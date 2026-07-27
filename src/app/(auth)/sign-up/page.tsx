"use client";

import { Button, Logo } from "@/components/ui";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>

      {/* Card */}
      <div className="rounded-card border border-rule bg-paper-2 p-8">
        <h1 className="font-display text-2xl font-bold text-center">Create Account</h1>
        <p className="mt-2 text-sm text-ink-muted text-center">Join thousands of players and start winning</p>

        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Password</label>
            <input
              type="password"
              placeholder="Min 8 characters"
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Referral Code <span className="text-ink-muted font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="Enter referral code"
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <Button className="w-full" size="lg" type="submit">
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">Log in</Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        By signing up, you agree to our{" "}
        <a href="#" className="underline">Terms</a> and{" "}
        <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}
