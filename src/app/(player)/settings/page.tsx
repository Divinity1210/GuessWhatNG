"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateProfile } from "@/lib/supabase/queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [username, setUsername] = useState(profile?.username ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const inputClass = "w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      {/* ── Profile settings ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Profile</h2>
        <p className="mt-1 text-sm text-ink-muted">Update your display name and username.</p>

        {error && (
          <div className="mt-3 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {saved && (
          <div className="mt-3 rounded-[var(--radius-sm)] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Profile updated successfully!
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleProfileUpdate}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Email</label>
            <input type="email" value={user?.email ?? ""} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </form>
      </section>

      {/* ── Password change ── */}
      <section className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="font-display text-lg font-bold">Change Password</h2>
        <p className="mt-1 text-sm text-ink-muted">Update your account password.</p>

        {pwError && (
          <div className="mt-3 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="mt-3 rounded-[var(--radius-sm)] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Password changed successfully!
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handlePasswordChange}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className={inputClass} />
          </div>
          <Button type="submit" variant="secondary" disabled={pwSaving}>{pwSaving ? "Changing..." : "Change Password"}</Button>
        </form>
      </section>

      {/* ── Danger zone ── */}
      <section className="rounded-card border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="font-display text-lg font-bold text-red-400">Danger Zone</h2>
        <p className="mt-1 text-sm text-ink-muted">Irreversible actions.</p>
        <div className="mt-4 flex gap-3">
          <Button variant="danger" onClick={signOut}>Sign Out</Button>
        </div>
      </section>
    </div>
  );
}
