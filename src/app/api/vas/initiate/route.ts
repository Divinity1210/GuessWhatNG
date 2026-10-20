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
    const rawMsisdn = String(body.msisdn ?? "").trim();
    const plan = (body.plan ?? "weekly") as SubscriptionPlan;
    const userId = String(body.userId ?? "demo-naija-player");

    if (!rawMsisdn || rawMsisdn.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid Nigerian phone number (e.g. 0803 123 4567)" },
        { status: 400 },
      );
    }

    const planSpec = PLAN_CATALOG[plan] ?? PLAN_CATALOG.weekly;
    const provider = getBillingProvider();
    const msisdn = normalizeNigerianMsisdn(rawMsisdn);
    const carrier = provider.detectCarrier(msisdn);

    const initiation = await provider.initiateSubscription({
      msisdn,
      plan,
      userId,
    });

    // Record pending_consent subscription in Supabase when reachable and userId is a UUID
    if (/^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const sb = createSupabaseServiceClient();
        await sb.from("subscriptions").insert({
          user_id: userId,
          msisdn,
          carrier,
          plan,
          status: "pending_consent",
          coins_per_cycle: planSpec.coins,
          provider: provider.key,
          provider_ref: initiation.providerRef,
        });
      } catch {
        // Non-fatal if DB is paused or msisdn already has an active sub
      }
    }

    return NextResponse.json({
      ok: true,
      providerRef: initiation.providerRef,
      consentMethod: initiation.consentMethod,
      consentHint: initiation.consentHint,
      carrier,
      msisdn,
      plan,
      coins: planSpec.coins,
      priceNgn: planSpec.priceNgn,
      ussd: planSpec.ussd,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to initiate VAS subscription",
      },
      { status: 500 },
    );
  }
}
