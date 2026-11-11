import { NextResponse, type NextRequest } from "next/server";
import { getBillingProvider } from "@/lib/billing/mock-adapter";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Telco VAS Aggregator Webhook Endpoint (`POST /api/vas/webhook`)
 *
 * Invariants:
 * 1. Verifies HMAC-SHA256 `x-vas-signature` header before processing (simulator disabled in production).
 * 2. Append-only & idempotent on `(provider, provider_event_id)` in `billing_events`.
 * 3. Credits `coins_per_cycle` atomically via `credit_wallet_topup` RPC (`FOR UPDATE` + `idempotency_key`).
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const provider = getBillingProvider();

    const isSimulator =
      process.env.NODE_ENV !== "production" &&
      request.headers.get("x-vas-simulator") === "true";
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
    if (!event.providerEventId) {
      return NextResponse.json(
        { ok: false, error: "Missing provider event ID" },
        { status: 400 },
      );
    }

    let dbSynced = false;

    try {
      const sb = createSupabaseServiceClient();
      const safeRef = String(event.providerRef || "").replace(/[^a-zA-Z0-9_:-]/g, "");
      const safeMsisdn = String(event.msisdn || "").replace(/[^0-9+]/g, "");

      let sub: Record<string, unknown> | null = null;
      if (safeRef) {
        const { data } = await sb
          .from("subscriptions")
          .select("*")
          .eq("provider_ref", safeRef)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sub = data;
      }
      if (!sub && safeMsisdn) {
        const { data } = await sb
          .from("subscriptions")
          .select("*")
          .eq("msisdn", safeMsisdn)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sub = data;
      }

      const { error: evtErr } = await sb.from("billing_events").insert({
        provider: provider.key,
        provider_event_id: event.providerEventId,
        subscription_id: (sub?.id as string | undefined) ?? null,
        type: event.type,
        raw_payload: event.raw as Record<string, unknown>,
        signature_valid: true,
        processed: true,
      });

      if (evtErr && evtErr.code === "23505") {
        return NextResponse.json({
          ok: true,
          idempotentDuplicate: true,
          eventId: event.providerEventId,
        });
      }

      if (sub) {
        const subId = String(sub.id);
        const subUserId = String(sub.user_id);
        const subCarrier = String(sub.carrier ?? "VAS").toUpperCase();
        const subPlan = String(sub.plan ?? "daily");

        if (event.type === "charge_success" || event.type === "consent") {
          const coinsToCredit = Number(sub.coins_per_cycle ?? 100);
          await sb
            .from("subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("id", subId);

          if (event.type === "charge_success" && coinsToCredit > 0) {
            await sb.rpc("credit_wallet_topup", {
              p_user_id: subUserId,
              p_coins: coinsToCredit,
              p_reference: `vas-webhook:${event.providerEventId}`,
              p_idempotency_key: `vas-webhook:${provider.key}:${event.providerEventId}`,
              p_note: `VAS Renewal (${subCarrier} · ${subPlan})`,
            });
          }
        } else if (event.type === "charge_failed") {
          await sb
            .from("subscriptions")
            .update({ status: "grace", updated_at: new Date().toISOString() })
            .eq("id", subId);
        } else if (event.type === "cancel") {
          await sb
            .from("subscriptions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", subId);
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
