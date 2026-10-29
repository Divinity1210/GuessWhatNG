"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { MobileNav, Logo } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  TrendingUpIcon,
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  HelpCircleIcon,
  TargetIcon,
  ZapIcon,
} from "@/components/ui/Icons";

const navGroups = [
  {
    label: "Game",
    items: [
      { label: "Home", href: "/dashboard", Icon: TrendingUpIcon },
      { label: "Play", href: "/play", Icon: PlayIcon },
      { label: "Leaderboard", href: "/leaderboard", Icon: TrophyIcon },
    ],
  },
  {
    label: "Options",
    items: [
      { label: "Profile", href: "/profile", Icon: TargetIcon },
      { label: "Referrals", href: "/referrals", Icon: UsersIcon },
      { label: "How to Play", href: "/how-to-play", Icon: HelpCircleIcon },
      { label: "Support", href: "/support", Icon: HelpCircleIcon },
      { label: "Settings", href: "/settings", Icon: ZapIcon },
    ],
  },
];

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Player";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isAdmin =
    profile?.role === "super_admin" ||
    user?.email === "admin@guesswhat.ng" ||
    user?.email === "master@guesswhat.ng";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-[#07090e] text-slate-100">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-60 flex-col border-r border-white/5 bg-[#0b0e17] fixed inset-y-0 left-0 z-40">
        <div className="px-6 py-5 border-b border-white/5">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-200 ${
                          active
                            ? "bg-accent-muted text-accent font-semibold border border-accent/30"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        <item.Icon className="size-4.5" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-white/5">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Administration
              </p>
              <a
                href="https://guesswhat-admin.vercel.app/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
              >
                <span>Admin Portal</span>
                <span>↗</span>
              </a>
            </div>
          )}
        </nav>

        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="grid size-9 place-items-center rounded-xl bg-accent font-display text-xs font-bold text-white"
            >
              {initials}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-60 min-w-0 flex flex-col">
        {/* Clean Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#0b0e17]/90 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
              className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Logo size="sm" />
          </div>

          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            <span className="grid size-6 place-items-center rounded-lg bg-accent text-[10px] font-bold text-white">
              {initials}
            </span>
            <span className="max-w-24 truncate">{displayName}</span>
          </Link>
        </header>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl md:hidden flex flex-col p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm font-medium text-slate-200"
                      >
                        <item.Icon className="size-4 text-accent" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {isAdmin && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Administration
                  </p>
                  <a
                    href="https://guesswhat-admin.vercel.app/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-bold text-amber-300"
                  >
                    <span>Open Admin Portal</span>
                    <span>↗</span>
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{displayName}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8 pb-28 md:pb-10 flex-1 w-full">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
