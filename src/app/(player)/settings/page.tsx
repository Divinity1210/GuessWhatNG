"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  VolumeIcon,
  VolumeMuteIcon,
  MusicIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";
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

  // Audio controls
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
    "min-h-11 w-full rounded-xl border border-white/15 bg-[#07090e] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none";

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your game audio, account profile, security, and legal policies.
        </p>
      </div>

      {/* Game Audio & Sound Controls */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-white">
            Sound &amp; Music
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Control UI click sounds, leaderboard chimes, and gameplay background music.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
            <div className="min-w-0">
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
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                sfxEnabled
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                  : "bg-white/5 border border-white/10 text-slate-400"
              }`}
            >
              {sfxEnabled ? (
                <>
                  <VolumeIcon className="size-4" />
                  <span>SFX On</span>
                </>
              ) : (
                <>
                  <VolumeMuteIcon className="size-4" />
                  <span>SFX Off</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                Background Music (BGM)
              </p>
              <p className="text-xs text-slate-400">
                GuessWhat Afrobeats and Kalimba groove during gameplay
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={musicEnabled}
              onClick={handleToggleMusic}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                musicEnabled
                  ? "bg-accent/20 border border-accent/40 text-accent"
                  : "bg-white/5 border border-white/10 text-slate-400"
              }`}
            >
              <MusicIcon className="size-4" />
              <span>{musicEnabled ? "Music On" : "Music Off"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Navigation & Legal Links */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
        <h2 className="font-display text-base sm:text-lg font-bold text-white">
          Player Options &amp; Legal
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { href: "/profile", label: "My Profile & Payout Bank" },
            { href: "/inbox", label: "Player Inbox" },
            { href: "/how-to-play", label: "How to Play" },
            { href: "/support", label: "Support & Feedback" },
            { href: "/terms", label: "Terms & Conditions" },
            { href: "/privacy", label: "Privacy Policy" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-200 hover:border-accent/40 hover:text-white transition-colors"
            >
              <span>{item.label}</span>
              <ChevronRightIcon className="size-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* Profile settings */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
        <h2 className="font-display text-base sm:text-lg font-bold text-white">Profile Details</h2>
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
            Profile updated.
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
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </section>

      {/* Password change */}
      <section className="rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
        <h2 className="font-display text-base sm:text-lg font-bold text-white">Change Password</h2>
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
            Password changed.
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
              placeholder="Minimum 8 characters"
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
          <Button type="submit" variant="secondary" disabled={pwSaving} className="w-full sm:w-auto">
            {pwSaving ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </section>

      {/* Account Session */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6">
        <h2 className="font-display text-base sm:text-lg font-bold text-red-400">Account Session</h2>
        <p className="mt-1 text-xs text-slate-400">
          Sign out of your active player session on this device.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={handleSignOut} className="w-full sm:w-auto">
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  );
}
