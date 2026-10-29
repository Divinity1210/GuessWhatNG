"use client";

import { useEffect, useState } from "react";
import { Avatar, Button } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";

const NIGERIAN_BANKS = [
  "Access Bank",
  "First Bank of Nigeria",
  "Guaranty Trust Bank (GTBank)",
  "Kuda Bank",
  "Moniepoint MFB",
  "OPay",
  "PalmPay",
  "Stanbic IBTC Bank",
  "Sterling Bank",
  "United Bank for Africa (UBA)",
  "Wema Bank",
  "Zenith Bank",
];

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");

  // Bank Account Details for Prize Payouts (Product Document Page 6, 25, 35)
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const res = await fetch(`/api/profile?userId=${encodeURIComponent(user!.id)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          if (p) {
            setUsername(p.username ?? "");
            setFullName(p.full_name ?? "");
            setPhone(p.phone ?? "");
            setDateOfBirth(p.date_of_birth ?? "");
            setGender(p.gender ?? "");
            setLocation(p.state ?? "");
          }
          if (data.bank) {
            setBankName(data.bank.bankName ?? "");
            setAccountNumber(data.bank.accountNumber ?? "");
            setAccountName(data.bank.accountName ?? "");
          }
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username,
          fullName,
          phone,
          dateOfBirth,
          gender,
          location,
          bankName,
          accountNumber,
          accountName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }
      await refreshProfile();
      setSavedMsg("Profile and bank payout details saved.");
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const displayName = username || profile?.username || "Player";
  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none";

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Header Card */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} size="lg" />
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              {displayName}
            </h1>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        {profile?.referral_code && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Referral Code
              </p>
              <p className="font-mono text-sm font-bold text-accent">
                {profile.referral_code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="ml-2 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </section>

      {/* Main Profile & Bank Payout Form (Product Document Pages 25 & 35) */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 sm:p-8 space-y-8"
      >
        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {savedMsg}
          </div>
        )}

        {/* Personal Details */}
        <fieldset className="space-y-4">
          <legend className="font-display text-base font-bold text-white">
            Personal Details
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label
                htmlFor="profile-fullname"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Full Name
              </label>
              <input
                id="profile-fullname"
                name="name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="profile-username"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Username
              </label>
              <input
                id="profile-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Phone Number
              </label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0803 000 0000"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="profile-dob"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Date of Birth (DOB)
              </label>
              <input
                id="profile-dob"
                name="bday"
                type="date"
                autoComplete="bday"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="profile-gender"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Gender
              </label>
              <select
                id="profile-gender"
                name="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputClass}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-location"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Location (State / City)
              </label>
              <input
                id="profile-location"
                name="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lagos"
                className={inputClass}
              />
            </div>
          </div>
        </fieldset>

        {/* Bank Account Details for Direct Prize Payouts (Page 6, 25, 35) */}
        <fieldset className="space-y-4 border-t border-white/10 pt-6">
          <div>
            <legend className="font-display text-base font-bold text-white">
              Bank Account Details (For Prize Payouts)
            </legend>
            <p className="text-xs text-slate-400 mt-0.5">
              Leaderboard cash prizes are paid directly to your bank account when a session ends.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label
                htmlFor="profile-bank"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Bank Name
              </label>
              <select
                id="profile-bank"
                name="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className={inputClass}
              >
                <option value="">Select bank</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-acct-num"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Account Number (NUBAN)
              </label>
              <input
                id="profile-acct-num"
                name="accountNumber"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="10 digits"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="profile-acct-name"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Account Name
              </label>
              <input
                id="profile-acct-name"
                name="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account holder name"
                className={inputClass}
              />
            </div>
          </div>
        </fieldset>

        <div className="pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
