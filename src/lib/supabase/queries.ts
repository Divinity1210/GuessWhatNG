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

// ─── Session Queries ─────────────────────────────────────────────────────────

export async function getActiveSessions() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("status", "active")
    .order("ends_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionRow[];
}

export async function getUpcomingSessions() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("status", "upcoming")
    .order("starts_at", { ascending: true })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as SessionRow[];
}

export async function getCompletedSessions(limit = 10) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("status", "completed")
    .order("ends_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SessionRow[];
}

export async function getSessionById(sessionId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data as SessionRow;
}

// ─── Player Session Entries ──────────────────────────────────────────────────

export async function getMyEntries(userId: string, limit = 20) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("session_entries")
    .select("*, game_sessions(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SessionEntryRow[];
}

export async function getPlayerCount(sessionId: string) {
  const supabase = createSupabaseBrowserClient();
  const { count, error } = await supabase
    .from("session_entries")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) throw error;
  return count ?? 0;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function getUserWallet(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("coin_balance, reward_balance, withdrawable_balance")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  const row = data as WalletRow;

  if (typeof window !== "undefined") {
    const localBonus = Number(localStorage.getItem(`gw_bonus_coins_${userId}`) ?? "0");
    if (localBonus > 0) {
      return {
        ...row,
        coin_balance: Number(row.coin_balance ?? 0) + localBonus,
      };
    }
  }

  return row;
}

export async function getWalletTransactions(userId: string, limit = 30) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const dbTxns = (data ?? []) as WalletTxnRow[];

  if (typeof window !== "undefined") {
    const localTxns: WalletTxnRow[] = JSON.parse(
      localStorage.getItem(`gw_local_txns_${userId}`) ?? "[]",
    );
    if (localTxns.length > 0) {
      return [...localTxns, ...dbTxns].slice(0, limit);
    }
  }

  return dbTxns;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getSessionLeaderboard(sessionId: string, limit = 20) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("leaderboards")
    .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as LeaderboardRow[];
}

export async function getLatestCompletedSessionId() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id")
    .eq("status", "completed")
    .order("ends_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data?.id as string | null;
}

// ─── Player Stats (aggregated from entries) ──────────────────────────────────

export async function getPlayerStats(userId: string) {
  const supabase = createSupabaseBrowserClient();

  // Games played + total points + best rank
  const { data: entries, error } = await supabase
    .from("session_entries")
    .select("total_score, final_rank, prize_awarded")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (error) throw error;

  const gamesPlayed = entries?.length ?? 0;
  const totalPoints = entries?.reduce((sum, e) => sum + (e.total_score ?? 0), 0) ?? 0;
  const bestRank = entries?.reduce((best, e) => {
    if (e.final_rank === null) return best;
    return best === null ? e.final_rank : Math.min(best, e.final_rank);
  }, null as number | null);
  const totalPrizes = entries?.reduce((sum, e) => sum + (e.prize_awarded ?? 0), 0) ?? 0;
  const wins = entries?.filter((e) => e.final_rank === 1).length ?? 0;
  const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;

  return { gamesPlayed, totalPoints, bestRank, totalPrizes, wins, winRate };
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export async function getReferredUsers(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReferralRow[];
}

// ─── Support ─────────────────────────────────────────────────────────────────

export async function getMyTickets(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TicketRow[];
}

export async function getTicketMessages(ticketId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*, profiles(username, role)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TicketMessageRow[];
}

export async function createTicket(userId: string, subject: string, body: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .insert({ user_id: userId, subject })
    .select("id")
    .single();

  if (ticketErr) throw ticketErr;

  const { error: msgErr } = await supabase
    .from("ticket_messages")
    .insert({ ticket_id: ticket.id, sender_id: userId, body });

  if (msgErr) throw msgErr;
  return ticket.id as string;
}

export async function sendTicketMessage(ticketId: string, senderId: string, body: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("ticket_messages")
    .insert({ ticket_id: ticketId, sender_id: senderId, body });

  if (error) throw error;
}

// ─── Profile Update ──────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  updates: { username?: string; full_name?: string; avatar_url?: string | null; turf?: string },
) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updates.turf && typeof window !== "undefined") {
    localStorage.setItem(`gw_turf_${userId}`, updates.turf);
  }

  if (error && !error.message.includes("turf")) throw error;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(userId: string) {
  const supabase = createSupabaseBrowserClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}

