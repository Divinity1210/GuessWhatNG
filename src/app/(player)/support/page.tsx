"use client";

import { Button, Badge } from "@/components/ui";
import { useState } from "react";
import {
  PlayIcon,
  CoinsIcon,
  TargetIcon,
  ZapIcon,
  HelpCircleIcon,
} from "@/components/ui/Icons";

const faqs = [
  { q: "How do I play?", a: "Join a session, answer questions by predicting what most players will choose, and earn points for matching the crowd consensus." },
  { q: "How do I earn coins?", a: "Buy coins directly, earn them through daily challenges, referrals, or win them in sessions." },
  { q: "How do I withdraw?", a: "Go to Wallet → Withdraw. You can withdraw to your bank account or mobile wallet. Minimum withdrawal is ₦1,000." },
  { q: "What happens if I disconnect?", a: "Your progress is saved automatically. You can resume the session from where you left off." },
  { q: "How are winners determined?", a: "Players who match the majority answer score points. Higher accuracy and faster response times earn more." },
];

const helpCategories = [
  { Icon: PlayIcon, title: "Gameplay", desc: "Rules, scoring, sessions" },
  { Icon: CoinsIcon, title: "Payments", desc: "Coins, withdrawals, billing" },
  { Icon: TargetIcon, title: "Account", desc: "Profile, security, settings" },
  { Icon: ZapIcon, title: "Technical", desc: "Bugs, performance, errors" },
];

const tickets = [
  { id: "TK-001", subject: "Withdrawal not received", status: "open", date: "Jul 22" },
  { id: "TK-002", subject: "Session froze during question 5", status: "resolved", date: "Jul 18" },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredFaqs = searchQuery
    ? faqs.filter((f) => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqs;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Support</h1>
        <p className="mt-1 text-sm text-ink-muted">Get help with your account, gameplay, and more</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search FAQ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-rule bg-paper-2 px-5 py-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {/* Quick help categories */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {helpCategories.map((cat) => (
          <button key={cat.title} className="rounded-card border border-rule bg-paper-2 p-5 text-left transition-all duration-200 hover:border-rule-2 hover:shadow-soft">
            <div className="size-10 grid place-items-center rounded-xl bg-[#F7911B]/10 text-[#F7911B]">
              <cat.Icon className="size-5" />
            </div>
            <h3 className="mt-3 font-display font-semibold text-ink">{cat.title}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{cat.desc}</p>
          </button>
        ))}
      </div>

      {/* FAQ */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule px-5 py-4 flex items-center gap-2">
          <HelpCircleIcon className="size-5 text-[#F7911B]" />
          <h2 className="font-display text-lg font-bold">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-rule/50">
          {filteredFaqs.map((f, i) => (
            <details key={i} className="group px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-ink list-none">
                {f.q}
                <span className="text-ink-muted transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-card border border-rule bg-paper-2 p-6">
          <h2 className="font-display font-semibold">Live Chat Support</h2>
          <p className="mt-1 text-sm text-ink-3">Chat with our support team in real-time</p>
          <Button className="mt-4" size="sm">Start Chat</Button>
        </section>
        <section className="rounded-card border border-rule bg-paper-2 p-6">
          <h2 className="font-display font-semibold">Submit Ticket</h2>
          <p className="mt-1 text-sm text-ink-3">Create a support ticket and we&apos;ll respond via email</p>
          <Button variant="secondary" className="mt-4" size="sm">New Ticket</Button>
        </section>
      </div>

      {/* My tickets */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule px-5 py-4">
          <h2 className="font-display text-lg font-bold">My Tickets</h2>
        </div>
        <div className="divide-y divide-rule/50">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink">{t.subject}</p>
                <p className="text-xs text-ink-muted">{t.id} · {t.date}</p>
              </div>
              <Badge variant={t.status === "open" ? "warning" : "success"} dot>
                {t.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
