import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for the GuessWhat social prediction game.",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[#07090e] text-slate-100 py-8 sm:py-12 px-4 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <Logo size="xs" />
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-[#0d111c] px-3.5 py-2 text-xs font-semibold text-accent hover:bg-white/[0.04] transition-colors"
          >
            Back to Game
          </Link>
        </div>

        <article className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 sm:p-10 space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Effective across all GuessWhat gameplay sessions, community threads, and prize payouts.
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              1. Game Overview &amp; Eligibility
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              GuessWhat is a social crowd-prediction game where players answer 10 questions per session by predicting the option most players will select. Players must be at least 18 years of age and maintain a single verified player account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              2. Scoring &amp; Tie-Breaking Rules
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Options for each question are ranked dynamically based on total player selections during the session. The most selected option earns 10 points, the second most selected earns 9 points, down to 1 point for the least selected option. Leaderboard rankings are determined first by highest total points and second by shortest cumulative completion time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              3. Sessions &amp; Prize Structure
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Each standard 3-day session features a ₦500,000 prize pool shared across the top 36 winners: 1st Place (₦100,000), 2nd Place (₦50,000), 3rd Place (₦20,000), and 4th to 36th Place (₦10,000 each). Players may replay a session to improve their score and completion time before the session countdown expires.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              4. Fair Play &amp; Anti-Fraud Policy
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automated scripts, bots, emulators, or multi-account collusion are strictly prohibited. Accounts flagged by our integrity checks may be suspended or disqualified from session prize payouts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              5. Support &amp; Dispute Resolution
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              If you have questions regarding a session result, referral credit, or account status, submit a ticket through{" "}
              <Link href="/support" className="text-accent hover:underline">
                Customer Support
              </Link>
              .
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
