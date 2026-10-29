"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo, ZapIcon, EyeIcon, EyeOffIcon } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setError("Invalid email/username or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn({ email: "demo@guesswhat.ng", password: "Password123!" });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
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
          <div
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
            >
              Email or Username
            </label>
            <input
              id="login-email"
              name="email"
              type="text"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="you@example.com or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-muted">
              <label htmlFor="login-password">Password</label>
              <Link href="/support" className="font-normal normal-case text-accent hover:underline">
                Need help?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <button
                type="button"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1.5 text-ink-muted transition-colors hover:bg-white/10 hover:text-white"
              >
                {showPassword ? (
                  <EyeOffIcon className="size-4.5" />
                ) : (
                  <EyeIcon className="size-4.5" />
                )}
              </button>
            </div>
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-rule" />
          <span className="text-xs text-ink-muted">or jump right in</span>
          <div className="h-px flex-1 bg-rule" />
        </div>

        {/* 1-Click Live Demo Player Login */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[#F7911B]/40 bg-[#F7911B]/10 px-4 py-3 text-sm font-bold text-[#F7911B] transition-colors hover:bg-[#F7911B]/20"
        >
          <ZapIcon className="size-4" />
          <span>1-Click Demo Login (@naija_striker · 500 🪙)</span>
        </button>

        <div className="mt-6 text-center text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-accent hover:underline">
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
