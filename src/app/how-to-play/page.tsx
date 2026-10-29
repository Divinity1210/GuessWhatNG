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
  title: "How to Play — Guess What",
  description:
    "Learn how Guess What works — predict what the crowd selects across 10 questions, climb the live leaderboard, and win cash prizes.",
};

const rules = [
  {
    Icon: PlayIcon,
    title: "1. Free Entry into the Live Session",
    body: "Each game session runs for 3 days (72 hours) and is completely free to play. Click PLAY to enter fullscreen and begin.",
  },
  {
    Icon: HelpCircleIcon,
    title: "2. 10 Questions, 4 Formats",
    body: "Answer 10 questions across Text, Numbers (0–9), Colours, and Images. There are no textbook right or wrong answers — you are predicting what most players will select.",
  },
  {
    Icon: TrendingUpIcon,
    title: "3. Dynamic Crowd Points (10 to 1)",
    body: "The option selected by the most players earns 10 points, the 2nd most selected earns 9 points, down to 1 point for the 10th option. Points update dynamically as more players play.",
  },
  {
    Icon: ZapIcon,
    title: "4. Time Counts Up & Breaks Ties",
    body: "Your timer starts at 0:00 and counts up across all 10 questions. If two players have the same points, the player with the faster total time ranks higher.",
  },
  {
    Icon: TrophyIcon,
    title: "5. Play Again to Improve Your Rank",
    body: "Check your live standing on the Leaderboard at any time. Not in the top 36 yet? You can play again during the session to beat your score.",
  },
  {
    Icon: CoinsIcon,
    title: "6. Top 36 Scorers Share ₦500,000",
    body: "When the 3-day session ends, 1st wins ₦100,000, 2nd wins ₦50,000, 3rd wins ₦20,000, and 4th–36th win ₦10,000 each — paid directly to the bank account in your Profile.",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-[#0c0d12] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0c0d12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo size="xs" />
          <div className="flex items-center gap-3">
            <Link
              href="/leaderboard"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/play"
              className="rounded-xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-4 py-2 text-xs font-black text-white"
            >
              Play Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12 sm:py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-block rounded-full bg-[#F7911B]/15 border border-[#F7911B]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F7911B]">
            Think &amp; Win
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-white">
            How to Play Guess What
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            No trivia facts needed. Simply predict what most players will choose across 10 fast questions.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <div
              key={rule.title}
              className="rounded-3xl border border-white/10 bg-[#141720] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#F7911B]/15 text-[#F7911B]">
                  <rule.Icon className="size-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-white">
                  {rule.title}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-400">
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#141720] p-8 text-center space-y-4">
          <h3 className="font-display text-2xl font-black text-white">
            Ready to jump in?
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Make sure your bank details are saved in your Profile so your winnings can be sent directly when the session ends.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/play"
              className="rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-3.5 text-sm font-black text-white shadow-lg"
            >
              PLAY NOW
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-gray-200 hover:bg-white/10"
            >
              View Live Leaderboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
