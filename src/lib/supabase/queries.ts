import { createSupabaseBrowserClient } from "./client";
import { VIRAL_DEMO_QUESTIONS } from "@/lib/game/viral-engine";

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

// ─── Fallback Data (Used when remote Supabase is paused or empty) ────────────

const FALLBACK_ACTIVE_SESSIONS: SessionRow[] = [
  {
    id: "live-naija-heat-01",
    name: "Friday Night Naija Heat",
    status: "active",
    starts_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
    ends_at: new Date(Date.now() + 18 * 3600_000).toISOString(),
    entry_fee_coins: 50,
    prize_pool: 50000,
    prize_structure: [
      { rank_from: 1, rank_to: 1, amount: 25000 },
      { rank_from: 2, rank_to: 2, amount: 12500 },
      { rank_from: 3, rank_to: 3, amount: 7500 },
      { rank_from: 4, rank_to: 5, amount: 2500 },
    ],
  },
];

const FALLBACK_UPCOMING_SESSIONS: SessionRow[] = [
  {
    id: "upcoming-campus-clash-01",
    name: "Weekend Campus Clash (UNILAG vs OAU vs UI)",
    status: "upcoming",
    starts_at: new Date(Date.now() + 20 * 3600_000).toISOString(),
    ends_at: new Date(Date.now() + 68 * 3600_000).toISOString(),
    entry_fee_coins: 50,
    prize_pool: 100000,
    prize_structure: [
      { rank_from: 1, rank_to: 1, amount: 50000 },
      { rank_from: 2, rank_to: 2, amount: 25000 },
      { rank_from: 3, rank_to: 5, amount: 8333 },
    ],
  },
  {
    id: "upcoming-afrobeats-drop-02",
    name: "Sunday Afrobeats & Street Banter Drop",
    status: "upcoming",
    starts_at: new Date(Date.now() + 44 * 3600_000).toISOString(),
    ends_at: new Date(Date.now() + 92 * 3600_000).toISOString(),
    entry_fee_coins: 100,
    prize_pool: 250000,
    prize_structure: [
      { rank_from: 1, rank_to: 1, amount: 125000 },
      { rank_from: 2, rank_to: 2, amount: 65000 },
      { rank_from: 3, rank_to: 5, amount: 20000 },
    ],
  },
];

const FALLBACK_COMPLETED_SESSIONS: SessionRow[] = [
  {
    id: "completed-lagos-abuja-derby",
    name: "Lagos vs Abuja Street Derby",
    status: "completed",
    starts_at: new Date(Date.now() - 72 * 3600_000).toISOString(),
    ends_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
    entry_fee_coins: 50,
    prize_pool: 50000,
    prize_structure: [
      { rank_from: 1, rank_to: 1, amount: 25000 },
      { rank_from: 2, rank_to: 2, amount: 12500 },
      { rank_from: 3, rank_to: 3, amount: 7500 },
    ],
  },
];

const FALLBACK_LEADERBOARD: LeaderboardRow[] = [
  {
    rank: 1,
    points: 108,
    response_ms: 14210,
    prize: 25000,
    user_id: "u-eko-king",
    profiles: { username: "eko_king", avatar_url: null },
  },
  {
    rank: 2,
    points: 104,
    response_ms: 15840,
    prize: 12500,
    user_id: "demo-naija-player",
    profiles: { username: "naija_striker", avatar_url: null },
  },
  {
    rank: 3,
    points: 101,
    response_ms: 16490,
    prize: 7500,
    user_id: "u-ada-unilag",
    profiles: { username: "ada_unilag", avatar_url: null },
  },
  {
    rank: 4,
    points: 98,
    response_ms: 17120,
    prize: 2500,
    user_id: "u-tunde-ph",
    profiles: { username: "tunde_ph", avatar_url: null },
  },
  {
    rank: 5,
    points: 96,
    response_ms: 18050,
    prize: 2500,
    user_id: "u-chidi-042",
    profiles: { username: "chidi_042", avatar_url: null },
  },
  {
    rank: 6,
    points: 94,
    response_ms: 19300,
    prize: 0,
    user_id: "u-zainab-abj",
    profiles: { username: "zainab_abj", avatar_url: null },
  },
  {
    rank: 7,
    points: 91,
    response_ms: 20110,
    prize: 0,
    user_id: "u-kwame-accra",
    profiles: { username: "kwame_accra", avatar_url: null },
  },
];

// ─── Session Queries ─────────────────────────────────────────────────────────

export async function getActiveSessions() {
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
    // Fall through
  }
  return FALLBACK_ACTIVE_SESSIONS;
}

