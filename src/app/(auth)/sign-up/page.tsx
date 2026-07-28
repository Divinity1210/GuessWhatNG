"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError("Username must be 3-20 characters (letters, numbers, underscore only)");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        username: username.trim(),
        referralCode: referralCode.trim() || undefined,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
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
        <h1 className="font-display text-2xl font-bold text-center">Create Account</h1>
        <p className="mt-2 text-sm text-ink-muted text-center">Join thousands of players and start winning</p>

        {error && (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
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
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Password</label>
            <input
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Referral Code <span className="text-ink-muted font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
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
