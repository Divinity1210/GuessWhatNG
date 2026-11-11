import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/mock-adapter";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * VAS aggregator webhook. Hardening rules:
 *  - refuse-by-default: invalid signature -> 401, unknown event -> logged + 202
 *  - idempotent on (provider, provider_event_id) and wallet_transactions.idempotency_key
 *  - coins credited atomically with row-level lock via credit_wallet_topup RPC
 */
export async function POST(req: Request) {
  const provider = getBillingProvider();
  const rawBody = await req.text();

  if (!provider.verifyWebhook(rawBody, req.headers)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = provider.parseEvent(rawBody);
  if (!event.providerEventId) {
    return NextResponse.json({ error: "missing event id" }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  const { data: sub } = await db
    .from("subscriptions")
    .select("id, user_id, coins_per_cycle, plan, status")
    .eq("provider", provider.key)
    .eq("provider_ref", event.providerRef)
    .maybeSingle();

  // Insert first: unique index makes replays a no-op.
  const { error: insertError } = await db.from("billing_events").insert({
    provider: provider.key,
    provider_event_id: event.providerEventId,
    subscription_id: sub?.id ?? null,
    type: event.type,
    raw_payload: event.raw,
    signature_valid: true,
    processed: false,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ status: "duplicate ignored" }, { status: 200 });
    }
    return NextResponse.json({ error: "storage failure" }, { status: 500 });
  }

  if (!sub || event.type === "unknown") {
    return NextResponse.json({ status: "logged, not processed" }, { status: 202 });
  }

  switch (event.type) {
    case "consent": {
      await db
        .from("subscriptions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      break;
    }
    case "charge_success": {
      await db.rpc("credit_wallet_topup", {
        p_user_id: sub.user_id,
        p_coins: Number(sub.coins_per_cycle),
        p_reference: `billing:${event.providerEventId}`,
        p_idempotency_key: `billing:${provider.key}:${event.providerEventId}`,
        p_note: `Recurring VAS cycle grant (${sub.plan})`,
      });
      await db
        .from("subscriptions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      break;
    }
    case "charge_failed": {
      await db
        .from("subscriptions")
        .update({ status: "grace", updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      break;
    }
    case "cancel": {
      await db
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      break;
    }
  }

  await db
    .from("billing_events")
    .update({ processed: true })
    .eq("provider", provider.key)
    .eq("provider_event_id", event.providerEventId);

  return NextResponse.json({ status: "processed" });
}
