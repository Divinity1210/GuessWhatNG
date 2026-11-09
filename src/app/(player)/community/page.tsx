"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  FlameIcon,
  SmileIcon,
  TargetIcon,
  ShieldCheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  PlusIcon,
  SendIcon,
} from "@/components/ui/Icons";

type ChatMessage = {
  id: number;
  postId?: string | null;
  userId: string | null;
  isSystem: boolean;
  body: string;
  username: string;
  state: string;
  rank: number | null;
  points?: number | null;
  reactions: Record<string, number>;
  createdAt: string;
};

type PollOption = {
  id: string;
  label: string;
  votes: number;
  percentage: number;
};

type CommunityPost = {
  id: string;
  kind: "poll" | "topic" | "verdict" | "sponsored_poll";
  category: string;
  title: string;
  body: string | null;
  isPinned: boolean;
  isLocked: boolean;
  sponsorName: string | null;
  sponsorCtaLabel: string | null;
  sponsorCtaUrl: string | null;
  authorUsername: string;
  authorState: string | null;
  authorRank: number | null;
  isOfficial: boolean;
  pollOptions: PollOption[];
  totalVotes: number;
  myVoteOptionId: string | null;
  replyCount: number;
  replies: ChatMessage[];
  createdAt: string;
};

type CommunityAd = {
  id: string;
  placement: "feed" | "chat_banner" | "sidebar";
  sponsorName: string;
  headline: string;
  body: string | null;
  mediaUrl: string | null;
  ctaLabel: string;
  ctaUrl: string;
  adsenseSlotId: string | null;
};

type MyIdentity = {
  username: string;
  state: string;
  hasExplicitState: boolean;
  hasGender: boolean;
  hasDob: boolean;
  rank: number | null;
  points: number | null;
  nextTopicAllowedAt?: string | null;
};

type MentionCandidate = {
  username: string;
  state: string;
  rank: number | null;
};

type ActiveMentionContext = {
  target: "chat" | string;
  query: string;
  atIndex: number;
  caretIndex: number;
};

const CATEGORIES = [
  "all",
  "Banking & Fintech",
  "Telecoms & Data",
  "Economy & Policy",
  "Game Banter",
  "Food & Culture",
  "Sports & Music",
  "Session Verdict",
];

const NIGERIAN_STATES = [
  "Lagos",
  "Abuja (FCT)",
  "Rivers",
  "Oyo",
  "Kano",
  "Delta",
  "Enugu",
  "Anambra",
  "Ogun",
  "Edo",
  "Kaduna",
  "Akwa Ibom",
  "Cross River",
  "Imo",
  "Kwara",
  "Osun",
  "Ondo",
  "Plateau",
  "Benue",
  "Abia",
  "Ekiti",
  "Bayelsa",
  "Kogi",
  "Nasarawa",
  "Niger",
  "Bauchi",
  "Borno",
  "Adamawa",
  "Gombe",
  "Jigawa",
  "Katsina",
  "Kebbi",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Ebonyi",
  "Diaspora",
];

const REACTION_MAP: { key: "fire" | "laugh" | "target"; label: string }[] = [
  { key: "fire", label: "Hot take" },
  { key: "laugh", label: "Funny" },
  { key: "target", label: "Spot on" },
];

function ReactionGlyph({ kind }: { kind: "fire" | "laugh" | "target" }) {
  if (kind === "fire") return <FlameIcon className="size-3.5 text-orange-400" />;
  if (kind === "laugh") return <SmileIcon className="size-3.5 text-amber-300" />;
  return <TargetIcon className="size-3.5 text-emerald-400" />;
}

function timeAgo(iso: string): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function RankBadge({ rank }: { rank: number | null | undefined }) {
  if (!rank || rank <= 0) return null;
  if (rank === 1) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-300">
        #1
      </span>
    );
  }
  if (rank === 2 || rank === 3) {
    return (
      <span className="inline-flex items-center rounded-md bg-orange-500/20 border border-orange-400/35 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-orange-300">
        #{rank}
      </span>
    );
  }
  if (rank <= 36) {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-300">
        #{rank}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-300">
      #{rank}
    </span>
  );
}

function detectActiveMention(
  text: string,
  caret: number,
): { query: string; atIndex: number; caretIndex: number } | null {
  const safeCaret = Math.max(0, Math.min(caret, text.length));
  const beforeCaret = text.slice(0, safeCaret);
  const match = /(?:^|\s)@([a-zA-Z0-9_]{0,20})$/.exec(beforeCaret);
  if (!match) return null;
  const query = match[1];
  const atIndex = safeCaret - query.length - 1;
  return { query, atIndex, caretIndex: safeCaret };
}

function hasSelfMention(body: string, myUsername?: string | null): boolean {
  if (!myUsername || !body.includes("@")) return false;
  const target = myUsername.toLowerCase();
  const matches = body.matchAll(/(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{2,24})\b/g);
  for (const m of matches) {
    if (m[1].toLowerCase() === target) return true;
  }
  return false;
}

function renderBodyWithMentions(
  body: string,
  myUsername: string | null | undefined,
  onMentionClick?: (username: string) => void,
) {
  if (!body.includes("@")) return body;
  const parts = body.split(/((?:^|[^a-zA-Z0-9_])@[a-zA-Z0-9_]{2,24}\b)/g);
  const lowerMe = myUsername ? myUsername.toLowerCase() : "";

  return parts.map((seg, idx) => {
    if (idx % 2 === 0 || !seg) return seg;
    const startsWithAt = seg.startsWith("@");
    const leading = startsWithAt ? "" : seg[0];
    const tag = startsWithAt ? seg : seg.slice(1);
    const rawUsername = tag.slice(1);
    const isSelf = Boolean(lowerMe && rawUsername.toLowerCase() === lowerMe);

    return (
      <span key={idx}>
        {leading}
        <button
          type="button"
          onClick={() => onMentionClick?.(rawUsername)}
          title={`Tag @${rawUsername}`}
          className={`inline-flex items-center rounded-md px-1 py-0.5 text-[11px] leading-tight transition-colors ${
            isSelf
              ? "bg-amber-400/20 border border-amber-400/45 font-bold text-amber-200 hover:bg-amber-400/30"
              : "bg-accent/15 border border-accent/30 font-semibold text-accent hover:bg-accent/25"
          }`}
        >
          {tag}
        </button>
      </span>
    );
  });
}