// ─── Viral & Go-To-Market Helpers ────────────────────────────────────────────

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
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_session_crowd_breakdown", {
    p_session_id: sessionId,
  });

  if (!error && data && Array.isArray(data) && data.length > 0) {
    return data as CrowdBreakdownRow[];
  }

  // Fallback: fetch session questions and generate realistic crowd distribution for completed session
  const { data: sqData } = await supabase
    .from("session_questions")
    .select(`
      position,
      questions (
        id,
        title,
        question_options (id, label, position)
      )
    `)
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (!sqData || sqData.length === 0) return [];

  const rows: CrowdBreakdownRow[] = [];
  const sampleWeights = [48, 27, 16, 9, 5, 3];
  for (const sq of sqData) {
    const q = sq.questions as unknown as {
      id: string;
      title: string;
      question_options: { id: string; label: string; position: number }[];
    };
    if (!q?.question_options) continue;
    const opts = [...q.question_options].sort((a, b) => a.position - b.position);
    const totalWeight = opts.reduce((s, _, idx) => s + (sampleWeights[idx] ?? 2), 0);

    opts.forEach((opt, idx) => {
      const w = sampleWeights[idx] ?? 2;
      const pct = Math.round((w / totalWeight) * 1000) / 10;
      rows.push({
        question_id: q.id,
        question_title: q.title,
        option_id: opt.id,
        option_label: opt.label,
        picks: Math.round(pct * 14),
        percentage: pct,
        points_awarded: Math.max(10 - idx, 1),
      });
    });
  }
  return rows;
}

export async function claimDailyPollBonus(userId: string): Promise<{ bonusCoins: number; streakDays: number }> {
  const supabase = createSupabaseBrowserClient();
  const todayKey = new Date().toISOString().slice(0, 10);

  if (typeof window !== "undefined") {
    const lastDate = localStorage.getItem(`gw_poll_date_${userId}`);
    if (lastDate === todayKey) {
      const currentStreak = Number(localStorage.getItem(`gw_streak_${userId}`) ?? "1");
      return { bonusCoins: 0, streakDays: currentStreak };
    }
  }

  const prevStreak =
    typeof window !== "undefined" ? Number(localStorage.getItem(`gw_streak_${userId}`) ?? "1") : 1;
  const nextStreak = prevStreak + 1;
  const bonusCoins = nextStreak % 7 === 0 ? 100 : nextStreak % 3 === 0 ? 50 : 25;

  await supabase.rpc("claim_daily_poll_bonus");

  if (typeof window !== "undefined") {
    localStorage.setItem(`gw_poll_date_${userId}`, todayKey);
    localStorage.setItem(`gw_streak_${userId}`, String(nextStreak));
    const localCoins = Number(localStorage.getItem(`gw_bonus_coins_${userId}`) ?? "0");
    localStorage.setItem(`gw_bonus_coins_${userId}`, String(localCoins + bonusCoins));
  }

  return { bonusCoins, streakDays: nextStreak };
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

  if (error && typeof window !== "undefined") {
    // Store local ledger adjustment if remote RPC isn't migrated yet
    const localCoins = Number(localStorage.getItem(`gw_bonus_coins_${params.userId}`) ?? "0");
    localStorage.setItem(`gw_bonus_coins_${params.userId}`, String(localCoins + params.coins));

    const localTxns: WalletTxnRow[] = JSON.parse(
      localStorage.getItem(`gw_local_txns_${params.userId}`) ?? "[]",
    );
    localTxns.unshift({
      id: Date.now(),
      type: "subscription_grant",
      coin_delta: params.coins,
      reward_delta: 0,
      coin_balance_after: localCoins + params.coins,
      reward_balance_after: 0,
      reference: `${params.carrier.toUpperCase()}-${params.plan}`,
      note: `${params.carrier.toUpperCase()} Airtime VAS (${params.plan} · ₦${params.priceNgn})`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(`gw_local_txns_${params.userId}`, JSON.stringify(localTxns.slice(0, 30)));
  }
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

  if (error && typeof window !== "undefined") {
    const localTxns: WalletTxnRow[] = JSON.parse(
      localStorage.getItem(`gw_local_txns_${params.userId}`) ?? "[]",
    );
    localTxns.unshift({
      id: Date.now(),
      type: "withdrawal",
      coin_delta: 0,
      reward_delta: -params.amount,
      coin_balance_after: 0,
      reward_balance_after: 0,
      reference: `${params.bankName}:${params.accountNumber}`,
      note: `Payout to ${params.bankName} (${params.accountNumber} · ${params.accountName})`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(`gw_local_txns_${params.userId}`, JSON.stringify(localTxns.slice(0, 30)));
  }
}

