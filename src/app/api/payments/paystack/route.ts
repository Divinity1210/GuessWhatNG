import { NextResponse, type NextRequest } from "next/server";
import {
  initiatePaystackCheckout,
  verifyPaystackSignature,
} from "@/lib/billing/paystack";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Paystack & Flutterwave Payment Gateway Route (`POST /api/payments/paystack`)
 *
 * Supports:
 * 1. Client Checkout Initialization (`action: "initialize"`) for Card, Bank Transfer, USSD & OPay
 * 2. Paystack Webhook processing (`x-paystack-signature` header present)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // ─── Path A: Paystack Server Webhook ─────────────────────────────────────
    if (signature) {
      const isValid = verifyPaystackSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json(
          { ok: false, error: "Invalid Paystack webhook signature" },
          { status: 401 },
        );
      }

      const payload = JSON.parse(rawBody);
      if (payload.event === "charge.success") {
        const ref = String(payload.data?.reference ?? "");
        const userId = String(payload.data?.metadata?.user_id ?? "");
        const coins = Number(payload.data?.metadata?.coins ?? 0);
        const amountNgn = Math.round(Number(payload.data?.amount ?? 0) / 100);

        if (/^[0-9a-f-]{36}$/i.test(userId) && coins > 0) {
          try {
            const sb = createSupabaseServiceClient();
            const { data: wallet } = await sb
              .from("wallets")
              .select("coin_balance, reward_balance")
              .eq("user_id", userId)
              .maybeSingle();

            if (wallet) {
              const nextCoins = Number(wallet.coin_balance ?? 0) + coins;
              await sb
                .from("wallets")
                .update({ coin_balance: nextCoins, updated_at: new Date().toISOString() })
                .eq("user_id", userId);

              await sb.from("wallet_transactions").insert({
                user_id: userId,
                type: "promo",
                coin_delta: coins,
                reward_delta: 0,
                coin_balance_after: nextCoins,
                reward_balance_after: Number(wallet.reward_balance ?? 0),
                reference: ref,
                note: `Paystack Instant Checkout (₦${amountNgn.toLocaleString()})`,
              });
            }
          } catch {
            // Ignore if DB is paused
          }
        }
      }

      return NextResponse.json({ ok: true, received: true });
    }

    // ─── Path B: Client Checkout Initialization ──────────────────────────────
    const body = JSON.parse(rawBody);
    const userId = String(body.userId ?? "demo-naija-player");
    const email = String(body.email ?? "player@guesswhat.ng");
    const planId = String(body.plan ?? "weekly");
    const coins = Number(body.coins ?? 800);
    const amountNgn = Number(body.priceNgn ?? 300);
    const gateway = body.gateway === "flutterwave" ? "flutterwave" : "paystack";

    const checkout = await initiatePaystackCheckout({
      email,
      amountNgn,
      coins,
      planId,
      userId,
      gateway,
      callbackUrl: body.callbackUrl,
    });

    // If running in instant_sandbox mode (no live secret key yet), credit DB ledger immediately
    if (checkout.mode === "instant_sandbox" && /^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const sb = createSupabaseServiceClient();
        const { data: wallet } = await sb
          .from("wallets")
          .select("coin_balance, reward_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (wallet) {
          const nextCoins = Number(wallet.coin_balance ?? 0) + coins;
          await sb
            .from("wallets")
            .update({ coin_balance: nextCoins, updated_at: new Date().toISOString() })
            .eq("user_id", userId);

          await sb.from("wallet_transactions").insert({
            user_id: userId,
            type: "subscription_grant",
            coin_delta: coins,
            reward_delta: 0,
            coin_balance_after: nextCoins,
            reward_balance_after: Number(wallet.reward_balance ?? 0),
            reference: checkout.reference,
            note: `${gateway === "paystack" ? "Paystack" : "Flutterwave"} Checkout (₦${amountNgn.toLocaleString()})`,
          });
        }
      } catch {
        // Handled by client hybrid fallback when DB is paused
      }
    }

    return NextResponse.json({
      ok: true,
      reference: checkout.reference,
      authorizationUrl: checkout.authorizationUrl,
      mode: checkout.mode,
      gateway,
      coins,
      amountNgn,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Payment initialization failed",
      },
      { status: 500 },
    );
  }
}
