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
    const otpCode = String(body.otpCode ?? body.otp ?? "").trim();
    const rawMsisdn = String(body.msisdn ?? "").trim();
    const plan = (body.plan ?? "weekly") as SubscriptionPlan;
    const userId = String(body.userId ?? "");

    if (!providerRef || !otpCode) {
      return NextResponse.json(
        { ok: false, error: "Provider reference and 4-digit OTP code are required" },
        { status: 400 },
      );
    }

    const provider = getBillingProvider();
    const planSpec = PLAN_CATALOG[plan] ?? PLAN_CATALOG.weekly;
    const msisdn = rawMsisdn ? normalizeNigerianMsisdn(rawMsisdn) : "";
    const carrier = msisdn ? provider.detectCarrier(msisdn) : "mtn";

    const confirmed = await provider.confirmConsent(providerRef, otpCode);

    if (!confirmed) {
      return NextResponse.json(
        { ok: false, error: "Invalid OTP code. Enter 0000 in pilot mode." },
        { status: 400 },
      );
    }

    const nextBillingAt = new Date(
      Date.now() + (plan === "daily" ? 86_400_000 : 7 * 86_400_000),
    ).toISOString();

    let dbSynced = false;

    if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const sb = createSupabaseServiceClient();

        // 1. Activate subscription in Supabase
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

        // 2. Log billing_events record
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

        // 3. Credit wallet via service role
        const { data: wallet } = await sb
          .from("wallets")
          .select("coin_balance, reward_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (wallet) {
          const newCoinBalance = Number(wallet.coin_balance ?? 0) + planSpec.coins;
          const { error: wErr } = await sb
            .from("wallets")
            .update({
              coin_balance: newCoinBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          if (!wErr) {
            await sb.from("wallet_transactions").insert({
              user_id: userId,
              type: "topup",
              coin_delta: planSpec.coins,
              reward_delta: 0,
              coin_balance_after: newCoinBalance,
              reward_balance_after: Number(wallet.reward_balance ?? 0),
              reference: providerRef,
              note: `${carrier.toUpperCase()} VAS (${planSpec.name} · ₦${planSpec.priceNgn})`,
            });
            dbSynced = true;
          }
        }
      } catch {
        // Client-side hybrid ledger fallback will record this transaction if DB is unreachable
      }
    }

    return NextResponse.json({
      ok: true,
      confirmed: true,
      dbSynced,
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
