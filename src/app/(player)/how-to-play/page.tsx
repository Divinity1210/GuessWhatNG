import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BarChartIcon,
  CheckIcon,
  ChevronRightIcon,
  InboxIcon,
  LockIcon,
  MessageSquareIcon,
  PlayIcon,
  ShareIcon,
  ShieldCheckIcon,
  TimerIcon,
  TrendingUpIcon,
  TrophyIcon,
  UsersIcon,
  ZapIcon,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Learn every GuessWhat rule: 10 to 1 crowd scoring, stopwatch tiebreakers, best-score replay safety, 4 question formats, prize payouts, and Community Arena features.",
};

const anchorLinks = [
  { href: "#quick-start", label: "Quick Start" },
  { href: "#scoring", label: "10 to 1 Scoring" },
  { href: "#formats", label: "4 Question Types" },
  { href: "#prizes", label: "Prizes & Payouts" },
  { href: "#arena", label: "Results & Community" },
  { href: "#faq", label: "FAQ" },
];

const gameLoop = [
  {
    step: "1",
    title: "Join the Live Session Free",
    body: "Open Play anytime during the active countdown at zero entry cost. Each session features 10 curated questions with 10 options per question.",
  },
  {
    step: "2",
    title: "Predict What the Crowd Picks",
    body: "Skip textbook facts. On every question, tap the option you believe most other players in the session will choose, as fast as you can.",
  },
  {
    step: "3",
    title: "Climb Live and Replay Free",
    body: "Your round scores immediately on the Live Leaderboard. Because replays are unlimited and free, you can try again to improve your score before closing.",
  },
  {
    step: "4",
    title: "Votes Unlock at 00:00",
    body: "When the session timer hits zero, full vote shares unlock for every question and Top 36 winners share the cash prize pool.",
  },
];

const sampleCrowdRows = [
  { rank: "#1", label: "Jollof Rice", share: "34%", widthPct: 100, pts: "10 pts", highlight: "top" as const },
  { rank: "#2", label: "Fried Rice & Chicken", share: "21%", widthPct: 62, pts: "9 pts", highlight: "mid" as const },
  { rank: "#3", label: "Amala & Ewedu", share: "15%", widthPct: 44, pts: "8 pts", highlight: "mid" as const },
  { rank: "#4", label: "Egusi & Pounded Yam", share: "11%", widthPct: 32, pts: "7 pts", highlight: "mid" as const },
  { rank: "#5 to #9", label: "Middle crowd picks", share: "16% combined", widthPct: 20, pts: "6 to 2 pts", highlight: "muted" as const },
  { rank: "#10", label: "Least picked option", share: "3%", widthPct: 9, pts: "1 pt", highlight: "low" as const },
];

const prizeTiers = [
  { rank: "1st Place", winners: "1 winner", amount: "₦100,000", accent: true },
  { rank: "2nd Place", winners: "1 winner", amount: "₦50,000", accent: false },
  { rank: "3rd Place", winners: "1 winner", amount: "₦20,000", accent: false },
  { rank: "4th to 36th Place", winners: "33 winners", amount: "₦10,000 each", accent: false },
];

const colorSwatches = [
  { name: "Blue", hex: "#0018F9" },
  { name: "Red", hex: "#FF1100" },
  { name: "Gold", hex: "#FFE600" },
  { name: "Green", hex: "#05FF00" },
  { name: "Black", hex: "#12151f" },
];

