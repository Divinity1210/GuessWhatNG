"use client";

import { useEffect, useState } from "react";
import { Button, Badge, StatCard, EmptyState } from "@/components/ui";
import { GiftIcon, CoinsIcon, TrophyIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUserWallet, getWalletTransactions, type WalletRow, type WalletTxnRow } from "@/lib/supabase/queries";

function formatNaira(n: number) { return `₦${n.toLocaleString()}`; }

export default function RewardsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [rewards, setRewards] = useState<WalletTxnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [w, txns] = await Promise.all([
          getUserWallet(user!.id),
          getWalletTransactions(user!.id, 50),
        ]);
        setWallet(w);
        // Filter to reward-type transactions only
        setRewards(txns.filter((t) => t.type === "reward" || t.type === "referral_bonus" || t.type === "promo"));
      } catch (err) {
        console.error("Rewards load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const totalRewards = rewards.reduce((sum, r) => sum + r.reward_delta, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold">Rewards</h1>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Earned"
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
          icon={<div className="size-5 grid place-items-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">₦</div>}
        />
      </div>

      {/* ── Withdrawal action ── */}
      <div>
        <Button disabled={(wallet?.withdrawable_balance ?? 0) <= 0}>
          {(wallet?.withdrawable_balance ?? 0) > 0
            ? `Withdraw ${formatNaira(wallet!.withdrawable_balance)}`
            : "Nothing to withdraw yet"
          }
        </Button>
      </div>

      {/* ── Reward history ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Reward History</h2>
        {rewards.length > 0 ? (
          <div className="mt-4 space-y-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-green-500/15 text-green-400 text-xs font-bold">
                    +
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {r.type === "reward" ? "Session Prize" : r.type === "referral_bonus" ? "Referral Bonus" : "Promo Bonus"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-400">+{formatNaira(r.reward_delta)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No rewards yet" description="Play sessions and win prizes to earn rewards!" />
        )}
      </section>
    </div>
  );
}
