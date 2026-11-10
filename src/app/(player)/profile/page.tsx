"use client";

import { useEffect, useState } from "react";
import { Avatar, Button } from "@/components/ui";
import { CopyIcon, CheckIcon } from "@/components/ui/Icons";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");

  // Bank Account Details for Prize Payouts
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
            setAvatarUrl(p.avatar_url ?? null);
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

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose an image file.");
      return;
    }

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSavedMsg(null);

    try {
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error("Invalid image format"));
          img.onload = () => {
            const size = 160;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas unavailable"));
              return;
            }
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      setAvatarUrl(compressedDataUrl);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          avatarUrl: compressedDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update avatar");
      }
      await refreshProfile();
      setSavedMsg("Profile photo updated.");
      setTimeout(() => setSavedMsg(null), 3500);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to upload photo",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

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
          avatarUrl: avatarUrl ?? "",
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
    "min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none";

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      {/* Header Card */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            name={displayName}
            src={avatarUrl || profile?.avatar_url}
            size="lg"
          />
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
              {displayName}
            </h1>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            <div className="pt-0.5">
              <label className="inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-slate-200 transition-colors">
                <span>{uploadingAvatar ? "Uploading..." : "Change photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingAvatar}
                  onChange={handleAvatarFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>

        {profile?.referral_code && (
          <div className="flex items-center justify-between sm:justify-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
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
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5 text-slate-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Main Profile & Bank Payout Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-7 space-y-7"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                Date of Birth
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

        {/* Bank Account Details for Direct Prize Payouts */}
        <fieldset className="space-y-4 border-t border-white/10 pt-6">
          <div>
            <legend className="font-display text-base font-bold text-white">
              Bank Account Details (Prize Payouts)
            </legend>
            <p className="text-xs text-slate-400 mt-0.5">
              Leaderboard cash prizes are sent directly to your bank account when a session ends.
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

        <div className="pt-1">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