const faqItems = [
  {
    q: "Is it really free to enter and replay a live session?",
    a: "Yes. Entering the active live session and replaying to beat your score costs ₦0. Unlimited replays stay open until the countdown timer reaches 00:00:00.",
  },
  {
    q: "Why does the Leaderboard say Provisional while the session is open?",
    a: "Crowd points are calculated dynamically from everyone's picks across the session. When new players finish rounds, the popularity order of options on a question can shift, which updates live ranks until closing.",
  },
  {
    q: "Will replaying hurt my rank if I score lower on my second try?",
    a: "Never. Your Leaderboard slot only keeps your highest scoring round (and your fastest total time achieved at that top score). A weaker replay attempt is archived automatically without lowering your rank.",
  },
  {
    q: "How does the speed stopwatch tiebreaker work?",
    a: "Your stopwatch measures total answering time from the moment each question appears until all 10 picks are locked in. If two players finish tied on the same point total (for example, 86 pts), the faster total clock ranks higher.",
  },
  {
    q: "Why are question vote percentages hidden until 00:00?",
    a: "Keeping exact option percentages and pick counts sealed during the live window ensures fair play so later entrants cannot copy top-ranked answers before the session ends.",
  },
  {
    q: "How do cash payouts reach Top 36 winners?",
    a: "Open your Profile page and save a valid Nigerian bank account (Bank Name, 10-digit Account Number, and Account Name). Once a session closes and standings finalize, payouts are verified and sent to winning accounts, with updates delivered to your Inbox.",
  },
  {
    q: "Where can I inspect full question-by-question results from earlier sessions?",
    a: "Tap Results in the top bar (or Session Results in the sidebar menu) anytime to switch between closed sessions and inspect Votes (10 to 1 crowd shares), Winners, and My Picks.",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in">
      {/* Header + Jump Navigation */}
      <header className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#131929] to-[#0c101b] p-5 sm:p-8 space-y-5 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F7911B]/30 bg-[#F7911B]/12 px-3 py-1 text-xs font-semibold text-[#F7911B]">
            <span>Official Player Handbook</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            How GuessWhat Works
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[65ch]">
            Think like the majority, lock in your 10 picks fast, and climb into the Top 36 cash prize spots. Everything you need to know lives on this page so your play screen stays clean.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <Link
            href="/play"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all"
          >
            <PlayIcon className="size-4 fill-current" />
            <span>Play Free Now</span>
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <TrophyIcon className="size-4 text-amber-400" />
            <span>View Live Leaderboard</span>
          </Link>
        </div>

        <nav
          aria-label="Guide sections"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-white/[0.07]"
        >
          {anchorLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent/40 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Section 1: Quick Start Loop */}
      <section id="quick-start" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            The 4-Step Game Loop
          </h2>
          <p className="text-sm text-slate-400 max-w-[65ch]">
            Every active session follows the same four stages from entry to payout.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {gameLoop.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-lg bg-[#F7911B]/15 border border-[#F7911B]/30 font-display text-sm font-bold text-[#F7911B]">
                  {item.step}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-white leading-snug">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2: 10 to 1 Scoring & Tiebreakers */}
      <section id="scoring" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            10 to 1 Crowd Scoring &amp; Speed Tiebreakers
          </h2>
          <p className="text-sm text-slate-400 max-w-[65ch]">
            No answer is marked right or wrong beforehand. Points come strictly from how many players picked each option across the session (maximum 100 points across 10 questions).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Visual Sample Question Breakdown */}
          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div>
                <p className="text-xs font-semibold text-emerald-400">
                  Example Crowd Ranking
                </p>
                <p className="font-display text-base font-bold text-white mt-0.5">
                  &ldquo;Which Sunday meal will most players choose?&rdquo;
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                <LockIcon className="size-3 text-amber-400" />
                <span>Shares revealed at 00:00</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {sampleCrowdRows.map((row) => {
                const barClass =
                  row.highlight === "top"
                    ? "bg-emerald-400"
                    : row.highlight === "low"
                    ? "bg-rose-400"
                    : row.highlight === "muted"
                    ? "bg-slate-600"
                    : "bg-amber-400";
                const badgeClass =
                  row.highlight === "top"
                    ? "bg-emerald-500/20 border-emerald-500/35 text-emerald-300"
                    : row.highlight === "low"
                    ? "bg-rose-500/20 border-rose-500/35 text-rose-300"
                    : "bg-amber-500/15 border-amber-500/30 text-amber-300";

                return (
                  <div key={row.rank} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-400 shrink-0 w-16">
                          {row.rank}
                        </span>
                        <span className="font-semibold text-white truncate">
                          {row.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-slate-400">{row.share}</span>
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${badgeClass}`}
                        >
                          {row.pts}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barClass}`}
                        style={{ width: `${row.widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3 Key Scoring Mechanics */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <TrendingUpIcon className="size-4.5" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Provisional Scores Shift Live
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Until the session closes, standings stay Provisional. As new rounds arrive, #2 can overtake #1 and swap between 9 pts and 10 pts for everyone.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
                <TimerIcon className="size-4.5" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Stopwatch Breaks All Point Ties
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Your clock records millisecond response time across all 10 questions. When players tie on points, faster total completion time always takes the higher rank.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
                <ShieldCheckIcon className="size-4.5" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Best-Score Replay Protection
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Replay for free anytime. Only your highest score (and fastest tiebreak time at that score) counts on the Leaderboard, so trying again carries zero risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: 4 Question Formats */}
      <section id="formats" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            4 Question Formats You Will See
          </h2>
          <p className="text-sm text-slate-400 max-w-[65ch]">
            Every round mixes text, visual, number, and colour prompts designed for fast one-handed tapping on mobile and 5x2 scanning on desktop.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Picture Questions */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Picture Questions
              </h3>
              <span className="rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                1:1 Square Grid
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick from 10 crisp 1:1 square photo cards (dishes, cars, football clubs, fruits, snacks). Displays 2 columns on phones and 5x2 on desktop.
            </p>
            <div className="grid grid-cols-5 gap-1.5 pt-1" aria-hidden="true">
              {["Jollof", "Suya", "Bole", "Ofada", "Abula"].map((label) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-[#151c2e] p-1.5 text-center"
                >
                  <div className="aspect-square rounded bg-gradient-to-br from-[#F7911B]/25 to-[#ec5812]/10 mb-1" />
                  <span className="block truncate text-[10px] font-semibold text-slate-300">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Text Questions */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Text &amp; Brand Questions
              </h3>
              <span className="rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                10 Word Tiles
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Large readable prompts paired with full-height thumb tiles across two rows (or five columns on desktop) so options stay in comfortable reach.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1" aria-hidden="true">
              {["Coca-Cola", "Maltina", "Pepsi", "Fanta"].map((brand) => (
                <div
                  key={brand}
                  className="rounded-lg border border-white/12 bg-[#192236] py-2 text-center text-xs font-bold text-slate-200"
                >
                  {brand}
                </div>
              ))}
            </div>
          </div>

          {/* Number Questions */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Number Picks (0 to 9)
              </h3>
              <span className="rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                5x2 Keypad
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Predict the crowd&apos;s favourite jersey number, lucky digit, or most picked number from 0 through 9 on an oversized tap pad.
            </p>
            <div className="grid grid-cols-5 gap-1.5 pt-1" aria-hidden="true">
              {["1", "2", "3", "7", "0"].map((num) => (
                <div
                  key={num}
                  className="rounded-lg border border-white/12 bg-[#192236] py-2 text-center font-display text-sm font-bold text-white"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Colour Questions */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Colour Swatches
              </h3>
              <span className="rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                10 Named Swatches
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose the colour swatch most players will tap first across 10 labelled circles, with sound and background music toggles right on the play bar.
            </p>
            <div className="flex items-center justify-between gap-2 pt-1" aria-hidden="true">
              {colorSwatches.map((swatch) => (
                <div key={swatch.name} className="flex flex-col items-center gap-1">
                  <span
                    className="size-7 rounded-full border-2 border-white/80"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="text-[10px] font-medium text-slate-300">
                    {swatch.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Prize Pool & Bank Payouts */}
      <section id="prizes" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0d111c] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                ₦500,000 Session Prize Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard payout table shared across the Top 36 finishers when a session closes.
              </p>
            </div>
            <Link
              href="/leaderboard?tab=prizes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              <span>Check active session tiers</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-black/25">
            {prizeTiers.map((tier) => (
              <div
                key={tier.rank}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-white">{tier.rank}</p>
                  <p className="text-xs text-slate-400">{tier.winners}</p>
                </div>
                <span
                  className={`font-display text-base font-bold tabular-nums ${
                    tier.accent ? "text-[#F7911B]" : "text-emerald-400"
                  }`}
                >
                  {tier.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0d111c] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ZapIcon className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Receiving Cash Payouts
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Save your Nigerian bank or fintech details once in your Profile so winnings clear smoothly after results finalize:
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              {[
                "Choose your Bank (GTBank, OPay, PalmPay, Kuda, Moniepoint, Access, Zenith, UBA, and more)",
                "Enter your 10-digit NUBAN Account Number",
                "Confirm the exact Account Name on the bank profile",
              ].map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <CheckIcon className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/35 bg-accent/15 px-4 py-2.5 text-xs font-bold text-accent hover:bg-accent/25 transition-colors"
          >
            <span>Add Bank Details in Profile</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* Section 5: Everything Else in GuessWhat */}
      <section id="arena" className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Results, Community &amp; Rewards Tools
          </h2>
          <p className="text-sm text-slate-400 max-w-[65ch]">
            Track closed votes, debate picks with your state squad, and invite friends from anywhere in the app.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Link
            href="/leaderboard"
            className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 hover:border-white/25 transition-colors flex items-start gap-3.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
              <BarChartIcon className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Live Leaderboard &amp; Session Results
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Search players, compare closed sessions, and tap Results in the header anytime to review Crowd Votes, Winners, and your personal Scorecard.
              </p>
            </div>
          </Link>

          <Link
            href="/community"
            className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 hover:border-white/25 transition-colors flex items-start gap-3.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <MessageSquareIcon className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Community Arena &amp; State Polls
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Rep your state in Live Chat with rank badges, react to messages, and vote on city rivalry polls and topics.
              </p>
            </div>
          </Link>

          <Link
            href="/referrals"
            className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 hover:border-white/25 transition-colors flex items-start gap-3.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
              <ShareIcon className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Referrals &amp; Cash Leaderboard
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Share your code or WhatsApp link. Friends who join and play at least 1 round count toward active Referral Leaderboard cash prizes.
              </p>
            </div>
          </Link>

          <Link
            href="/support"
            className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 hover:border-white/25 transition-colors flex items-start gap-3.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-slate-200">
              <InboxIcon className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Inbox Alerts &amp; Player Support
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Watch the Inbox bell for winner and payout alerts, and reach Support directly if you ever need help with an account or prize question.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Section 6: Accessible FAQ Accordion */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="gw-faq rounded-2xl border border-white/10 bg-[#0d111c] p-5 sm:p-6 space-y-3"
      >
        <div className="space-y-1 pb-1">
          <h2 id="faq-heading" className="font-display text-xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">
            Select any question below to inspect the exact rule.
          </p>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {faqItems.map((item, idx) => (
            <details
              key={item.q}
              open={idx === 0}
              className="group py-3 first:pt-1 last:pb-1"
            >
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center gap-2.5 rounded-lg py-1 text-sm font-semibold text-white hover:text-[#F7911B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb95b] transition-colors">
                <ChevronRightIcon className="size-4 shrink-0 text-[#F7911B] transition-transform duration-200 group-open:rotate-90" />
                <span>{item.q}</span>
              </summary>
              <p className="mt-2 pl-6.5 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[70ch]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-2xl border border-[#F7911B]/25 bg-gradient-to-r from-[#F7911B]/12 via-[#ec5812]/8 to-[#0d111c] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-white">
            Ready to predict what the crowd picks?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Free entry is open now across 10 fast questions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <Link
            href="/play"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all"
          >
            <PlayIcon className="size-4 fill-current" />
            <span>Play Free Now</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <UsersIcon className="size-4 text-slate-400" />
            <span>Back to Home</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
