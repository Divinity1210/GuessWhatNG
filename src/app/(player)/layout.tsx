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
  HomeIcon,
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  HelpCircleIcon,
  UserIcon,
  SettingsIcon,
  HeadsetIcon,
  InboxIcon,
  MessageSquareIcon,
  BarChartIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  CloseIcon,
  MenuIcon,
} from "@/components/ui/Icons";

const navGroups = [
  {
    label: "Game",
    items: [
      { label: "Home", href: "/dashboard", Icon: HomeIcon },
      { label: "Play", href: "/play", Icon: PlayIcon },
      { label: "Leaderboard", href: "/leaderboard", Icon: TrophyIcon },
      { label: "Community", href: "/community", Icon: MessageSquareIcon, isLive: true },
      { label: "Inbox", href: "/inbox", Icon: InboxIcon, showBadge: true },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/profile", Icon: UserIcon },
      { label: "Referrals", href: "/referrals", Icon: UsersIcon },
      { label: "How to Play", href: "/how-to-play", Icon: HelpCircleIcon },
      { label: "Support", href: "/support", Icon: HeadsetIcon },
      { label: "Settings", href: "/settings", Icon: SettingsIcon },
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
      className="flex min-h-dvh bg-[#07090e] text-slate-100"
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col border-r border-white/[0.06] bg-[#0b0e17] fixed inset-y-0 left-0 z-40">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <Logo size="sm" href="/dashboard" />
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <ul className="space-y-0.5">
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
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${
                          active
                            ? "bg-accent-muted text-accent font-semibold border border-accent/25"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <item.Icon className="size-4.5 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                        {badgeCount > 0 ? (
                          <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                            {badgeCount}
                          </span>
                        ) : "isLive" in item && item.isLive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
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

          <div className="pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => openSessionResultsPopup({ initialTab: "feedback" })}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold bg-white/[0.04] text-slate-200 border border-white/10 hover:border-accent/35 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <BarChartIcon className="size-4 text-accent" />
                <span>Session Results</span>
              </span>
              <ChevronRightIcon className="size-3.5 text-slate-400" />
            </button>
          </div>

          {isAdmin && (
            <div className="space-y-1.5 pt-3 border-t border-white/[0.06]">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Admin
              </p>
              <a
                href="https://guesswhat-admin.vercel.app/admin"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playMenuClick()}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
              >
                <span>Admin Portal</span>
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </div>
          )}
        </nav>

        <div className="border-t border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              onClick={() => playMenuClick()}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-xs font-bold text-white"
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

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-w-0 flex flex-col">
        {/* Compact Mobile Top Bar (fits cleanly on 360px+ screens) */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0b0e17]/95 px-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                playMenuClick();
                setMenuOpen(true);
              }}
              aria-label="Open menu"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 active:bg-white/[0.08]"
            >
              <MenuIcon className="size-5" />
            </button>
            <Logo size="xs" href="/dashboard" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => openSessionResultsPopup({ initialTab: "feedback" })}
              aria-label="Session results"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/10 px-2.5 text-xs font-semibold text-slate-200 active:bg-white/[0.08]"
            >
              <BarChartIcon className="size-3.5 text-accent" />
              <span>Results</span>
            </button>

            <Link
              href="/inbox"
              onClick={() => playMenuClick()}
              aria-label="Inbox"
              className="relative grid size-10 place-items-center rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 active:bg-white/[0.08]"
            >
              <InboxIcon className="size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              onClick={() => playMenuClick()}
              aria-label="Profile"
              className="grid size-10 place-items-center rounded-xl bg-accent/15 border border-accent/30 text-xs font-bold text-accent active:bg-accent/25"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Mobile Full-Height Menu Sheet */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-[#07090e]/96 backdrop-blur-xl md:hidden flex flex-col px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-fade-in">
            <div className="flex h-12 items-center justify-between border-b border-white/[0.06] pb-3">
              <Logo size="xs" href="/dashboard" />
              <button
                type="button"
                onClick={() => {
                  playMenuClick();
                  setMenuOpen(false);
                }}
                aria-label="Close menu"
                className="grid size-10 place-items-center rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 active:text-white"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-5">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
                          className={`flex min-h-12 items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium border transition-colors ${
                            active
                              ? "bg-accent-muted border-accent/30 text-accent font-semibold"
                              : "bg-white/[0.03] border-white/[0.06] text-slate-200 active:bg-white/[0.06]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <item.Icon className="size-4 shrink-0 text-accent" />
                            <span className="truncate">{item.label}</span>
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

              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openSessionResultsPopup({ initialTab: "feedback" });
                  }}
                  className="w-full flex min-h-12 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold bg-white/[0.04] text-slate-100 border border-white/10 active:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <BarChartIcon className="size-4 text-accent" />
                    <span>Session Results & Standings</span>
                  </span>
                  <ChevronRightIcon className="size-4 text-slate-400" />
                </button>

                {isAdmin && (
                  <a
                    href="https://guesswhat-admin.vercel.app/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playMenuClick()}
                    className="flex min-h-12 items-center justify-between rounded-xl px-4 py-3 bg-amber-500/12 border border-amber-500/25 text-sm font-semibold text-amber-300"
                  >
                    <span>Admin Portal</span>
                    <ExternalLinkIcon className="size-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-11 shrink-0 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold active:bg-rose-500/20"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        <div
          className={`mx-auto ${
            pathname.startsWith("/community")
              ? "max-w-7xl"
              : "max-w-5xl px-3.5 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8"
          } pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10 flex-1 w-full`}
        >
          {children}
        </div>
      </main>

      <SessionResultsPopup />
      <MobileNav />
    </div>
  );
}
