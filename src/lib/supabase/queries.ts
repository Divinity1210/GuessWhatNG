import { createSupabaseBrowserClient } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionRow = {
  id: string;
  name: string;
  status: "upcoming" | "active" | "closing" | "completed";
  starts_at: string;
  ends_at: string;
  entry_fee_coins: number;
  prize_pool: number;
  prize_structure: { rank_from: number; rank_to: number; amount: number }[];
};

export type WalletRow = {
  coin_balance: number;
  reward_balance: number;
  withdrawable_balance: number;
};

export type WalletTxnRow = {
  id: number;
  type: string;
  coin_delta: number;
  reward_delta: number;
  coin_balance_after: number;
  reward_balance_after: number;
  reference: string | null;
  note: string | null;
  created_at: string;
};

export type LeaderboardRow = {
  rank: number;
  points: number;
  response_ms: number;
  prize: number;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export type SessionEntryRow = {
  id: string;
  session_id: string;
  joined_at: string;
  completed_at: string | null;
  total_score: number | null;
  final_rank: number | null;
  prize_awarded: number;
  game_sessions: SessionRow | null;
};

export type ReferralRow = {
  id: string;
  username: string;
  created_at: string;
};

export type TicketRow = {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TicketMessageRow = {
  id: number;
  body: string;
  sender_id: string;
  created_at: string;
  profiles: { username: string; role: string } | null;
};

// ─── Session Queries (100% Real Supabase Data) ───────────────────────────────

export async function getActiveSessions(): Promise<SessionRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "active")
      .order("ends_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as SessionRow[];
    }
  } catch {
    // Fall through to service API
  }

  try {
    const res = await fetch("/api/game/session", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.sessions)) {
        return (json.sessions as SessionRow[]).filter((s) => s.status === "active");
      }
    }
  } catch {
    // Ignore
  }

  return [];
}

export async function getUpcomingSessions(): Promise<SessionRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true })
      .limit(6);

    if (!error && data) {
      return data as SessionRow[];
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function getCompletedSessions(limit = 10): Promise<SessionRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "completed")
      .order("ends_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as SessionRow[];
    }
  } catch {
    // Fall through to service API
  }

  try {
    const res = await fetch("/api/game/session", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.sessions)) {
        return (json.sessions as SessionRow[])
          .filter((s) => s.status === "completed")
          .slice(0, limit);
      }
    }
  } catch {
    // Ignore
  }

  return [];
}

export async function getSessionById(sessionId: string): Promise<SessionRow | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!error && data) {
      return data as SessionRow;
    }
  } catch {
    // Ignore
  }
  return null;
}

// ─── Player Session Entries ──────────────────────────────────────────────────

export async function getMyEntries(userId: string, limit = 20): Promise<SessionEntryRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("session_entries")
      .select("*, game_sessions(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as SessionEntryRow[];
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function getPlayerCount(sessionId: string): Promise<number> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { count, error } = await supabase
      .from("session_entries")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (!error && typeof count === "number") return count;
  } catch {
    // Ignore
  }
  return 0;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function getUserWallet(userId: string): Promise<WalletRow> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("wallets")
      .select("coin_balance, reward_balance, withdrawable_balance")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      return {
        coin_balance: Number(data.coin_balance ?? 0),
        reward_balance: Number(data.reward_balance ?? 0),
        withdrawable_balance: Number(data.withdrawable_balance ?? 0),
      };
    }
  } catch {
    // Ignore
  }

  return {
    coin_balance: 0,
    reward_balance: 0,
    withdrawable_balance: 0,
  };
}