export async function getUpcomingSessions() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true })
      .limit(6);

    if (!error && data && data.length > 0) {
      return data as SessionRow[];
    }
  } catch {
    // Fall through
  }
  return FALLBACK_UPCOMING_SESSIONS;
}

export async function getCompletedSessions(limit = 10) {
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
    // Fall through
  }
  return FALLBACK_COMPLETED_SESSIONS;
}

export async function getSessionById(sessionId: string) {
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
    // Fall through
  }
  const all = [
    ...FALLBACK_ACTIVE_SESSIONS,
    ...FALLBACK_UPCOMING_SESSIONS,
    ...FALLBACK_COMPLETED_SESSIONS,
  ];
  return all.find((s) => s.id === sessionId) ?? FALLBACK_ACTIVE_SESSIONS[0];
}

// ─── Player Session Entries ──────────────────────────────────────────────────

export async function getMyEntries(userId: string, limit = 20) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("session_entries")
      .select("*, game_sessions(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as SessionEntryRow[];
    }
  } catch {
    // Fall through
  }
  return [
    {
      id: "entry-demo-completed-1",
      session_id: FALLBACK_COMPLETED_SESSIONS[0].id,
      joined_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
      completed_at: new Date(Date.now() - 47 * 3600_000).toISOString(),
      total_score: 104,
      final_rank: 2,
      prize_awarded: 12500,
      game_sessions: FALLBACK_COMPLETED_SESSIONS[0],
    },
  ];
}

export async function getPlayerCount(sessionId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { count, error } = await supabase
      .from("session_entries")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (!error && count && count > 0) return count;
  } catch {
    // Fall through
  }
  return 1_248;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function getUserWallet(userId: string) {
  let baseCoins = 150;
  let baseRewards = 12500;
  let baseWithdrawable = 12500;

  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("wallets")
      .select("coin_balance, reward_balance, withdrawable_balance")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      baseCoins = Number(data.coin_balance ?? 0);
      baseRewards = Number(data.reward_balance ?? 0);
      baseWithdrawable = Number(data.withdrawable_balance ?? 0);
    }
  } catch {
    // Use default fallback wallet
  }

  if (typeof window !== "undefined") {
    const localBonus = Number(localStorage.getItem(`gw_bonus_coins_${userId}`) ?? "0");
    const localWithdrawn = Number(localStorage.getItem(`gw_withdrawn_${userId}`) ?? "0");
    return {
      coin_balance: baseCoins + localBonus,
      reward_balance: Math.max(0, baseRewards - localWithdrawn),
      withdrawable_balance: Math.max(0, baseWithdrawable - localWithdrawn),
    };
  }

  return {
    coin_balance: baseCoins,
    reward_balance: baseRewards,
    withdrawable_balance: baseWithdrawable,
  };
}

export async function getWalletTransactions(userId: string, limit = 30) {
  let dbTxns: WalletTxnRow[] = [];
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      dbTxns = data as WalletTxnRow[];
    }
  } catch {
    // Ignore
  }

  const defaultDemoTxns: WalletTxnRow[] =
    dbTxns.length === 0
      ? [
          {
            id: 1002,
            type: "prize_payout",
            coin_delta: 0,
            reward_delta: 12500,
            coin_balance_after: 150,
            reward_balance_after: 12500,
            reference: "SESSION-LAGOS-ABUJA",
            note: "Rank #2 Prize — Lagos vs Abuja Street Derby",
            created_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
          },
          {
            id: 1001,
            type: "welcome_bonus",
            coin_delta: 150,
            reward_delta: 0,
            coin_balance_after: 150,
            reward_balance_after: 0,
            reference: "WELCOME-NAIJA",
            note: "Welcome + Squad Referral Bonus Coins",
            created_at: new Date(Date.now() - 72 * 3600_000).toISOString(),
          },
        ]
      : dbTxns;

  if (typeof window !== "undefined") {
    const localTxns: WalletTxnRow[] = JSON.parse(
      localStorage.getItem(`gw_local_txns_${userId}`) ?? "[]",
    );
    if (localTxns.length > 0) {
      return [...localTxns, ...defaultDemoTxns].slice(0, limit);
    }
  }

  return defaultDemoTxns;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getSessionLeaderboard(sessionId: string, limit = 20) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("leaderboards")
      .select("rank, points, response_ms, prize, user_id, profiles(username, avatar_url)")
      .eq("session_id", sessionId)
      .order("rank", { ascending: true })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as unknown as LeaderboardRow[];
    }
  } catch {
    // Fall through
  }
  return FALLBACK_LEADERBOARD.slice(0, limit);
}

