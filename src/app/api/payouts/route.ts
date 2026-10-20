import { NextResponse, type NextRequest } from "next/server";
import {
  initiateNigerianBankTransfer,
  resolveNigerianBankAccount,
} from "@/lib/billing/paystack";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/payouts?account_number=0123456789&bank=OPay+(Paycom)
 * Resolves a 10-digit Nigerian NUBAN account number via Paystack Bank Resolution API
 * (with instant deterministic fallback in sandbox mode).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountNumber = (searchParams.get("account_number") ?? "").replace(/\D/g, "");
  const bankName = searchParams.get("bank") ?? "OPay (Paycom)";

  if (accountNumber.length !== 10) {
    return NextResponse.json(
      { ok: false, error: "Account number must be 10 digits (NUBAN)" },
      { status: 400 },
    );
  }

  const resolved = await resolveNigerianBankAccount({
    accountNumber,
    bankName,
  });

  return NextResponse.json({
    ok: true,
    accountNumber,
    bankName,
    accountName: resolved.accountName,
    bankCode: resolved.bankCode,
    verifiedVia: resolved.verifiedVia,
  });
}

/**
 * POST /api/payouts
 * Initiates a Naira prize payout to Nigerian Banks, OPay, PalmPay, or Moniepoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body.userId ?? "demo-naija-player");
    const amount = Number(body.amount ?? 0);
    const bankName = String(body.bankName ?? "OPay (Paycom)");
    const accountNumber = String(body.accountNumber ?? "").replace(/\D/g, "");
    const accountName = String(body.accountName ?? "VERIFIED PLAYER").trim();

    if (!amount || amount < 500) {
      return NextResponse.json(
        { ok: false, error: "Minimum withdrawal amount is ₦500" },
        { status: 400 },
      );
    }

    if (accountNumber.length !== 10) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid 10-digit NUBAN account or wallet number" },
        { status: 400 },
      );
    }

    const transfer = await initiateNigerianBankTransfer({
      amountNgn: amount,
      bankName,
      accountNumber,
      accountName,
      userId,
    });

    // Debit reward_balance & withdrawable_balance in Supabase when online
    if (/^[0-9a-f-]{36}$/i.test(userId)) {
      try {
        const sb = createSupabaseServiceClient();
        const { data: wallet } = await sb
          .from("wallets")
          .select("coin_balance, reward_balance, withdrawable_balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (wallet && Number(wallet.reward_balance ?? 0) >= amount) {
          const nextReward = Number(wallet.reward_balance) - amount;
          const nextWithdrawable = Math.max(
            0,
            Number(wallet.withdrawable_balance ?? wallet.reward_balance) - amount,
          );

          await sb
            .from("wallets")
            .update({
              reward_balance: nextReward,
              withdrawable_balance: nextWithdrawable,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          await sb.from("wallet_transactions").insert({
            user_id: userId,
            type: "withdrawal",
            coin_delta: 0,
            reward_delta: -amount,
            coin_balance_after: Number(wallet.coin_balance ?? 0),
            reward_balance_after: nextReward,
            reference: transfer.transferReference,
            note: `Payout to ${bankName} (${accountNumber} · ${accountName})`,
          });
        }
      } catch {
        // Client-side hybrid ledger fallback also records the withdrawal
      }
    }

    return NextResponse.json({
      ok: true,
      transferReference: transfer.transferReference,
      providerStatus: transfer.providerStatus,
      mode: transfer.mode,
      amount,
      bankName,
      accountNumber,
      accountName,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to process payout request",
      },
      { status: 500 },
    );
  }
}