function MentionPopover({
  candidates,
  highlightIdx,
  query,
  onSelect,
  onHover,
}: {
  candidates: MentionCandidate[];
  highlightIdx: number;
  query: string;
  onSelect: (candidate: MentionCandidate) => void;
  onHover: (idx: number) => void;
}) {
  if (candidates.length === 0) return null;
  const safeIdx = Math.min(highlightIdx, candidates.length - 1);

  return (
    <div
      role="listbox"
      aria-label="Tag player suggestions"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-white/15 bg-[#0d111c] shadow-2xl shadow-black/80"
    >
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#080b12] px-3 py-1.5 text-[10px] text-slate-400">
        <span>
          {query ? `Matching "@${query}"` : "Tag a player"}
        </span>
        <span className="hidden sm:inline text-slate-500">Arrows + Enter to tag</span>
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {candidates.map((cand, idx) => {
          const active = idx === safeIdx;
          const initials = (cand.username || "PL").slice(0, 2).toUpperCase();
          return (
            <button
              key={cand.username}
              type="button"
              role="option"
              aria-selected={active}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(cand);
              }}
              onMouseEnter={() => onHover(idx)}
              className={`flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                active
                  ? "bg-accent/20 text-white"
                  : "text-slate-200 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                    cand.rank === 1
                      ? "bg-amber-400 text-slate-950"
                      : active
                      ? "bg-accent text-white"
                      : "bg-white/10 text-slate-200"
                  }`}
                >
                  {initials}
                </span>
                <span className="truncate font-bold text-white">
                  @{cand.username}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300">
                  {cand.state}
                </span>
                <RankBadge rank={cand.rank} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { user, refreshProfile } = useAuth();
  const [mobileTab, setMobileTab] = useState<"chat" | "feed">("chat");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "official" | "player">("all");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [activeSession, setActiveSession] = useState<{ id: string; name: string } | null>(null);
  const [topicSlot, setTopicSlot] = useState<{
    nextAllowedAt: string | null;
    lastAuthorUsername: string | null;
  }>({ nextAllowedAt: null, lastAuthorUsername: null });
  const [myIdentity, setMyIdentity] = useState<MyIdentity | null>(null);
  const [mentionDirectory, setMentionDirectory] = useState<MentionCandidate[]>([]);
  const [remoteMentionUsers, setRemoteMentionUsers] = useState<MentionCandidate[]>([]);
  const [topStates, setTopStates] = useState<{ state: string; count: number }[]>([]);
  const [liveChat, setLiveChat] = useState<ChatMessage[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [ads, setAds] = useState<CommunityAd[]>([]);
  const [loading, setLoading] = useState(true);

  // @Mention autocomplete state & input refs
  const [activeMention, setActiveMention] = useState<ActiveMentionContext | null>(null);
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState(0);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const replyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Live Chat composer
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Thread expansion & replies
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [votingPostId, setVotingPostId] = useState<string | null>(null);
  const pollShownAtRef = useRef<number>(Date.now());

  // New Topic / Poll Modal
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("Game Banter");
  const [includePoll, setIncludePoll] = useState(false);
  const [pollOpts, setPollOpts] = useState<string[]>(["", ""]);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Quick Demographic Badge Unlocker
  const [quickState, setQuickState] = useState("Lagos");
  const [quickGender, setQuickGender] = useState("Male");
  const [quickBirthYear, setQuickBirthYear] = useState("1998");
  const [savingDemo, setSavingDemo] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);

  const loadCommunity = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (user?.id) qs.set("userId", user.id);
        if (selectedCategory !== "all") qs.set("category", selectedCategory);
        if (expandedPostId) qs.set("postId", expandedPostId);

        const res = await fetch(`/api/community?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.ok) return;

        if (data.activeSession) {
          setActiveSession(data.activeSession);
        } else if (!silent) {
          setActiveSession(null);
        }

        if (data.topicSlot) {
          setTopicSlot({
            nextAllowedAt: data.topicSlot.nextAllowedAt ?? null,
            lastAuthorUsername: data.topicSlot.lastAuthorUsername ?? null,
          });
        }

        if (data.myIdentity) {
          setMyIdentity(data.myIdentity);
        } else if (!user?.id) {
          setMyIdentity(null);
        }

        if (
          Array.isArray(data.mentionDirectory) &&
          (data.mentionDirectory.length > 0 || !silent)
        ) {
          setMentionDirectory(data.mentionDirectory);
        }

        if (Array.isArray(data.topStates) && (data.topStates.length > 0 || !silent)) {
          setTopStates(data.topStates);
        }

        if (Array.isArray(data.liveChat)) {
          setLiveChat((prev) =>
            silent && data.liveChat.length === 0 && prev.length > 0
              ? prev
              : data.liveChat,
          );
        }

        if (Array.isArray(data.posts)) {
          setPosts((prev) =>
            silent && data.posts.length === 0 && prev.length > 0
              ? prev
              : data.posts,
          );
        }

        if (Array.isArray(data.ads)) {
          setAds((prev) =>
            silent && data.ads.length === 0 && prev.length > 0
              ? prev
              : data.ads,
          );
        }
      } catch {
        // Keep current UI state on transient offline glitch
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.id, selectedCategory, expandedPostId],
  );

  useEffect(() => {
    loadCommunity(false);
  }, [loadCommunity]);

  // Realtime WebSocket subscription for instant Live Chat & Poll updates + resilient fallback
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("gw-community-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          const row = payload.new as {
            id: number;
            room: string;
            post_id: string | null;
            user_id: string | null;
            is_system: boolean;
            body: string;
            author_username: string;
            author_state: string | null;
            author_rank: number | null;
            reactions: Record<string, number> | null;
            created_at: string;
          };

          if (row.room === "live_arena") {
            setLiveChat((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  id: row.id,
                  userId: row.user_id,
                  isSystem: row.is_system,
                  body: row.body,
                  username: row.author_username || "Player",
                  state: row.author_state || "Nigeria",
                  rank: row.author_rank,
                  reactions: row.reactions ?? {},
                  createdAt: row.created_at,
                },
              ];
            });
          } else if (row.post_id) {
            setPosts((prev) =>
              prev.map((p) => {
                if (p.id !== row.post_id) return p;
                if (p.replies.some((r) => r.id === row.id)) return p;
                return {
                  ...p,
                  replyCount: p.replyCount + 1,
                  replies: [
                    ...p.replies,
                    {
                      id: row.id,
                      postId: row.post_id,
                      userId: row.user_id,
                      isSystem: row.is_system,
                      body: row.body,
                      username: row.author_username || "Player",
                      state: row.author_state || "Nigeria",
                      rank: row.author_rank,
                      reactions: row.reactions ?? {},
                      createdAt: row.created_at,
                    },
                  ],
                };
              }),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_posts" },
        (payload) => {
          const newPost = payload.new as {
            author_id?: string | null;
            created_at?: string;
          };
          if (newPost?.author_id && newPost?.created_at) {
            const unlockIso = new Date(
              new Date(newPost.created_at).getTime() + 60 * 60 * 1000,
            ).toISOString();
            setTopicSlot((prev) => ({
              nextAllowedAt: unlockIso,
              lastAuthorUsername: prev.lastAuthorUsername,
            }));
          }
          loadCommunity(true);
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      loadCommunity(true);
    }, 7000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadCommunity]);

  // Keep Live Chat anchored at bottom when autoScroll is active
  useEffect(() => {
    if (!autoScroll || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [liveChat.length, autoScroll, mobileTab]);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    setAutoScroll(nearBottom);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setChatError("Sign in to post in the Live Banter Room.");
      return;
    }
    const trimmed = chatInput.trim();
    if (!trimmed || sendingChat) return;

    setSendingChat(true);
    setChatError(null);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_chat",
          userId: user.id,
          body: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data.error || "Could not send message.");
      } else if (data.message) {
        setChatInput("");
        setAutoScroll(true);
        setLiveChat((prev) =>
          prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
        );
      }
    } catch {
      setChatError("Connection issue. Please try sending again.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleVotePoll = async (postId: string, optionId: string) => {
    if (!user?.id) {
      setChatError("Sign in to vote on polls.");
      return;
    }
    if (votingPostId) return;
    setVotingPostId(postId);
    const responseMs = Math.max(300, Date.now() - pollShownAtRef.current);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote_poll",
          userId: user.id,
          postId,
          optionId,
          responseMs,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  myVoteOptionId: data.myVoteOptionId,
                  totalVotes: data.totalVotes,
                  pollOptions: data.pollOptions,
                }
              : p,
          ),
        );
      }
    } finally {
      setVotingPostId(null);
    }
  };

  const handleSendReply = async (postId: string) => {
    if (!user?.id) return;
    const draft = (replyDrafts[postId] || "").trim();
    if (!draft || sendingReplyId) return;

    setSendingReplyId(postId);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply_post",
          userId: user.id,
          postId,
          body: draft,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            if (p.replies.some((r) => r.id === data.message.id)) return p;
            return {
              ...p,
              replyCount: p.replyCount + 1,
              replies: [...p.replies, data.message],
            };
          }),
        );
      } else if (data.error) {
        setChatError(data.error);
      }
    } finally {
      setSendingReplyId(null);
    }
  };

  const handleReactMessage = async (messageId: number, emoji: string) => {
    setLiveChat((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] ?? 0) + 1 } }
          : m,
      ),
    );
    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        replies: p.replies.map((r) =>
          r.id === messageId
            ? { ...r, reactions: { ...r.reactions, [emoji]: (r.reactions[emoji] ?? 0) + 1 } }
            : r,
        ),
      })),
    );

    await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react_message", messageId, emoji }),
    }).catch(() => null);
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setCreatingTopic(true);
    setTopicError(null);

    try {
      const cleanOpts = includePoll
        ? pollOpts.map((o) => o.trim()).filter(Boolean)
        : [];
      if (includePoll && cleanOpts.length < 2) {
        setTopicError("Add at least 2 poll options.");
        setCreatingTopic(false);
        return;
      }

      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_topic",
          userId: user.id,
          category: newCategory,
          title: newTitle,
          body: newBody,
          pollOptions: cleanOpts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.nextTopicAllowedAt) {
          setTopicSlot({
            nextAllowedAt: data.nextTopicAllowedAt,
            lastAuthorUsername: data.lastAuthorUsername ?? null,
          });
          setMyIdentity((prev) =>
            prev ? { ...prev, nextTopicAllowedAt: data.nextTopicAllowedAt } : prev,
          );
        }
        setTopicError(data.error || "Could not publish topic.");
      } else {
        if (data.nextTopicAllowedAt) {
          setTopicSlot({
            nextAllowedAt: data.nextTopicAllowedAt,
            lastAuthorUsername:
              data.lastAuthorUsername ?? myIdentity?.username ?? null,
          });
          setMyIdentity((prev) =>
            prev ? { ...prev, nextTopicAllowedAt: data.nextTopicAllowedAt } : prev,
          );
        }
        setComposerOpen(false);
        setNewTitle("");
        setNewBody("");
        setIncludePoll(false);
        setPollOpts(["", ""]);
        setMobileTab("feed");
        await loadCommunity(true);
      }
    } catch {
      setTopicError("Network error while publishing.");
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleSaveQuickDemographics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingDemo(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick_demographics",
          userId: user.id,
          state: quickState,
          gender: quickGender,
          birthYear: Number(quickBirthYear),
        }),
      });
      if (res.ok) {
        await refreshProfile?.();
        await loadCommunity(true);
      }
    } finally {
      setSavingDemo(false);
    }
  };

  const trackAdClick = (adId: string) => {
    fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "track_ad_click", adId }),
    }).catch(() => null);
  };

  // Remote lookup for @username queries (2+ chars) so any player in the database can be tagged
  useEffect(() => {
    const q = activeMention?.query?.trim() || "";
    if (q.length < 2) {
      setRemoteMentionUsers([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/community?searchUsers=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.users)) {
          setRemoteMentionUsers(data.users);
        }
      } catch {
        // Ignore transient lookup glitches
      }
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeMention?.query]);

  const filteredMentionCandidates = useMemo(() => {
    if (!activeMention) return [];
    const meLower = myIdentity?.username ? myIdentity.username.toLowerCase() : "";
    const pool = new Map<string, MentionCandidate>();

    const pushCandidate = (
      username: string | null | undefined,
      state: string | null | undefined,
      rank: number | null | undefined,
    ) => {
      const clean = (username || "").trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (
        key === "guesswhat" ||
        key === "player" ||
        key === "superadmin" ||
        key === "masteradmin" ||
        key === meLower
      ) {
        return;
      }
      const existing = pool.get(key);
      if (!existing) {
        pool.set(key, {
          username: clean,
          state: state || "Nigeria",
          rank: rank ?? null,
        });
      } else if (existing.rank === null && rank !== null && rank !== undefined) {
        pool.set(key, { ...existing, rank });
      }
    };

    if (activeMention.target !== "chat") {
      const targetPost = posts.find((p) => p.id === activeMention.target);
      if (targetPost) {
        for (let i = targetPost.replies.length - 1; i >= 0; i--) {
          const r = targetPost.replies[i];
          if (!r.isSystem) pushCandidate(r.username, r.state, r.rank);
        }
        if (!targetPost.isOfficial) {
          pushCandidate(
            targetPost.authorUsername,
            targetPost.authorState,
            targetPost.authorRank,
          );
        }
      }
    }

    for (let i = liveChat.length - 1; i >= 0; i--) {
      const m = liveChat[i];
      if (!m.isSystem) pushCandidate(m.username, m.state, m.rank);
    }

    for (const p of posts) {
      for (let i = p.replies.length - 1; i >= 0; i--) {
        const r = p.replies[i];
        if (!r.isSystem) pushCandidate(r.username, r.state, r.rank);
      }
    }

    for (const d of mentionDirectory) {
      pushCandidate(d.username, d.state, d.rank);
    }

    for (const u of remoteMentionUsers) {
      pushCandidate(u.username, u.state, u.rank);
    }

    const all = Array.from(pool.values());
    const q = activeMention.query.toLowerCase();
    if (!q) return all.slice(0, 6);

    return all
      .filter((c) => c.username.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.username.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.username.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return 0;
      })
      .slice(0, 6);
  }, [
    activeMention,
    myIdentity?.username,
    posts,
    liveChat,
    mentionDirectory,
    remoteMentionUsers,
  ]);

  const handleInputMentionScan = (
    target: "chat" | string,
    value: string,
    selectionStart: number | null,
  ) => {
    const detected = detectActiveMention(value, selectionStart ?? value.length);
    if (detected) {
      setActiveMention({ target, ...detected });
      setMentionHighlightIdx(0);
    } else {
      setActiveMention((prev) => (prev?.target === target ? null : prev));
    }
  };

  const applyMentionSelection = (cand: MentionCandidate) => {
    if (!activeMention) return;
    const { target, atIndex, caretIndex } = activeMention;
    const currentText =
      target === "chat" ? chatInput : replyDrafts[target] || "";
    const before = currentText.slice(0, atIndex);
    const after = currentText.slice(caretIndex);
    const insertion = `@${cand.username}${after.startsWith(" ") ? "" : " "}`;
    const nextText = before + insertion + after;
    const nextCaret = before.length + insertion.length;

    if (target === "chat") {
      setChatInput(nextText);
    } else {
      setReplyDrafts((prev) => ({ ...prev, [target]: nextText }));
    }
    setActiveMention(null);

    requestAnimationFrame(() => {
      const el =
        target === "chat" ? chatInputRef.current : replyInputRefs.current[target];
      if (el) {
        el.focus();
        el.setSelectionRange(nextCaret, nextCaret);
      }
    });
  };

  const handleMentionKeyDown = (
    target: "chat" | string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ): boolean => {
    if (
      activeMention?.target !== target ||
      filteredMentionCandidates.length === 0
    ) {
      return false;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionHighlightIdx(
        (prev) => (prev + 1) % filteredMentionCandidates.length,
      );
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionHighlightIdx(
        (prev) =>
          (prev - 1 + filteredMentionCandidates.length) %
          filteredMentionCandidates.length,
      );
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const safeIdx = Math.min(
        mentionHighlightIdx,
        filteredMentionCandidates.length - 1,
      );
      applyMentionSelection(filteredMentionCandidates[safeIdx]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setActiveMention(null);
      return true;
    }
    return false;
  };

  const quickTagUser = (target: "chat" | string, username: string) => {
    if (!user) {
      setChatError("Sign in to @tag players in the Arena.");
      return;
    }
    const uname = username.replace(/^@/, "").trim();
    if (!uname || uname.toLowerCase() === "guesswhat") return;

    const current = target === "chat" ? chatInput : replyDrafts[target] || "";
    const existingMentions = Array.from(
      current.matchAll(/(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{2,24})\b/g),
    ).map((m) => m[1].toLowerCase());
    const alreadyTagged = existingMentions.includes(uname.toLowerCase());

    const nextText = alreadyTagged
      ? current.endsWith(" ")
        ? current
        : `${current} `
      : current.length === 0
      ? `@${uname} `
      : current.endsWith(" ")
      ? `${current}@${uname} `
      : `${current} @${uname} `;

    if (target === "chat") {
      setChatInput(nextText);
    } else {
      setReplyDrafts((prev) => ({ ...prev, [target]: nextText }));
    }
    setActiveMention(null);

    requestAnimationFrame(() => {
      const el =
        target === "chat" ? chatInputRef.current : replyInputRefs.current[target];
      if (el) {
        el.focus();
        el.setSelectionRange(nextText.length, nextText.length);
      }
    });
  };

  const triggerAtPicker = (target: "chat" | string) => {
    if (!user) {
      setChatError("Sign in to @tag players in the Arena.");
      return;
    }
    const current = target === "chat" ? chatInput : replyDrafts[target] || "";
    const nextText = current.endsWith("@")
      ? current
      : current.length === 0 || current.endsWith(" ")
      ? `${current}@`
      : `${current} @`;

    if (target === "chat") {
      setChatInput(nextText);
    } else {
      setReplyDrafts((prev) => ({ ...prev, [target]: nextText }));
    }

    const detected = detectActiveMention(nextText, nextText.length);
    if (detected) {
      setActiveMention({ target, ...detected });
      setMentionHighlightIdx(0);
    }

    requestAnimationFrame(() => {
      const el =
        target === "chat" ? chatInputRef.current : replyInputRefs.current[target];
      if (el) {
        el.focus();
        el.setSelectionRange(nextText.length, nextText.length);
      }
    });
  };

  // Tick every 1 second so the MM:SS Arena topic/poll countdown updates live
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const topicCooldownSecondsLeft = useMemo(() => {
    const iso = topicSlot.nextAllowedAt || myIdentity?.nextTopicAllowedAt || null;
    if (!iso) return 0;
    const diffMs = new Date(iso).getTime() - nowMs;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 1000);
  }, [topicSlot.nextAllowedAt, myIdentity?.nextTopicAllowedAt, nowMs]);

  const formattedTopicCountdown = useMemo(() => {
    if (topicCooldownSecondsLeft <= 0) return "00:00";
    const mins = Math.floor(topicCooldownSecondsLeft / 60);
    const secs = topicCooldownSecondsLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [topicCooldownSecondsLeft]);

  const isTopicSlotOpen = topicCooldownSecondsLeft === 0;
  const validPollOptionsCount = includePoll
    ? pollOpts.map((o) => o.trim()).filter(Boolean).length
    : 0;
  const canPublishTopic =
    Boolean(user?.id) &&
    isTopicSlotOpen &&
    !creatingTopic &&
    newTitle.trim().length > 0 &&
    (!includePoll || validPollOptionsCount >= 2);

  const displayedPosts = useMemo(() => {
    if (sourceFilter === "official") {
      return posts.filter((p) => p.isOfficial || Boolean(p.sponsorName));
    }
    if (sourceFilter === "player") {
      return posts.filter((p) => !p.isOfficial && !p.sponsorName);
    }
    return posts;
  }, [posts, sourceFilter]);

  const chatBannerAd = ads.find((a) => a.placement === "chat_banner") ?? null;
  const feedAds = ads.filter((a) => a.placement === "feed");

  const needsStateBadgeUnlock =
    Boolean(user?.id) &&
    myIdentity &&
    (!myIdentity.hasExplicitState || !myIdentity.hasGender || !myIdentity.hasDob) &&
    !demoDismissed;

  return (
    <div className="mx-auto w-full max-w-7xl px-3.5 py-4 md:px-6 md:py-7">
      {/* Top Arena Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Community Arena
            </h1>
            {activeSession && (
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[180px]">{activeSession.name}</span>
              </Link>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
            Live session banter, state rivalries, and daily Nigerian polls.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {myIdentity && (
            <div className="hidden xl:flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0e17] px-3 py-2 text-xs">
              <span className="text-slate-400">Badge:</span>
              <span className="font-semibold text-white">{myIdentity.username}</span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-slate-300">
                {myIdentity.state}
              </span>
              <RankBadge rank={myIdentity.rank} />
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setTopicError(null);
              setComposerOpen(true);
            }}
            className={`inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              !isTopicSlotOpen
                ? "border border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                : "bg-gradient-to-r from-[#FF0400] to-[#F7911B] text-white shadow-lg shadow-[#F7911B]/20 hover:opacity-95"
            }`}
          >
            {!isTopicSlotOpen ? (
              <>
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Next topic/poll in</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono tabular-nums text-amber-300">
                  {formattedTopicCountdown}
                </span>
              </>
            ) : (
              <>
                <PlusIcon className="size-4 shrink-0" />
                <span>Start topic or poll</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active States Rivalry Strip */}
      {topStates.length > 0 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar rounded-xl border border-white/[0.06] bg-[#0b0e17] px-3 py-2 text-xs">
          <span className="shrink-0 font-semibold text-slate-400">Loudest states:</span>
          {topStates.map((item, idx) => (
            <span
              key={item.state}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold ${
                idx === 0
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-white/[0.04] text-slate-300"
              }`}
            >
              <span>{item.state}</span>
              <span className="text-[10px] tabular-nums opacity-75">({item.count})</span>
            </span>
          ))}
        </div>
      )}

      {/* Mobile Switcher: Fast Live Chat vs Topic & Poll Threads */}
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.08] bg-[#0b0e17] p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
            mobileTab === "chat"
              ? "bg-accent text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate">Live Chat ({liveChat.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("feed")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
            mobileTab === "feed"
              ? "bg-accent text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="truncate">Polls &amp; Topics ({posts.length})</span>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (7 cols): Polls, Topics, Verdicts & Native Feed Ads */}
        <section
          aria-label="Polls and topic threads"
          className={`lg:col-span-7 space-y-4 ${
            mobileTab === "feed" ? "block" : "hidden lg:block"
          }`}
        >
          {/* State & Demographic Badge Unlocker */}
          {needsStateBadgeUnlock && (
            <form
              onSubmit={handleSaveQuickDemographics}
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#0b0e17] to-[#0b0e17] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Unlock your State Badge in chat
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Represent your state in Live Arena banter and state-vs-state polls.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoDismissed(true)}
                  className="min-h-8 px-2 text-xs text-slate-400 hover:text-white"
                >
                  Later
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                <select
                  aria-label="Select your state"
                  value={quickState}
                  onChange={(e) => setQuickState(e.target.value)}
                  className="min-h-11 rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-base sm:text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Select gender"
                  value={quickGender}
                  onChange={(e) => setQuickGender(e.target.value)}
                  className="min-h-11 rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-base sm:text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                <input
                  type="number"
                  min={1950}
                  max={2010}
                  value={quickBirthYear}
                  onChange={(e) => setQuickBirthYear(e.target.value)}
                  placeholder="Birth year (1998)"
                  aria-label="Birth year"
                  className="min-h-11 rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-base sm:text-xs text-white focus:border-amber-400 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={savingDemo}
                  className="min-h-11 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {savingDemo ? "Saving..." : "Activate badge"}
                </button>
              </div>
            </form>
          )}

          {/* Source Filter: All vs GuessWhat Official vs Player Created */}
          <div className="flex items-center overflow-x-auto no-scrollbar">
            <div className="inline-flex shrink-0 rounded-xl border border-white/[0.08] bg-[#0b0e17] p-1">
              {(
                [
                  { id: "all", label: "All Posts" },
                  { id: "official", label: "GuessWhat Official" },
                  { id: "player", label: "Player Created" },
                ] as const
              ).map((tab) => {
                const active = sourceFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceFilter(tab.id)}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? tab.id === "player"
                          ? "bg-emerald-600 text-white"
                          : "bg-accent text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.id === "official" && (
                      <ShieldCheckIcon className="size-3.5 shrink-0" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-9 shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent text-white"
                      : "bg-[#0b0e17] border border-white/[0.06] text-slate-400 hover:text-white"
                  }`}
                >
                  {cat === "all" ? "All topics" : cat}
                </button>
              );
            })}
          </div>

          {/* Posts & Interleaved Native Sponsor Cards */}
          {loading && displayedPosts.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-2xl border border-white/[0.06] bg-[#0b0e17] animate-pulse"
                />
              ))}
            </div>
          ) : displayedPosts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0b0e17] p-8 text-center">
              <p className="text-sm font-semibold text-white">No topics match this filter yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Start the first debate or switch back to All Posts.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTopicError(null);
                  setComposerOpen(true);
                }}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white"
              >
                Start a topic
              </button>
            </div>
          ) : (
            displayedPosts.map((post, index) => {
              const hasPoll = post.pollOptions.length >= 2;
              const isExpanded = expandedPostId === post.id;
              const isPlayerPost = !post.isOfficial && !post.sponsorName;
              const injectedAd =
                feedAds.length > 0 && (index + 1) % 2 === 0
                  ? feedAds[Math.floor(index / 2) % feedAds.length]
                  : null;
              const maxOptionVotes = hasPoll
                ? Math.max(...post.pollOptions.map((o) => o.votes), 1)
                : 1;

              return (
                <div key={post.id} className="space-y-4">
                  <article
                    className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                      post.sponsorName
                        ? "border-sky-500/25 bg-[#0b0e17] hover:border-sky-400/40"
                        : post.isOfficial
                        ? "border-[#F7911B]/30 bg-gradient-to-br from-[#F7911B]/[0.06] via-[#0b0e17] to-[#0b0e17] hover:border-[#F7911B]/45"
                        : "border-emerald-500/20 bg-[#0b0e17] hover:border-emerald-500/35"
                    }`}
                  >
                    {/* Post Meta Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {post.sponsorName ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 border border-sky-500/35 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                            Sponsored · {post.sponsorName}
                          </span>
                        ) : post.isOfficial ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#FF0400]/20 to-[#F7911B]/25 border border-[#F7911B]/45 px-2 py-0.5 text-[11px] font-bold text-[#ffb457]">
                            <ShieldCheckIcon className="size-3 shrink-0" />
                            <span>GuessWhat {hasPoll ? "Official Poll" : "Official"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/35 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                            <span>{hasPoll ? "Player Poll" : "Player Topic"}</span>
                          </span>
                        )}

                        {post.isPinned && (
                          <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                            Pinned
                          </span>
                        )}

                        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-slate-300">
                          {post.category}
                        </span>

                        {post.kind === "verdict" && (
                          <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            Session Results
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] tabular-nums text-slate-500">
                        {timeAgo(post.createdAt)} ago
                      </span>
                    </div>

                    {/* Author Line */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      {post.isOfficial && !post.sponsorName ? (
                        <>
                          <span className="grid size-5 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#FF0400] to-[#F7911B] text-[9px] font-black text-white">
                            GW
                          </span>
                          <span className="font-bold text-white">GuessWhat</span>
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                            Host
                          </span>
                        </>
                      ) : isPlayerPost ? (
                        <>
                          <span className="grid size-5 shrink-0 place-items-center rounded-md bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-bold text-emerald-200">
                            {(post.authorUsername || "PL").slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-slate-400">By</span>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPostId(post.id);
                              quickTagUser(post.id, post.authorUsername);
                            }}
                            title={`Tag @${post.authorUsername}`}
                            className="font-bold text-white hover:text-emerald-300 transition-colors"
                          >
                            @{post.authorUsername}
                          </button>
                          {post.authorState && (
                            <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-slate-300">
                              {post.authorState}
                            </span>
                          )}
                          <RankBadge rank={post.authorRank} />
                        </>
                      ) : (
                        <span className="font-semibold text-slate-200">
                          {post.authorUsername}
                        </span>
                      )}
                    </div>

                    {/* Title & Body */}
                    <h2 className="mt-2 text-base font-bold leading-snug text-white sm:text-lg">
                      {post.title}
                    </h2>
                    {post.body && (
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                        {renderBodyWithMentions(
                          post.body,
                          myIdentity?.username,
                          (uname) => {
                            setExpandedPostId(post.id);
                            quickTagUser(post.id, uname);
                          },
                        )}
                      </p>
                    )}

                    {/* Interactive 1-Tap Poll */}
                    {hasPoll && (
                      <div className="mt-4 space-y-2">
                        {post.pollOptions.map((opt) => {
                          const isSelected = post.myVoteOptionId === opt.id;
                          const showResults = Boolean(post.myVoteOptionId);
                          const isLeader =
                            showResults && opt.votes > 0 && opt.votes === maxOptionVotes;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={votingPostId === post.id || post.isLocked}
                              onClick={() => handleVotePoll(post.id, opt.id)}
                              className={`relative min-h-11 w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                                isSelected
                                  ? "border-accent bg-accent/10"
                                  : "border-white/[0.08] bg-[#07090e] hover:border-white/20"
                              }`}
                            >
                              {showResults && (
                                <div
                                  style={{ width: `${opt.percentage}%` }}
                                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                    isLeader ? "bg-accent/25" : "bg-white/[0.06]"
                                  }`}
                                />
                              )}
                              <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm">
                                <span className="font-medium text-white flex flex-wrap items-center gap-2">
                                  <span>{opt.label}</span>
                                  {isSelected && (
                                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      Your pick
                                    </span>
                                  )}
                                </span>
                                {showResults ? (
                                  <span className="shrink-0 font-bold tabular-nums text-slate-200">
                                    {opt.percentage}%{" "}
                                    <span className="text-[11px] font-normal text-slate-400">
                                      ({opt.votes})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                                    Vote
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                          <span className="tabular-nums">
                            {post.totalVotes.toLocaleString()}{" "}
                            {post.totalVotes === 1 ? "player voted" : "players voted"}
                          </span>
                          {!post.myVoteOptionId && (
                            <span>Vote to reveal live percentages</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Optional Sponsored Poll CTA */}
                    {post.sponsorCtaUrl && (
                      <div className="mt-3">
                        <a
                          href={post.sponsorCtaUrl}
                          target={post.sponsorCtaUrl.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 underline underline-offset-4"
                        >
                          <span>{post.sponsorCtaLabel || "Visit sponsor"}</span>
                          <ExternalLinkIcon className="size-3.5 shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Thread Footer & Replies Toggle */}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPostId(isExpanded ? null : post.id)
                        }
                        className="min-h-8 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                      >
                        {isExpanded
                          ? "Hide replies"
                          : post.replyCount > 0
                          ? `Join banter (${post.replyCount} ${
                              post.replyCount === 1 ? "reply" : "replies"
                            })`
                          : "Write the first reply"}
                      </button>

                      {!isExpanded && post.replies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedPostId(post.id)}
                          className="truncate text-[11px] text-accent hover:underline"
                        >
                          Latest from {post.replies[post.replies.length - 1].username}
                        </button>
                      )}
                    </div>

                    {/* Compact Reply Preview OR Full Expanded Thread */}
                    {(isExpanded || post.replies.length > 0) && (
                      <div className="mt-3 space-y-2.5 rounded-xl bg-[#07090e]/80 p-3 border border-white/[0.05]">
                        {(isExpanded ? post.replies : post.replies.slice(-2)).map((rep) => {
                          const isMyReply = Boolean(user?.id && rep.userId === user.id);
                          const taggedMe =
                            !isMyReply && hasSelfMention(rep.body, myIdentity?.username);

                          return (
                            <div
                              key={rep.id}
                              className={`border-b border-white/[0.04] pb-2.5 last:border-b-0 last:pb-0 ${
                                taggedMe
                                  ? "rounded-lg bg-amber-500/[0.08] px-2 py-1.5 border border-amber-400/30"
                                  : ""
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => quickTagUser(post.id, rep.username)}
                                    title={`Tag @${rep.username}`}
                                    className="font-bold text-white hover:text-accent transition-colors"
                                  >
                                    {rep.username}
                                  </button>
                                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300">
                                    {rep.state}
                                  </span>
                                  <RankBadge rank={rep.rank} />
                                  {taggedMe && (
                                    <span className="rounded bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                      Tagged you
                                    </span>
                                  )}
                                  <span className="text-[10px] tabular-nums text-slate-500">
                                    {timeAgo(rep.createdAt)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {!isMyReply && !post.isLocked && (
                                    <button
                                      type="button"
                                      onClick={() => quickTagUser(post.id, rep.username)}
                                      className="inline-flex min-h-7 items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:bg-accent/20 hover:text-accent transition-colors"
                                    >
                                      @ Reply
                                    </button>
                                  )}
                                  {REACTION_MAP.map((rx) => {
                                    const count = rep.reactions?.[rx.key] ?? 0;
                                    return (
                                      <button
                                        key={rx.key}
                                        type="button"
                                        onClick={() => handleReactMessage(rep.id, rx.key)}
                                        aria-label={rx.label}
                                        className="inline-flex min-h-7 items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300 hover:bg-white/10"
                                      >
                                        <ReactionGlyph kind={rx.key} />
                                        {count > 0 && <span>{count}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <p className="mt-1 break-words text-xs leading-relaxed text-slate-200">
                                {renderBodyWithMentions(
                                  rep.body,
                                  myIdentity?.username,
                                  (uname) => quickTagUser(post.id, uname),
                                )}
                              </p>
                            </div>
                          );
                        })}

                        {!post.isLocked && (
                          <div className="relative flex items-center gap-2 pt-1">
                            {activeMention?.target === post.id && (
                              <MentionPopover
                                candidates={filteredMentionCandidates}
                                highlightIdx={mentionHighlightIdx}
                                query={activeMention.query}
                                onSelect={applyMentionSelection}
                                onHover={setMentionHighlightIdx}
                              />
                            )}
                            <div className="relative flex-1">
                              <input
                                ref={(el) => {
                                  replyInputRefs.current[post.id] = el;
                                }}
                                type="text"
                                value={replyDrafts[post.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyDrafts((prev) => ({
                                    ...prev,
                                    [post.id]: val,
                                  }));
                                  handleInputMentionScan(
                                    post.id,
                                    val,
                                    e.target.selectionStart,
                                  );
                                }}
                                onClick={(e) =>
                                  handleInputMentionScan(
                                    post.id,
                                    e.currentTarget.value,
                                    e.currentTarget.selectionStart,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (handleMentionKeyDown(post.id, e)) return;
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    setActiveMention(null);
                                    handleSendReply(post.id);
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setActiveMention((prev) =>
                                      prev?.target === post.id ? null : prev,
                                    );
                                  }, 150);
                                }}
                                placeholder={
                                  user
                                    ? "Write a reply or @tag..."
                                    : "Sign in to reply..."
                                }
                                disabled={!user}
                                maxLength={400}
                                className="min-h-10 w-full rounded-xl border border-white/10 bg-[#0b0e17] pl-3 pr-9 py-2 text-base sm:text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                              />
                              {user && (
                                <button
                                  type="button"
                                  title="Tag a player with @"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    triggerAtPicker(post.id);
                                  }}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-lg bg-white/[0.06] text-xs font-bold text-slate-300 hover:bg-accent/25 hover:text-accent transition-colors"
                                >
                                  @
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={
                                !user ||
                                sendingReplyId === post.id ||
                                !(replyDrafts[post.id] || "").trim()
                              }
                              onClick={() => {
                                setActiveMention(null);
                                handleSendReply(post.id);
                              }}
                              className="min-h-10 shrink-0 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40"
                            >
                              {sendingReplyId === post.id ? "..." : "Reply"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>

                  {/* Native In-Feed Sponsor / Ad Card */}
                  {injectedAd && (
                    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#121624] to-[#0b0e17] p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-300">
                          Sponsored · {injectedAd.sponsorName}
                        </span>
                        {injectedAd.adsenseSlotId && (
                          <span className="text-slate-500">Ad #{injectedAd.adsenseSlotId}</span>
                        )}
                      </div>

                      {injectedAd.mediaUrl && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={injectedAd.mediaUrl}
                            alt={injectedAd.headline}
                            className="max-h-52 w-full object-cover"
                          />
                        </div>
                      )}

                      <h3 className="mt-2.5 text-sm font-bold text-white sm:text-base">
                        {injectedAd.headline}
                      </h3>
                      {injectedAd.body && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">
                          {injectedAd.body}
                        </p>
                      )}

                      <div className="mt-3">
                        <a
                          href={injectedAd.ctaUrl}
                          target={injectedAd.ctaUrl.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          onClick={() => trackAdClick(injectedAd.id)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/15 transition-colors"
                        >
                          <span>{injectedAd.ctaLabel}</span>
                          <ExternalLinkIcon className="size-3.5 shrink-0" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* RIGHT COLUMN (5 cols): Fast-Scrolling Live Arena Chat Room */}
        <aside
          aria-label="Live chat room"
          className={`lg:col-span-5 lg:sticky lg:top-6 ${
            mobileTab === "chat" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex h-[calc(100dvh-16rem)] min-h-[380px] max-h-[680px] lg:max-h-none lg:h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0e17]">
            {/* Chat Room Header */}
            <div className="border-b border-white/[0.07] px-3.5 py-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-white">Live Banter Room</h2>
                  <p className="truncate text-[11px] text-slate-400">
                    Live rank and state badges
                  </p>
                </div>
              </div>
              <Link
                href="/play"
                className="shrink-0 rounded-lg bg-accent/15 border border-accent/30 px-2.5 py-1.5 text-[11px] font-bold text-accent hover:bg-accent/25 transition-colors"
              >
                Play live
              </Link>
            </div>

            {/* Pinned Native Chat Sponsor Strip */}
            {chatBannerAd && (
              <a
                href={chatBannerAd.ctaUrl}
                target={chatBannerAd.ctaUrl.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={() => trackAdClick(chatBannerAd.id)}
                className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/[0.08] px-3.5 py-2.5 hover:bg-amber-500/[0.13] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
                    <span>Sponsored</span>
                    <span>·</span>
                    <span className="truncate">{chatBannerAd.sponsorName}</span>
                  </div>
                  <p className="truncate text-xs font-semibold text-white">
                    {chatBannerAd.headline}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                  {chatBannerAd.ctaLabel}
                </span>
              </a>
            )}

            {/* Fast-Scrolling Messages Stream */}
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="flex-1 space-y-2.5 overflow-y-auto p-3"
            >
              {liveChat.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                    >
                      <span className="font-bold text-amber-300">Room Notice: </span>
                      <span>{msg.body}</span>
                    </div>
                  );
                }

                const isMe = Boolean(user?.id && msg.userId === user.id);
                const taggedMe =
                  !isMe && hasSelfMention(msg.body, myIdentity?.username);
                const initials = (msg.username || "PL").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={msg.id}
                    className={`group rounded-xl border px-3 py-2.5 transition-colors ${
                      taggedMe
                        ? "border-amber-400/45 bg-amber-500/[0.09]"
                        : isMe
                        ? "border-accent/30 bg-accent/[0.07]"
                        : "border-white/[0.05] bg-[#07090e]/90"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${
                          msg.rank === 1
                            ? "bg-amber-400 text-slate-950"
                            : isMe
                            ? "bg-accent text-white"
                            : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => quickTagUser("chat", msg.username)}
                            title={`Tag @${msg.username}`}
                            className="text-xs font-bold text-white hover:text-accent transition-colors"
                          >
                            {msg.username}
                          </button>
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                            {msg.state}
                          </span>
                          <RankBadge rank={msg.rank} />
                          {taggedMe && (
                            <span className="rounded bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              Tagged you
                            </span>
                          )}
                          <span className="ml-auto text-[10px] tabular-nums text-slate-500">
                            {timeAgo(msg.createdAt)}
                          </span>
                        </div>

                        <p className="mt-1 break-words text-xs leading-relaxed text-slate-200">
                          {renderBodyWithMentions(
                            msg.body,
                            myIdentity?.username,
                            (uname) => quickTagUser("chat", uname),
                          )}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => quickTagUser("chat", msg.username)}
                              className="inline-flex min-h-7 items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:bg-accent/20 hover:text-accent transition-colors"
                            >
                              @ Reply
                            </button>
                          )}
                          {REACTION_MAP.map((rx) => {
                            const count = msg.reactions?.[rx.key] ?? 0;
                            return (
                              <button
                                key={rx.key}
                                type="button"
                                onClick={() => handleReactMessage(msg.id, rx.key)}
                                aria-label={rx.label}
                                className={`inline-flex min-h-7 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums transition-colors ${
                                  count > 0
                                    ? "bg-white/10 text-white font-semibold"
                                    : "bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <ReactionGlyph kind={rx.key} />
                                {count > 0 && <span>{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!autoScroll && (
              <div className="px-4 py-1.5 bg-[#07090e] border-t border-white/5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAutoScroll(true);
                    if (chatScrollRef.current) {
                      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                    }
                  }}
                  className="min-h-7 text-[11px] font-bold text-accent hover:underline"
                >
                  Jump to latest messages
                </button>
              </div>
            )}

            {/* Chat Composer */}
            <form
              onSubmit={(e) => {
                setActiveMention(null);
                handleSendChat(e);
              }}
              className="border-t border-white/[0.08] bg-[#07090e] p-2.5 sm:p-3"
            >
              {chatError && (
                <p className="mb-2 rounded-lg bg-rose-500/15 border border-rose-500/30 px-2.5 py-1.5 text-[11px] text-rose-300">
                  {chatError}
                </p>
              )}

              <div className="relative flex items-center gap-2">
                {activeMention?.target === "chat" && (
                  <MentionPopover
                    candidates={filteredMentionCandidates}
                    highlightIdx={mentionHighlightIdx}
                    query={activeMention.query}
                    onSelect={applyMentionSelection}
                    onHover={setMentionHighlightIdx}
                  />
                )}
                <div className="relative flex-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setChatInput(val);
                      handleInputMentionScan(
                        "chat",
                        val,
                        e.target.selectionStart,
                      );
                    }}
                    onClick={(e) =>
                      handleInputMentionScan(
                        "chat",
                        e.currentTarget.value,
                        e.currentTarget.selectionStart,
                      )
                    }
                    onKeyDown={(e) => {
                      handleMentionKeyDown("chat", e);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setActiveMention((prev) =>
                          prev?.target === "chat" ? null : prev,
                        );
                      }, 150);
                    }}
                    placeholder={
                      user
                        ? "Write a message or @tag..."
                        : "Sign in to chat live..."
                    }
                    disabled={!user}
                    maxLength={360}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0e17] pl-3.5 pr-10 py-2.5 text-base sm:text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                  />
                  {user && (
                    <button
                      type="button"
                      title="Tag a player with @"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        triggerAtPicker("chat");
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-lg bg-white/[0.06] text-xs font-bold text-slate-300 hover:bg-accent/25 hover:text-accent transition-colors"
                    >
                      @
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!user || sendingChat || !chatInput.trim()}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF0400] to-[#F7911B] px-3.5 sm:px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  <SendIcon className="size-3.5 sm:hidden" />
                  <span>{sendingChat ? "..." : "Send"}</span>
                </button>
              </div>

              {myIdentity && (
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                  <span className="truncate">
                    Posting as {myIdentity.username} · {myIdentity.state}
                    {myIdentity.rank ? ` · #${myIdentity.rank}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">{chatInput.length}/360</span>
                </div>
              )}
            </form>
          </div>
        </aside>
      </div>

      {/* Start Topic / Community Poll Modal (Mobile Bottom Sheet -> Desktop Modal) */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 bg-[#0b0e17] p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Start a player topic or poll</h2>
                <p className="text-[11px] text-slate-400">
                  Published with a Player Poll / Player Topic badge · Limit: 1 per hour
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setComposerOpen(false)}
                className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {!user ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-300">
                  Sign in to start topics and community polls.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreateTopic} className="mt-4 space-y-3.5">
                {!isTopicSlotOpen ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-amber-300">
                        Next player topic/poll unlocks in {formattedTopicCountdown}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-300">
                        {topicSlot.lastAuthorUsername
                          ? `@${topicSlot.lastAuthorUsername} claimed this hour's Arena slot. `
                          : "This hour's Arena slot has been used. "}
                        Publish unlocks automatically at 00:00.
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl border border-amber-400/40 bg-[#07090e] px-3 py-1.5 font-mono text-base font-extrabold tabular-nums text-amber-300">
                      {formattedTopicCountdown}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 text-emerald-200">
                      <span className="size-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        <span className="font-bold text-white">Arena slot open now.</span> Limit: 1 player topic or poll per hour.
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      OPEN
                    </span>
                  </div>
                )}

                {topicError && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-300">
                    {topicError}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-[#07090e] px-3 py-2.5 text-base sm:text-xs text-white focus:border-accent focus:outline-none"
                  >
                    {[
                      "Game Banter",
                      "Banking & Fintech",
                      "Telecoms & Data",
                      "Economy & Policy",
                      "Food & Culture",
                      "Sports & Music",
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Headline or question
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Which state has the sharpest players right now?"
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-[#07090e] px-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Extra context (optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Add your take or @tag a rival to start replies..."
                    className="w-full rounded-xl border border-white/10 bg-[#07090e] px-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
                  />
                </div>

                <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-[#07090e] px-3.5 py-2.5">
                  <span className="text-xs font-semibold text-slate-200">
                    Include voting options (poll)
                  </span>
                  <input
                    type="checkbox"
                    checked={includePoll}
                    onChange={(e) => setIncludePoll(e.target.checked)}
                    className="size-4 accent-[#F7911B]"
                  />
                </label>

                {includePoll && (
                  <div className="space-y-2">
                    {pollOpts.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={val}
                          maxLength={70}
                          onChange={(e) => {
                            const next = [...pollOpts];
                            next[idx] = e.target.value;
                            setPollOpts(next);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="min-h-11 flex-1 rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-base sm:text-xs text-white focus:border-accent focus:outline-none"
                        />
                        {pollOpts.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPollOpts(pollOpts.filter((_, i) => i !== idx))
                            }
                            className="min-h-11 px-2 text-xs text-slate-400 hover:text-rose-400"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOpts.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setPollOpts([...pollOpts, ""])}
                        className="min-h-9 text-xs font-semibold text-accent hover:underline"
                      >
                        + Add another option
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="min-h-11 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canPublishTopic}
                    className={`min-h-11 rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                      canPublishTopic
                        ? "bg-gradient-to-r from-[#FF0400] to-[#F7911B] text-white shadow-lg shadow-[#F7911B]/25 hover:opacity-95 cursor-pointer"
                        : "border border-white/10 bg-white/[0.05] text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {creatingTopic
                      ? "Publishing..."
                      : !isTopicSlotOpen
                      ? `Available in ${formattedTopicCountdown}`
                      : "Publish to Arena"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
