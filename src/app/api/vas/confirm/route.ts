import { NextResponse, type NextRequest } from "next/server";
import {
  getBillingProvider,
  normalizeNigerianMsisdn,
  PLAN_CATALOG,
} from "@/lib/billing/mock-adapter";
import type { SubscriptionPlan } from "@/lib/billing/provider";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const providerRef = String(body.providerRef ?? "").trim();
    const otp = String(body.otp ?? "").trim();
    const userId = String(body.userId ?? "demo-naija-player");
    const plan = (body.plan ?? "weekly") as SubscriptionPlan;
    const rawMsisdn = String(body.msisdn ?? "");

    if (!providerRef || !otp) {
      return NextResponse.json(
        { ok: false, error: "Missing providerRef or OTP code" },
        { status: 400 },
      );
    }

    const provider = getBillingProvider();
    const confirmed = await provider.confirmConsent(providerRef, otp);

    if (!confirmed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid OTP code. In sandbox/pilot mode, enter 0000 to confirm.",
        },
        { status: 400 },
      );
    }

    const planSpec = PLAN_CATALOG[plan] ?? PLAN_CATALOG.weekly;
    const msisdn = normalizeNigerianMsisdn(rawMsisdn);
    const carrier = provider.detectCarrier(msisdn);
    const cycleDays = plan === "daily" ? 1 : plan === "weekly" ? 7 : 30;
    const nextBillingAt = new Date(Date.now() + cycleDays * 86400_000).toISOString();

    // Update DB subscription + credit wallet if userId is a valid UUID and Supabase is reachable
    if (/^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const sb = createSupabaseServiceClient();

        // 1. Activate subscription
        const { data: subRow } = await sb
          .from("subscriptions")
          .update({
            status: "active",
            next_billing_at: nextBillingAt,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_ref", providerRef)
          .select("id")
          .maybeSingle();

        // 2. Log idempotent billing_events record
        await sb.from("billing_events").insert({
          provider: provider.key,
          provider_event_id: `consent_${providerRef}`,
          subscription_id: subRow?.id ?? null,
          type: "charge_success",
          raw_payload: {
            provider_ref: providerRef,
            msisdn,
            carrier,
            plan,
            coins: planSpec.coins,
            price_ngn: planSpec.priceNgn,
          },
          signature_valid: true,
          processed: true,
        });

        // 3. Credit wallet via RPC or service role
        const { data: wallet } = await sb
          .from("wallets")
          .select("coin_balance, reward_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (wallet) {
          const newCoinBalance = Number(wallet.coin_balance ?? 0) + planSpec.coins;
          await sb
            .from("wallets")
            .update({
              coin_balance: newCoinBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          await sb.from("wallet_transactions").insert({
            user_id: userId,
            type: "subscription_grant",
            coin_delta: planSpec.coins,
            reward_delta: 0,
            coin_balance_after: newCoinBalance,
            reward_balance_after: Number(wallet.reward_balance ?? 0),
            reference: providerRef,
            note: `${carrier.toUpperCase()} VAS (${planSpec.name} · ₦${planSpec.priceNgn})`,
          });
        }
      } catch {
        // Client-side hybrid ledger fallback will also record this transaction if DB is paused
      }
    }

    return NextResponse.json({
      ok: true,
      confirmed: true,
      providerRef,
      carrier,
      plan,
      coinsCredited: planSpec.coins,
      priceNgn: planSpec.priceNgn,
      nextBillingAt,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "VAS confirmation failed",
      },
      { status: 500 },
    );
  }
}
