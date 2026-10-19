"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { CoinsIcon } from "@/components/ui/Icons";
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
      <div className="mb-6 flex justify-center">
        <Logo size="md" />
      </div>

      <div className="rounded-xl border border-[#222631] bg-[#111318] p-6 sm:p-8">
        {success ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border border-[#10B981]/30 bg-[#10B981]/10">
              <svg className="size-6 text-[#10B981]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-[#F4F5F8]">Verify Your Email</h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8A92A6]">
              Confirmation sent to <strong className="text-[#F4F5F8]">{email}</strong>. Activate your account to credit{" "}
              <strong className="font-mono text-[#F7911B]">{hasReferral ? "150 GW Coins" : "100 GW Coins"}</strong>.
            </p>
            <Link href="/login" className="mt-6 inline-block text-xs font-semibold text-[#F7911B] hover:underline">
              Proceed to Sign In →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F4F5F8]">
              Open Player Account
            </h1>
            <p className="mt-1 text-xs text-[#8A92A6]">
              Enter live 72-hour prediction pools and represent your division.
            </p>

            {/* Allocation Credit Strip */}
            <div className="mt-4 rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[#C8CDD8]">
                <CoinsIcon className="size-4 text-[#F7911B] shrink-0" />
                <span>
                  {hasReferral
                    ? `Referral Code ${referralCode.toUpperCase()} Applied`
                    : "Starting Coin Allocation"}
                </span>
              </div>
              <span className="rounded border border-[#F7911B]/30 bg-[#F7911B]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#F7911B] shrink-0">
                {hasReferral ? "+150 GW" : "+100 GW"}
              </span>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#EF4444]">
                {error}
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  Handle / Username
                </label>
                <input
                  type="text"
                  placeholder="ada_thinks"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 text-sm text-[#F4F5F8] placeholder:text-[#5E6678] focus:border-[#F7911B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 text-sm text-[#F4F5F8] placeholder:text-[#5E6678] focus:border-[#F7911B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 text-sm text-[#F4F5F8] placeholder:text-[#5E6678] focus:border-[#F7911B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  <span>Home Division (City / Campus)</span>
                  <span className="font-mono text-[10px] text-[#F7911B]">REQUIRED</span>
                </label>
                <select
                  value={turf}
                  onChange={(e) => setTurf(e.target.value)}
                  className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 text-sm text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
                >
                  <optgroup label="Nigerian Cities & States">
                    {TURF_SQUADS.filter((t) => t.category === "city").map((t) => (
                      <option key={t.id} value={t.name}>
                        [{t.emoji}] {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="University Campuses">
                    {TURF_SQUADS.filter((t) => t.category === "campus").map((t) => (
                      <option key={t.id} value={t.name}>
                        [{t.emoji}] {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Pan-African Divisions">
                    {TURF_SQUADS.filter((t) => t.category === "africa").map((t) => (
                      <option key={t.id} value={t.name}>
                        [{t.emoji}] {t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  Referral Code <span className="font-mono text-[#10B981]">(+50 GW BONUS)</span>
                </label>
                <input
                  type="text"
                  placeholder="Optional invite code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 font-mono text-sm text-[#F4F5F8] placeholder:font-sans placeholder:text-[#5E6678] focus:border-[#F7911B] focus:outline-none"
                />
              </div>

              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading
                  ? "Creating Account..."
                  : `Create Account (+${hasReferral ? "150" : "100"} GW)`}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-[#8A92A6]">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-[#F7911B] hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
