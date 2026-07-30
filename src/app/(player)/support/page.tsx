"use client";

import { useEffect, useState } from "react";
import { Button, Badge, EmptyState } from "@/components/ui";
import { HelpCircleIcon } from "@/components/ui/Icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getMyTickets, getTicketMessages, createTicket, sendTicketMessage, type TicketRow, type TicketMessageRow } from "@/lib/supabase/queries";

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);

  // Reply form
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const t = await getMyTickets(user!.id);
        setTickets(t);
      } catch (err) {
        console.error("Support load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

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
    if (!user || !subject.trim() || !body.trim()) return;
    setCreating(true);
    try {
      const ticketId = await createTicket(user.id, subject.trim(), body.trim());
      setSubject("");
      setBody("");
      setShowNew(false);
      const t = await getMyTickets(user.id);
      setTickets(t);
      setSelectedTicket(ticketId);
    } catch (err) {
      console.error("Create ticket error:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || !reply.trim()) return;
    setSending(true);
    try {
      await sendTicketMessage(selectedTicket, user.id, reply.trim());
      setReply("");
      const msgs = await getTicketMessages(selectedTicket);
      setMessages(msgs);
    } catch (err) {
      console.error("Send reply error:", err);
    } finally {
      setSending(false);
    }
  };

  const inputClass = "w-full rounded-[var(--radius-sm)] border border-rule bg-paper-3 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30";

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Support</h1>
        <Button size="sm" onClick={() => { setShowNew(true); setSelectedTicket(null); }}>
          New Ticket
        </Button>
      </div>

      {/* ── New ticket form ── */}
      {showNew && (
        <section className="rounded-card border border-rule bg-paper-2 p-6">
          <h2 className="font-display text-lg font-bold">Create Support Ticket</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreateTicket}>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your issue..." required rows={4} className={inputClass} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Submit Ticket"}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </form>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Ticket list ── */}
        <section className="lg:col-span-1 space-y-2">
          {tickets.length > 0 ? tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedTicket(t.id); setShowNew(false); }}
              className={`w-full text-left rounded-[var(--radius-sm)] border px-4 py-3 transition-all ${
                selectedTicket === t.id ? "border-accent bg-accent-muted" : "border-rule bg-paper-2 hover:border-rule-2"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink truncate">{t.subject}</p>
                <Badge variant={statusColors[t.status] ?? "default"} className="text-[0.6rem]">{t.status}</Badge>
              </div>
              <p className="text-xs text-ink-muted mt-1">{new Date(t.updated_at).toLocaleDateString("en-NG")}</p>
            </button>
          )) : (
            <p className="text-sm text-ink-muted text-center py-8">No tickets yet.</p>
          )}
        </section>

        {/* ── Conversation ── */}
        <section className="lg:col-span-2 rounded-card border border-rule bg-paper-2 p-6">
          {selectedTicket ? (
            <>
              <h2 className="font-display text-lg font-bold mb-4">Conversation</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`rounded-[var(--radius-sm)] px-4 py-3 ${
                      isMe ? "bg-accent-muted border border-accent/20 ml-8" : "bg-paper-3 border border-rule/50 mr-8"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-ink">{isMe ? "You" : msg.profiles?.username ?? "Support"}</p>
                        <p className="text-xs text-ink-muted">{new Date(msg.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <p className="text-sm text-ink-2">{msg.body}</p>
                    </div>
                  );
                })}
              </div>
              <form className="mt-4 flex gap-2" onSubmit={handleReply}>
                <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply..." className={`flex-1 ${inputClass}`} />
                <Button type="submit" size="sm" disabled={sending}>{sending ? "..." : "Send"}</Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircleIcon className="size-10 text-ink-muted mb-3" />
              <p className="text-sm text-ink-muted">Select a ticket or create a new one.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
