/**
 * GUESS WHAT — Viral & Cultural Engine (Nigeria & Africa Go-To-Market)
 * Powers:
 *  - Territory & Campus Standings (States, Campuses, Pan-African Divisions)
 *  - Daily Crowd Pulse Poll + Streak Ledger (+25 Free Coins)
 *  - Live Market Activity Feed
 *  - WhatsApp & X (Twitter) Deep-Links + Verification Receipt PNG Generator
 *  - Instant Playable Prediction Slip Questions
 */

export type TurfCategory = "city" | "campus" | "africa";

export interface TurfSquad {
  id: string;
  name: string;
  shortName: string;
  category: TurfCategory;
  slogan: string;
  emoji: string; // 3-letter territory code (e.g. LOS, ABV, PHC)
  basePoints: number;
  basePlayers: number;
  topPlayer: string;
  weeklyDelta: string;
}

export const TURF_SQUADS: TurfSquad[] = [
  // Cities & States
  {
    id: "lagos",
    name: "Lagos (Eko)",
    shortName: "Lagos",
    category: "city",
    slogan: "Eko Oni Baje · Mainland & Island",
    emoji: "LOS",
    basePoints: 184_920,
    basePlayers: 4_812,
    topPlayer: "ada_thinks",
    weeklyDelta: "+14.2%",
  },
  {
    id: "abuja",
    name: "Abuja (FCT)",
    shortName: "Abuja",
    category: "city",
    slogan: "Center of Unity · FCT Division",
    emoji: "ABV",
    basePoints: 162_450,
    basePlayers: 3_490,
    topPlayer: "kelvin_o",
    weeklyDelta: "+18.6%",
  },
  {
    id: "ph",
    name: "Port Harcourt",
    shortName: "PH City",
    category: "city",
    slogan: "Pitakwa · Garden City Division",
    emoji: "PHC",
    basePoints: 139_800,
    basePlayers: 2_740,
    topPlayer: "tamuno_ph",
    weeklyDelta: "+11.9%",
  },
  {
    id: "ibadan",
    name: "Ibadan",
    shortName: "Ibadan",
    category: "city",
    slogan: "Pacesetter State · West Division",
    emoji: "IBD",
    basePoints: 118_310,
    basePlayers: 2_190,
    topPlayer: "wale_ib",
    weeklyDelta: "+9.4%",
  },
  {
    id: "enugu",
    name: "Enugu (042)",
    shortName: "042 Enugu",
    category: "city",
    slogan: "Coal City · East Division",
    emoji: "ENU",
    basePoints: 112_640,
    basePlayers: 1_980,
    topPlayer: "chidi_042",
    weeklyDelta: "+15.1%",
  },
  {
    id: "kano",
    name: "Kano",
    shortName: "Kano",
    category: "city",
    slogan: "Pyramid City · North Division",
    emoji: "KAN",
    basePoints: 94_200,
    basePlayers: 1_640,
    topPlayer: "sadiq_kn",
    weeklyDelta: "+8.7%",
  },
  // Campus Squads
  {
    id: "unilag",
    name: "UNILAG (Akoka)",
    shortName: "UNILAG",
    category: "campus",
    slogan: "University of Lagos · Akoka",
    emoji: "ULG",
    basePoints: 146_800,
    basePlayers: 3_120,
    topPlayer: "tobi_akoka",
    weeklyDelta: "+22.4%",
  },
  {
    id: "oau",
    name: "OAU (Ile-Ife)",
    shortName: "OAU Ife",
    category: "campus",
    slogan: "Obafemi Awolowo University",
    emoji: "OAU",
    basePoints: 138_420,
    basePlayers: 2_890,
    topPlayer: "ife_scholar",
    weeklyDelta: "+19.8%",
  },
  {
    id: "ui",
    name: "UI (Ibadan)",
    shortName: "UI Ibadan",
    category: "campus",
    slogan: "University of Ibadan",
    emoji: "UIB",
    basePoints: 129_150,
    basePlayers: 2_540,
    topPlayer: "zainab_ui",
    weeklyDelta: "+13.5%",
  },
  {
    id: "covenant",
    name: "Covenant (Ota)",
    shortName: "Covenant",
    category: "campus",
    slogan: "Covenant University · Canaanland",
    emoji: "CUO",
    basePoints: 121_900,
    basePlayers: 2_110,
    topPlayer: "david_cu",
    weeklyDelta: "+17.0%",
  },
  {
    id: "uniben",
    name: "UNIBEN (Benin)",
    shortName: "UNIBEN",
    category: "campus",
    slogan: "University of Benin · Ugbowo",
    emoji: "UBN",
    basePoints: 109_400,
    basePlayers: 1_870,
    topPlayer: "osa_benin",
    weeklyDelta: "+12.3%",
  },
  {
    id: "lasu",
    name: "LASU (Ojo)",
    shortName: "LASU",
    category: "campus",
    slogan: "Lagos State University",
    emoji: "LSU",
    basePoints: 104_750,
    basePlayers: 1_790,
    topPlayer: "bami_ojo",
    weeklyDelta: "+16.2%",
  },
  // Pan-African
  {
    id: "naija",
    name: "Nigeria",
    shortName: "Nigeria",
    category: "africa",
    slogan: "West Africa · Primary Pool",
    emoji: "NGA",
    basePoints: 492_300,
    basePlayers: 12_480,
    topPlayer: "ada_thinks",
    weeklyDelta: "+24.1%",
  },
  {
    id: "ghana",
    name: "Ghana (Accra)",
    shortName: "Ghana",
    category: "africa",
    slogan: "Accra & Kumasi Division",
    emoji: "GHA",
    basePoints: 218_600,
    basePlayers: 4_320,
    topPlayer: "kwame_accra",
    weeklyDelta: "+18.3%",
  },
  {
    id: "sa",
    name: "South Africa",
    shortName: "South Africa",
    category: "africa",
    slogan: "Joburg & Cape Town Division",
    emoji: "ZAF",
    basePoints: 194_100,
    basePlayers: 3_810,
    topPlayer: "thabo_jhb",
    weeklyDelta: "+15.7%",
  },
  {
    id: "kenya",
    name: "Kenya (Nairobi)",
    shortName: "Kenya",
    category: "africa",
    slogan: "East Africa · 254 Division",
    emoji: "KEN",
    basePoints: 167_900,
    basePlayers: 3_150,
    topPlayer: "wanjiku_254",
    weeklyDelta: "+14.9%",
  },
];

