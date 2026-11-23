import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type StoredReceipt = {
  id: string;
  sessionId?: string;
  sessionName: string;
  payoutType: "session_winner" | "referral_prize" | "bonus";
  userId?: string;
  username: string;
  fullName: string;
  hideFullName?: boolean;
  state: string;
  position?: number;
  points?: number;
  amount: number;
  bankName: string;
  accountNumberMasked: string;
  transferRef?: string;
  note?: string;
  paidAt: string;
  imageUrl?: string;
  createdAt: string;
};

function ensureMasked(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "******";
  if (s.includes("*")) return s;
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length >= 4) {
    return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
  }
  return "******";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const cleanId = decodeURIComponent(id || "").trim().toUpperCase();
    if (!cleanId) {
      return NextResponse.json({ error: "Receipt ID required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payout_receipts")
      .maybeSingle();

    const val = data?.value as { receipts?: StoredReceipt[] } | StoredReceipt[] | null;
    const list = Array.isArray(val)
      ? val
      : val && Array.isArray(val.receipts)
        ? val.receipts
        : [];

    const matched = list.find((r) => String(r.id || "").toUpperCase() === cleanId);
    if (!matched) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      receipt: {
        id: matched.id,
        sessionName: matched.sessionName,
        payoutType: matched.payoutType,
        username: matched.username,
        fullName: matched.hideFullName ? undefined : matched.fullName,
        hideFullName: Boolean(matched.hideFullName),
        state: matched.state,
        position: matched.position,
        points: matched.points,
        amount: matched.amount,
        bankName: matched.bankName,
        accountNumberMasked: ensureMasked(matched.accountNumberMasked),
        transferRef: matched.transferRef,
        note: matched.note,
        paidAt: matched.paidAt,
        imageUrl: matched.imageUrl,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load receipt" },
      { status: 500 },
    );
  }
}
