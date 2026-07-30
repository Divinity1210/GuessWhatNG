"use client";

import { useEffect, useState } from "react";
import { StatCard, Button, Badge, TabGroup } from "@/components/ui";
import { CoinsIcon, GiftIcon, TimerIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUserWallet, getWalletTransactions, type WalletRow, type WalletTxnRow } from "@/lib/supabase/queries";

const TXN_LABELS: Record<string, string> = {
  subscription_grant: "Coin Purchase",
  session_entry: "Session Entry",
  reward: "Prize Reward",
  referral_bonus: "Referral Bonus",
  promo: "Promo Bonus",
  withdrawal: "Withdrawal",
  adjustment: "Adjustment",
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

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [w, txns] = await Promise.all([
          getUserWallet(user!.id),
          getWalletTransactions(user!.id, 50),
        ]);
        setWallet(w);
        setTransactions(txns);
      } catch (err) {
        console.error("Wallet load error:", err);
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

  const filteredTxns = tab === "all"
    ? transactions
    : transactions.filter((t) => {
        if (tab === "credits") return t.coin_delta > 0 || t.reward_delta > 0;
        return t.coin_delta < 0 || t.reward_delta < 0;
      });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold">Wallet</h1>

      {/* ── Balance cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Coin Balance"
          value={wallet?.coin_balance.toLocaleString() ?? "0"}
          icon={<CoinsIcon className="size-5 text-[#F7911B]" />}
        />
        <StatCard
          label="Reward Balance"
          value={formatNaira(wallet?.reward_balance ?? 0)}
          icon={<GiftIcon className="size-5 text-accent" />}
        />
        <StatCard
          label="Withdrawable"
          value={formatNaira(wallet?.withdrawable_balance ?? 0)}
          icon={<div className="size-5 grid place-items-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">₦</div>}
        />
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button className="inline-flex items-center gap-2">
          <CoinsIcon className="size-4" />
          Buy Coins
        </Button>
        <Button variant="secondary" className="inline-flex items-center gap-2" disabled={(wallet?.withdrawable_balance ?? 0) <= 0}>
          Withdraw
        </Button>
      </div>

      {/* ── Transaction history ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Transaction History</h2>
          <TabGroup
            tabs={[
              { label: "All", value: "all" },
              { label: "Credits", value: "credits" },
              { label: "Debits", value: "debits" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {filteredTxns.length > 0 ? (
          <div className="mt-4 space-y-2">
            {filteredTxns.map((txn) => {
              const isCredit = txn.coin_delta > 0 || txn.reward_delta > 0;
              return (
                <div key={txn.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-rule/50 bg-paper-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`grid size-9 place-items-center rounded-full text-xs font-bold ${
                      isCredit ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                    }`}>
                      {isCredit ? "+" : "−"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{TXN_LABELS[txn.type] ?? txn.type}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(txn.created_at).toLocaleDateString("en-NG", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {txn.coin_delta !== 0 && (
                      <p className={`text-sm font-semibold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {isCredit ? "+" : ""}{txn.coin_delta.toLocaleString()} coins
                      </p>
                    )}
                    {txn.reward_delta !== 0 && (
                      <p className={`text-xs ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {isCredit ? "+" : ""}{formatNaira(txn.reward_delta)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-ink-muted">No transactions yet.</p>
        )}
      </section>
    </div>
  );
}
