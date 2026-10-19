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

const navGroups = [
  {
    label: "Arena",
    items: [
      { label: "Overview", href: "/dashboard", Icon: TrendingUpIcon },
      { label: "Live Arena", href: "/play", Icon: PlayIcon },
      { label: "Schedule", href: "/sessions", Icon: CalendarIcon },
      { label: "Standings", href: "/leaderboard", Icon: TrophyIcon },
    ],
  },
  {
    label: "Ledger",
    items: [
      { label: "Wallet", href: "/wallet", Icon: CoinsIcon },
      { label: "Payouts", href: "/rewards", Icon: GiftIcon },
      { label: "Squad & Turf", href: "/referrals", Icon: UsersIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/profile", Icon: TargetIcon },
      { label: "Settings", href: "/settings", Icon: ZapIcon },
      { label: "Support", href: "/support", Icon: HelpCircleIcon },
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
    <div className="flex min-h-screen bg-[#090A0D] text-[#F4F5F8]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-[#222631] bg-[#090A0D] fixed inset-y-0 left-0 z-40">
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#222631]">
          <Logo size="sm" href="/dashboard" />
          <span className="rounded border border-[#222631] bg-[#111318] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8A92A6]">
            NGN
          </span>
        </div>

        {/* Compact Balance Strip */}
        <div className="border-b border-[#222631] bg-[#111318] px-5 py-3.5">
          <div className="flex items-center justify-between text-[11px] text-[#8A92A6]">
            <span>Cash Balance</span>
            <Link href="/wallet" className="text-[#F7911B] hover:underline font-medium">
              Top up
            </Link>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-base font-semibold text-[#F4F5F8] tabular-nums">
              ₦{(wallet?.withdrawable_balance ?? 0).toLocaleString()}
            </span>
            <span className="font-mono text-xs font-medium text-[#F7911B] tabular-nums">
              {(wallet?.coin_balance ?? 0).toLocaleString()} GW
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E6678]">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors duration-150 ${
                          active
                            ? "bg-[#171A21] text-[#F4F5F8] font-semibold border border-[#2E3442]"
                            : "text-[#8A92A6] hover:bg-[#111318] hover:text-[#F4F5F8] border border-transparent"
                        }`}
                      >
                        <item.Icon className={`size-4 ${active ? "text-[#F7911B]" : "text-[#8A92A6]"}`} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-[#222631] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-[#171A21] border border-[#2E3442] font-mono text-xs font-semibold text-[#F4F5F8]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-[#F4F5F8]">@{displayName}</p>
              <button
                onClick={handleSignOut}
                className="text-[11px] text-[#8A92A6] hover:text-[#EF4444] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Column ── */}
      <main className="flex-1 md:ml-60 lg:ml-64 min-w-0 flex flex-col">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#222631] bg-[#090A0D]/95 px-4 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
              className="grid size-8 place-items-center rounded-lg border border-[#222631] bg-[#111318] text-[#C8CDD8]"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
            <Logo size="xs" href="/dashboard" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/wallet"
              className="flex items-center gap-2 rounded-lg border border-[#222631] bg-[#111318] px-2.5 py-1 text-xs"
            >
              <span className="font-mono font-semibold text-[#10B981] tabular-nums">
                ₦{(wallet?.withdrawable_balance ?? 0).toLocaleString()}
              </span>
              <span className="h-3 w-[1px] bg-[#222631]" />
              <span className="font-mono font-medium text-[#F7911B] tabular-nums">
                {(wallet?.coin_balance ?? 0).toLocaleString()}c
              </span>
            </Link>

            <Link
              href="/profile"
              className="grid size-8 place-items-center rounded-lg border border-[#2E3442] bg-[#171A21] font-mono text-[11px] font-semibold text-[#F4F5F8]"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-[#090A0D] md:hidden flex flex-col p-5 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#222631] pb-4">
              <Logo size="xs" href="/dashboard" />
              <button
                onClick={() => setMenuOpen(false)}
                className="grid size-8 place-items-center rounded-lg border border-[#222631] bg-[#111318] text-xs text-[#8A92A6]"
              >
                ESC
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E6678]">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg border border-[#222631] bg-[#111318] p-3 text-xs font-medium text-[#F4F5F8] hover:border-[#2E3442]"
                      >
                        <item.Icon className="size-4 text-[#F7911B]" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#222631] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#F4F5F8]">@{displayName}</p>
                <p className="text-[11px] text-[#8A92A6]">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-1.5 text-xs font-medium text-[#EF4444]"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7 pb-24 md:pb-10 flex-1 w-full">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <MobileNav />
    </div>
  );
}
