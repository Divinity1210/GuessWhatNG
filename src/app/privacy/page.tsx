import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the GuessWhat social prediction game.",
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              How GuessWhat collects, protects, and uses player data.
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              1. Information We Collect
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              When you register and play GuessWhat, we collect your username, email address, phone number, optional demographic profile fields (age range, gender, state, and country), and gameplay records (options chosen and response times).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              2. How We Use Your Data
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your data is used to calculate live crowd points, display your username on session leaderboards, verify prize eligibility, credit referral bonuses, and deliver support updates to your Player Inbox.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              3. Aggregate Crowd Insights
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Individual picks are never shown to other players while a session is active. Aggregate option popularity and anonymised audience statistics are used for game scoring, community polls, and statistical reporting.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-white">
              4. Data Security &amp; Player Rights
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We protect account data using encrypted connections and strict row-level security policies. Update your profile details anytime in{" "}
              <Link href="/settings" className="text-accent hover:underline">
                Settings
              </Link>{" "}
              or reach out to{" "}
              <Link href="/support" className="text-accent hover:underline">
                Customer Support
              </Link>{" "}
              for account assistance.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
