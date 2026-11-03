"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { CheckIcon, ZapIcon, TrophyIcon, HelpCircleIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export default function InboxPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadInbox = useCallback(async () => {
    try {
      const uid = user?.id ?? "";
      const res = await fetch(`/api/inbox?userId=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error("Inbox load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const notifyInboxBadge = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gw-inbox-updated"));
    }
  };

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "",
          notificationId: id,
        }),
      });
      notifyInboxBadge();
    } catch {
      // Ignore network errors
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "",
          markAll: true,
        }),
      });
      notifyInboxBadge();
    } catch {
      // Ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredList =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-white">
              Inbox
            </h1>
            {unreadCount > 0 && (
              <Badge variant="active">{unreadCount} unread</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Session announcements, winner alerts, and customer support replies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-[#0d111c] p-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === "all"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === "unread"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              <CheckIcon className="size-3.5 mr-1.5" />
              {markingAll ? "Marking..." : "Mark all as read"}
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <section className="space-y-3">
        {filteredList.length > 0 ? (
          filteredList.map((item) => {
            const lowerTitle = item.title.toLowerCase();
            const isSupport =
              lowerTitle.includes("support") || lowerTitle.includes("ticket");
            const isWinner =
              lowerTitle.includes("winner") ||
              lowerTitle.includes("result") ||
              lowerTitle.includes("prize");

            return (
              <article
                key={item.id}
                onClick={() => {
                  if (!item.read) handleMarkRead(item.id);
                }}
                className={`rounded-2xl border p-5 transition-all cursor-pointer ${
                  !item.read
                    ? "border-accent/40 bg-[#0d111c] shadow-sm"
                    : "border-white/10 bg-[#0b0e17]/80 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        isWinner
                          ? "bg-amber-500/15 text-amber-400"
                          : isSupport
                          ? "bg-sky-500/15 text-sky-400"
                          : "bg-accent/15 text-accent"
                      }`}
                    >
                      {isWinner ? (
                        <TrophyIcon className="size-4.5" />
                      ) : isSupport ? (
                        <HelpCircleIcon className="size-4.5" />
                      ) : (
                        <ZapIcon className="size-4.5" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-sm sm:text-base font-bold text-white">
                          {item.title}
                        </h2>
                        {!item.read && (
                          <span className="inline-flex items-center rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {item.body}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 pt-1.5 text-xs text-slate-500">
                        <span>
                          {new Date(item.created_at).toLocaleString("en-NG", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {isSupport && (
                          <Link
                            href="/support"
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-accent hover:underline"
                          >
                            View Support Ticket →
                          </Link>
                        )}
                        {isWinner && (
                          <Link
                            href="/leaderboard?tab=winners"
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-accent hover:underline"
                          >
                            View Winners Board →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!item.read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(item.id);
                      }}
                      className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-12 text-center space-y-2">
            <p className="font-display text-base font-bold text-white">
              {filter === "unread" ? "You're all caught up!" : "Your inbox is empty"}
            </p>
            <p className="text-xs text-slate-400">
              New session alerts, prize notifications, and support updates will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
