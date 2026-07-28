"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn({ email: email.trim(), password });
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

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

        {error && (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
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
            <span className="font-bold"></span> Apple
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
