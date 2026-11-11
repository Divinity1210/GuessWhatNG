import { NextResponse, type NextRequest } from "next/server";
import {
  getBillingProvider,
  normalizeNigerianMsisdn,
  PLAN_CATALOG,
} from "@/lib/billing/mock-adapter";
import type { SubscriptionPlan } from "@/lib/billing/provider";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/supabase/api-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = await requireAuthUser(request, body.userId);
    if (!auth.user) {
      return auth.response;
    }
    const userId = auth.user.id;

    const providerRef = String(body.providerRef ?? "").trim();
    const otpCode = String(body.otpCode ?? body.otp ?? "").trim();
    const rawMsisdn = String(body.msisdn ?? "").trim();
    const plan = (body.plan ?? "weekly") as SubscriptionPlan;

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

    const sb = createSupabaseServiceClient();

    const { data: subRow } = await sb
      .from("subscriptions")
      .update({
        status: "active",
        next_billing_at: nextBillingAt,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_ref", providerRef)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    await sb
      .from("billing_events")
      .upsert(
        {
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
        },
        { onConflict: "provider,provider_event_id" },
      );

    const { error: creditErr } = await sb.rpc("credit_wallet_topup", {
      p_user_id: userId,
      p_coins: planSpec.coins,
      p_reference: providerRef,
      p_idempotency_key: `vas_consent:${providerRef}`,
      p_note: `${carrier.toUpperCase()} VAS (${planSpec.name} · ₦${planSpec.priceNgn})`,
    });

    if (creditErr) {
      return NextResponse.json(
        { ok: false, error: creditErr.message || "Failed to credit VAS coins" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      confirmed: true,
      dbSynced: true,
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
