import Link from "next/link";
import { Logo } from "@/components/logo";

const steps = [
  {
    title: "Join a session",
    body: "Use your coins to enter a live 72-hour prediction session.",
  },
  {
    title: "Guess what most players pick",
    body: "10 questions. No right answers — only the crowd decides. The most-picked option scores 10 points.",
  },
  {
    title: "Think fast, win rewards",
    body: "Top scores win the prize pool. Ties go to the fastest thinker.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-white/70">
          <Link href="/how-to-play" className="hover:text-white">
            How to play
          </Link>
          <Link href="/leaderboard" className="hover:text-white">
            Leaderboard
          </Link>
          <Link
            href="/login"
            className="rounded-btn border border-border px-4 py-2 hover:border-brand-orange hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="gradient-brand rounded-btn px-4 py-2 font-semibold text-white"
          >
            Play now
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-border bg-card px-4 py-1 text-sm text-brand-orange">
          The social prediction game
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-extrabold leading-tight sm:text-6xl">
          Think <span className="text-gradient-brand">&amp;</span> Win
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          Predict what most players will pick. No luck, no house — just you
          against the crowd&apos;s mind. Subscribe with airtime and start
          playing in seconds.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/sign-up"
            className="gradient-brand rounded-btn px-8 py-3 font-display text-lg font-bold text-white shadow-lg shadow-brand-red/25"
          >
            Fingers crossed — play
          </Link>
          <Link
            href="/how-to-play"
            className="rounded-btn border border-border bg-card px-8 py-3 font-semibold text-white/80 hover:text-white"
          >
            How it works
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-card border border-border bg-card p-6"
          >
            <div className="gradient-brand mb-4 grid size-10 place-items-center rounded-full font-display font-bold">
              {i + 1}
            </div>
            <h3 className="font-display text-xl font-bold">{step.title}</h3>
            <p className="mt-2 text-white/60">{step.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-white/40">
        © {new Date().getFullYear()} GRAMEF Digital · Guess What — Think and
        Win
      </footer>
    </main>
  );
}
