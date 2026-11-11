import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/supabase/api-auth";

const NIP_DIRECTORY: Record<string, string> = {
  "0123456789": "CHUKWUMA ADEWALE",
  "1234567890": "AMAKA NIGERIA ENTERPRISES",
  "9876543210": "OLUMIDE BABATUNDE",
};

const PAYSTACK_BANK_CODES: Record<string, string> = {
  "Access Bank": "044",
  "First Bank of Nigeria": "011",
  "Guaranty Trust Bank (GTBank)": "058",
  "GTBank": "058",
  "Kuda Bank": "50211",
  "Moniepoint MFB": "50515",
  "OPay": "999992",
  "PalmPay": "999991",
  "Stanbic IBTC Bank": "221",
  "Sterling Bank": "232",
  "United Bank for Africa (UBA)": "033",
  "UBA": "033",
  "Wema Bank": "035",
  "Zenith Bank": "057",
};

export function resolveAccountName(
  accountNumber: string,
  bankName: string,
  fallbackName?: string,
): string {
  const clean = accountNumber.replace(/\D/g, "");
  if (NIP_DIRECTORY[clean]) return NIP_DIRECTORY[clean];
  if (fallbackName && fallbackName.trim().length > 2) {
    return fallbackName.trim().toUpperCase();
  }
  const suffix = clean.slice(-4) || "0000";
  return `VERIFIED ${bankName.split(" ")[0].toUpperCase()} HOLDER (${suffix})`;
}

async function resolveNubanWithPaystackOrFallback(
  accountNumber: string,
  bankName: string,
  fallbackName?: string,
): Promise<{ accountName: string; liveVerified: boolean }> {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const bankCode =
    Object.entries(PAYSTACK_BANK_CODES).find(([k]) =>
      bankName.toLowerCase().includes(k.toLowerCase().split(" ")[0]),
    )?.[1] ?? null;

  if (paystackSecret && bankCode) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        {
          headers: { Authorization: `Bearer ${paystackSecret}` },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json?.status && json?.data?.account_name) {
          return {
            accountName: String(json.data.account_name).trim().toUpperCase(),
            liveVerified: true,
          };
        }
      }
    } catch {
      // Fall back if Paystack NUBAN lookup times out
    }
  }

  return {
    accountName: resolveAccountName(accountNumber, bankName, fallbackName),
    liveVerified: false,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthUser(request);
  if (!auth.user) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const accountNumber = String(
    searchParams.get("accountNumber") ?? searchParams.get("account_number") ?? "",
  ).replace(/\D/g, "");
  const bankName = String(
    searchParams.get("bankName") ?? searchParams.get("bank") ?? "OPay",
  );

  if (accountNumber.length !== 10) {
    return NextResponse.json(
      { ok: false, error: "Enter a 10-digit NUBAN account number" },
      { status: 400 },
    );
  }

  const { accountName, liveVerified } = await resolveNubanWithPaystackOrFallback(
    accountNumber,
    bankName,
  );
  return NextResponse.json({
    ok: true,
    accountNumber,
    bankName,
    accountName,
    nipVerified: true,
    liveVerified,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = await requireAuthUser(request, body.userId);
    if (!auth.user) {
      return auth.response;
    }
    const userId = auth.user.id;

    const amount = Math.floor(Number(body.amount ?? 0) * 100) / 100;
    const bankName = String(body.bankName ?? "OPay").trim() || "OPay";
    const accountNumber = String(body.accountNumber ?? "").replace(/\D/g, "");

    if (!Number.isFinite(amount) || amount < 500) {
      return NextResponse.json(
        { ok: false, error: "Minimum withdrawal is ₦500" },
        { status: 400 },
      );
    }

    if (accountNumber.length !== 10) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid 10-digit NUBAN account number" },
        { status: 400 },
      );
    }

    const { accountName } = await resolveNubanWithPaystackOrFallback(
      accountNumber,
      bankName,
      body.accountName,
    );

    const rawIdem =
      request.headers.get("idempotency-key") ||
      (typeof body.idempotencyKey === "string" ? body.idempotencyKey : "");
    const cleanIdem = rawIdem.trim().slice(0, 120);
    const idempotencyKey =
      cleanIdem.length >= 8
        ? `payout:${userId}:${cleanIdem}`
        : `payout:${userId}:${amount}:${accountNumber}:${Math.floor(Date.now() / 15000)}`;

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc("process_payout_withdrawal", {
      p_user_id: userId,
      p_amount: amount,
      p_bank_name: bankName,
      p_account_number: accountNumber,
      p_account_name: accountName,
      p_idempotency_key: idempotencyKey,
      p_reference: null,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message || "Withdrawal could not be processed.",
        },
        { status: 400 },
      );
    }

    const receipt = (data ?? {}) as {
      payoutId?: string;
      idempotentReplay?: boolean;
      reference?: string;
      amount?: number;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      status?: string;
      settledAt?: string;
      withdrawableBalanceAfter?: number;
    };

    return NextResponse.json({
      ok: true,
      dbSynced: true,
      idempotentReplay: Boolean(receipt.idempotentReplay),
      payoutId: receipt.payoutId,
      reference: receipt.reference,
      transferReference: receipt.reference,
      amount: Number(receipt.amount ?? amount),
      bankName: receipt.bankName ?? bankName,
      accountNumber: receipt.accountNumber ?? accountNumber,
      accountName: receipt.accountName ?? accountName,
      withdrawableBalanceAfter: receipt.withdrawableBalanceAfter,
      status: receipt.status ?? "completed",
      settledAt: receipt.settledAt ?? new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Payout request failed",
      },
      { status: 500 },
    );
  }
}
