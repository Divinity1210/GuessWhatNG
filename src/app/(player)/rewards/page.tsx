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
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const totalRewards = rewards
    .filter((r) => r.reward_delta > 0)
    .reduce((sum, r) => sum + r.reward_delta, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Cash Rewards &amp; Payouts</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Withdraw your session prizes directly to OPay, PalmPay, Moniepoint, Kuda or any Nigerian bank.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Cash Earned"
          value={formatNaira(totalRewards)}
          icon={<GiftIcon className="size-5 text-accent" />}
        />
        <StatCard
          label="Reward Balance"
          value={formatNaira(wallet?.reward_balance ?? 0)}
          icon={<TrophyIcon className="size-5 text-amber-400" />}
        />
        <StatCard
          label="Withdrawable"
          value={formatNaira(wallet?.withdrawable_balance ?? 0)}
          icon={
            <div className="size-5 grid place-items-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
              ₦
            </div>
          }
        />
      </div>

      {/* ── Withdrawal action ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowWithdraw(true)}>
          {(wallet?.withdrawable_balance ?? 0) > 0
            ? `Withdraw ${formatNaira(wallet!.withdrawable_balance)} to Bank / OPay`
            : "Request Bank / OPay Payout"}
        </Button>
        <Button variant="secondary" href="/play">
          Play Session to Win Cash
        </Button>
      </div>

      {/* ── Reward history ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Reward &amp; Bonus History</h2>
        {rewards.length > 0 ? (
          <div className="mt-4 space-y-2">
            {rewards.map((r) => {
              const isCredit = r.reward_delta >= 0 && r.coin_delta >= 0;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-9 place-items-center rounded-full text-xs font-bold ${
                        isCredit ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {isCredit ? "+" : "↗"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {r.note ||
                          (r.type === "reward"
                            ? "Session Cash Prize"
                            : r.type === "referral_bonus"
                              ? "Squad Referral Bonus"
                              : "Streak / Welcome Bonus")}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {new Date(r.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.reward_delta !== 0 ? (
                      <p className={`text-sm font-semibold ${r.reward_delta > 0 ? "text-green-400" : "text-amber-400"}`}>
                        {r.reward_delta > 0 ? "+" : ""}
                        {formatNaira(r.reward_delta)}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-[#F7911B]">
                        +{r.coin_delta} coins
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No rewards yet"
            description="Play sessions and win prizes to earn cash rewards!"
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
