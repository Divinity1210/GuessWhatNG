"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MobileNav, Logo } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  TrendingUpIcon,
  PlayIcon,
  CalendarIcon,
  TrophyIcon,
  CoinsIcon,
  GiftIcon,
  UsersIcon,
  HelpCircleIcon,
  TargetIcon,
  ZapIcon,
} from "@/components/ui/Icons";

/* ── Navigation structure from Sidebar Content IA ── */
const navGroups = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", Icon: TrendingUpIcon },
      { label: "Play", href: "/play", Icon: PlayIcon },
      { label: "Sessions", href: "/sessions", Icon: CalendarIcon },
      { label: "Leaderboard", href: "/leaderboard", Icon: TrophyIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Wallet", href: "/wallet", Icon: CoinsIcon },
      { label: "Rewards", href: "/rewards", Icon: GiftIcon },
      { label: "Referrals", href: "/referrals", Icon: UsersIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Support", href: "/support", Icon: HelpCircleIcon },
      { label: "Profile", href: "/profile", Icon: TargetIcon },
      { label: "Settings", href: "/settings", Icon: ZapIcon },
    ],
  },
];

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Player";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-rule bg-paper-2 fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="px-6 py-5">
          <Logo size="sm" />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-ink-muted">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition-all duration-200 ${
                          active
                            ? "bg-accent-muted text-accent font-semibold"
                            : "text-ink-3 hover:bg-surface-boost hover:text-ink"
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
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-rule px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent-3 to-accent font-display text-sm font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <button
                onClick={handleSignOut}
                className="text-xs text-ink-muted hover:text-accent transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-64 lg:ml-72">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper/90 px-4 py-3 backdrop-blur-xl md:hidden">
          <Logo size="sm" />
          <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent-3 to-accent text-xs font-bold text-white font-display">
            {initials}
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <MobileNav />
    </div>
  );
}
