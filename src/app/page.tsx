import Image from "next/image";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import {
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  TargetIcon,
  CoinsIcon,
  TimerIcon,
  ZapIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import { LiveFomoTicker } from "@/components/viral/LiveFomoTicker";
import { LandingMiniGame } from "@/components/viral/LandingMiniGame";
import { TURF_SQUADS } from "@/lib/game/viral-engine";

const protocolSteps = [
  {
    num: "01",
    code: "ENTRY",
    title: "Enter a 72-Hour Session Pool",
    desc: "Select an active prediction market. Entry starts at 100 GW Coins (₦50 via MTN, Airtel, Glo, or 9mobile airtime).",
    metric: "10 QUESTIONS / POOL",
  },
  {
    num: "02",
    code: "CONSENSUS",
    title: "Forecast the Majority Pick",
    desc: "No textbook trivia. Every question asks what everyday Nigerians will choose. Picking the #1 crowd choice yields 10 points.",
    metric: "2X MULTIPLIER AVAILABLE",
  },
  {
    num: "03",
    code: "SETTLEMENT",
    title: "Rank High & Withdraw Instant Cash",
    desc: "Top entries split the guaranteed Naira pool. Equal point totals are settled by cumulative response speed down to the millisecond.",
    metric: "DIRECT NIP / OPAY PAYOUT",
  },
];

export default function LandingPage() {
  const cityStandings = TURF_SQUADS.filter((t) => t.category === "city").slice(0, 4);
  const campusStandings = TURF_SQUADS.filter((t) => t.category === "campus").slice(0, 4);

  return (
    <div className="min-h-screen bg-[#090A0D] text-[#F4F5F8] overflow-x-hidden">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 border-b border-[#222631] bg-[#090A0D]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo size="xs" />
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="#protocol"
                className="text-xs font-medium text-[#8A92A6] hover:text-[#F4F5F8] transition-colors"
              >
                Mechanics
              </a>
              <a
                href="#divisions"
                className="text-xs font-medium text-[#8A92A6] hover:text-[#F4F5F8] transition-colors"
              >
                Divisions
              </a>
              <Link
                href="/leaderboard"
                className="text-xs font-medium text-[#8A92A6] hover:text-[#F4F5F8] transition-colors"
              >
                Standings
              </Link>
              <Link
                href="/how-to-play"
                className="text-xs font-medium text-[#8A92A6] hover:text-[#F4F5F8] transition-colors"
              >
                Rules
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" href="/login">
              Sign in
            </Button>
            <Button size="sm" href="/sign-up">
              Open Account
            </Button>
          </div>
        </div>
      </header>

      {/* ── Live Market Activity Strip ── */}
      <div className="border-b border-[#222631] bg-[#0D0F14]">
        <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          <LiveFomoTicker compact />
        </div>
      </div>

      {/* ── Asymmetric Split Hero (Editorial Left + Playable Prediction Slip Right) ── */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pt-14 md:pb-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column: High-Contrast Editorial Headline & Telemetry */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#222631] bg-[#111318] px-3 py-1">
              <span className="size-1.5 rounded-full bg-[#10B981]" />
              <span className="font-mono text-[11px] font-medium text-[#C8CDD8] tabular-nums">
                POOL #48 ACTIVE · ₦250,000 GUARANTEED · SETTLEMENT IN 72H
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-[#F4F5F8] sm:text-5xl lg:text-[54px] leading-[1.08]">
              Predict what the crowd chooses.{" "}
              <span className="text-[#F7911B]">Win real payouts.</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-[#8A92A6] leading-relaxed">
              GuessWhat is Nigeria&apos;s social consensus arena. There are no trivia facts to memorize—score points by forecasting the most popular answer across 10 everyday cultural questions.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7911B] px-6 py-3.5 text-sm font-semibold text-[#090A0D] hover:bg-[#FFA236] transition-colors"
              >
                <PlayIcon className="size-4 fill-current" />
                <span>Start Playing — 100 GW Coins Included</span>
              </Link>
              <a
                href="#divisions"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#222631] bg-[#111318] px-5 py-3.5 text-sm font-medium text-[#C8CDD8] hover:border-[#2E3442] hover:text-[#F4F5F8] transition-colors"
              >
                <span>View City &amp; Campus Standings</span>
              </a>
            </div>

            {/* Framed Ledger Metrics Strip */}
            <div className="grid grid-cols-3 divide-x divide-[#222631] rounded-xl border border-[#222631] bg-[#111318] py-4">
              <div className="px-4">
                <p className="text-[11px] uppercase tracking-wider text-[#8A92A6]">Active Players</p>
                <p className="mt-1 font-mono text-lg sm:text-2xl font-semibold text-[#F4F5F8] tabular-nums">
                  24,810
                </p>
              </div>
              <div className="px-4">
                <p className="text-[11px] uppercase tracking-wider text-[#8A92A6]">Total Settled</p>
                <p className="mt-1 font-mono text-lg sm:text-2xl font-semibold text-[#10B981] tabular-nums">
                  ₦48.2M
                </p>
              </div>
              <div className="px-4">
                <p className="text-[11px] uppercase tracking-wider text-[#8A92A6]">Avg Payout Speed</p>
                <p className="mt-1 font-mono text-lg sm:text-2xl font-semibold text-[#F7911B] tabular-nums">
                  &lt; 90s
                </p>
              </div>
            </div>

            {/* Editorial Photography Pair — Sharp Framed Documentary Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="relative overflow-hidden rounded-xl border border-[#222631] bg-[#111318]">
                <div className="relative h-44 sm:h-52 w-full">
                  <Image
                    src="/hero-portrait.png"
                    alt="Adaora locking predictions in Lagos"
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 rounded border border-[#222631] bg-[#090A0D]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#F7911B]">
                    LOS · #1 STREAK
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-xs font-semibold text-[#F4F5F8]">@ada_thinks · Lagos</p>
                    <p className="font-mono text-[11px] text-[#8A92A6]">94/100 pts · 19.2s</p>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-[#222631] bg-[#111318]">
                <div className="relative h-44 sm:h-52 w-full">
                  <Image
                    src="/hero-winner.png"
                    alt="Kelvin celebrating verified payout in Abuja"
                    fill
                    className="object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 rounded border border-[#10B981]/30 bg-[#090A0D]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#10B981]">
                    SETTLED · ₦100,000
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-xs font-semibold text-[#F4F5F8]">@kelvin_o · Abuja</p>
                    <p className="font-mono text-[11px] text-[#8A92A6]">1st Place · Showdown #47</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Playable 3-Question Prediction Slip */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <LandingMiniGame />
          </div>
        </div>
      </section>

      {/* ── Game Protocol (Architectural 3-Column Ledger) ── */}
      <section id="protocol" className="border-t border-[#222631] bg-[#0D0F14] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-10 border-b border-[#222631]">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F7911B]">
                ARENA MECHANICS
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#F4F5F8] sm:text-3xl">
                How consensus scoring works
              </h2>
            </div>
            <p className="max-w-md text-xs sm:text-sm text-[#8A92A6]">
              Points are determined strictly by the percentage distribution of all locked entries when the session clock expires.
            </p>
          </div>

          <div className="grid divide-y md:divide-y-0 md:divide-x divide-[#222631] border-b border-[#222631] md:grid-cols-3">
            {protocolSteps.map((step) => (
              <div key={step.num} className="py-8 md:px-6 first:md:pl-0 last:md:pr-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#F7911B] font-semibold">{step.num} // {step.code}</span>
                    <span className="rounded border border-[#222631] bg-[#111318] px-2 py-0.5 text-[10px] text-[#8A92A6]">
                      {step.metric}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#F4F5F8]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#8A92A6]">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#222631]/60 flex items-center justify-between text-xs text-[#8A92A6]">
                  <span>Point Yield</span>
                  <span className="font-mono text-[#F4F5F8]">#1 = 10 pts · #2 = 9 pts · #3 = 8 pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payout & Tiebreaker Specification Strip */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#222631] bg-[#111318] p-4 flex items-start gap-3">
              <TargetIcon className="size-5 text-[#F7911B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F4F5F8]">2x Multiplier Lock</p>
                <p className="mt-1 text-xs text-[#8A92A6]">
                  Deploy your single 2x Multiplier on the market question where you have maximum conviction (up to 20 pts).
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#222631] bg-[#111318] p-4 flex items-start gap-3">
              <ZapIcon className="size-5 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F4F5F8]">Millisecond Tiebreaker</p>
                <p className="mt-1 text-xs text-[#8A92A6]">
                  When two players finish with identical points, the player with the lower cumulative response time wins the higher rank.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#222631] bg-[#111318] p-4 flex items-start gap-3">
              <CoinsIcon className="size-5 text-[#F7911B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F4F5F8]">Airtime VAS &amp; NIP Rails</p>
                <p className="mt-1 text-xs text-[#8A92A6]">
                  Top up coins directly from mobile airtime and withdraw Naira winnings to OPay, PalmPay, Moniepoint, or any bank.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Territory & Campus Division Standings ── */}
      <section id="divisions" className="border-t border-[#222631] bg-[#090A0D] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F7911B]">
                LIVE DIVISION TABLES
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#F4F5F8] sm:text-3xl">
                City &amp; University Standings
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#8A92A6]">
                Every point you score contributes to your home division&apos;s weekly aggregate.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F7911B] hover:underline"
            >
              <span>Full Standings &amp; Pan-African Table</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* City Division Table */}
            <div className="rounded-xl border border-[#222631] bg-[#111318] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#222631] px-5 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F4F5F8]">
                  City Divisions
                </span>
                <span className="font-mono text-[11px] text-[#10B981]">LIVE AGGREGATE</span>
              </div>
              <div className="divide-y divide-[#222631]">
                {cityStandings.map((turf, idx) => (
                  <div
                    key={turf.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[#171A21]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="font-mono text-xs font-semibold text-[#8A92A6] w-5 tabular-nums">
                        0{idx + 1}
                      </span>
                      <span className="rounded border border-[#2E3442] bg-[#171A21] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#F7911B]">
                        {turf.emoji}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#F4F5F8]">{turf.name}</p>
                        <p className="font-mono text-[11px] text-[#8A92A6] tabular-nums">
                          {turf.basePlayers.toLocaleString()} players · Lead: @{turf.topPlayer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="text-sm font-semibold text-[#F4F5F8]">
                        {turf.basePoints.toLocaleString()} pts
                      </p>
                      <p className="text-[11px] text-[#10B981]">{turf.weeklyDelta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campus Division Table */}
            <div className="rounded-xl border border-[#222631] bg-[#111318] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#222631] px-5 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F4F5F8]">
                  University Divisions
                </span>
                <span className="font-mono text-[11px] text-[#F7911B]">CAMPUS POOL</span>
              </div>
              <div className="divide-y divide-[#222631]">
                {campusStandings.map((turf, idx) => (
                  <div
                    key={turf.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[#171A21]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="font-mono text-xs font-semibold text-[#8A92A6] w-5 tabular-nums">
                        0{idx + 1}
                      </span>
                      <span className="rounded border border-[#2E3442] bg-[#171A21] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#C8CDD8]">
                        {turf.emoji}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#F4F5F8]">{turf.name}</p>
                        <p className="font-mono text-[11px] text-[#8A92A6] tabular-nums">
                          {turf.basePlayers.toLocaleString()} students · Lead: @{turf.topPlayer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="text-sm font-semibold text-[#F4F5F8]">
                        {turf.basePoints.toLocaleString()} pts
                      </p>
                      <p className="text-[11px] text-[#10B981]">{turf.weeklyDelta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom Account Callout (Matte Carbon Ledger Card) ── */}
      <section className="border-t border-[#222631] bg-[#0D0F14] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-xl border border-[#222631] bg-[#111318] p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#10B981]">
                INSTANT ONBOARDING · 100 GW COINS CREDITED
              </span>
              <h2 className="font-display text-2xl font-bold text-[#F4F5F8] sm:text-3xl">
                Ready to lock in your first prediction slip?
              </h2>
              <p className="text-xs sm:text-sm text-[#8A92A6]">
                Create your player account in 30 seconds, select your City or University division, and enter the live pool.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button size="lg" href="/sign-up">
                Create Player Account
              </Button>
              <Button variant="secondary" size="lg" href="/login">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#222631] bg-[#090A0D] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="xs" />
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#8A92A6]">
            <Link href="/how-to-play" className="hover:text-[#F4F5F8] transition-colors">
              Rules &amp; Scoring
            </Link>
            <Link href="/leaderboard" className="hover:text-[#F4F5F8] transition-colors">
              Standings
            </Link>
            <Link href="/support" className="hover:text-[#F4F5F8] transition-colors">
              Support
            </Link>
            <Link href="/login" className="hover:text-[#F4F5F8] transition-colors">
              Sign In
            </Link>
          </div>
          <p className="font-mono text-[11px] text-[#5E6678]">
            © 2026 GUESSWHAT NIGERIA
          </p>
        </div>
      </footer>
    </div>
  );
}
