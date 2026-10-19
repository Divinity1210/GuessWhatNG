/**
 * GUESS WHAT — Viral & Cultural Engine (Nigeria & Africa Go-To-Market)
 * Powers:
 *  - "Rep Your Turf" (States, Campuses, Pan-African Squad Wars)
 *  - "Daily Street Heat" Free Poll + Flame Streak (+25 Free Coins)
 *  - Live FOMO Social Proof Ticker
 *  - WhatsApp & X (Twitter) Viral Deep-Links + Canvas Brag Card Generator
 *  - Instant Playable Demo & Practice Arena Questions
 */

export type TurfCategory = "city" | "campus" | "africa";

export interface TurfSquad {
  id: string;
  name: string;
  shortName: string;
  category: TurfCategory;
  slogan: string;
  emoji: string;
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
    slogan: "Eko Oni Baje · No Sleep",
    emoji: "⚡",
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
    slogan: "Center of Unity · Soft Life",
    emoji: "🏛️",
    basePoints: 162_450,
    basePlayers: 3_490,
    topPlayer: "kelvin_o",
    weeklyDelta: "+18.6%",
  },
  {
    id: "ph",
    name: "Port Harcourt (PH City)",
    shortName: "PH City",
    category: "city",
    slogan: "Pitakwa · Garden City Heat",
    emoji: "🔥",
    basePoints: 139_800,
    basePlayers: 2_740,
    topPlayer: "tamuno_ph",
    weeklyDelta: "+11.9%",
  },
  {
    id: "ibadan",
    name: "Ibadan (Pacesetter)",
    shortName: "Ibadan",
    category: "city",
    slogan: "Ancient Brown Roofs · Sharp Minds",
    emoji: "👑",
    basePoints: 118_310,
    basePlayers: 2_190,
    topPlayer: "wale_ib",
    weeklyDelta: "+9.4%",
  },
  {
    id: "enugu",
    name: "Enugu (042 Coal City)",
    shortName: "042 Enugu",
    category: "city",
    slogan: "042 To The World",
    emoji: "💎",
    basePoints: 112_640,
    basePlayers: 1_980,
    topPlayer: "chidi_042",
    weeklyDelta: "+15.1%",
  },
  {
    id: "kano",
    name: "Kano (Pyramid City)",
    shortName: "Kano",
    category: "city",
    slogan: "Arewa Giants",
    emoji: "🦅",
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
    slogan: "First Choice · Nation's Pride",
    emoji: "🎓",
    basePoints: 146_800,
    basePlayers: 3_120,
    topPlayer: "tobi_akoka",
    weeklyDelta: "+22.4%",
  },
  {
    id: "oau",
    name: "OAU (Great Ife)",
    shortName: "OAU Ife",
    category: "campus",
    slogan: "Oba Awon University",
    emoji: "🦁",
    basePoints: 138_420,
    basePlayers: 2_890,
    topPlayer: "ife_scholar",
    weeklyDelta: "+19.8%",
  },
  {
    id: "ui",
    name: "UI (First & Best)",
    shortName: "UI Ibadan",
    category: "campus",
    slogan: "Recte Sapere Fons",
    emoji: "📚",
    basePoints: 129_150,
    basePlayers: 2_540,
    topPlayer: "zainab_ui",
    weeklyDelta: "+13.5%",
  },
  {
    id: "covenant",
    name: "Covenant (Hebron)",
    shortName: "Covenant",
    category: "campus",
    slogan: "Eagles Taking Flight",
    emoji: "🦅",
    basePoints: 121_900,
    basePlayers: 2_110,
    topPlayer: "david_cu",
    weeklyDelta: "+17.0%",
  },
  {
    id: "uniben",
    name: "UNIBEN (Unikoko)",
    shortName: "UNIBEN",
    category: "campus",
    slogan: "Knowledge for Service",
    emoji: "⚡",
    basePoints: 109_400,
    basePlayers: 1_870,
    topPlayer: "osa_benin",
    weeklyDelta: "+12.3%",
  },
  {
    id: "lasu",
    name: "LASU (We Are LASU)",
    shortName: "LASU",
    category: "campus",
    slogan: "We Are LASU, We Are Great",
    emoji: "🔥",
    basePoints: 104_750,
    basePlayers: 1_790,
    topPlayer: "bami_ojo",
    weeklyDelta: "+16.2%",
  },
  // Pan-African
  {
    id: "naija",
    name: "Nigeria (Naija)",
    shortName: "Naija 🇳🇬",
    category: "africa",
    slogan: "Giant of Africa · No Dey Carry Last",
    emoji: "🇳🇬",
    basePoints: 492_300,
    basePlayers: 12_480,
    topPlayer: "ada_thinks",
    weeklyDelta: "+24.1%",
  },
  {
    id: "ghana",
    name: "Ghana (Accra)",
    shortName: "Ghana 🇬🇭",
    category: "africa",
    slogan: "Chale · Black Stars Energy",
    emoji: "🇬🇭",
    basePoints: 218_600,
    basePlayers: 4_320,
    topPlayer: "kwame_accra",
    weeklyDelta: "+18.3%",
  },
  {
    id: "sa",
    name: "South Africa (Mzansi)",
    shortName: "Mzansi 🇿🇦",
    category: "africa",
    slogan: "Amapiano & Sharp Predictions",
    emoji: "🇿🇦",
    basePoints: 194_100,
    basePlayers: 3_810,
    topPlayer: "thabo_jhb",
    weeklyDelta: "+15.7%",
  },
  {
    id: "kenya",
    name: "Kenya (254 Nairobi)",
    shortName: "Kenya 🇰🇪",
    category: "africa",
    slogan: "Silicon Savannah Speed",
    emoji: "🇰🇪",
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
    tag: "AFROBEATS GOAT PULSE",
    question: "If a surprise stadium concert drops in Lagos tonight, who will most Nigerians buy tickets for first?",
    totalVotes: 6_842,
    options: [
      { id: "burna", label: "Burna Boy (Odogwu Live)", pct: 41, pts: 10 },
      { id: "davido", label: "Davido (001 Timeless Vibe)", pct: 34, pts: 9 },
      { id: "wizkid", label: "Wizkid (Big Wiz FC)", pct: 19, pts: 8 },
      { id: "asake", label: "Asake (Mr Money With The Vibe)", pct: 6, pts: 7 },
    ],
  },
  {
    id: "street-poll-food",
    tag: "FRIDAY NIGHT CHOW",
    question: "It's 10:30 PM on a Friday in Lagos or Abuja. What is the #1 late-night craving the crowd picks?",
    totalVotes: 5_910,
    options: [
      { id: "suya", label: "Hot Aboki Suya with Extra Yaji & Masa", pct: 46, pts: 10 },
      { id: "shawarma", label: "Double-Sausage Chicken Shawarma", pct: 29, pts: 9 },
      { id: "jollof", label: "Smoky Party Jollof & Fried Plantain (Dodo)", pct: 18, pts: 8 },
      { id: "indomie", label: "Pepper Indomie + 2 Boiled Eggs", pct: 7, pts: 7 },
    ],
  },
  {
    id: "street-poll-fintech",
    tag: "NAIJA ALERT WARS",
    question: "When sending urgent ₦5,000 for cab or shawarma, which app will most players open first?",
    totalVotes: 7_315,
    options: [
      { id: "opay", label: "OPay (Instant Zero-Downtime)", pct: 52, pts: 10 },
      { id: "moniepoint", label: "Moniepoint", pct: 24, pts: 9 },
      { id: "palmpay", label: "PalmPay", pct: 15, pts: 8 },
      { id: "kuda", label: "Kuda / Traditional Bank App", pct: 9, pts: 7 },
    ],
  },
  {
    id: "street-poll-power",
    tag: "REALITY CHECK",
    question: "NEPA takes light at 8:55 PM right before a Champions League match. What do most people do first?",
    totalVotes: 5_420,
    options: [
      { id: "check-window", label: "Look outside window to see if neighbours have light", pct: 58, pts: 10 },
      { id: "Viewing-center", label: "Walk straight to the nearest viewing center / bar", pct: 22, pts: 9 },
      { id: "gen", label: "Put on generator / inverter immediately", pct: 13, pts: 8 },
      { id: "stream-phone", label: "Stream on phone with 12% battery", pct: 7, pts: 7 },
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
    category: "Naija Culture",
    title: "Which Nigerian meal will the majority of players pick as the ultimate Sunday lunch?",
    options: [
      { id: "opt-jollof", label: "Smoky Party Jollof, Dodo & Peppered Turkey", crowdPct: 54, rank: 1, points: 10 },
      { id: "opt-pounded-yam", label: "Pounded Yam & Egusi Soup with Assorted", crowdPct: 26, rank: 2, points: 9 },
      { id: "opt-fried-rice", label: "Fried Rice, Coleslaw & Grilled Chicken", crowdPct: 13, rank: 3, points: 8 },
      { id: "opt-amala", label: "Hot Amala, Ewedu & Gbegiri (Abula)", crowdPct: 7, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q2",
    category: "Afrobeats & Vibes",
    title: "If a DJ wants everyone on the dancefloor at a Nigerian wedding in 5 seconds, what drops?",
    options: [
      { id: "opt-burna", label: "Burna Boy — City Boys / Last Last", crowdPct: 39, rank: 1, points: 10 },
      { id: "opt-asake", label: "Asake — Lonely At The Top / Amapiano", crowdPct: 33, rank: 2, points: 9 },
      { id: "opt-davido", label: "Davido — Unavailable / Kante", crowdPct: 20, rank: 3, points: 8 },
      { id: "opt-olamide", label: "Olamide / Rema — Calm Down", crowdPct: 8, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q3",
    category: "Money & Hustle",
    title: "If a player wins ₦250,000 cash on GuessWhat on Friday afternoon, what will most people do first?",
    options: [
      { id: "opt-save", label: "Move 80% to savings/OPay & flex with 20%", crowdPct: 48, rank: 1, points: 10 },
      { id: "opt-data-sub", label: "Clear urgent bills, buy data & stock food", crowdPct: 31, rank: 2, points: 9 },
      { id: "opt-turnup", label: "Call the squad for Friday Suya & drinks", crowdPct: 14, rank: 3, points: 8 },
      { id: "opt-gadget", label: "Upgrade phone or gadget immediately", crowdPct: 7, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q4",
    category: "Football Fever",
    title: "Which club has the loudest fanbase in Nigerian viewing centers on matchday?",
    options: [
      { id: "opt-arsenal", label: "Arsenal (Gunners FC)", crowdPct: 38, rank: 1, points: 10 },
      { id: "opt-chelsea", label: "Chelsea (Blues Nation)", crowdPct: 34, rank: 2, points: 9 },
      { id: "opt-manutd", label: "Manchester United (Red Devils)", crowdPct: 19, rank: 3, points: 8 },
      { id: "opt-madrid", label: "Real Madrid / Man City", crowdPct: 9, rank: 4, points: 7 },
    ],
  },
  {
    id: "demo-q5",
    category: "Street Psychology",
    title: "Pick the lucky number most players will instinctively tap first:",
    options: [
      { id: "opt-7", label: "7 (Lucky Seven)", crowdPct: 49, rank: 1, points: 10 },
      { id: "opt-10", label: "10 (The Goat Number)", crowdPct: 24, rank: 2, points: 9 },
      { id: "opt-1", label: "1 (Number One)", crowdPct: 17, rank: 3, points: 8 },
      { id: "opt-99", label: "99 (Max Energy)", crowdPct: 10, rank: 4, points: 7 },
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
    text: "kelvin_o (Abuja) cashed out ₦100,000 via OPay",
    subtext: "1st Place · Weekend Showdown",
    timeAgo: "2m ago",
  },
  {
    id: "f2",
    tag: "SPEED",
    text: "tobi_akoka (UNILAG) locked 10/10 answers in 18.4s",
    subtext: "Used 2x Confidence Lock on Q4",
    timeAgo: "Just now",
  },
  {
    id: "f3",
    tag: "TURF",
    text: "Lagos (Eko) leads Abuja by 22,470 pts in Turf Wars",
    subtext: "4,812 Lagos players active",
    timeAgo: "1m ago",
  },
  {
    id: "f4",
    tag: "STREAK",
    text: "ada_thinks hit a 7-Day Flame Streak (+100 Free Coins)",
    subtext: "Voted on Today's Afrobeats Pulse",
    timeAgo: "3m ago",
  },
  {
    id: "f5",
    tag: "WIN",
    text: "tamuno_ph (PH City) won ₦50,000 cash reward",
    subtext: "2nd Place · Naija Culture Clash",
    timeAgo: "6m ago",
  },
  {
    id: "f6",
    tag: "SPEED",
    text: "kwame_accra (Ghana 🇬🇭) joined Weekend Showdown",
    subtext: "Pan-African Clash heating up",
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
 * Build WhatsApp share URL with pre-formatted viral challenge message
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
    `🔥 *GUESS WHAT — Think Like The Crowd & Win Cash!*`,
    ``,
  ];

  if (params.timeSeconds && params.sessionName) {
    lines.push(
      `⚡ I just locked in my predictions on *${params.sessionName}* in *${params.timeSeconds}s* repping *${params.turf ?? "Lagos (Eko)"}*!`,
    );
  } else if (params.username) {
    lines.push(
      `👑 *${params.username}* is challenging you on *GuessWhat* (repping *${params.turf ?? "Lagos (Eko)"}*)!`,
    );
  }

  if (params.challengeQuestion) {
    lines.push(
      ``,
      `🤔 *Debate Question:* "${params.challengeQuestion}"`,
      `What do you think MOST Nigerians will pick?`,
    );
  }

  if (params.prizePool) {
    lines.push(``, `💰 *Live Prize Pool:* ₦${params.prizePool.toLocaleString()}`);
  }

  lines.push(
    ``,
    `🎁 Join with my link for *150 FREE COINS* (100 Welcome + 50 Squad Bonus)${params.referralCode ? ` · Code: *${params.referralCode}*` : ""}:`,
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
    ? `🔥 "${params.challengeQuestion}" — What will the crowd pick?\n\nI just locked in my predictions on @GuessWhatNG${params.timeSeconds ? ` in ${params.timeSeconds}s` : ""} repping ${params.turf ?? "Lagos"}! Think like the crowd & win cash 💰👇`
    : `🔥 I just locked in my crowd predictions on GuessWhat${params.timeSeconds ? ` in ${params.timeSeconds}s` : ""} repping ${params.turf ?? "Lagos"}! No trivia needed — just predict what most players pick & win real cash 💰👇`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/**
 * Generate a 1080x1350 viral PNG Brag / Debate Card for WhatsApp Status & Instagram Stories
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

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, "#0b0d14");
  bg.addColorStop(0.5, "#171219");
  bg.addColorStop(1, "#090b10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  // Orange/Red ambient glow
  const glow = ctx.createRadialGradient(540, 260, 40, 540, 260, 520);
  glow.addColorStop(0, "rgba(247, 145, 27, 0.32)");
  glow.addColorStop(0.5, "rgba(255, 4, 0, 0.14)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1350);

  // Outer frame border
  ctx.strokeStyle = "rgba(247, 145, 27, 0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 984, 1254);

  // Top Pill Badge
  ctx.fillStyle = "rgba(247, 145, 27, 0.18)";
  ctx.fillRect(310, 100, 460, 54);
  ctx.strokeStyle = "#F7911B";
  ctx.lineWidth = 2;
  ctx.strokeRect(310, 100, 460, 54);

  ctx.fillStyle = "#F7911B";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🔥 GUESS WHAT · THINK & WIN", 540, 136);

  // Main Headline
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 62px system-ui, -apple-system, sans-serif";
  ctx.fillText("PREDICTIONS LOCKED!", 540, 245);

  // Player & Turf subhead
  ctx.fillStyle = "#F7911B";
  ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
  ctx.fillText(`@${opts.username} · Repping ${opts.turf}`, 540, 305);

  // Stats Box
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(96, 360, 888, 250);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(96, 360, 888, 250);

  // 3 Stat Columns
  ctx.fillStyle = "#9EA6BA";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText("SPEED TIEBREAKER", 260, 430);
  ctx.fillText("PRIZE POOL", 540, 430);
  ctx.fillText("2X SURE LOCK", 820, 430);

  ctx.fillStyle = "#22C55E";
  ctx.font = "900 54px system-ui, sans-serif";
  ctx.fillText(`${opts.timeSeconds}s`, 260, 510);

  ctx.fillStyle = "#F7911B";
  ctx.fillText(opts.prizePool, 540, 510);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(opts.used2xLock ? "ACTIVE 🔥" : `${opts.answeredCount}/10`, 820, 510);

  ctx.fillStyle = "#D5D9E6";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText(`Session: ${opts.sessionName}`, 540, 575);

  // Debate Question Card
  ctx.fillStyle = "rgba(247, 145, 27, 0.10)";
  ctx.fillRect(96, 660, 888, 340);
  ctx.strokeStyle = "#F7911B";
  ctx.lineWidth = 3;
  ctx.strokeRect(96, 660, 888, 340);

  ctx.fillStyle = "#F7911B";
  ctx.font = "bold 25px system-ui, sans-serif";
  ctx.fillText("🤔 CAN YOU GUESS WHAT THE CROWD PICKED?", 540, 725);

  // Wrap question text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 38px system-ui, sans-serif";
  const words = opts.challengeQuestion.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 780) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  lines.slice(0, 3).forEach((l, i) => {
    ctx.fillText(l, 540, 805 + i * 54);
  });

  ctx.fillStyle = "#9EA6BA";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText("No right or wrong answer — majority rules!", 540, 965);

  // Referral CTA Footer
  const ctaGrad = ctx.createLinearGradient(96, 1060, 984, 1210);
  ctaGrad.addColorStop(0, "#FF0400");
  ctaGrad.addColorStop(1, "#F7911B");
  ctx.fillStyle = ctaGrad;
  ctx.fillRect(96, 1060, 888, 160);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 36px system-ui, sans-serif";
  ctx.fillText(
    `USE CODE: ${opts.referralCode || "GUESSWHAT"} FOR 150 FREE COINS`,
    540,
    1128,
  );
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText("Play at guesswhat-tan.vercel.app · Beat my speed!", 540, 1180);

  return canvas.toDataURL("image/png");
}
