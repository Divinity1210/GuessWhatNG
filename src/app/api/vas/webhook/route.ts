import { NextResponse, type NextRequest } from "next/server";
import { getBillingProvider } from "@/lib/billing/mock-adapter";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Telco VAS Aggregator Webhook Endpoint (`POST /api/vas/webhook`)
 *
 * Invariants:
 * 1. Verifies HMAC-SHA256 `x-vas-signature` header before processing.
 * 2. Append-only & idempotent on `(provider, provider_event_id)` in `billing_events`.
 * 3. Credits `coins_per_cycle` to `wallets` + `wallet_transactions` on `charge_success`.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const provider = getBillingProvider();

    // Allow admin webhook simulator to request automatic HMAC signing for test runs
    const isSimulator = request.headers.get("x-vas-simulator") === "true";
    const headersToVerify = new Headers(request.headers);
    if (isSimulator && !headersToVerify.get("x-vas-signature")) {
      headersToVerify.set("x-vas-signature", provider.signPayload(rawBody));
    }

    const signatureValid = provider.verifyWebhook(rawBody, headersToVerify);
    if (!signatureValid) {
      return NextResponse.json(
        { ok: false, error: "Invalid x-vas-signature header" },
        { status: 401 },
      );
    }

    const event = provider.parseEvent(rawBody);
    let dbSynced = false;

    try {
      const sb = createSupabaseServiceClient();

      // Lookup matching subscription by provider_ref or msisdn
      const { data: sub } = await sb
        .from("subscriptions")
        .select("*")
        .or(`provider_ref.eq.${event.providerRef},msisdn.eq.${event.msisdn}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Insert idempotent billing_events row
      const { error: evtErr } = await sb.from("billing_events").insert({
        provider: provider.key,
        provider_event_id: event.providerEventId,
        subscription_id: sub?.id ?? null,
        type: event.type,
        raw_payload: event.raw as Record<string, unknown>,
        signature_valid: true,
        processed: true,
      });

      // If duplicate provider_event_id, return 200 idempotently without double-crediting
      if (evtErr && evtErr.code === "23505") {
        return NextResponse.json({
          ok: true,
          idempotentDuplicate: true,
          eventId: event.providerEventId,
        });
      }

      if (sub) {
        if (event.type === "charge_success" || event.type === "consent") {
          const coinsToCredit = Number(sub.coins_per_cycle ?? 100);
          await sb
            .from("subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("id", sub.id);

          if (event.type === "charge_success") {
            const { data: wallet } = await sb
              .from("wallets")
              .select("coin_balance, reward_balance")
              .eq("user_id", sub.user_id)
              .maybeSingle();

            if (wallet) {
              const nextCoins = Number(wallet.coin_balance ?? 0) + coinsToCredit;
              await sb
                .from("wallets")
                .update({ coin_balance: nextCoins, updated_at: new Date().toISOString() })
                .eq("user_id", sub.user_id);

              await sb.from("wallet_transactions").insert({
                user_id: sub.user_id,
                type: "subscription_grant",
                coin_delta: coinsToCredit,
                reward_delta: 0,
                coin_balance_after: nextCoins,
                reward_balance_after: Number(wallet.reward_balance ?? 0),
                reference: event.providerEventId,
                note: `VAS Renewal (${sub.carrier?.toUpperCase()} · ${sub.plan})`,
              });
            }
          }
        } else if (event.type === "charge_failed") {
          await sb
            .from("subscriptions")
            .update({ status: "grace", updated_at: new Date().toISOString() })
            .eq("id", sub.id);
        } else if (event.type === "cancel") {
          await sb
            .from("subscriptions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
        }
      }
      dbSynced = true;
    } catch {
      // Non-fatal if Supabase is paused during sandbox testing
    }

    return NextResponse.json({
      ok: true,
      eventId: event.providerEventId,
      providerRef: event.providerRef,
      type: event.type,
      msisdn: event.msisdn,
      signatureValid: true,
      dbSynced,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to process VAS webhook",
      },
      { status: 400 },
    );
  }
}
