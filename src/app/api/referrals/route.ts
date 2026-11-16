import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getOptionalAuthUser } from "@/lib/supabase/api-auth";

type ReferralPrizeTier = {
  rank_from: number;
  rank_to: number;
  amount: number;
};

type ReferralLeaderboardConfig = {
  title: string;
  enabled: boolean;
  cycleNumber: number;
  cycleStartedAt: string | null;
  endsNote: string;
  prizeTiers: ReferralPrizeTier[];
  updatedAt: string;
};

type ReferralArchiveWinner = {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  state: string;
  referralCode: string;
  verifiedReferrals: number;
  cycleSignups: number;
  prizeAmount: number;
};

type ReferralCycleArchive = {
  id: string;
  cycleNumber: number;
  title: string;
  startedAt: string | null;
  endedAt: string;
  totalPool: number;
  winners: ReferralArchiveWinner[];
};

const DEFAULT_PRIZE_TIERS: ReferralPrizeTier[] = [
  { rank_from: 1, rank_to: 1, amount: 50000 },
  { rank_from: 2, rank_to: 2, amount: 30000 },
  { rank_from: 3, rank_to: 3, amount: 20000 },
  { rank_from: 4, rank_to: 10, amount: 5000 },
];

function normalizeConfig(raw: unknown): ReferralLeaderboardConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      title: "Referral Cash Challenge #1",
      enabled: true,
      cycleNumber: 1,
      cycleStartedAt: null,
      endsNote: "Top verified referrers win cash prizes",
      prizeTiers: DEFAULT_PRIZE_TIERS.map((t) => ({ ...t })),
      updatedAt: new Date(0).toISOString(),
    };
  }
  const obj = raw as Record<string, unknown>;
  const cycleNumber = Math.max(1, Math.floor(Number(obj.cycleNumber ?? 1) || 1));
  const rawTiers = Array.isArray(obj.prizeTiers) ? obj.prizeTiers : DEFAULT_PRIZE_TIERS;
  const prizeTiers: ReferralPrizeTier[] = [];
  for (const item of rawTiers) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const rankFrom = Math.max(1, Math.floor(Number(t.rank_from ?? 1) || 1));
    const rankTo = Math.max(rankFrom, Math.floor(Number(t.rank_to ?? rankFrom) || rankFrom));
    const amount = Math.max(0, Math.round(Number(t.amount ?? 0) || 0));
    prizeTiers.push({ rank_from: rankFrom, rank_to: rankTo, amount });
  }
  prizeTiers.sort((a, b) => a.rank_from - b.rank_from || a.rank_to - b.rank_to);

  return {
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : `Referral Cash Challenge #${cycleNumber}`,
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
    cycleNumber,
    cycleStartedAt:
      typeof obj.cycleStartedAt === "string" && obj.cycleStartedAt.trim()
        ? obj.cycleStartedAt
        : null,
    endsNote:
      typeof obj.endsNote === "string" && obj.endsNote.trim()
        ? obj.endsNote.trim()
        : "Top verified referrers win cash prizes",
    prizeTiers: prizeTiers.length > 0 ? prizeTiers : DEFAULT_PRIZE_TIERS.map((t) => ({ ...t })),
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

function computePool(prizeTiers: ReferralPrizeTier[]) {
  let totalPool = 0;
  let totalWinnerSpots = 0;
  for (const t of prizeTiers) {
    const count = Math.max(1, t.rank_to - t.rank_from + 1);
    totalPool += count * Math.max(0, t.amount);
    if (t.amount > 0 && t.rank_to > totalWinnerSpots) {
      totalWinnerSpots = t.rank_to;
    }
  }
  return { totalPool, totalWinnerSpots };
}

function lookupPrize(
  rank: number | null,
  prizeTiers: ReferralPrizeTier[],
  enabled: boolean,
  verifiedReferrals: number,
): number {
  if (!enabled || !rank || verifiedReferrals <= 0) return 0;
  const tier = prizeTiers.find((t) => rank >= t.rank_from && rank <= t.rank_to);
  return tier ? Math.max(0, Number(tier.amount) || 0) : 0;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuthUser(req);
    const resolvedUserId = authUser?.id ?? null;
    const supabase = createSupabaseServiceClient();

    const [
      { data: myProfile },
      { data: allReferredProfiles },
      { data: entries },
      { data: settingsRows },
    ] = await Promise.all([
      resolvedUserId
        ? supabase
            .from("profiles")
            .select("id, username, referral_code, turf")
            .eq("id", resolvedUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("profiles")
        .select("id, username, avatar_url, status, risk_score, referred_by, created_at")
        .not("referred_by", "is", null)
        .limit(10000),
      supabase
        .from("session_entries")
        .select("user_id")
        .limit(50000),
      supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["referral_leaderboard_config", "referral_leaderboard_archives"]),
    ]);

    const settingsMap = new Map<string, unknown>();
    for (const row of settingsRows ?? []) {
      settingsMap.set(row.key, row.value);
    }

    const config = normalizeConfig(settingsMap.get("referral_leaderboard_config"));
    const { totalPool, totalWinnerSpots } = computePool(config.prizeTiers);
    const archives: ReferralCycleArchive[] = Array.isArray(
      settingsMap.get("referral_leaderboard_archives"),
    )
      ? (settingsMap.get("referral_leaderboard_archives") as ReferralCycleArchive[])
      : [];

    const playsByUser = new Map<string, number>();
    for (const e of entries ?? []) {
      playsByUser.set(e.user_id, (playsByUser.get(e.user_id) ?? 0) + 1);
    }

    const cycleStartMs = config.cycleStartedAt
      ? new Date(config.cycleStartedAt).getTime()
      : null;

    // Group referred accounts by referrer ID cleanly
    const verifiedByReferrer = new Map<string, number>();
    const signupsByReferrer = new Map<string, number>();
    const lastVerifiedMsByReferrer = new Map<string, number>();

    const myReferrals: {
      id: string;
      username: string;
      avatarUrl: string | null;
      created_at: string;
      sessionsPlayed: number;
      isVerified: boolean;
      inCurrentCycle: boolean;
    }[] = [];

    for (const child of allReferredProfiles ?? []) {
      const refId = child.referred_by;
      if (!refId) continue;

      const createdMs = new Date(child.created_at).getTime();
      const inCurrentCycle = cycleStartMs === null || createdMs >= cycleStartMs;
      const sessionsPlayed = playsByUser.get(child.id) ?? 0;
      const childRisk = Number(child.risk_score ?? 0);
      const childStatus = child.status || "active";
      const childBlocked =
        childStatus === "suspended" || childStatus === "blocked" || childRisk >= 50;
      const isVerified = inCurrentCycle && sessionsPlayed >= 1 && !childBlocked;

      if (inCurrentCycle) {
        signupsByReferrer.set(refId, (signupsByReferrer.get(refId) ?? 0) + 1);
      }
      if (isVerified) {
        verifiedByReferrer.set(refId, (verifiedByReferrer.get(refId) ?? 0) + 1);
        const prevMax = lastVerifiedMsByReferrer.get(refId) ?? 0;
        if (createdMs > prevMax) {
          lastVerifiedMsByReferrer.set(refId, createdMs);
        }
      }

      if (resolvedUserId && refId === resolvedUserId) {
        myReferrals.push({
          id: child.id,
          username: child.username || "Player",
          avatarUrl: child.avatar_url || null,
          created_at: child.created_at,
          sessionsPlayed,
          isVerified,
          inCurrentCycle,
        });
      }
    }

    myReferrals.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const activeReferrerIds = Array.from(verifiedByReferrer.entries())
      .filter(([, count]) => count > 0)
      .map(([uid]) => uid);

    const { data: referrerProfiles } =
      activeReferrerIds.length > 0
        ? await supabase
            .from("profiles")
            .select(
              "id, username, avatar_url, referral_code, turf, state, status, created_at",
            )
            .in("id", activeReferrerIds)
        : { data: [] };

    const eligibleRows: {
      userId: string;
      username: string;
      avatarUrl: string | null;
      referralCode: string;
      verifiedReferrals: number;
      cycleSignups: number;
      lastVerifiedAtMs: number;
      joinedAtMs: number;
      turf: string;
      state: string;
    }[] = [];

    for (const p of referrerProfiles ?? []) {
      const status = p.status || "active";
      if (status === "suspended" || status === "blocked") continue;

      const verifiedReferrals = verifiedByReferrer.get(p.id) ?? 0;
      if (verifiedReferrals <= 0) continue;

      eligibleRows.push({
        userId: p.id,
        username: p.username || "Player",
        avatarUrl: p.avatar_url || null,
        referralCode: p.referral_code || (p.username ? p.username.toUpperCase() : "NAIJA26"),
        verifiedReferrals,
        cycleSignups: signupsByReferrer.get(p.id) ?? verifiedReferrals,
        lastVerifiedAtMs:
          lastVerifiedMsByReferrer.get(p.id) ?? Number.MAX_SAFE_INTEGER,
        joinedAtMs: new Date(p.created_at).getTime(),
        turf: p.turf ?? "Lagos (Eko)",
        state: p.state || p.turf || "Nigeria",
      });
    }

    eligibleRows.sort((a, b) => {
      if (b.verifiedReferrals !== a.verifiedReferrals) {
        return b.verifiedReferrals - a.verifiedReferrals;
      }
      if (a.lastVerifiedAtMs !== b.lastVerifiedAtMs) {
        return a.lastVerifiedAtMs - b.lastVerifiedAtMs;
      }
      if (b.cycleSignups !== a.cycleSignups) {
        return b.cycleSignups - a.cycleSignups;
      }
      return a.joinedAtMs - b.joinedAtMs;
    });

    const rankedLeaderboard = eligibleRows.map((item, idx) => {
      const rank = idx + 1;
      const prizeAmount = lookupPrize(
        rank,
        config.prizeTiers,
        config.enabled,
        item.verifiedReferrals,
      );
      return {
        rank,
        userId: item.userId,
        username: item.username,
        avatarUrl: item.avatarUrl,
        referralCode: item.referralCode,
        verifiedReferrals: item.verifiedReferrals,
        referralsCount: item.verifiedReferrals,
        cycleSignups: item.cycleSignups,
        prizeAmount,
        turf: item.turf,
        state: item.state,
      };
    });

    const myRankedRow = resolvedUserId
      ? rankedLeaderboard.find((r) => r.userId === resolvedUserId) ?? null
      : null;

    const myVerifiedCount = resolvedUserId
      ? verifiedByReferrer.get(resolvedUserId) ?? 0
      : 0;
    const myCycleSignups = resolvedUserId
      ? signupsByReferrer.get(resolvedUserId) ?? 0
      : 0;
    const myPendingCount = Math.max(0, myCycleSignups - myVerifiedCount);

    const referralCode = myProfile?.referral_code ?? "NAIJA26";

    return NextResponse.json({
      ok: true,
      referralCode,
      config: {
        ...config,
        totalPool,
        totalWinnerSpots,
      },
      myStats: {
        rank: myRankedRow?.rank ?? null,
        verifiedReferrals: myVerifiedCount,
        pendingReferrals: myPendingCount,
        lifetimeReferrals: myReferrals.length,
        projectedPrize: myRankedRow?.prizeAmount ?? 0,
      },
      referrals: myReferrals,
      leaderboard: rankedLeaderboard.slice(0, 50),
      monthlyLeaderboard: rankedLeaderboard.slice(0, 10),
      previousCycles: archives.slice(0, 5),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load referrals" },
      { status: 500 },
    );
  }
}
