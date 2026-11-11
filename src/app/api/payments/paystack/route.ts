import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/supabase/api-auth";

export interface PaystackPack {
  id: string;
  name: string;
  coins: number;
  priceNgn: number;
}

const PAYSTACK_PACKS: Record<string, PaystackPack> = {
  starter: { id: "starter", name: "Starter Pack", coins: 100, priceNgn: 100 },
  daily: { id: "daily", name: "Daily Pass", coins: 100, priceNgn: 50 },
  weekend: { id: "weekend", name: "Weekend Bundle", coins: 350, priceNgn: 300 },
  weekly: { id: "weekly", name: "Weekly Pack", coins: 800, priceNgn: 300 },
  monthly: { id: "monthly", name: "Monthly Pass", coins: 4000, priceNgn: 1000 },
  ballers: { id: "ballers", name: "Baller Vault", coins: 1000, priceNgn: 750 },
  mega: { id: "mega", name: "Mega 750 Coins", coins: 750, priceNgn: 500 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = await requireAuthUser(request, body.userId);
    if (!auth.user) {
      return auth.response;
    }
    const userId = auth.user.id;
    const email = auth.user.email || "player@guesswhat.ng";

    const packKey = String(body.packId ?? body.plan ?? "weekly").toLowerCase();
    const pack = PAYSTACK_PACKS[packKey] ?? PAYSTACK_PACKS.weekly;
    const gateway = String(body.gateway ?? body.channel ?? "paystack").toLowerCase();

    const rawIdem =
      request.headers.get("idempotency-key") ||
      (typeof body.idempotencyKey === "string" ? body.idempotencyKey : "");
    const cleanIdem = rawIdem.trim().slice(0, 120);
    const idempotencyKey =
      cleanIdem.length >= 8
        ? `topup:${userId}:${cleanIdem}`
        : `topup:${userId}:${pack.id}:${gateway}:${Math.floor(Date.now() / 15000)}`;

    const reference = `${gateway.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

    const sb = createSupabaseServiceClient();
    const { data, error } = await sb.rpc("credit_wallet_topup", {
      p_user_id: userId,
      p_coins: pack.coins,
      p_reference: reference,
      p_idempotency_key: idempotencyKey,
      p_note: `${gateway.toUpperCase()} Instant Top-Up (+${pack.coins} Coins · ₦${pack.priceNgn})`,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Could not credit wallet" },
        { status: 400 },
      );
    }

    const resObj = (data ?? {}) as { reference?: string };

    return NextResponse.json({
      ok: true,
      dbSynced: true,
      reference: resObj.reference ?? reference,
      channel: gateway,
      email,
      pack,
      coinsCredited: pack.coins,
      amountNgn: pack.priceNgn,
      paidAt: new Date().toISOString(),
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
