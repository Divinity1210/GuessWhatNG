import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import type { Metadata } from "next";
import {
  PlayIcon,
  HelpCircleIcon,
  TrendingUpIcon,
  ZapIcon,
  TrophyIcon,
  CoinsIcon,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "See how GuessWhat works: predict what the crowd picks across 10 questions, climb the live standings, and win cash prizes.",
};

const rules = [
  {
    Icon: PlayIcon,
    title: "1. Free Entry into the Live Session",
    body: "Every game session runs for 3 days (72 hours) with free entry. Tap Play to start your round.",
  },
  {
    Icon: HelpCircleIcon,
    title: "2. 10 Questions, 4 Formats",
    body: "Answer 10 questions across Text, Numbers (0 to 9), Colours, and Images. There are no textbook facts here; your goal is to predict what most players will pick.",
  },
  {
    Icon: TrendingUpIcon,
    title: "3. Dynamic Crowd Points (10 to 1)",
    body: "The most popular option earns 10 points, second earns 9 points, down to 1 point for the 10th option. Scores adjust live as more players submit rounds.",
  },
  {
    Icon: ZapIcon,
    title: "4. Completion Time Breaks Ties",
    body: "Your session clock counts up from 0:00 across all 10 questions. When two players finish on equal points, the faster total time takes the higher rank.",
  },
  {
    Icon: TrophyIcon,
    title: "5. Replay to Climb Higher",
    body: "Track your position on the live Leaderboard anytime. Outside the top 36? Replay while the session is open to beat your score.",
  },
  {
    Icon: CoinsIcon,
    title: "6. Top 36 Share ₦500,000",
    body: "When the 3-day session closes, 1st wins ₦100,000, 2nd wins ₦50,000, 3rd wins ₦20,000, and 4th to 36th win ₦10,000 each, paid straight to the bank account in your Profile.",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="min-h-dvh bg-[#0c0d12] text-white flex flex-col">
      <header className="border-b border-white/[0.08] bg-[#0c0d12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo size="xs" />
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/play"
              className="inline-flex min-h-10 items-center rounded-xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-4 py-2 text-xs font-bold text-white"
            >
              Play Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 py-10 sm:py-16 space-y-10 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-block rounded-full bg-[#F7911B]/15 border border-[#F7911B]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F7911B]">
            Game Guide
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-white">
            How to Play GuessWhat
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Skip trivia memorisation. Read the crowd across 10 quick questions and finish fast.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <div
              key={rule.title}
              className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#141720] p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#F7911B]/15 text-[#F7911B]">
                  <rule.Icon className="size-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-white">
                  {rule.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#141720] p-6 sm:p-8 text-center space-y-4">
          <h3 className="font-display text-2xl font-black text-white">
            Ready to lock in your picks?
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Add your payout bank details in Profile so cash prizes reach you without delay when the session closes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href="/play"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-3.5 text-sm font-bold text-white shadow-lg"
            >
              Play Now
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              View Live Standings
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
