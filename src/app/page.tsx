import Image from "next/image";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import {
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  TargetIcon,
  CoinsIcon,
  StarIcon,
  TimerIcon,
  ZapIcon,
  BrainIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

const steps = [
  {
    num: "01",
    title: "Join a Live Session",
    desc: "Pick an active 72-hour prediction session. Entry costs just a few coins.",
    img: "/human-thinking.png",
    tag: "Pick Your Session",
  },
  {
    num: "02",
    title: "Guess What the Crowd Picks",
    desc: "10 trivia-free questions. Predict the answer most players will pick to score high.",
    img: "/hero-portrait.png",
    tag: "Think & Predict",
  },
  {
    num: "03",
    title: "Win the Cash Prize Pool",
    desc: "Top scorers on the leaderboard split the cash pool. Speed breaks any ties!",
    img: "/human-group-winner.png",
    tag: "Claim Cash Winnings",
  },
];

const features = [
  {
    title: "Real Cash Prizes",
    desc: "Win real cash paid directly to your bank account or digital wallet.",
    Icon: CoinsIcon,
  },
  {
    title: "No Trivia Required",
    desc: "No general knowledge needed. You only need to read the room and predict human behavior.",
    Icon: BrainIcon,
  },
  {
    title: "72-Hour Live Sessions",
    desc: "Sessions run round the clock. Enter anytime and track your ranking live.",
    Icon: TimerIcon,
  },
  {
    title: "Tiebreaker Speed Thrill",
    desc: "Ties are broken by response speed. Fast thinkers take the biggest share of the pot.",
    Icon: ZapIcon,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg,#0a0a0c)] text-[var(--color-ink,#f3f3f5)] overflow-x-hidden font-sans">
      {/* ── Top Navigation ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[oklch(24%_0.015_60)] bg-[oklch(14%_0.015_60/0.85)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo size="xs" />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              How to Play
            </a>
            <a href="#live-demo" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Live Predictions
            </a>
            <a href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Why Play
            </a>
            <Link href="/leaderboard" className="text-sm font-medium text-gray-300 hover:text-[#F7911B] transition-colors">
              Leaderboard
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" href="/login" className="text-gray-200 hover:text-white hover:bg-white/5">
              Log In
            </Button>
            <Button
              size="sm"
              href="/sign-up"
              className="bg-gradient-to-r from-[#F7911B] to-[#FF0400] text-white font-bold hover:brightness-110 shadow-md shadow-orange-500/20"
            >
              Play Now
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-[#F7911B]/10 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 size-[400px] rounded-full bg-[#FF0400]/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          {/* Live indicator badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#F7911B]/30 bg-[#F7911B]/10 px-4 py-1.5 text-xs font-semibold text-[#F7911B] backdrop-blur-md">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="size-2 rounded-full bg-emerald-400 -ml-4.5" />
              <span>Live Session: Weekend Showdown · ₦250,000 Pot</span>
            </div>
          </div>

          {/* Hero Main Heading */}
          <div className="mt-8 text-center max-w-4xl mx-auto">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]">
              Think Like the <span className="bg-gradient-to-r from-[#F7911B] via-[#FF0400] to-[#F7911B] bg-clip-text text-transparent">Crowd.</span>
              <br />
              Win <span className="bg-gradient-to-r from-[#F7911B] to-[#FF0400] bg-clip-text text-transparent">Real Prizes.</span>
            </h1>

            <p className="mt-6 text-lg text-gray-300 sm:text-xl max-w-2xl mx-auto leading-relaxed">
              The social prediction game where you win by guessing what most players will pick.
              No trivia knowledge needed — just read the room.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-transform hover:scale-[1.03] active:scale-[0.98] text-center"
              >
                <PlayIcon className="size-5 fill-white" />
                <span>Start Playing Free — Get 100 Coins</span>
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-gray-200 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white text-center"
              >
                How It Works ↓
              </a>
            </div>

            {/* Social proof stats */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4.5 text-[#F7911B]" />
                <span><strong className="text-white font-bold">12,400+</strong> Active Players</span>
              </div>
              <div className="flex items-center gap-2">
                <TrophyIcon className="size-4.5 text-amber-400" />
                <span><strong className="text-white font-bold">₦48M+</strong> Paid to Winners</span>
              </div>
              <div className="flex items-center gap-2">
                <StarIcon className="size-4.5 text-yellow-400" />
                <span><strong className="text-white font-bold">4.9/5</strong> Player Rating</span>
              </div>
            </div>
          </div>

          {/* ── Brand Expression Human Imagery Showcase ── */}
          <div className="mt-16 grid gap-6 lg:grid-cols-12 items-center">
            {/* Left Card: Human Player Thinking / Crossing Fingers */}
            <div className="lg:col-span-4 relative group">
              <div className="relative overflow-hidden rounded-3xl border border-[#F7911B]/30 bg-gradient-to-b from-[#F7911B]/20 to-black/60 p-2 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:-translate-y-1">
                <div className="relative h-[340px] w-full rounded-2xl overflow-hidden">
                  <Image
                    src="/hero-portrait.png"
                    alt="Player predicting crowd answer with fingers crossed"
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Brand Thought Bubble overlay */}
                  <div className="absolute top-4 left-4 rounded-2xl bg-white/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-gray-900 shadow-xl flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#F7911B] animate-pulse" />
                    <span>Fingers crossed... Jollof Rice wins!</span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block rounded-full bg-[#F7911B] px-3 py-1 text-xs font-bold text-black uppercase tracking-wider">
                      Live Player
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-white">Adaora, Lagos</p>
                    <p className="text-xs text-gray-300">Streak: 5 Sessions Won</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Card: Interactive Live Question Market Preview */}
            <div className="lg:col-span-4 relative">
              <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[oklch(20%_0.02_60)] to-[oklch(12%_0.01_60)] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/10 pb-3">
                  <span className="font-semibold text-[#F7911B]">QUESTION 4 OF 10</span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                    <TimerIcon className="size-3.5" />
                    <span>18s Left</span>
                  </span>
                </div>

                <h3 className="mt-4 font-display text-xl font-bold text-white leading-snug">
                  Which Nigerian meal will be chosen by the majority?
                </h3>

                {/* Option Bars */}
                <div className="mt-5 space-y-3">
                  {[
                    { option: "Jollof Rice", pct: "64%", label: "Crowd Favorite", active: true },
                    { option: "Fried Rice & Chicken", pct: "22%", label: "2nd Most Picked", active: false },
                    { option: "Pounded Yam & Egusi", pct: "14%", label: "Contender", active: false },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`relative overflow-hidden rounded-xl border p-3.5 transition-all ${
                        item.active
                          ? "border-[#F7911B] bg-[#F7911B]/15"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F7911B]/30 to-[#FF0400]/30 transition-all duration-700"
                        style={{ width: item.pct }}
                      />
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-sm">{item.option}</p>
                          <p className="text-[11px] text-[#F7911B] font-medium">{item.label}</p>
                        </div>
                        <span className="font-display font-black text-lg text-white">{item.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span>4,218 players voting</span>
                  </div>
                  <span className="text-[#F7911B] font-semibold">Ties broken by speed</span>
                </div>
              </div>
            </div>

            {/* Right Card: Human Winner Celebrating */}
            <div className="lg:col-span-4 relative group">
              <div className="relative overflow-hidden rounded-3xl border border-[#FF0400]/30 bg-gradient-to-b from-[#FF0400]/20 to-black/60 p-2 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:-translate-y-1">
                <div className="relative h-[340px] w-full rounded-2xl overflow-hidden">
                  <Image
                    src="/hero-winner.png"
                    alt="Player celebrating big cash win"
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Winner Badge overlay */}
                  <div className="absolute top-4 right-4 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-4 py-2 text-xs font-black text-white shadow-xl flex items-center gap-1.5">
                    <TrophyIcon className="size-4 text-yellow-300" />
                    <span>WON ₦100,000 CASH</span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-black uppercase tracking-wider">
                      Verified Winner
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-white">Kelvin O.</p>
                    <p className="text-xs text-gray-300">1st Place — Weekend Showdown #47</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works / Three Steps ── */}
      <section id="how-it-works" className="py-20 md:py-32 relative border-t border-white/10 bg-black/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block rounded-full bg-[#F7911B]/15 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#F7911B] border border-[#F7911B]/30">
              Simple & Fun Rules
            </span>
            <h2 className="mt-4 font-display text-3xl font-black text-white sm:text-5xl">
              Three Steps. One Winner.
            </h2>
            <p className="mt-4 text-base text-gray-300 sm:text-lg">
              Every session is a live prediction room. You don't need facts — you just need to think like the majority.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="group relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:border-[#F7911B]/50 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col justify-between"
              >
                <div>
                  {/* Step Image */}
                  <div className="relative h-56 w-full rounded-2xl overflow-hidden border border-white/10">
                    <Image
                      src={step.img}
                      alt={step.title}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 left-3 grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#F7911B] to-[#FF0400] text-sm font-black text-white shadow-lg font-display">
                      {step.num}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-[#F7911B] border border-[#F7911B]/30">
                      {step.tag}
                    </span>
                  </div>

                  <h3 className="mt-6 font-display text-2xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Fast & Fair</span>
                  <span className="text-[#F7911B] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Learn more</span>
                    <ArrowRightIcon className="size-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Crowd Spotlight / Prediction Market Demo ── */}
      <section id="live-demo" className="py-20 md:py-28 relative">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#F7911B]/30 bg-gradient-to-r from-black via-[oklch(16%_0.02_60)] to-black p-8 md:p-14 shadow-2xl">
            <div className="grid gap-10 lg:grid-cols-12 items-center">
              {/* Left Column */}
              <div className="lg:col-span-5 relative">
                <div className="relative h-[380px] w-full rounded-2xl overflow-hidden border border-[#F7911B]/40 shadow-xl">
                  <Image
                    src="/human-group-winner.png"
                    alt="Crowd of players predicting and winning"
                    fill
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="inline-block rounded-full bg-[#F7911B] px-3 py-1 text-xs font-black text-black uppercase">
                      The Crowd Decides
                    </span>
                    <h4 className="mt-2 font-display text-2xl font-bold text-white">
                      Thousands of players guessing simultaneously
                    </h4>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
                  Game Engine
                </span>
                <h3 className="font-display text-3xl font-black text-white sm:text-4xl leading-tight">
                  No right or wrong answers. Only what the majority chooses.
                </h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  Unlike traditional trivia where you need facts, <strong className="text-white">GuessWhat</strong> tests your intuition of people. 
                  Every answer chosen by the crowd awards points to everyone who guessed it.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
                    <TargetIcon className="size-6 text-[#F7911B] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-white text-base">10 Points</p>
                      <p className="mt-0.5 text-xs text-gray-300">For picking the #1 most voted option</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
                    <ZapIcon className="size-6 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-white text-base">Speed Tiebreaker</p>
                      <p className="mt-0.5 text-xs text-gray-300">Fastest response total wins equal ties</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    href="/how-to-play"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors border border-white/20"
                  >
                    <span>Read full game rules</span>
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 md:py-28 border-t border-white/10 bg-black/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F7911B]">
              Built For Winners
            </span>
            <h2 className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">
              Why Players Love GuessWhat
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-[#F7911B]/40 hover:-translate-y-1"
              >
                <div className="size-11 grid place-items-center rounded-xl bg-[#F7911B]/10 text-[#F7911B] border border-[#F7911B]/20">
                  <f.Icon className="size-6" />
                </div>
                <h3 className="mt-4 font-display font-bold text-white text-lg">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ── */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#F7911B]/40 bg-gradient-to-br from-[#FF0400] via-[#F7911B] to-[#FF0400] p-10 md:p-16 text-center shadow-2xl">
            {/* Background image overlay */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay">
              <Image
                src="/human-group-winner.png"
                alt="Background winner celebration crowd"
                fill
                className="object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/60" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-4 py-1 text-xs font-black text-white uppercase tracking-wider mb-4 border border-white/30">
                Join The Live Crowd
              </span>
              <h2 className="font-display text-3xl font-black text-white sm:text-5xl leading-tight">
                Think you know what everyone else will pick? <br />
                <span className="text-[#F7911B]">Prove it.</span>
              </h2>
              <p className="mt-4 text-base text-white/90 sm:text-lg">
                Sign up today, get 100 free coins, and join the active 72-hour session now.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-black text-black shadow-2xl hover:bg-gray-100 transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span>Create Free Account & Play</span>
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link
                  href="/how-to-play"
                  className="w-full sm:w-auto rounded-full border border-white/40 bg-black/40 px-7 py-4 text-base font-bold text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                >
                  How To Play
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo size="sm" />

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <Link href="/how-to-play" className="hover:text-white transition-colors">How To Play</Link>
              <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
              <Link href="/support" className="hover:text-white transition-colors">Support & FAQ</Link>
              <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
              <Link href="/sign-up" className="hover:text-white transition-colors">Sign Up</Link>
            </div>

            <p className="text-xs text-gray-500">© 2026 GuessWhat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
