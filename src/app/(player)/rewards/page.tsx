"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, StatCard, EmptyState } from "@/components/ui";
import { GiftIcon, TrophyIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUserWallet, getWalletTransactions, type WalletRow, type WalletTxnRow } from "@/lib/supabase/queries";
import { WithdrawalModal } from "@/components/viral/WalletModals";

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default function RewardsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [rewards, setRewards] = useState<WalletTxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadRewards = useCallback(async () => {
    if (!user) return;
    try {
      const [w, txns] = await Promise.all([
        getUserWallet(user.id),
        getWalletTransactions(user.id, 50),
      ]);
      setWallet(w);
      setRewards(
        txns.filter(
          (t) =>
            t.type === "reward" ||
            t.type === "referral_bonus" ||
            t.type === "promo" ||
            t.type === "withdrawal",
        ),
      );
    } catch (err) {
      console.error("Rewards load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-[#F7911B] border-t-transparent" />
      </div>
    );
  }

  const totalRewards = rewards
    .filter((r) => r.reward_delta > 0)
    .reduce((sum, r) => sum + r.reward_delta, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#F4F5F8]">
          Payouts &amp; Settlements
        </h1>
        <p className="text-xs text-[#8A92A6] mt-0.5">
          Transfer settled session winnings to OPay, PalmPay, Moniepoint, Kuda, or any commercial bank.
        </p>
      </div>

      {/* ── Summary Ledger ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Cumulative Prizes"
          value={formatNaira(totalRewards)}
          icon={<GiftIcon className="size-4 text-[#F7911B]" />}
        />
        <StatCard
          label="Settled Balance"
          value={formatNaira(wallet?.reward_balance ?? 0)}
          icon={<TrophyIcon className="size-4 text-[#C8CDD8]" />}
        />
        <StatCard
          label="Available Payout"
          value={formatNaira(wallet?.withdrawable_balance ?? 0)}
          icon={<span className="font-mono text-xs font-bold text-[#10B981]">NGN</span>}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowWithdraw(true)}>
          {(wallet?.withdrawable_balance ?? 0) > 0
            ? `Transfer ${formatNaira(wallet!.withdrawable_balance)} via NIP`
            : "Request Bank / OPay Transfer"}
        </Button>
        <Button variant="secondary" href="/play">
          Enter Live Pool
        </Button>
      </div>

      {/* ── Settlement History ── */}
      <section className="rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F4F5F8] border-b border-[#222631] pb-3">
          Settlement &amp; Bonus Log
        </h2>
        {rewards.length > 0 ? (
          <div className="divide-y divide-[#222631]">
            {rewards.map((r) => {
              const isCredit = r.reward_delta >= 0 && r.coin_delta >= 0;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3.5 first:pt-4 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-8 place-items-center rounded-lg border font-mono text-xs font-semibold ${
                        isCredit
                          ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]"
                          : "border-[#2E3442] bg-[#171A21] text-[#C8CDD8]"
                      }`}
                    >
                      {isCredit ? "CR" : "OUT"}
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-[#F4F5F8]">
                        {r.note ||
                          (r.type === "reward"
                            ? "Session Pool Prize"
                            : r.type === "referral_bonus"
                              ? "Referral Credit"
                              : "Daily Streak Credit")}
                      </p>
                      <p className="font-mono text-[11px] text-[#8A92A6] tabular-nums">
                        {new Date(r.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    {r.reward_delta !== 0 ? (
                      <p className={`text-xs sm:text-sm font-semibold ${r.reward_delta > 0 ? "text-[#10B981]" : "text-[#C8CDD8]"}`}>
                        {r.reward_delta > 0 ? "+" : ""}
                        {formatNaira(r.reward_delta)}
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm font-semibold text-[#F7911B]">
                        +{r.coin_delta} GW
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No settlements recorded"
            description="Rank in the top entries of a live session pool to earn Naira payouts."
          />
        )}
      </section>

      {showWithdraw && user && (
        <WithdrawalModal
          userId={user.id}
          maxAmount={wallet?.withdrawable_balance ?? 0}
          onClose={() => setShowWithdraw(false)}
          onSuccess={loadRewards}
        />
      )}
    </div>
  );
}