export async function getWalletTransactions(
  userId: string,
  limit = 30,
): Promise<WalletTxnRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as WalletTxnRow[];
    }
  } catch {
    // Ignore
  }

  return [];
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getSessionLeaderboard(
  sessionId: string,
  limit = 20,
): Promise<LeaderboardRow[]> {
  try {
    const res = await fetch(
      `/api/game/session?sessionId=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.leaderboard)) {
        return (json.leaderboard as LeaderboardRow[]).slice(0, limit);
      }
    }
  } catch {
    // Fall through to direct browser query
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("leaderboards")
      .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
      .eq("session_id", sessionId)
      .order("rank", { ascending: true })
      .limit(limit);

    if (!error && data) {
      return data as unknown as LeaderboardRow[];
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function getLatestCompletedSessionId(): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("game_sessions")
      .select("id")
      .eq("status", "completed")
      .order("ends_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data?.id) return data.id as string;
  } catch {
    // Fall through
  }

  const completed = await getCompletedSessions(1);
  return completed[0]?.id ?? null;
}

// ─── Player Stats (aggregated from real entries) ─────────────────────────────

export async function getPlayerStats(userId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: entries, error } = await supabase
      .from("session_entries")
      .select("total_score, final_rank, prize_awarded")
      .eq("user_id", userId)
      .not("completed_at", "is", null);

    if (!error && entries && entries.length > 0) {
      const gamesPlayed = entries.length;
      const totalPoints = entries.reduce((sum, e) => sum + (e.total_score ?? 0), 0);
      const bestRank = entries.reduce((best, e) => {
        if (e.final_rank === null) return best;
        return best === null ? e.final_rank : Math.min(best, e.final_rank);
      }, null as number | null);
      const totalPrizes = entries.reduce((sum, e) => sum + Number(e.prize_awarded ?? 0), 0);
      const wins = entries.filter((e) => e.final_rank === 1).length;
      const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;

      return { gamesPlayed, totalPoints, bestRank, totalPrizes, wins, winRate };
    }
  } catch {
    // Ignore
  }

  return {
    gamesPlayed: 0,
    totalPoints: 0,
    bestRank: null,
    totalPrizes: 0,
    wins: 0,
    winRate: 0,
  };
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export async function getReferredUsers(userId: string): Promise<ReferralRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, created_at")
      .eq("referred_by", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as ReferralRow[];
    }
  } catch {
    // Ignore
  }

  return [];
}

// ─── Support ─────────────────────────────────────────────────────────────────

export async function getMyTickets(userId: string): Promise<TicketRow[]> {
  try {
    const res = await fetch(`/api/support?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.tickets)) {
      return data.tickets as TicketRow[];
    }
  } catch {
    // Fall through
  }
  return [];
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessageRow[]> {
  try {
    const res = await fetch(`/api/support?ticketId=${encodeURIComponent(ticketId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.messages)) {
      return data.messages as TicketMessageRow[];
    }
  } catch {
    // Fall through
  }
  return [];
}

export async function createTicket(userId: string, subject: string, body: string) {
  const res = await fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subject, message: body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create ticket");
  return data.ticket?.id as string;
}

export async function sendTicketMessage(ticketId: string, senderId: string, body: string) {
  const res = await fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reply",
      ticketId,
      userId: senderId,
      message: body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send message");
}

// ─── Profile Update ──────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  updates: { username?: string; full_name?: string; avatar_url?: string | null; turf?: string },
) {
  if (updates.turf && typeof window !== "undefined") {
    localStorage.setItem(`gw_turf_${userId}`, updates.turf);
  }

  try {
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // Ignore
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (!error && count !== null) return count;
  } catch {
    // Ignore
  }
  return 0;
}

// ─── Crowd Breakdown Helpers ─────────────────────────────────────────────────

export type CrowdBreakdownRow = {
  question_id: string;
  question_title: string;
  option_id: string;
  option_label: string;
  picks: number;
  percentage: number;
  points_awarded: number;
};

export async function getSessionCrowdBreakdown(sessionId: string): Promise<CrowdBreakdownRow[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("get_session_crowd_breakdown", {
      p_session_id: sessionId,
    });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data as CrowdBreakdownRow[];
    }
  } catch {
    // Ignore
  }

  return [];
}

export async function claimDailyPollBonus(
  userId: string,
): Promise<{ bonusCoins: number; streakDays: number }> {
  void userId;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("claim_daily_poll_bonus");
  if (error) throw error;
  return { bonusCoins: Number(data ?? 0), streakDays: 1 };
}

export async function topupCoinsVas(params: {
  userId: string;
  coins: number;
  plan: string;
  msisdn: string;
  carrier: string;
  priceNgn: number;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("topup_coins_vas", {
    p_coins: params.coins,
    p_plan: params.plan,
    p_msisdn: params.msisdn,
    p_carrier: params.carrier,
  });
  if (error) throw error;
}

export async function requestRewardWithdrawal(params: {
  userId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("request_reward_withdrawal", {
    p_amount: params.amount,
    p_bank_name: params.bankName,
    p_account_number: params.accountNumber,
    p_account_name: params.accountName,
  });
  if (error) throw error;
}
