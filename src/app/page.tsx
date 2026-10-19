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
  FlameIcon,
} from "@/components/ui/Icons";
import { LiveFomoTicker } from "@/components/viral/LiveFomoTicker";
import { LandingMiniGame } from "@/components/viral/LandingMiniGame";
import { TURF_SQUADS } from "@/lib/game/viral-engine";

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
    desc: "Win real cash paid directly to your Nigerian bank, OPay, PalmPay or Moniepoint.",
    Icon: CoinsIcon,
  },
  {
    title: "2x Sure Lock Power-Up",
    desc: "Arm your 2x Confidence Lock on the 1 question you're 100% sure you know the crowd's pick.",
    Icon: FlameIcon,
  },
  {
    title: "Rep Your Turf & Campus",
    desc: "Every point you score boosts your City, State, or University Squad on the Turf Wars table.",
    Icon: UsersIcon,
  },
  {
    title: "Tiebreaker Speed Thrill",
    desc: "Ties are broken by millisecond speed. Fast thinkers take the biggest share of the pot.",
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
            <a href="#turf-wars" className="text-sm font-medium text-gray-300 hover:text-[#F7911B] transition-colors">
              Turf & Campus Wars
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
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-[#F7911B]/10 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 size-[400px] rounded-full bg-[#FF0400]/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          {/* Live FOMO Social Proof Ticker */}
          <div className="mx-auto max-w-3xl mb-6">
            <LiveFomoTicker compact />
          </div>

          {/* Live indicator badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#F7911B]/30 bg-[#F7911B]/10 px-4 py-1.5 text-xs font-semibold text-[#F7911B] backdrop-blur-md">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="size-2 rounded-full bg-emerald-400 -ml-4.5" />
              <span>Live Session: Weekend Showdown · ₦250,000 Pot · Airtime & Instant Bank Payouts</span>
            </div>
          </div>

          {/* Hero Main Heading */}
          <div className="mt-8 text-center max-w-4xl mx-auto">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]">
              Think Like the <span className="bg-gradient-to-r from-[#F7911B] via-[#FF0400] to-[#F7911B] bg-clip-text text-transparent">Crowd.</span>
              <br />
              Win <span className="bg-gradient-to-r from-[#F7911B] to-[#FF0400] bg-clip-text text-transparent">Real Cash.</span>
            </h1>

            <p className="mt-6 text-lg text-gray-300 sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Africa&apos;s #1 social prediction arena. You don&apos;t need textbook trivia — just predict what most Nigerians &amp; Africans will pick, lock in your 2x Sure Pick, and cash out.
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
                href="#turf-wars"
                className="w-full sm:w-auto rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-gray-200 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white text-center"
              >
                View Turf &amp; Campus Wars ↓
              </a>
            </div>

            {/* Social proof stats */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4.5 text-[#F7911B]" />
                <span><strong className="text-white font-bold">24,800+</strong> Active Players</span>
              </div>
              <div className="flex items-center gap-2">
                <TrophyIcon className="size-4.5 text-amber-400" />
                <span><strong className="text-white font-bold">₦48M+</strong> Paid to Winners</span>
              </div>
              <div className="flex items-center gap-2">
                <StarIcon className="size-4.5 text-yellow-400" />
                <span><strong className="text-white font-bold">MTN · Airtel · Glo · OPay</strong> Ready</span>
              </div>
            </div>
          </div>

          {/* ── Brand Expression Human Imagery + Interactive Mini-Game Showcase ── */}
          <div className="mt-16 grid gap-6 lg:grid-cols-12 items-center">
            {/* Left Card: Human Player Thinking / Crossing Fingers */}
            <div className="lg:col-span-4 relative group">
              <div className="relative overflow-hidden rounded-3xl border border-[#F7911B]/30 bg-gradient-to-b from-[#F7911B]/20 to-black/60 p-2 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:-translate-y-1">
                <div className="relative h-[380px] w-full rounded-2xl overflow-hidden">
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
                    <span>2x Lock on Smoky Party Jollof! 🔥</span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block rounded-full bg-[#F7911B] px-3 py-1 text-xs font-bold text-black uppercase tracking-wider">
                      ⚡ Lagos (Eko) Turf Leader
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-white">Adaora, Lagos</p>
                    <p className="text-xs text-gray-300">7-Day Flame Streak · 5 Sessions Won</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Card: Interactive 3-Question Live Playable Mini-Game */}
            <div className="lg:col-span-4 relative">
              <LandingMiniGame />
            </div>

            {/* Right Card: Human Winner Celebrating */}
            <div className="lg:col-span-4 relative group">
              <div className="relative overflow-hidden rounded-3xl border border-[#FF0400]/30 bg-gradient-to-b from-[#FF0400]/20 to-black/60 p-2 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:-translate-y-1">
                <div className="relative h-[380px] w-full rounded-2xl overflow-hidden">
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
                    <span>CASHED OUT ₦100,000</span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-black uppercase tracking-wider">
                      Instant OPay Alert
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-white">Kelvin O. · Abuja Squad</p>
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

      {/* ── Rep Your Turf: City & Campus Squad Wars ── */}
      <section id="turf-wars" className="py-20 md:py-28 border-t border-white/10 bg-[#0d1018]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7911B]/15 border border-[#F7911B]/30 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#F7911B]">
                <FlameIcon className="size-3.5" />
                <span>Turf &amp; Campus Squad Wars</span>
              </span>
              <h2 className="mt-4 font-display text-3xl font-black text-white sm:text-5xl">
                Rep Your City. Rep Your Campus.
              </h2>
              <p className="mt-3 text-base text-gray-300">
                Every point you score boosts your Turf on the national and Pan-African leaderboard. Rally your WhatsApp group so your squad doesn&apos;t carry last!
              </p>
            </div>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all shrink-0"
            >
              <span>Join &amp; Rep Your Turf</span>
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* City Wars */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-white">
                  ⚡ Top Cities &amp; States (Live Standings)
                </h3>
                <span className="text-xs font-semibold text-emerald-400">Updated Live</span>
              </div>
              <div className="space-y-3">
                {TURF_SQUADS.filter((t) => t.category === "city")
                  .slice(0, 4)
                  .map((turf, idx) => (
                    <div
                      key={turf.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-8 place-items-center rounded-xl font-display text-xs font-black ${
                            idx === 0
                              ? "bg-gradient-to-br from-[#F7911B] to-[#FF0400] text-white"
                              : "bg-white/10 text-gray-300"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-display font-bold text-white text-sm">
                            {turf.emoji} {turf.name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {turf.basePlayers.toLocaleString()} players · MVP @{turf.topPlayer}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-black text-sm text-[#F7911B]">
                          {turf.basePoints.toLocaleString()} pts
                        </p>
                        <p className="text-[11px] text-emerald-400 font-semibold">{turf.weeklyDelta}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Campus Wars */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-white">
                  🎓 University Campus Clash
                </h3>
                <span className="text-xs font-semibold text-[#F7911B]">₦100k Campus Bonus</span>
              </div>
              <div className="space-y-3">
                {TURF_SQUADS.filter((t) => t.category === "campus")
                  .slice(0, 4)
                  .map((turf, idx) => (
                    <div
                      key={turf.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-8 place-items-center rounded-xl font-display text-xs font-black ${
                            idx === 0
                              ? "bg-gradient-to-br from-[#F7911B] to-[#FF0400] text-white"
                              : "bg-white/10 text-gray-300"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-display font-bold text-white text-sm">
                            {turf.emoji} {turf.name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {turf.basePlayers.toLocaleString()} students · MVP @{turf.topPlayer}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-black text-sm text-[#F7911B]">
                          {turf.basePoints.toLocaleString()} pts
                        </p>
                        <p className="text-[11px] text-emerald-400 font-semibold">{turf.weeklyDelta}</p>
                      </div>
                    </div>
                  ))}
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
