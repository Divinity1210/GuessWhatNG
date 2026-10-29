import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export interface PaystackPack {
  id: string;
  name: string;
  coins: number;
  priceNgn: number;
}

const PAYSTACK_PACKS: Record<string, PaystackPack> = {
  starter: { id: "starter", name: "Starter Pack", coins: 100, priceNgn: 100 },
  daily: { id: "daily", name: "Daily 100 Coins", coins: 100, priceNgn: 100 },
  weekend: { id: "weekend", name: "Weekend Bundle", coins: 350, priceNgn: 300 },
  weekly: { id: "weekly", name: "Weekly 350 Coins", coins: 350, priceNgn: 300 },
  ballers: { id: "ballers", name: "Baller Vault", coins: 1000, priceNgn: 750 },
  mega: { id: "mega", name: "Mega 750 Coins", coins: 750, priceNgn: 500 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const packKey = String(body.packId ?? body.plan ?? "weekly");
    const basePack = PAYSTACK_PACKS[packKey] ?? PAYSTACK_PACKS.weekly;
    const coins = Number(body.coins ?? basePack.coins);
    const priceNgn = Number(body.priceNgn ?? basePack.priceNgn);
    const gateway = String(body.gateway ?? body.channel ?? "paystack");
    const userId = String(body.userId ?? "");
    const email = String(body.email ?? "player@guesswhat.ng");

    const pack: PaystackPack = {
      id: packKey,
      name: `${coins} Coins Pack`,
      coins,
      priceNgn,
    };
    const reference = `${gateway.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

    let dbSynced = false;

    if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const sb = createSupabaseServiceClient();
        const { data: wallet } = await sb
          .from("wallets")
          .select("coin_balance, reward_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (wallet) {
          const newCoinBalance = Number(wallet.coin_balance ?? 0) + coins;
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
              coin_delta: coins,
              reward_delta: 0,
              coin_balance_after: newCoinBalance,
              reward_balance_after: Number(wallet.reward_balance ?? 0),
              reference,
              note: `${gateway.toUpperCase()} Instant Top-Up (+${coins} Coins · ₦${priceNgn})`,
            });
            dbSynced = true;
          }
        }
      } catch {
        // Hybrid client ledger handles offline fallback
      }
    }

    return NextResponse.json({
      ok: true,
      dbSynced,
      reference,
      channel: gateway,
      email,
      pack,
      coinsCredited: coins,
      amountNgn: priceNgn,
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
