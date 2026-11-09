"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Badge } from "@/components/ui";
import {
  HelpCircleIcon,
  StarIcon,
  PlusIcon,
  CloseIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getMyTickets,
  getTicketMessages,
  sendTicketMessage,
  type TicketRow,
  type TicketMessageRow,
} from "@/lib/supabase/queries";

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // New ticket / feedback form
  const [category, setCategory] = useState<"support" | "feedback">("support");
  const [rating, setRating] = useState<number>(5);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);

  // Reply form
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      const uid = user?.id ?? "";
      const t = await getMyTickets(uid);
      setTickets(t);
      if (t.length > 0 && !selectedTicket) {
        setSelectedTicket(t[0].id);
      }
    } catch (err) {
      console.error("Support load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedTicket]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicket) return;
    async function loadMessages() {
      const msgs = await getTicketMessages(selectedTicket!);
      setMessages(msgs);
    }
    loadMessages();
  }, [selectedTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setCreating(true);
    setSubmitBanner(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "",
          category,
          rating: category === "feedback" ? rating : undefined,
          subject: subject.trim(),
          message: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      const newId = data.ticket?.id as string | undefined;
      setSubject("");
      setBody("");
      setShowNew(false);
      setSubmitBanner(
        category === "feedback"
          ? "Thank you. Your gameplay feedback has been submitted."
          : "Your customer support ticket has been created.",
      );
      const t = await getMyTickets(user?.id ?? "");
      setTickets(t);
      if (newId) setSelectedTicket(newId);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gw-inbox-updated"));
      }
    } catch (err) {
      console.error("Create ticket error:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reply.trim()) return;
    setSending(true);
    try {
      await sendTicketMessage(selectedTicket, user?.id ?? "", reply.trim());
      setReply("");
      const msgs = await getTicketMessages(selectedTicket);
      setMessages(msgs);
    } catch (err) {
      console.error("Send reply error:", err);
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "min-h-11 w-full rounded-xl border border-white/15 bg-[#07090e] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const statusColors: Record<string, "active" | "info" | "default" | "upcoming"> = {
    open: "active",
    pending: "upcoming",
    resolved: "info",
    closed: "default",
  };

  const activeTicketObj = tickets.find((t) => t.id === selectedTicket);

  return (
    <div className="space-y-5 animate-fade-in min-w-0 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Support &amp; Gameplay Feedback
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit a support ticket or share gameplay feedback with the GuessWhat team.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 min-w-0">
          <Button
            size="sm"
            onClick={() => {
              setCategory("support");
              setShowNew(true);
            }}
          >
            <PlusIcon className="size-3.5 mr-1.5" />
            Support Ticket
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setCategory("feedback");
              setShowNew(true);
            }}
          >
            <StarIcon className="size-3.5 mr-1.5 text-amber-400" />
            Feedback
          </Button>
        </div>
      </div>

      {submitBanner && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center justify-between gap-3"
        >
          <span>{submitBanner}</span>
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => setSubmitBanner(null)}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-emerald-200 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      )}

      {/* New ticket / feedback form */}
      {showNew && (
        <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-white">
              {category === "feedback"
                ? "Submit Gameplay Feedback"
                : "Create Support Ticket"}
            </h2>
            <div className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex rounded-xl border border-white/10 bg-[#07090e] p-1">
              <button
                type="button"
                onClick={() => setCategory("support")}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === "support"
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Support Ticket
              </button>
              <button
                type="button"
                onClick={() => setCategory("feedback")}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === "feedback"
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Gameplay Feedback
              </button>
            </div>
          </div>

          <form className="space-y-4 min-w-0" onSubmit={handleCreateTicket}>
            {category === "feedback" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Gameplay Experience Rating
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                        rating >= star
                          ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                          : "border-white/10 bg-white/[0.02] text-slate-500"
                      }`}
                    >
                      <StarIcon className="size-3.5" />
                      <span>{star}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  category === "feedback"
                    ? "e.g. Suggestion for session questions or leaderboard"
                    : "Brief description of your issue"
                }
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                {category === "feedback" ? "Your Feedback" : "Message"}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  category === "feedback"
                    ? "Tell us what works well or what we should improve..."
                    : "Describe your issue in detail..."
                }
                required
                rows={4}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                {creating
                  ? "Submitting..."
                  : category === "feedback"
                  ? "Submit Feedback"
                  : "Submit Ticket"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNew(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 min-w-0">
        {/* Ticket list */}
        <section className="lg:col-span-1 space-y-2 min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Your Tickets &amp; Feedback ({tickets.length})
          </h2>
          {tickets.length > 0 ? (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTicket(t.id);
                  setShowNew(false);
                }}
                className={`min-h-14 w-full max-w-full overflow-hidden text-left rounded-xl border px-3.5 py-3 transition-all ${
                  selectedTicket === t.id
                    ? "border-accent bg-accent/10"
                    : "border-white/10 bg-[#0d111c] hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5 min-w-0">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-white line-clamp-2 break-words">
                    {t.subject}
                  </p>
                  <Badge
                    variant={statusColors[t.status] ?? "default"}
                    className="text-[0.65rem] shrink-0 mt-0.5"
                  >
                    {t.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Updated {new Date(t.updated_at).toLocaleDateString("en-NG")}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 text-center">
              <p className="text-sm text-slate-400">
                No tickets or feedback submitted yet.
              </p>
            </div>
          )}
        </section>

        {/* Conversation */}
        <section className="lg:col-span-2 min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d111c] p-4 sm:p-6">
          {selectedTicket ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 mb-4 min-w-0">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base sm:text-lg font-bold text-white break-words">
                    {activeTicketObj?.subject ?? "Conversation"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Replies from Support also appear in your Inbox.
                  </p>
                </div>
                {activeTicketObj && (
                  <Badge
                    variant={statusColors[activeTicketObj.status] ?? "default"}
                    className="shrink-0"
                  >
                    {activeTicketObj.status}
                  </Badge>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isAdminReply =
                      msg.profiles?.role &&
                      msg.profiles.role !== "player";
                    const isMe = !isAdminReply && msg.sender_id === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl px-3.5 py-3 ${
                          isMe
                            ? "bg-accent/15 border border-accent/30 ml-4 sm:ml-8"
                            : "bg-white/[0.04] border border-white/10 mr-4 sm:mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-white">
                            {isAdminReply
                              ? "GuessWhat Support"
                              : isMe
                              ? "You"
                              : msg.profiles?.username ?? "Player"}
                          </p>
                          <p className="text-[11px] tabular-nums text-slate-400">
                            {new Date(msg.created_at).toLocaleString("en-NG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-slate-200 whitespace-pre-line break-words">
                          {msg.body}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No messages in this thread yet.
                  </p>
                )}
              </div>

              <form className="mt-4 flex items-center gap-2 min-w-0" onSubmit={handleReply}>
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a follow-up..."
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <Button type="submit" size="md" disabled={sending} className="shrink-0">
                  {sending ? "..." : "Send"}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircleIcon className="size-10 text-slate-500 mb-3" />
              <p className="text-sm text-slate-400">
                Select a ticket from the list or open a new support ticket above.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
