import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/mock-adapter";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * VAS aggregator webhook. Hardening rules:
 *  - refuse-by-default: invalid signature → 401, unknown event → logged + 202
 *  - idempotent on (provider, provider_event_id)
 *  - coins credited only through the wallet_transactions ledger
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
    // Logged for investigation, acknowledged so the aggregator stops retrying.
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
      // Credit cycle coins through the ledger via RPC-free transactional path.
      const { data: wallet } = await db
        .from("wallets")
        .select("coin_balance, reward_balance")
        .eq("user_id", sub.user_id)
        .single();
      if (wallet) {
        const newBalance = Number(wallet.coin_balance) + Number(sub.coins_per_cycle);
        await db.from("wallet_transactions").insert({
          user_id: sub.user_id,
          type: "subscription_grant",
          coin_delta: sub.coins_per_cycle,
          coin_balance_after: newBalance,
          reward_balance_after: wallet.reward_balance,
          reference: `billing:${event.providerEventId}`,
        });
        await db
          .from("wallets")
          .update({ coin_balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", sub.user_id);
        await db
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
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
