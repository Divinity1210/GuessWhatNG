import Link from "next/link";
import { Logo } from "@/components/logo";

const nav = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Play", href: "/play" },
      { label: "Sessions", href: "/sessions" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Wallet", href: "/wallet" },
      { label: "Rewards", href: "/rewards" },
      { label: "Referrals", href: "/referrals" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Support", href: "/support" },
      { label: "Profile", href: "/profile" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export default function PlayerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar p-5 md:flex">
        <Logo href="/dashboard" />
        <nav className="mt-8 flex flex-col gap-6">
          {nav.map((group) => (
            <div key={group.section}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/35">
                {group.section}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-btn px-3 py-2 text-sm text-white/70 hover:bg-card hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-6 md:p-8">{children}</div>
    </div>
  );
}
