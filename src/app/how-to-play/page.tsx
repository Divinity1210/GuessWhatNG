import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import type { Metadata } from "next";
import {
  CoinsIcon,
  HelpCircleIcon,
  TrendingUpIcon,
  ZapIcon,
  TrophyIcon,
  CoinsIcon as PayoutIcon,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Learn how GuessWhat works — predict what the crowd picks, climb the leaderboard, and win real prizes.",
};

const rules = [
  {
    Icon: CoinsIcon,
    title: "Buy coins, enter a session",
    body: "Each session costs coins to join. Top up with airtime or your wallet — sessions run every 72 hours.",
  },
  {
    Icon: HelpCircleIcon,
    title: "10 questions, no right answers",
    body: "Every question has multiple options, but none is 'correct'. The winning answer is whichever the majority picks.",
  },
  {
    Icon: TrendingUpIcon,
    title: "Score by matching the crowd",
    body: "Pick the option most players choose → 10 pts. Second most → 9 pts, and so on down to 1 for the least popular.",
  },
  {
    Icon: ZapIcon,
    title: "Speed breaks ties",
    body: "If you tie with another player, total response time across all 10 questions decides who ranks higher.",
  },
  {
    Icon: TrophyIcon,
    title: "Top scorers win the pot",
    body: "Prize pools are split among the top finishers. The higher you rank, the bigger your share.",
  },
  {
    Icon: PayoutIcon,
    title: "Instant payouts",
    body: "Winnings are credited to your wallet immediately when the session ends. Withdraw anytime.",
  },
];

export default function HowToPlayPage() {
  return (
    <>
      {/* ─── Floating pill nav ─── */}
      <nav
        className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
        aria-label="Primary"
      >
        <div
          className="flex items-center gap-1 rounded-full px-2 py-1.5 shadow-xl shadow-black/30"
          style={{
            background: "oklch(17% 0.014 60 / 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid oklch(28% 0.010 60 / 0.6)",
          }}
        >
          <div className="pl-2 pr-3">
            <Logo size="xs" />
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Link
              href="/how-to-play"
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: "var(--color-paper-3)", color: "var(--color-ink)" }}
            >
              How to play
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
            >
              Leaderboard
            </Link>
          </div>
          <div className="flex items-center gap-1.5 pl-1">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full px-4 py-2.5 text-sm font-bold shadow-lg transition-[transform,box-shadow] hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "var(--color-accent)",
                color: "oklch(16% 0.012 60)",
                boxShadow: "0 4px 20px -4px oklch(77% 0.17 70 / 0.35)",
              }}
            >
              Play now
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero banner */}
        <section
          className="relative overflow-hidden pt-32 pb-20 text-center"
          style={{
            background:
              "linear-gradient(135deg, #ff6a00 0%, #f7911b 40%, #ffb45c 100%)",
          }}
        >
          <div className="relative z-10 mx-auto max-w-3xl px-6">
            <h1 className="font-display text-5xl font-black text-white sm:text-6xl text-shadow-game">
              How to Play
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-white/85 leading-relaxed">
              No trivia knowledge needed. Just predict what the crowd will pick,
              answer fast, and climb to the top.
            </p>
          </div>
          {/* Wave */}
          <div className="absolute right-0 bottom-0 left-0" aria-hidden="true">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none" style={{ height: "clamp(60px, 8vw, 120px)" }}>
              <path d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,80 1440,60 L1440,120 L0,120 Z" fill="oklch(14% 0.012 60)" />
            </svg>
          </div>
        </section>

        {/* Rules grid */}
        <section className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <div
                key={rule.title}
                className="group relative flex flex-col rounded-3xl p-8 transition-transform duration-200 hover:-translate-y-1"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 8px 30px -8px rgba(0,0,0,0.25)",
                }}
              >
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl text-[#F7911B]" style={{ background: "oklch(77% 0.17 70 / 0.1)" }}>
                  <rule.Icon className="size-7" />
                </div>
                <h3 className="font-display text-xl font-bold">{rule.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed" style={{ color: "var(--color-ink-3)" }}>
                  {rule.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Visual example section */}
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="overflow-hidden rounded-3xl" style={{ background: "var(--color-sidebar)", border: "1px solid var(--color-border)" }}>
            <div className="grid items-center gap-0 md:grid-cols-2">
              <div className="relative h-64 md:h-full">
                <Image
                  src="/step2-crowd.png"
                  alt="Players connected in a game session"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-8 md:p-10">
                <h2 className="font-display text-2xl font-bold">
                  Read the room, not the book.
                </h2>
                <p className="mt-4 leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                  GuessWhat isn&apos;t about what&apos;s &ldquo;right&rdquo; — it&apos;s about
                  what&apos;s <strong className="text-[var(--color-accent)]">popular</strong>.
                  Think like the crowd, pick the most common answer, and outscore
                  everyone else doing the same thing.
                </p>
                <Link
                  href="/sign-up"
                  className="mt-8 inline-block rounded-full px-8 py-3.5 font-display font-bold transition-[transform,box-shadow] hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: "var(--color-accent)",
                    color: "oklch(16% 0.012 60)",
                    boxShadow: "0 4px 20px -4px oklch(77% 0.17 70 / 0.35)",
                  }}
                >
                  Try it now
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 pb-8 pt-16">
        <div className="mx-auto max-w-5xl">
          <div
            className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderTop: "1px solid var(--color-rule)" }}
          >
            <Logo />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              <Link href="/how-to-play" className="hover:text-[var(--color-ink-2)] transition-colors">How to play</Link>
              <Link href="/leaderboard" className="hover:text-[var(--color-ink-2)] transition-colors">Leaderboard</Link>
              <Link href="/support" className="hover:text-[var(--color-ink-2)] transition-colors">Support</Link>
            </div>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              © {new Date().getFullYear()} GuessWhat
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
