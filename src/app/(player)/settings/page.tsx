"use client";

import { Button } from "@/components/ui";

const settingGroups = [
  {
    title: "Account Settings",
    items: [
      { label: "Username", value: "GuestPlayer", type: "text" },
      { label: "Email", value: "guest@example.com", type: "text" },
      { label: "Phone", value: "+234 *** *** 1234", type: "text" },
      { label: "Change Password", value: "", type: "action" },
    ],
  },
  {
    title: "Notification Preferences",
    items: [
      { label: "Session reminders", value: true, type: "toggle" },
      { label: "Win notifications", value: true, type: "toggle" },
      { label: "Referral updates", value: true, type: "toggle" },
      { label: "Marketing emails", value: false, type: "toggle" },
      { label: "Push notifications", value: true, type: "toggle" },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { label: "Show profile on leaderboard", value: true, type: "toggle" },
      { label: "Two-factor authentication", value: false, type: "toggle" },
      { label: "Login activity", value: "", type: "action" },
    ],
  },
  {
    title: "Appearance",
    items: [
      { label: "Dark mode", value: true, type: "toggle" },
      { label: "Reduced animations", value: false, type: "toggle" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage your account preferences</p>
      </div>

      {settingGroups.map((group) => (
        <section key={group.title} className="rounded-card border border-rule bg-paper-2">
          <div className="border-b border-rule px-5 py-4">
            <h2 className="font-display font-semibold">{group.title}</h2>
          </div>
          <div className="divide-y divide-rule/50">
            {group.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-ink">{item.label}</span>
                {item.type === "text" && (
                  <span className="text-sm text-ink-3">{item.value as string}</span>
                )}
                {item.type === "toggle" && (
                  <button
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                      item.value ? "bg-accent" : "bg-rule-2"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-200 ${
                        item.value ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                )}
                {item.type === "action" && (
                  <Button variant="ghost" size="sm">
                    Manage →
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Legal */}
      <section className="rounded-card border border-rule bg-paper-2">
        <div className="border-b border-rule px-5 py-4">
          <h2 className="font-display font-semibold">Legal</h2>
        </div>
        <div className="divide-y divide-rule/50">
          {["Terms of Service", "Privacy Policy", "Cookie Policy"].map((item) => (
            <button key={item} className="flex w-full items-center justify-between px-5 py-4 text-sm text-ink hover:bg-surface-boost transition-colors">
              {item}
              <span className="text-ink-muted">→</span>
            </button>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-card border border-danger/25 bg-danger/5 p-5">
        <h2 className="font-display font-semibold text-danger">Account Actions</h2>
        <p className="mt-1 text-sm text-ink-3">These actions are irreversible</p>
        <div className="mt-4 flex gap-3">
          <Button variant="danger" size="sm">Log Out</Button>
          <Button variant="danger" size="sm">Delete Account</Button>
        </div>
      </section>
    </div>
  );
}