export async function getLatestCompletedSessionId() {
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
  return FALLBACK_COMPLETED_SESSIONS[0].id;
}

// ─── Player Stats (aggregated from entries) ──────────────────────────────────

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
      const totalPrizes = entries.reduce((sum, e) => sum + (e.prize_awarded ?? 0), 0);
      const wins = entries.filter((e) => e.final_rank === 1).length;
      const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;

      return { gamesPlayed, totalPoints, bestRank, totalPrizes, wins, winRate };
    }
  } catch {
    // Fall through
  }

  return {
    gamesPlayed: 4,
    totalPoints: 386,
    bestRank: 2,
    totalPrizes: 12500,
    wins: 1,
    winRate: 0.25,
  };
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export async function getReferredUsers(userId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, created_at")
      .eq("referred_by", userId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as ReferralRow[];
    }
  } catch {
    // Fall through
  }

  return [
    {
      id: "ref-1",
      username: "tunde_lekki",
      created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
    },
    {
      id: "ref-2",
      username: "amaka_unilag",
      created_at: new Date(Date.now() - 60 * 3600_000).toISOString(),
    },
  ];
}

// ─── Support ─────────────────────────────────────────────────────────────────

export async function getMyTickets(userId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!error && data) return data as TicketRow[];
  } catch {
    // Fall through
  }
  return [];
}

export async function getTicketMessages(ticketId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*, profiles(username, role)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!error && data) return data as TicketMessageRow[];
  } catch {
    // Fall through
  }
  return [];
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
    // Saved locally
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(userId: string) {
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
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("get_session_crowd_breakdown", {
      p_session_id: sessionId,
    });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data as CrowdBreakdownRow[];
    }

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

    if (sqData && sqData.length > 0) {
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
  } catch {
    // Fall through to demo breakdown
  }

  // Fallback using VIRAL_DEMO_QUESTIONS so Crowd Vote Reveal works even when DB is paused
  const fallbackRows: CrowdBreakdownRow[] = [];
  const weights = [46, 29, 16, 9];
  for (const dq of VIRAL_DEMO_QUESTIONS) {
    dq.options.forEach((opt, idx) => {
      const pct = weights[idx] ?? 10;
      fallbackRows.push({
        question_id: dq.id,
        question_title: dq.title,
        option_id: opt.id,
        option_label: opt.label,
        picks: Math.round(pct * 12.4),
        percentage: pct,
        points_awarded: 10 - idx,
      });
    });
  }
  return fallbackRows;
}

export async function claimDailyPollBonus(
  userId: string,
): Promise<{ bonusCoins: number; streakDays: number }> {
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

  try {
    await supabase.rpc("claim_daily_poll_bonus");
  } catch {
    // Offline fallback
  }

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
  let hasError = false;
  try {
    const { error } = await supabase.rpc("topup_coins_vas", {
      p_coins: params.coins,
      p_plan: params.plan,
      p_msisdn: params.msisdn,
      p_carrier: params.carrier,
    });
    if (error) hasError = true;
  } catch {
    hasError = true;
  }

  if (hasError && typeof window !== "undefined") {
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
      coin_balance_after: 150 + localCoins + params.coins,
      reward_balance_after: 12500,
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
  let hasError = false;
  try {
    const { error } = await supabase.rpc("request_reward_withdrawal", {
      p_amount: params.amount,
      p_bank_name: params.bankName,
      p_account_number: params.accountNumber,
      p_account_name: params.accountName,
    });
    if (error) hasError = true;
  } catch {
    hasError = true;
  }

  if (hasError && typeof window !== "undefined") {
    const prevWithdrawn = Number(localStorage.getItem(`gw_withdrawn_${params.userId}`) ?? "0");
    localStorage.setItem(
      `gw_withdrawn_${params.userId}`,
      String(prevWithdrawn + params.amount),
    );

    const localTxns: WalletTxnRow[] = JSON.parse(
      localStorage.getItem(`gw_local_txns_${params.userId}`) ?? "[]",
    );
    localTxns.unshift({
      id: Date.now(),
      type: "withdrawal",
      coin_delta: 0,
      reward_delta: -params.amount,
      coin_balance_after: 150,
      reward_balance_after: Math.max(0, 12500 - prevWithdrawn - params.amount),
      reference: `${params.bankName}:${params.accountNumber}`,
      note: `Payout to ${params.bankName} (${params.accountNumber} · ${params.accountName})`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(`gw_local_txns_${params.userId}`, JSON.stringify(localTxns.slice(0, 30)));
  }
}
