import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const rawUserId = req.nextUrl.searchParams.get("userId");
    const resolvedUserId = rawUserId && UUID_RE.test(rawUserId) ? rawUserId : null;

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, username, referral_code, referred_by, created_at, turf")
      .order("created_at", { ascending: false });

    const profiles = allProfiles ?? [];
    const myProfile = resolvedUserId
      ? profiles.find((p) => p.id === resolvedUserId)
      : null;

    const referralCode = myProfile?.referral_code ?? "";

    // Players referred by this user
    const myReferrals = resolvedUserId
      ? profiles
          .filter((p) => p.referred_by === resolvedUserId)
          .map((p) => ({
            id: p.id,
            username: p.username,
            created_at: p.created_at,
          }))
      : [];

    // Compute Monthly Referral Leaderboard across all real profiles
    const countsByReferrer = new Map<string, number>();
    for (const p of profiles) {
      if (p.referred_by) {
        countsByReferrer.set(
          p.referred_by,
          (countsByReferrer.get(p.referred_by) ?? 0) + 1,
        );
      }
    }

    const leaderboardCandidates: {
      userId: string;
      username: string;
      referralCode: string;
      referralsCount: number;
      turf: string;
    }[] = [];

    for (const p of profiles) {
      const count = countsByReferrer.get(p.id) ?? 0;
      leaderboardCandidates.push({
        userId: p.id,
        username: p.username,
        referralCode: p.referral_code,
        referralsCount: count,
        turf: p.turf ?? "Lagos (Eko)",
      });
    }

    leaderboardCandidates.sort((a, b) => {
      if (b.referralsCount !== a.referralsCount) {
        return b.referralsCount - a.referralsCount;
      }
      return a.username.localeCompare(b.username);
    });

    const monthlyLeaderboard = leaderboardCandidates.slice(0, 10).map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    return NextResponse.json({
      ok: true,
      referralCode,
      referrals: myReferrals,
      monthlyLeaderboard,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load referrals" },
      { status: 500 },
    );
  }
}
