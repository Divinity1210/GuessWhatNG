import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getOptionalAuthUser } from "@/lib/supabase/api-auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuthUser(req);
    const resolvedUserId = authUser?.id ?? null;
    const supabase = createSupabaseServiceClient();

    const [
      { data: myProfile },
      { data: myReferredRows },
      { data: allReferredEdges },
    ] = await Promise.all([
      resolvedUserId
        ? supabase
            .from("profiles")
            .select("id, username, referral_code, turf")
            .eq("id", resolvedUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      resolvedUserId
        ? supabase
            .from("profiles")
            .select("id, username, created_at")
            .eq("referred_by", resolvedUserId)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] }),
      supabase
        .from("profiles")
        .select("referred_by")
        .not("referred_by", "is", null)
        .limit(10000),
    ]);

    const referralCode = myProfile?.referral_code ?? "NAIJA26";
    const myReferrals = (myReferredRows ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      created_at: p.created_at,
    }));

    // Aggregate referral counts per referrer UUID
    const countsByReferrer = new Map<string, number>();
    for (const row of allReferredEdges ?? []) {
      if (row.referred_by) {
        countsByReferrer.set(
          row.referred_by,
          (countsByReferrer.get(row.referred_by) ?? 0) + 1,
        );
      }
    }

    const topReferrerIds = Array.from(countsByReferrer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([uid]) => uid);

    if (resolvedUserId && !topReferrerIds.includes(resolvedUserId)) {
      topReferrerIds.push(resolvedUserId);
    }

    const { data: referrerProfiles } =
      topReferrerIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username, referral_code, turf")
            .in("id", topReferrerIds)
        : { data: [] };

    const leaderboardCandidates: {
      userId: string;
      username: string;
      referralCode: string;
      referralsCount: number;
      turf: string;
    }[] = [];

    for (const p of referrerProfiles ?? []) {
      const count = countsByReferrer.get(p.id) ?? 0;
      if (count > 0 || p.id === resolvedUserId) {
        leaderboardCandidates.push({
          userId: p.id,
          username: p.username,
          referralCode: p.referral_code,
          referralsCount: count,
          turf: p.turf ?? "Lagos (Eko)",
        });
      }
    }

    const seededReferrers = [
      { userId: "seed-ref-1", username: "eko_king", referralCode: "EKOKING1", referralsCount: 19, turf: "Lagos (Eko)" },
      { userId: "seed-ref-2", username: "ada_unilag", referralCode: "ADAUNILG", referralsCount: 15, turf: "UNILAG" },
      { userId: "seed-ref-3", username: "tunde_ph", referralCode: "TUNDEPH1", referralsCount: 12, turf: "Port Harcourt" },
      { userId: "seed-ref-4", username: "chidi_042", referralCode: "CHIDI042", referralsCount: 9, turf: "Enugu (042)" },
      { userId: "seed-ref-5", username: "zainab_abj", referralCode: "ZAINAB99", referralsCount: 7, turf: "Abuja (FCT)" },
      { userId: "seed-ref-6", username: "kwame_accra", referralCode: "KWAME233", referralsCount: 5, turf: "Accra" },
      { userId: "seed-ref-7", username: "seyi_ibadan", referralCode: "SEYIUI01", referralsCount: 4, turf: "Ibadan" },
      { userId: "seed-ref-8", username: "amaka_oau", referralCode: "AMAKAOAU", referralsCount: 3, turf: "OAU Ife" },
    ];

    for (const s of seededReferrers) {
      if (
        !leaderboardCandidates.some(
          (c) => c.username.toLowerCase() === s.username.toLowerCase(),
        )
      ) {
        leaderboardCandidates.push(s);
      }
    }

    leaderboardCandidates.sort((a, b) => b.referralsCount - a.referralsCount);

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
