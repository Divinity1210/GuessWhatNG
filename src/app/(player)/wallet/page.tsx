"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, TabGroup } from "@/components/ui";
import { CoinsIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUserWallet, getWalletTransactions, type WalletRow, type WalletTxnRow } from "@/lib/supabase/queries";
import { VasTopupModal, WithdrawalModal } from "@/components/viral/WalletModals";

const TXN_LABELS: Record<string, string> = {
  subscription_grant: "Airtime VAS Coin Purchase",
  session_entry: "Session Pool Entry",
  reward: "Session Pool Settlement",
  referral_bonus: "Referral Credit",
  promo: "Daily Streak / Welcome Credit",
  withdrawal: "NIP Bank / OPay Transfer",
  adjustment: "Ledger Adjustment",
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<WalletTxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showTopup, setShowTopup] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    try {
      const [w, txns] = await Promise.all([
        getUserWallet(user.id),
        getWalletTransactions(user.id, 50),
      ]);
      setWallet(w);
      setTransactions(txns);
    } catch (err) {
      console.error("Wallet load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
      </div>
    );
  }

  const filteredTxns =
    tab === "all"
      ? transactions
      : transactions.filter((t) => {
          if (tab === "credits") return t.coin_delta > 0 || t.reward_delta > 0;
          return t.coin_delta < 0 || t.reward_delta < 0;
        });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
            Wallet &amp; Settlement Ledger
          </h1>
          <p className="text-xs text-[#8A92A6] mt-0.5">
            Direct airtime billing (MTN, Airtel, Glo, 9mobile) and instant NIP payouts to OPay, PalmPay, Moniepoint, and commercial banks.
          </p>
        </div>
      </div>

      {/* ── Unified Financial Ledger Card ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:divide-x divide-[#222631]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
              Withdrawable Cash (NGN)
            </p>
            <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold text-[#10B981] tabular-nums">
              {formatNaira(wallet?.withdrawable_balance ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-[#8A92A6]">
              Available for immediate NIP transfer
            </p>
          </div>

          <div className="sm:pl-6">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
              GW Coin Allocation
            </p>
            <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold text-[#F7911B] tabular-nums">
              {(wallet?.coin_balance ?? 0).toLocaleString()} <span className="text-sm text-[#8A92A6]">GW</span>
            </p>
            <p className="mt-1 text-[11px] text-[#8A92A6]">
              100 GW = 1 standard session entry
            </p>
          </div>

          <div className="sm:pl-6">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8A92A6]">
              Lifetime Pool Earnings
            </p>
            <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold text-[#F4F5F8] tabular-nums">
              {formatNaira(wallet?.reward_balance ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-[#8A92A6]">
              Cumulative settled prize volume
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#222631] flex flex-wrap gap-3">
          <Button onClick={() => setShowTopup(true)}>
            <CoinsIcon className="size-4" />
            <span>+ Top Up Coins (Airtime VAS)</span>
          </Button>
          <Button variant="secondary" onClick={() => setShowWithdraw(true)}>
            <span>Withdraw Cash to Bank / OPay</span>
          </Button>
        </div>
      </section>

      {/* ── Transaction Ledger ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222631] pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8]">
            Transaction Statement
          </h2>
          <TabGroup
            tabs={[
              { label: "All Entries", value: "all" },
              { label: "Credits", value: "credits" },
              { label: "Debits", value: "debits" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {filteredTxns.length > 0 ? (
          <div className="divide-y divide-[#222631]">
            {filteredTxns.map((txn) => {
              const isCredit = txn.coin_delta > 0 || txn.reward_delta > 0;
              return (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-3.5 first:pt-4 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-8 place-items-center rounded-lg border font-mono text-xs font-semibold ${
                        isCredit
                          ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]"
                          : "border-[#2E3442] bg-[#171A21] text-[#8A92A6]"
                      }`}
                    >
                      {isCredit ? "CR" : "DR"}
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-[#F4F5F8]">
                        {txn.note || TXN_LABELS[txn.type] || txn.type}
                      </p>
                      <p className="font-mono text-[11px] text-[#8A92A6] tabular-nums">
                        {new Date(txn.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    {txn.coin_delta !== 0 && (
                      <p
                        className={`text-xs sm:text-sm font-semibold ${
                          isCredit ? "text-[#F7911B]" : "text-[#C8CDD8]"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {txn.coin_delta.toLocaleString()} GW
                      </p>
                    )}
                    {txn.reward_delta !== 0 && (
                      <p
                        className={`text-xs sm:text-sm font-semibold ${
                          isCredit ? "text-[#10B981]" : "text-[#C8CDD8]"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {formatNaira(txn.reward_delta)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-10 text-center text-xs text-[#8A92A6]">
            No ledger entries recorded yet. Top up via Airtime VAS or complete today&apos;s consensus poll.
          </p>
        )}
      </section>

      {showTopup && user && (
        <VasTopupModal
          userId={user.id}
          onClose={() => setShowTopup(false)}
          onSuccess={loadWallet}
        />
      )}

      {showWithdraw && user && (
        <WithdrawalModal
          userId={user.id}
          maxAmount={wallet?.withdrawable_balance ?? 0}
          onClose={() => setShowWithdraw(false)}
          onSuccess={loadWallet}
        />
      )}
    </div>
  );
}
