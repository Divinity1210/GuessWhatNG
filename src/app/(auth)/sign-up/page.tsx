"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref");
    if (refParam) {
      setReferralCode(refParam.trim().toUpperCase());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const result = await signUp({
        email: email.trim(),
        password,
        username: username.trim(),
        referralCode: referralCode.trim() || undefined,
      });

      if (result.session) {
        router.push("/dashboard");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>

      <div className="rounded-card border border-rule bg-paper-2 p-8">
        {success ? (
          <div className="text-center py-4">
            <h2 className="font-display text-xl font-bold">Account Created</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Your account <strong className="text-ink">{email}</strong> is ready.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
            >
              Proceed to Log In →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-center">
              Create Account
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted text-center">
              Think &amp; Win — Free to play
            </p>

            {error && (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="signup-username"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
                >
                  Username
                </label>
                <input
                  id="signup-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. ada_thinks"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
                >
                  Email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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

              <div>
                <label
                  htmlFor="signup-referral"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
                >
                  Promo / Referral Code{" "}
                  <span className="text-ink-muted font-normal">(optional)</span>
                </label>
                <input
                  id="signup-referral"
                  name="referralCode"
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="Optional code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>

              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Log in
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        By signing up, you agree to our{" "}
        <a href="#" className="underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="#" className="underline">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
