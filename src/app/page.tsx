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
    title: "Enter Free",
    desc: "Join the live 3-day session at zero cost. No entry fee or coin purchase needed.",
    img: "/human-thinking.png",
    tag: "Free Entry",
  },
  {
    num: "02",
    title: "Read the Crowd",
    desc: "Answer 10 fast questions across Text, Numbers, Colours, and Images. Pick what you think most players will choose.",
    img: "/hero-portrait.png",
    tag: "10 Questions",
  },
  {
    num: "03",
    title: "Top 36 Win Cash",
    desc: "Options score from 10 pts down to 1 pt by popularity. Faster completion breaks ties. Top 36 share ₦500,000.",
    img: "/human-group-winner.png",
    tag: "₦500,000 Pool",
  },
];

const prizeHighlights = [
  { place: "1st Place", prize: "₦100,000" },
  { place: "2nd Place", prize: "₦50,000" },
  { place: "3rd Place", prize: "₦20,000" },
  { place: "4th to 36th Place", prize: "₦10,000 each" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0c0d12] text-white overflow-x-hidden font-sans">
      {/* Top Navigation */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0c0d12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo size="xs" />
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              How to Play
            </a>
            <a
              href="#prizes"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Prizes
            </a>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-slate-300 hover:text-[#F7911B] transition-colors"
            >
              Leaderboard
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              href="/login"
              className="px-3 text-slate-200 hover:text-white hover:bg-white/5"
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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-26 pb-14 sm:pt-34 sm:pb-22">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[420px] sm:size-[520px] rounded-full bg-[#F7911B]/10 blur-[130px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Free Entry · ₦500,000 Session Pool</span>
          </div>

          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.08]">
            Predict the Crowd.{" "}
            <span className="bg-gradient-to-r from-[#F7911B] to-[#FF0400] bg-clip-text text-transparent">
              Win Real Cash.
            </span>
          </h1>

          <p className="mt-4 text-base text-slate-300 sm:text-lg max-w-xl mx-auto leading-relaxed">
            Pick what most players will choose across 10 quick questions. Skip
            textbook trivia. In GuessWhat, the majority sets the winning answer.
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/sign-up"
              className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-transform active:scale-[0.99] sm:hover:scale-[1.01]"
            >
              <PlayIcon className="size-5 fill-white" />
              <span>Play Free Now</span>
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-base font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              Live Standings
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-14 md:py-22 border-t border-white/[0.08] bg-black/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
              How It Works
            </span>
            <h2 className="mt-2 font-display text-2xl font-black text-white sm:text-4xl">
              Simple Rules. Real Payouts.
            </h2>
          </div>

          <div className="mt-9 sm:mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#141720] p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 sm:h-48 w-full rounded-xl sm:rounded-2xl overflow-hidden border border-white/10">
                    <Image
                      src={step.img}
                      alt={step.title}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-3 left-3 grid size-8 place-items-center rounded-lg bg-[#F7911B] text-xs font-black text-black font-display">
                      {step.num}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-[#F7911B]">
                      {step.tag}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-lg sm:text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring & Prize Pool Overview */}
      <section id="prizes" className="py-14 md:py-22 border-t border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
                Live Crowd Scoring
              </span>
              <h2 className="font-display text-2xl font-black text-white sm:text-4xl leading-tight">
                Points shift live as more players lock in their picks.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Every question gives you 10 choices. The top crowd pick earns{" "}
                <strong className="text-white">10 points</strong>, second earns{" "}
                <strong className="text-white">9 points</strong>, down to{" "}
                <strong className="text-white">1 point</strong> for the least chosen option.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 flex items-start gap-3">
                  <TargetIcon className="size-5 text-[#F7911B] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display font-bold text-white text-sm">10 to 1 Points</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Ranked by live crowd popularity on every question
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141720] p-4 flex items-start gap-3">
                  <ZapIcon className="size-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display font-bold text-white text-sm">Speed Tiebreaker</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Faster total completion time wins when points are tied
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 36 Winners Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#141720] p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F7911B]">
                    Session Prize Pool
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-white mt-0.5">
                    36 Winners Share ₦500,000
                  </h3>
                </div>
                <div className="size-11 shrink-0 rounded-2xl bg-[#F7911B]/15 border border-[#F7911B]/30 grid place-items-center text-[#F7911B]">
                  <TrophyIcon className="size-5" />
                </div>
              </div>

              <div className="space-y-2">
                {prizeHighlights.map((item, idx) => (
                  <div
                    key={item.place}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-200">{item.place}</span>
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

              <p className="text-xs leading-relaxed text-slate-400">
                Payouts go straight to the bank account saved in your profile once the 3-day session closes. Replay anytime before closing to beat your best score.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 md:py-22 border-t border-white/[0.08]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl sm:rounded-3xl border border-[#F7911B]/25 bg-gradient-to-r from-[#F7911B]/12 via-[#FF0400]/8 to-[#F7911B]/12 p-6 sm:p-10 text-center">
            <h2 className="font-display text-2xl font-black text-white sm:text-4xl">
              Jump into the current session
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-300 max-w-lg mx-auto">
              Create your free account in under a minute and lock in your 10 picks.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-3.5 text-sm font-bold text-white shadow-lg"
              >
                <span>Create Free Account</span>
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-black py-8 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size="xs" />
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400">
            <Link href="/how-to-play" className="hover:text-white transition-colors">
              How to Play
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="hover:text-white transition-colors">
              Support
            </Link>
          </div>
          <p className="text-xs text-slate-500">© 2026 GuessWhat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
