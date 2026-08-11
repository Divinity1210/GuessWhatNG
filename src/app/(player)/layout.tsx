"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MobileNav, Logo } from "@/components/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUserWallet, type WalletRow } from "@/lib/supabase/queries";
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
      { label: "Play Now", href: "/play", Icon: PlayIcon },
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
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Player";
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!user) return;
    getUserWallet(user.id)
      .then(setWallet)
      .catch((err) => console.error("Wallet header load error:", err));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-[#07090e] text-slate-100">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-white/5 bg-[#0b0e17]/90 backdrop-blur-2xl fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <Logo size="sm" />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
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
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${
                          active
                            ? "bg-accent-muted text-accent font-semibold border border-accent/30 shadow-md shadow-accent/10"
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
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-accent to-purple-600 font-display text-xs font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <button
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
      <main className="flex-1 md:ml-64 lg:ml-72 min-w-0 flex flex-col">
        {/* Top bar (mobile view WIMBF redesign) */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#0b0e17]/85 px-4 py-3 backdrop-blur-2xl md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            >
              ☰
            </button>
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 shadow-sm"
            >
              <CoinsIcon className="size-3.5" />
              <span>{wallet?.coin_balance.toLocaleString() ?? 0}</span>
            </Link>

            <Link
              href="/profile"
              className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-accent to-purple-600 text-xs font-bold text-white shadow-md"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Full Mobile Navigation Menu Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl md:hidden flex flex-col p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <Logo size="sm" />
              <button
                onClick={() => setMenuOpen(false)}
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
                        className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-sm font-semibold text-slate-200"
                      >
                        <item.Icon className="size-4 text-accent" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{displayName}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 pb-28 md:pb-8 flex-1 w-full">
          {children}
        </div>
      </main>

      {/* ── Mobile WIMBF Floating Dock Nav ── */}
      <MobileNav />
    </div>
  );
}
