"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { CoinsIcon, FlameIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { TURF_SQUADS } from "@/lib/game/viral-engine";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [turf, setTurf] = useState(TURF_SQUADS[0].name);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-capture ?ref=CODE from invite links
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
      const result = await signUp({
        email: email.trim(),
        password,
        username: username.trim(),
        referralCode: referralCode.trim() || undefined,
        turf,
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

  const hasReferral = referralCode.trim().length >= 3;

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>

      {/* Card */}
      <div className="rounded-card border border-rule bg-paper-2 p-8">
        {success ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-green-500/15">
              <svg className="size-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
            </div>
            <h2 className="font-display text-xl font-bold">Check Your Email</h2>
            <p className="mt-2 text-sm text-ink-muted">
              We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click it to activate your account and claim your{" "}
              <strong className="text-[#F7911B]">{hasReferral ? "150 Free Coins" : "100 Free Coins"}</strong>!
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">Go to Login →</Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-center">Create Account</h1>
            <p className="mt-1.5 text-sm text-ink-muted text-center">
              Join thousands of players predicting the crowd &amp; winning cash
            </p>

            {/* Welcome + Referral Bonus Banner */}
            <div className="mt-4 rounded-xl border border-[#F7911B]/40 bg-[#F7911B]/10 px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CoinsIcon className="size-4 text-[#F7911B] shrink-0" />
                <span>
                  {hasReferral
                    ? `Squad Code "${referralCode.toUpperCase()}" Applied!`
                    : "Instant Welcome Bonus Unlocked"}
                </span>
              </div>
              <span className="rounded-full bg-gradient-to-r from-[#FF0400] to-[#F7911B] px-2.5 py-0.5 text-[11px] font-black text-white shrink-0">
                {hasReferral ? "+150 FREE COINS" : "+100 FREE COINS"}
              </span>
            </div>

            {error && (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Username</label>
                <input
                  type="text"
                  placeholder="e.g. ada_thinks"
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
                <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-muted">
                  <span>Rep Your Turf / Campus Squad</span>
                  <span className="text-[#F7911B] flex items-center gap-1 font-bold">
                    <FlameIcon className="size-3" /> Turf Wars
                  </span>
                </label>
                <select
                  value={turf}
                  onChange={(e) => setTurf(e.target.value)}
                  className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <optgroup label="⚡ Nigerian Cities & States">
                    {TURF_SQUADS.filter((t) => t.category === "city").map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.emoji} {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🎓 University Campus Squads">
                    {TURF_SQUADS.filter((t) => t.category === "campus").map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.emoji} {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🌍 Pan-African Squads">
                    {TURF_SQUADS.filter((t) => t.category === "africa").map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.emoji} {t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Referral Code <span className="text-[#F7911B] font-semibold">(+50 Extra Coins)</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter friend's referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>

              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading
                  ? "Creating Account..."
                  : `Create Account & Claim ${hasReferral ? "150" : "100"} Coins`}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">Log in</Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        By signing up, you agree to our{" "}
        <a href="#" className="underline">Terms</a> and{" "}
        <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}
