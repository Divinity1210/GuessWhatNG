"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateProfile } from "@/lib/supabase/queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  isSoundMuted,
  setSoundMuted,
  isMusicEnabled,
  toggleBackgroundMusic,
  playMenuClick,
} from "@/lib/audio/sound-effects";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [username, setUsername] = useState(profile?.username ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio controls (Pages 22, 32, 33)
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  useEffect(() => {
    const syncAudio = () => {
      setSfxEnabled(!isSoundMuted());
      setMusicEnabled(isMusicEnabled());
    };
    syncAudio();
    window.addEventListener("gw-audio-change", syncAudio);
    return () => window.removeEventListener("gw-audio-change", syncAudio);
  }, []);

  // Sync profile once loaded
  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setFullName(profile.full_name ?? "");
    }
  }, [profile]);

  const handleToggleSfx = () => {
    const nextMuted = sfxEnabled;
    setSoundMuted(nextMuted);
    setSfxEnabled(!nextMuted);
    if (!nextMuted) {
      playMenuClick();
    }
  };

  const handleToggleMusic = () => {
    if (!sfxEnabled) {
      setSoundMuted(false);
      setSfxEnabled(true);
    }
    const nowPlaying = toggleBackgroundMusic();
    setMusicEnabled(nowPlaying);
  };

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      await updateProfile(user.id, {
        username: username.trim(),
        full_name: fullName.trim(),
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }

    setPwSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setPwError((err as { message: string }).message);
      } else {
        setPwError("Failed to change password");
      }
    } finally {
      setPwSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-[#07090e] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your game audio, account profile, security, and legal policies.
        </p>
      </div>

      {/* ── Game Audio & Sound Controls (Pages 22, 32, 33) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-white">
            Sound &amp; Music
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Control UI click sounds, leaderboard chimes, and gameplay background music.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-white">
                Sound Effects (SFX)
              </p>
              <p className="text-xs text-slate-400">
                Menu clicks, option pops, and live rank climb chimes
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sfxEnabled}
              onClick={handleToggleSfx}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                sfxEnabled
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                  : "bg-white/5 border border-white/10 text-slate-400"
              }`}
            >
              {sfxEnabled ? "🔊 SFX On" : "🔇 SFX Off"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-white">
                Background Music (BGM)
              </p>
              <p className="text-xs text-slate-400">
                Signature Guess What Afrobeats/Kalimba groove during gameplay
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={musicEnabled}
              onClick={handleToggleMusic}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                musicEnabled
                  ? "bg-accent/20 border border-accent/40 text-accent"
                  : "bg-white/5 border border-white/10 text-slate-400"
              }`}
            >
              {musicEnabled ? "🎵 Music On" : "🎵 Music Off"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Quick Navigation & Legal Links (Pages 22, 32, 33) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">
          Player Options &amp; Legal
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/profile"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
          >
            <span>My Profile &amp; Stats</span>
            <span className="text-accent">→</span>
          </Link>
          <Link
            href="/inbox"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
          >
            <span>Player Inbox</span>
            <span className="text-accent">→</span>
          </Link>
          <Link
            href="/how-to-play"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
          >
            <span>How to Play</span>
            <span className="text-accent">→</span>
          </Link>
          <Link
            href="/support"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
          >
            <span>Customer Support &amp; Feedback</span>
            <span className="text-accent">→</span>
          </Link>
          <Link
            href="/terms"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
          >
            <span>Terms &amp; Conditions</span>
            <span className="text-accent">→</span>
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
          >
            <span>Privacy Policy</span>
            <span className="text-accent">→</span>
          </Link>
        </div>
      </section>

      {/* ── Profile settings ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
        <h2 className="font-display text-lg font-bold text-white">Profile Details</h2>
        <p className="mt-1 text-xs text-slate-400">
          Update your display name and username.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
          >
            Profile updated successfully!
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleProfileUpdate}>
          <div>
            <label
              htmlFor="settings-username"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Username
            </label>
            <input
              id="settings-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="settings-fullname"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Full Name
            </label>
            <input
              id="settings-fullname"
              name="name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label
              htmlFor="settings-email"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Email
            </label>
            <input
              id="settings-email"
              name="email"
              type="email"
              value={user?.email ?? ""}
              disabled
              className={`${inputClass} opacity-50 cursor-not-allowed`}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </section>

      {/* ── Password change ── */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
        <h2 className="font-display text-lg font-bold text-white">Change Password</h2>
        <p className="mt-1 text-xs text-slate-400">Update your account password.</p>

        {pwError && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
          >
            Password changed successfully!
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handlePasswordChange}>
          <div>
            <label
              htmlFor="settings-new-pw"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              New Password
            </label>
            <input
              id="settings-new-pw"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="settings-confirm-pw"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Confirm Password
            </label>
            <input
              id="settings-confirm-pw"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className={inputClass}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={pwSaving}>
            {pwSaving ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </section>

      {/* ── Danger zone ── */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="font-display text-lg font-bold text-red-400">Account Session</h2>
        <p className="mt-1 text-xs text-slate-400">
          Sign out of your active player session.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="danger" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  );
}
