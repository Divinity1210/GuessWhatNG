import Image from "next/image";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import {
  PlayIcon,
  TrophyIcon,
  TargetIcon,
  ZapIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

const steps = [
  {
    num: "01",
    title: "Play for Free",
    desc: "Join the active 3-day game session at zero cost. No coin purchase required.",
    img: "/human-thinking.png",
    tag: "Free Entry",
  },
  {
    num: "02",
    title: "Guess What Others Select",
    desc: "Answer 10 questions across Text, Numbers, Colours, and Images. Predict what the majority will choose.",
    img: "/hero-portrait.png",
    tag: "10 Questions",
  },
  {
    num: "03",
    title: "Top 36 Win Cash",
    desc: "Points are dynamic (10 pts for most selected down to 1 pt). Speed breaks ties. Top 36 scorers share ₦500,000.",
    img: "/human-group-winner.png",
    tag: "₦500,000 Pool",
  },
];

const prizeHighlights = [
  { place: "1st Place", prize: "₦100,000" },
  { place: "2nd Place", prize: "₦50,000" },
  { place: "3rd Place", prize: "₦20,000" },
  { place: "4th – 36th Place", prize: "₦10,000 each" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0c0d12] text-white overflow-x-hidden font-sans">
      {/* ── Clean Top Navigation ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0c0d12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Logo size="xs" />
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              How to Play
            </a>
            <a
              href="#prizes"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Prizes
            </a>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-gray-300 hover:text-[#F7911B] transition-colors"
            >
              Leaderboard
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              href="/login"
              className="text-gray-200 hover:text-white hover:bg-white/5"
            >
              Log In
            </Button>
            <Button
              size="sm"
              href="/sign-up"
              className="bg-gradient-to-r from-[#F7911B] to-[#FF0400] text-white font-bold hover:brightness-110"
            >
              Play Free
            </Button>
          </div>
        </div>
      </header>

      {/* ── Clean Hero Section ── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-24">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[520px] rounded-full bg-[#F7911B]/10 blur-[140px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Free to Play · 3-Day Live Session · ₦500,000 Prize Pool</span>
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.1]">
            Think &amp;{" "}
            <span className="bg-gradient-to-r from-[#F7911B] to-[#FF0400] bg-clip-text text-transparent">
              Win.
            </span>
          </h1>

          <p className="mt-5 text-base text-gray-300 sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Guess what other players will select across 10 simple questions.
            No trivia facts needed — the crowd decides the winning answers.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlayIcon className="size-5 fill-white" />
              <span>PLAY NOW — FREE</span>
            </Link>
            <Link
              href="/leaderboard"
              className="w-full sm:w-auto rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              View Live Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Clean Cards) ── */}
      <section id="how-it-works" className="py-16 md:py-24 border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
              How to Play
            </span>
            <h2 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">
              Simple Rules. Real Rewards.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="rounded-3xl border border-white/10 bg-[#141720] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-white/10">
                    <Image
                      src={step.img}
                      alt={step.title}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-3 left-3 grid size-9 place-items-center rounded-xl bg-[#F7911B] text-xs font-black text-black font-display">
                      {step.num}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-[#F7911B]">
                      {step.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scoring & Prize Pool Overview (Pages 18 & 20) ── */}
      <section id="prizes" className="py-16 md:py-24 border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
                Dynamic Crowd Scoring
              </span>
              <h2 className="font-display text-3xl font-black text-white sm:text-4xl leading-tight">
                Points change live as more players guess.
              </h2>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Every question has 10 options. The most selected option earns{" "}
                <strong className="text-white">10 points</strong>, the second most selected earns{" "}
                <strong className="text-white">9 points</strong>, down to{" "}
                <strong className="text-white">1 point</strong> for the least selected.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 flex items-start gap-3">
                  <TargetIcon className="size-5 text-[#F7911B] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display font-bold text-white text-sm">10 – 1 Points</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Ranked by crowd popularity on each question
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 flex items-start gap-3">
                  <ZapIcon className="size-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display font-bold text-white text-sm">Time Tiebreaker</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Faster total completion time ranks higher on ties
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 36 Winners Card */}
            <div className="rounded-3xl border border-white/10 bg-[#141720] p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F7911B]">
                    Session Prize Pool
                  </span>
                  <h3 className="font-display text-2xl font-black text-white mt-0.5">
                    36 Winners Share ₦500,000
                  </h3>
                </div>
                <div className="size-11 rounded-2xl bg-[#F7911B]/15 border border-[#F7911B]/30 grid place-items-center text-[#F7911B]">
                  <TrophyIcon className="size-6" />
                </div>
              </div>

              <div className="space-y-2.5">
                {prizeHighlights.map((item, idx) => (
                  <div
                    key={item.place}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-gray-200">{item.place}</span>
                    <span
                      className={`font-display text-sm font-black ${
                        idx === 0 ? "text-[#F7911B]" : "text-emerald-400"
                      }`}
                    >
                      {item.prize}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400">
                Winnings are paid directly to the bank account saved in your player profile when the 3-day session concludes. You can replay anytime to improve your score.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Clean Final CTA ── */}
      <section className="py-16 md:py-24 border-t border-white/10">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-3xl border border-[#F7911B]/30 bg-gradient-to-r from-[#F7911B]/15 via-[#FF0400]/10 to-[#F7911B]/15 p-8 md:p-12 text-center">
            <h2 className="font-display text-2xl font-black text-white sm:text-4xl">
              Ready to test your intuition?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-300 max-w-lg mx-auto">
              Create your free account in seconds and jump straight into the live session.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-4 text-sm font-black text-white shadow-lg"
              >
                <span>Create Free Account</span>
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-black py-10">
        <div className="mx-auto max-w-5xl px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-400">
            <Link href="/how-to-play" className="hover:text-white transition-colors">
              How to Play
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/support" className="hover:text-white transition-colors">
              Support
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Log In
            </Link>
          </div>
          <p className="text-xs text-gray-500">© 2026 GuessWhat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