export interface DailyStreetPoll {
  id: string;
  tag: string;
  question: string;
  totalVotes: number;
  options: {
    id: string;
    label: string;
    pct: number;
    pts: number;
  }[];
}

export const DAILY_STREET_POLLS: DailyStreetPoll[] = [
  {
    id: "street-poll-afrobeats",
    tag: "CULTURE PULSE · AFROBEATS",
    question: "If a surprise stadium concert drops in Lagos tonight, who will most Nigerians buy tickets for first?",
    totalVotes: 6_842,
    options: [
      { id: "burna", label: "Burna Boy", pct: 41, pts: 10 },
      { id: "davido", label: "Davido", pct: 34, pts: 9 },
      { id: "wizkid", label: "Wizkid", pct: 19, pts: 8 },
      { id: "asake", label: "Asake", pct: 6, pts: 7 },
    ],
  },
  {
    id: "street-poll-food",
    tag: "CULTURE PULSE · LATE NIGHT",
    question: "It's 10:30 PM on a Friday in Lagos or Abuja. What is the #1 late-night order the crowd picks?",
    totalVotes: 5_910,
    options: [
      { id: "suya", label: "Beef Suya with Yaji & Masa", pct: 46, pts: 10 },
      { id: "shawarma", label: "Double-Sausage Chicken Shawarma", pct: 29, pts: 9 },
      { id: "jollof", label: "Smoky Party Jollof & Plantain", pct: 18, pts: 8 },
      { id: "indomie", label: "Pepper Indomie & Boiled Eggs", pct: 7, pts: 7 },
    ],
  },
  {
    id: "street-poll-fintech",
    tag: "MARKET PULSE · FINTECH",
    question: "When sending urgent ₦5,000 for cab or food, which transfer app will most players open first?",
    totalVotes: 7_315,
    options: [
      { id: "opay", label: "OPay", pct: 52, pts: 10 },
      { id: "moniepoint", label: "Moniepoint", pct: 24, pts: 9 },
      { id: "palmpay", label: "PalmPay", pct: 15, pts: 8 },
      { id: "kuda", label: "Kuda / Commercial Bank App", pct: 9, pts: 7 },
    ],
  },
  {
    id: "street-poll-power",
    tag: "DAILY PULSE · MATCHDAY",
    question: "Power goes out at 8:55 PM right before a Champions League kickoff. What do most people do first?",
    totalVotes: 5_420,
    options: [
      { id: "check-window", label: "Check outside to see if neighbours have power", pct: 58, pts: 10 },
      { id: "viewing-center", label: "Head straight to the nearest viewing center", pct: 22, pts: 9 },
      { id: "gen", label: "Switch on generator or inverter", pct: 13, pts: 8 },
      { id: "stream-phone", label: "Stream live on mobile data", pct: 7, pts: 7 },
    ],
  },
];

