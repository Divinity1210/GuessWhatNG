"use client";

import { StatCard, Button, Badge, TabGroup } from "@/components/ui";
import { useState } from "react";
import { CoinsIcon, GiftIcon, TimerIcon } from "@/components/ui/Icons";

const txFilters = [
  { label: "All", value: "all" },
  { label: "Credits", value: "credit" },
  { label: "Debits", value: "debit" },
  { label: "Withdrawals", value: "withdrawal" },
];

const walletStats = [
  { label: "Coin Balance", value: "3,250", Icon: CoinsIcon },
  { label: "Reward Balance", value: "₦12,500", Icon: GiftIcon },
  { label: "Withdrawable", value: "₦8,000", Icon: CoinsIcon },
  { label: "Pending Rewards", value: "₦4,500", Icon: TimerIcon },
];

const transactions = [
  { id: "1", type: "credit", desc: "Session win — Sunday Showdown", amount: "+₦25,000", date: "Today, 2:30 PM", status: "completed" },
  { id: "2", type: "debit", desc: "Session entry — Quick Fire Round", amount: "-50 coins", date: "Today, 11:00 AM", status: "completed" },
  { id: "3", type: "credit", desc: "Referral bonus — @ChiChi_Win", amount: "+100 coins", date: "Yesterday", status: "completed" },
  { id: "4", type: "withdrawal", desc: "Withdrawal to GTBank ****4521", amount: "-₦15,000", date: "Jul 20", status: "completed" },
  { id: "5", type: "credit", desc: "Daily challenge reward", amount: "+50 coins", date: "Jul 20", status: "completed" },
  { id: "6", type: "debit", desc: "Session entry — Friday Frenzy", amount: "-150 coins", date: "Jul 19", status: "completed" },
  { id: "7", type: "withdrawal", desc: "Withdrawal to OPay ****8923", amount: "-₦8,000", date: "Jul 18", status: "pending" },
];

const typeColors: Record<string, string> = {
  credit: "text-success",
  debit: "text-danger",
  withdrawal: "text-warning",
};

export default function WalletPage() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Wallet</h1>
          <p className="mt-1 text-sm text-ink-muted">Manage your coins, rewards, and withdrawals</p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" className="inline-flex items-center gap-1.5">
            <CoinsIcon className="size-4 text-white" />
            <span>Buy Coins</span>
          </Button>
          <Button variant="secondary" size="sm">
            Withdraw
          </Button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {walletStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={<s.Icon className="size-5 text-[#F7911B]" />} />
        ))}
      </div>

      {/* ── Transaction history ── */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="flex flex-col gap-4 border-b border-rule p-5 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-lg font-bold">Transaction History</h2>
          <TabGroup tabs={txFilters} defaultValue="all" onChange={setFilter} />
        </div>
        <div className="divide-y divide-rule/50">
          {filtered.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-boost">
              <div className={`grid size-9 place-items-center rounded-full text-sm font-bold ${
                tx.type === "credit" ? "bg-success/15 text-success" :
                tx.type === "debit" ? "bg-danger/15 text-danger" :
                "bg-warning/15 text-warning"
              }`}>
                {tx.type === "credit" ? "↓" : tx.type === "debit" ? "↑" : "→"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-ink">{tx.desc}</p>
                <p className="text-xs text-ink-muted">{tx.date}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${typeColors[tx.type]}`}>{tx.amount}</p>
                <Badge variant={tx.status === "pending" ? "warning" : "neutral"} className="mt-0.5">
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
