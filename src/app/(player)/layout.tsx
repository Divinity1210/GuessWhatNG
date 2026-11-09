"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MobileNav, Logo } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { playMenuClick } from "@/lib/audio/sound-effects";
import {
  SessionResultsPopup,
  openSessionResultsPopup,
} from "@/components/game/SessionResultsPopup";
import {
  TrendingUpIcon,
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  HelpCircleIcon,
  TargetIcon,
  ZapIcon,
   type IconProps,
} from "@/components/ui/Icons";

function InboxIcon({ className = "size-5", size, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function ChatBubbleIcon({ className = "size-5", size, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const navGroups = [
  {
    label: "Game",
    items: [
      { label: "Home", href: "/dashboard", Icon: TrendingUpIcon },
      { label: "Play", href: "/play", Icon: PlayIcon },
      { label: "Leaderboard", href: "/leaderboard", Icon: TrophyIcon },
      { label: "Community", href: "/community", Icon: ChatBubbleIcon, isLive: true },
      { label: "Inbox", href: "/inbox", Icon: InboxIcon, showBadge: true },
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
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Player";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isAdmin =
    profile?.role === "super_admin" ||
    user?.email === "admin@guesswhat.ng" ||
    user?.email === "master@guesswhat.ng" ||
    user?.email === "muyiwa.a@gramefdigitalagency.com";

  const fetchUnread = useCallback(async () => {
    try {
      const uid = user?.id ?? "";
      const res = await fetch(`/api/inbox?userId=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch {
      // Ignore network errors
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread, pathname]);

  useEffect(() => {
    const handler = () => fetchUnread();
    window.addEventListener("gw-inbox-updated", handler);
    return () => window.removeEventListener("gw-inbox-updated", handler);
  }, [fetchUnread]);

  const handleSignOut = async () => {
    playMenuClick();
    await signOut();
    router.push("/");
  };

  const handleDelegatedClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const interactive = target.closest("a, button, [role='tab'], [role='menuitem']");
    if (interactive) {
      playMenuClick();
    }
  };

  return (
    <div
      onClick={handleDelegatedClick}
      className="flex min-h-screen bg-[#07090e] text-slate-100"
    >
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
                  const badgeCount =
                    "showBadge" in item && item.showBadge ? unreadCount : 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => playMenuClick()}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-200 ${
                          active
                            ? "bg-accent-muted text-accent font-semibold border border-accent/30"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <item.Icon className="size-4.5" />
                          <span>{item.label}</span>
                        </span>
                        {badgeCount > 0 ? (
                          <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                            {badgeCount}
                          </span>
                        ) : "isLive" in item && item.isLive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Live</span>
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => openSessionResultsPopup({ initialTab: "feedback" })}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
            >
              <span>🏁 Past Session Results</span>
              <span>📊</span>
            </button>
          </div>

          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-white/5">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Administration
              </p>
              <a
                href="https://guesswhat-admin.vercel.app/admin"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playMenuClick()}
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
              onClick={() => playMenuClick()}
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
              onClick={() => {
                playMenuClick();
                setMenuOpen(!menuOpen);
              }}
              aria-label="Open menu"
              className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openSessionResultsPopup({ initialTab: "feedback" })}
              aria-label="Open past session results and crowd feedback"
              className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25"
            >
              🏁 Past Results
            </button>

            <Link
              href="/inbox"
              onClick={() => playMenuClick()}
              aria-label="Inbox"
              className="relative p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white"
            >
              <InboxIcon className="size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              onClick={() => playMenuClick()}
              className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <span className="grid size-6 place-items-center rounded-lg bg-accent text-[10px] font-bold text-white">
                {initials}
              </span>
              <span className="max-w-24 truncate">{displayName}</span>
            </Link>
          </div>
        </header>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl md:hidden flex flex-col p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  setMenuOpen(false);
                }}
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
                    {group.items.map((item) => {
                      const badgeCount =
                        "showBadge" in item && item.showBadge ? unreadCount : 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            playMenuClick();
                            setMenuOpen(false);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm font-medium text-slate-200"
                        >
                          <span className="flex items-center gap-2.5">
                            <item.Icon className="size-4 text-accent" />
                            <span>{item.label}</span>
                          </span>
                          {badgeCount > 0 && (
                            <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                              {badgeCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => openSessionResultsPopup({ initialTab: "feedback" })}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
            >
              <span>🏁 Past Session Results</span>
              <span>📊</span>
            </button>
          </div>

          {isAdmin && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Administration
                  </p>
                  <a
                    href="https://guesswhat-admin.vercel.app/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playMenuClick()}
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

        <div
          className={`mx-auto ${
            pathname.startsWith("/community") ? "max-w-7xl" : "max-w-5xl px-4 py-6 md:px-8 md:py-8"
          } pb-28 md:pb-10 flex-1 w-full`}
        >
          {children}
        </div>
      </main>

      <SessionResultsPopup />
      <MobileNav />
    </div>
  );
}