export function getTodaysStreetPoll(): DailyStreetPoll {
  const dayIndex = new Date().getDate() % DAILY_STREET_POLLS.length;
  return DAILY_STREET_POLLS[dayIndex];
}

export interface DemoQuestion {
  id: string;
  category: string;
  title: string;
  options: {
    id: string;
    label: string;
    crowdPct: number;
    rank: number;
    points: number;
  }[];
}

export const VIRAL_DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "demo-q1",
    category: "Food & Culture",
    title: "Which Nigerian meal will the majority of players pick as the ultimate Sunday lunch?",
    options: [
      { id: "opt-jollof", label: "Smoky Party Jollof, Plantain & Peppered Turkey", crowdPct: 54, rank: 1, points: 10 },
      { id: "opt-pounded-yam", label: "Pounded Yam & Egusi Soup", crowdPct: 26, rank: 2, points: 9 },
      { id: "opt-fried-rice", label: "Fried Rice, Coleslaw & Grilled Chicken", crowdPct: 13, rank: 3, points: 8 },
      { id: "opt-amala", label: "Hot Amala, Ewedu & Gbegiri (Abula)", crowdPct: 7, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q2",
    category: "Music & Nightlife",
    title: "If a DJ wants everyone on the dancefloor at a Lagos reception in 5 seconds, what drops?",
    options: [
      { id: "opt-burna", label: "Burna Boy — City Boys / Last Last", crowdPct: 39, rank: 1, points: 10 },
      { id: "opt-asake", label: "Asake — Lonely At The Top / Active", crowdPct: 33, rank: 2, points: 9 },
      { id: "opt-davido", label: "Davido — Unavailable / Kante", crowdPct: 20, rank: 3, points: 8 },
      { id: "opt-olamide", label: "Rema / Olamide — Calm Down", crowdPct: 8, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q3",
    category: "Personal Finance",
    title: "If a player wins ₦250,000 cash on Friday afternoon, what will the crowd say comes first?",
    options: [
      { id: "opt-save", label: "Move 80% to savings and spend 20%", crowdPct: 48, rank: 1, points: 10 },
      { id: "opt-data-sub", label: "Settle bills, data & household restock", crowdPct: 31, rank: 2, points: 9 },
      { id: "opt-turnup", label: "Host friends for Friday night out", crowdPct: 14, rank: 3, points: 8 },
      { id: "opt-gadget", label: "Upgrade phone or work gear immediately", crowdPct: 7, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q4",
    category: "Football",
    title: "Which club has the loudest fanbase in Nigerian viewing centers on matchday?",
    options: [
      { id: "opt-arsenal", label: "Arsenal", crowdPct: 38, rank: 1, points: 10 },
      { id: "opt-chelsea", label: "Chelsea", crowdPct: 34, rank: 2, points: 9 },
      { id: "opt-manutd", label: "Manchester United", crowdPct: 19, rank: 3, points: 8 },
      { id: "opt-madrid", label: "Real Madrid / Manchester City", crowdPct: 9, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q5",
    category: "Crowd Psychology",
    title: "Pick the number most players instinctively lock in first under time pressure:",
    options: [
      { id: "opt-7", label: "7", crowdPct: 49, rank: 1, points: 10 },
      { id: "opt-10", label: "10", crowdPct: 24, rank: 2, points: 9 },
      { id: "opt-1", label: "1", crowdPct: 17, rank: 3, points: 8 },
      { id: "opt-99", label: "99", crowdPct: 10, rank: 4, points: 7 },
    ],
  },
];

export interface LiveFomoItem {
  id: string;
  tag: "WIN" | "SPEED" | "TURF" | "STREAK";
  text: string;
  subtext: string;
  timeAgo: string;
}

export const LIVE_FOMO_EVENTS: LiveFomoItem[] = [
  {
    id: "f1",
    tag: "WIN",
    text: "kelvin_o (ABV) settled ₦100,000 payout via OPay",
    subtext: "1st Place · Weekend Showdown",
    timeAgo: "2m ago",
  },
  {
    id: "f2",
    tag: "SPEED",
    text: "tobi_akoka (UNILAG) locked 10/10 picks in 18.4s",
    subtext: "2x Multiplier used on Q4",
    timeAgo: "Just now",
  },
  {
    id: "f3",
    tag: "TURF",
    text: "Lagos (LOS) leads Abuja (ABV) by 22,470 pts",
    subtext: "4,812 active players in division",
    timeAgo: "1m ago",
  },
  {
    id: "f4",
    tag: "STREAK",
    text: "ada_thinks reached a 7-Day Streak (+100 GW Coins)",
    subtext: "Completed Daily Crowd Pulse",
    timeAgo: "3m ago",
  },
  {
    id: "f5",
    tag: "WIN",
    text: "tamuno_ph (PHC) settled ₦50,000 cash payout",
    subtext: "2nd Place · Naija Culture Clash",
    timeAgo: "6m ago",
  },
  {
    id: "f6",
    tag: "SPEED",
    text: "kwame_accra (GHA) entered Weekend Showdown",
    subtext: "West Africa pool active",
    timeAgo: "4m ago",
  },
];

export const NIGERIAN_BANKS = [
  "OPay (OPay Digital Services)",
  "PalmPay",
  "Moniepoint MFB",
  "Kuda Bank",
  "GTBank (Guaranty Trust Bank)",
  "Access Bank",
  "Zenith Bank",
  "First Bank of Nigeria",
  "UBA (United Bank for Africa)",
  "Fidelity Bank",
  "Stanbic IBTC",
  "Wema Bank (ALAT)",
];

/**
 * Build WhatsApp share URL with pre-formatted challenge slip
 */
export function buildWhatsAppShareUrl(params: {
  username?: string;
  referralCode?: string;
  sessionName?: string;
  prizePool?: number;
  timeSeconds?: string;
  challengeQuestion?: string;
  turf?: string;
}): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://guesswhat-tan.vercel.app";
  const ref = params.referralCode ? `?ref=${encodeURIComponent(params.referralCode)}` : "";
  const url = `${origin}/sign-up${ref}`;

  const lines: string[] = [
    `*GUESS WHAT — Crowd Prediction Arena*`,
    ``,
  ];

  if (params.timeSeconds && params.sessionName) {
    lines.push(
      `I locked my predictions on *${params.sessionName}* in *${params.timeSeconds}s* (${params.turf ?? "Lagos"}).`,
    );
  } else if (params.username) {
    lines.push(
      `*${params.username}* (${params.turf ?? "Lagos"}) sent you a prediction challenge on *GuessWhat*.`,
    );
  }

  if (params.challengeQuestion) {
    lines.push(
      ``,
      `*Question:* "${params.challengeQuestion}"`,
      `Predict what the majority picks — fastest consensus wins.`,
    );
  }

  if (params.prizePool) {
    lines.push(``, `*Session Pool:* ₦${params.prizePool.toLocaleString()}`);
  }

  lines.push(
    ``,
    `Claim *150 GW Coins* on sign-up${params.referralCode ? ` (Code: *${params.referralCode}*)` : ""}:`,
    url,
  );

  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}

/**
 * Build X (Twitter) share URL
 */
export function buildTwitterShareUrl(params: {
  referralCode?: string;
  sessionName?: string;
  timeSeconds?: string;
  challengeQuestion?: string;
  turf?: string;
}): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://guesswhat-tan.vercel.app";
  const ref = params.referralCode ? `?ref=${encodeURIComponent(params.referralCode)}` : "";
  const url = `${origin}/sign-up${ref}`;

  const text = params.challengeQuestion
    ? `"${params.challengeQuestion}" — What will the crowd pick?\n\nLocked in my slip on @GuessWhatNG${params.timeSeconds ? ` in ${params.timeSeconds}s` : ""} (${params.turf ?? "Lagos"}). Predict the majority & compete for cash:`
    : `Locked in my prediction slip on GuessWhat${params.timeSeconds ? ` in ${params.timeSeconds}s` : ""} (${params.turf ?? "Lagos"}). Predict what the crowd picks & compete for real payouts:`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/**
 * Generate a 1080x1350 dark fintech verification ticket PNG for WhatsApp Status & Instagram Stories
 */
export function generateBragCardDataUrl(opts: {
  username: string;
  turf: string;
  sessionName: string;
  prizePool: string;
  timeSeconds: string;
  answeredCount: number;
  used2xLock: boolean;
  challengeQuestion: string;
  referralCode: string;
}): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Matte Carbon background
  ctx.fillStyle = "#090A0D";
  ctx.fillRect(0, 0, 1080, 1350);

  // Outer card frame
  ctx.fillStyle = "#111318";
  ctx.fillRect(56, 56, 968, 1238);
  ctx.strokeStyle = "#222631";
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, 968, 1238);

  // Top orange accent rule
  ctx.fillStyle = "#F7911B";
  ctx.fillRect(56, 56, 968, 10);

  // Header metadata
  ctx.fillStyle = "#8A92A6";
  ctx.font = "600 22px monospace";
  ctx.textAlign = "left";
  ctx.fillText("GUESSWHAT // OFFICIAL ENTRY SLIP", 112, 138);

  ctx.fillStyle = "#10B981";
  ctx.textAlign = "right";
  ctx.fillText("STATUS: VERIFIED", 968, 138);

  // Divider
  ctx.strokeStyle = "#222631";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, 174);
  ctx.lineTo(968, 174);
  ctx.stroke();

  // Headline
  ctx.textAlign = "left";
  ctx.fillStyle = "#F4F5F8";
  ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
  ctx.fillText("PREDICTIONS LOCKED", 112, 260);

  ctx.fillStyle = "#F7911B";
  ctx.font = "600 28px monospace";
  ctx.fillText(`@${opts.username}  ·  DIVISION: ${opts.turf.toUpperCase()}`, 112, 312);

  // 3-Column Ledger Box
  ctx.fillStyle = "#171A21";
  ctx.fillRect(112, 365, 856, 220);
  ctx.strokeStyle = "#2E3442";
  ctx.lineWidth = 2;
  ctx.strokeRect(112, 365, 856, 220);

  ctx.fillStyle = "#8A92A6";
  ctx.font = "600 20px monospace";
  ctx.fillText("TIEBREAKER TIME", 156, 425);
  ctx.fillText("SESSION POOL", 446, 425);
  ctx.fillText("2X MULTIPLIER", 736, 425);

  ctx.fillStyle = "#10B981";
  ctx.font = "bold 50px monospace";
  ctx.fillText(`${opts.timeSeconds}s`, 156, 505);

  ctx.fillStyle = "#F7911B";
  ctx.fillText(opts.prizePool, 446, 505);

  ctx.fillStyle = "#F4F5F8";
  ctx.fillText(opts.used2xLock ? "LOCKED" : `${opts.answeredCount}/10`, 736, 505);

  ctx.fillStyle = "#8A92A6";
  ctx.font = "500 20px system-ui, sans-serif";
  ctx.fillText(`Session: ${opts.sessionName}`, 156, 558);

  // Question Prompt Frame
  ctx.fillStyle = "#090A0D";
  ctx.fillRect(112, 635, 856, 360);
  ctx.strokeStyle = "#222631";
  ctx.lineWidth = 2;
  ctx.strokeRect(112, 635, 856, 360);

  ctx.fillStyle = "#F7911B";
  ctx.font = "600 22px monospace";
  ctx.fillText("FEATURED MARKET QUESTION", 156, 695);

  ctx.fillStyle = "#F4F5F8";
  ctx.font = "bold 36px system-ui, sans-serif";
  const words = opts.challengeQuestion.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 760) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  lines.slice(0, 3).forEach((l, i) => {
    ctx.fillText(l, 156, 768 + i * 52);
  });

  ctx.fillStyle = "#8A92A6";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText("Majority consensus determines the highest point yield.", 156, 955);

  // Bottom Solid Signal Bar
  ctx.fillStyle = "#F7911B";
  ctx.fillRect(112, 1055, 856, 170);

  ctx.fillStyle = "#090A0D";
  ctx.font = "bold 32px monospace";
  ctx.fillText(
    `INVITE CODE: ${opts.referralCode || "GUESSWHAT"} (+150 COINS)`,
    156,
    1125,
  );
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText("guesswhat-tan.vercel.app  ·  Think like the crowd", 156, 1178);

  return canvas.toDataURL("image/png");
}
