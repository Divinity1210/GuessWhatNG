"use client";

import { Button, Logo } from "@/components/ui";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>

      {/* Card */}
      <div className="rounded-card border border-rule bg-paper-2 p-8">
        <h1 className="font-display text-2xl font-bold text-center">Welcome Back</h1>
        <p className="mt-2 text-sm text-ink-muted text-center">Log in to continue playing</p>

        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-muted">
              Password
              <a href="#" className="font-normal normal-case text-accent hover:underline">Forgot?</a>
            </label>
            <input
              type="password"
              placeholder="Enter password"
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <Button className="w-full" size="lg" type="submit">
            Log In
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-rule" />
          <span className="text-xs text-ink-muted">or continue with</span>
          <div className="h-px flex-1 bg-rule" />
        </div>

        {/* Social login */}
        <div className="flex gap-3">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-4">
            <span className="font-bold">G</span> Google
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-4">
            <span className="font-bold"></span> Apple
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-accent hover:underline">Sign up free</Link>
        </div>
      </div>
    </div>
  );
}
