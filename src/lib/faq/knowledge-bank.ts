export type FaqArticle = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  sampleQuestions: string[];
  answer: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type FaqSearchMatch = {
  article: FaqArticle;
  score: number;
};

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "am", "do", "does", "did",
  "can", "could", "will", "would", "should", "shall", "may", "might", "to", "of", "in",
  "on", "at", "for", "with", "from", "by", "about", "as", "into", "or", "and", "but",
  "if", "so", "than", "then", "that", "this", "these", "those", "it", "its", "my", "me",
  "i", "you", "your", "we", "our", "they", "their", "them", "he", "she", "his", "her",
  "what", "when", "where", "who", "how", "why", "please", "pls", "abeg", "tell", "know",
  "want", "need", "get", "make", "just", "very", "really", "there", "here", "any", "some",
]);

/**
 * Nigerian English, Pidgin, fintech, and typo synonym expansions so players
 * can ask in completely natural language and still hit the exact FAQ article.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  cashout: ["payout", "withdraw", "bank", "paid", "money"],
  withdraw: ["payout", "bank", "paid", "money"],
  collect: ["payout", "paid", "money", "receive"],
  alert: ["payout", "paid", "bank", "credit"],
  nuban: ["bank", "account", "payout"],
  opay: ["bank", "account", "payout", "nigerian"],
  moniepoint: ["bank", "account", "payout", "nigerian"],
  kuda: ["bank", "account", "payout", "nigerian"],
  gtbank: ["bank", "account", "payout", "nigerian"],
  palmpay: ["bank", "account", "payout", "nigerian"],
  legit: ["real", "scam", "proof", "receipt", "pays", "verified"],
  scam: ["real", "legit", "proof", "receipt", "pays", "verified"],
  fake: ["real", "legit", "proof", "receipt", "pays"],
  proof: ["receipt", "verified", "payout", "pays"],
  receipts: ["receipt", "proof", "verified", "payout"],
  referal: ["referral", "invite", "link", "code"],
  referrals: ["referral", "invite", "link", "code"],
  reffer: ["referral", "invite", "link"],
  invite: ["referral", "link", "code", "friends"],
  drop: ["lower", "hurt", "replay", "best"],
  reduce: ["lower", "hurt", "replay", "best"],
  again: ["replay", "retry", "unlimited"],
  tie: ["tiebreaker", "stopwatch", "speed", "faster", "time"],
  fast: ["speed", "stopwatch", "tiebreaker", "time"],
  clock: ["timer", "countdown", "stopwatch", "ends"],
  finish: ["ends", "close", "closes", "countdown", "00:00"],
  end: ["ends", "close", "closes", "countdown", "00:00"],
  points: ["score", "scoring", "10", "crowd", "dynamic"],
  point: ["score", "scoring", "10", "crowd", "dynamic"],
  calculate: ["score", "scoring", "dynamic", "crowd"],
  provisional: ["live", "changing", "shift", "dynamic", "leaderboard"],
  changing: ["provisional", "shift", "dynamic", "leaderboard"],
  chat: ["community", "arena", "banter", "poll"],
  banter: ["community", "arena", "chat"],
  tag: ["mention", "mentions", "community", "inbox"],
  picture: ["image", "photo", "scroll", "format"],
  pictures: ["image", "photo", "scroll", "format"],
  photo: ["image", "picture", "avatar"],
  dp: ["avatar", "profile", "photo"],
  password: ["login", "signin", "account", "reset"],
  signin: ["login", "account", "google"],
  signup: ["register", "account", "google", "onboarding"],
  dns: ["reached", "network", "loading", "error", "vercel"],
  reached: ["dns", "network", "loading", "error"],
  tour: ["onboarding", "walkthrough", "guide"],
  complain: ["support", "ticket", "help", "human"],
  complaint: ["support", "ticket", "help", "human"],
  agent: ["support", "ticket", "human"],
  suggest: ["feedback", "improve", "idea"],
};

export const GUESSWHAT_KNOWLEDGE_BANK: FaqArticle[] = [
  {
    id: "what-is-guesswhat",
    title: "What is GuessWhat & How Do I Play?",
    category: "Gameplay & Rules",
    keywords: ["guesswhat", "how", "play", "work", "works", "rules", "basics", "crowd", "prediction", "game"],
    sampleQuestions: [
      "How does GuessWhat work?",
      "What is this game about?",
      "How do I play and win?",
    ],
    answer:
      "GuessWhat is a free-to-play crowd-prediction game where you win real cash. Instead of answering textbook trivia, every live session gives you 10 fast questions with 10 options each. Your goal is to tap the option you believe MOST other players will pick, as fast as you can. When the session timer hits 00:00, the Top 36 players share the cash prize pool.",
    ctaLabel: "Play Free Now",
    ctaHref: "/play",
  },
  {
    id: "dynamic-scoring-10-to-1",
    title: "How 10-to-1 Dynamic Crowd Scoring Works",
    category: "Gameplay & Rules",
    keywords: ["score", "scoring", "points", "10", "1", "dynamic", "calculate", "crowd", "majority", "popular"],
    sampleQuestions: [
      "How does 10 to 1 scoring work?",
      "How are points calculated?",
      "Why is there no single right answer?",
    ],
    answer:
      "On every question, all 10 options are ranked automatically by how many players picked them across the session. The #1 most popular option earns 10 points, #2 earns 9 points, #3 earns 8 points, all the way down to 1 point for the #10 least popular option. Your session score is the sum of your points across all 10 questions (up to 100 pts maximum).",
    ctaLabel: "Read Scoring Guide",
    ctaHref: "/how-to-play#scoring",
  },
  {
    id: "provisional-leaderboard",
    title: "Why Your Score & Rank Shift While a Session Is Live",
    category: "Leaderboard",
    keywords: ["provisional", "rank", "change", "changing", "shift", "dropped", "moved", "leaderboard", "live"],
    sampleQuestions: [
      "Why did my score or rank change?",
      "What does Provisional mean on the leaderboard?",
    ],
    answer:
      "The Live Leaderboard says Provisional because crowd popularity updates in real time as more players complete rounds. If a different option overtakes #1 on a question, points for that question automatically recalculate for everyone. Ranks only lock in permanently when the countdown timer reaches 00:00.",
    ctaLabel: "View Live Leaderboard",
    ctaHref: "/leaderboard",
  },
  {
    id: "speed-tiebreaker",
    title: "Speed Stopwatch & Tiebreaker Rules",
    category: "Gameplay & Rules",
    keywords: ["tie", "tiebreaker", "speed", "stopwatch", "time", "faster", "same", "score", "clock"],
    sampleQuestions: [
      "What happens if two players have the same points?",
      "Does speed matter in GuessWhat?",
    ],
    answer:
      "Yes! Your stopwatch tracks your total answering time across all 10 questions from the moment each question appears. If two players finish tied on the exact same point total (for example, 88 pts each), the player with the faster total time ranks higher on the leaderboard.",
    ctaLabel: "Play a Fast Round",
    ctaHref: "/play",
  },
  {
    id: "free-entry-unlimited-replays",
    title: "Free Entry & Unlimited Replays",
    category: "Gameplay & Rules",
    keywords: ["free", "cost", "fee", "entry", "pay", "replay", "replays", "unlimited", "again", "price"],
    sampleQuestions: [
      "Is GuessWhat really free to play?",
      "How many times can I replay a session?",
    ],
    answer:
      "Entering and replaying any live GuessWhat session is 100% free (₦0). You can replay as many times as you want before the session countdown hits 00:00 to sharpen your picks and speed.",
    ctaLabel: "Start Free Round",
    ctaHref: "/play",
  },
  {
    id: "best-score-safety",
    title: "Does Replaying Ever Lower My Rank?",
    category: "Gameplay & Rules",
    keywords: ["replay", "lower", "hurt", "drop", "lose", "rank", "best", "score", "safe", "worse"],
    sampleQuestions: [
      "Will replaying hurt my rank if I score lower?",
      "Does my second attempt replace my higher score?",
    ],
    answer:
      "Never. Your leaderboard slot ALWAYS keeps your highest-scoring round (and your fastest total time achieved at that top score). If a replay attempt scores lower than your best round, it is safely archived without lowering your rank.",
    ctaLabel: "Replay Safely Now",
    ctaHref: "/play",
  },
  {
    id: "question-formats",
    title: "4 Question Formats & Full-Screen Picture Options",
    category: "Gameplay & Rules",
    keywords: ["format", "formats", "picture", "image", "color", "number", "text", "scroll", "types"],
    sampleQuestions: [
      "What types of questions are in GuessWhat?",
      "Do I need to scroll on picture questions?",
    ],
    answer:
      "GuessWhat features 4 fast question formats: Text picks, Picture grids, Color swatches, and Number tiles. During active play, the screen enters a distraction-free full-viewport stage where all picture options fit on your screen at once with zero scrolling and upcoming images are preloaded so your stopwatch stays fair.",
    ctaLabel: "See Question Formats",
    ctaHref: "/how-to-play#formats",
  },
  {
    id: "hidden-votes-until-close",
    title: "Why Crowd Percentages Stay Hidden Until 00:00",
    category: "Gameplay & Rules",
    keywords: ["votes", "percentages", "hidden", "locked", "unlock", "00:00", "copy", "fair", "results"],
    sampleQuestions: [
      "Why can't I see vote percentages during the game?",
      "When do crowd vote shares unlock?",
    ],
    answer:
      "Exact vote percentages and option rankings stay sealed while a session is open so late entrants cannot copy the winning picks. The moment the countdown timer hits 00:00, full 10-to-1 crowd vote breakdowns unlock for every question in Session Results.",
    ctaLabel: "Check How to Play",
    ctaHref: "/how-to-play",
  },
  {
    id: "prize-pool-tiers",
    title: "Prize Pools & Top 36 Cash Winners",
    category: "Prizes & Payouts",
    keywords: ["prize", "prizes", "pool", "money", "win", "top", "36", "1st", "2nd", "3rd", "how much"],
    sampleQuestions: [
      "How many people win cash per session?",
      "How is the prize pool shared?",
    ],
    answer:
      "In a standard ₦500,000 session, the Top 36 ranked players share the cash pool: 1st Place wins ₦100,000, 2nd Place wins ₦50,000, 3rd Place wins ₦20,000, and 4th to 36th Place win ₦10,000 each. Prize tiers can also be customized per special session and are always shown live on your Leaderboard.",
    ctaLabel: "View Prize Board",
    ctaHref: "/leaderboard",
  },
  {
    id: "bank-account-setup",
    title: "How to Add Your Nigerian Bank Account for Payouts",
    category: "Prizes & Payouts",
    keywords: ["bank", "account", "nuban", "payout", "opay", "moniepoint", "kuda", "gtbank", "details", "add", "save"],
    sampleQuestions: [
      "How do I add my bank account to get paid?",
      "Which Nigerian banks are supported (OPay, Moniepoint, Kuda, GTBank)?",
    ],
    answer:
      "Open your Profile page, scroll to Bank Account Details, choose your bank (GTBank, Access, Zenith, First Bank, UBA, OPay, Moniepoint, Kuda, PalmPay, Wema, Stanbic, Sterling), enter your 10-digit NUBAN account number and account holder name, and tap Save. Make sure this is saved before a session closes so payouts process smoothly.",
    ctaLabel: "Set Up Bank in Profile",
    ctaHref: "/profile",
  },
  {
    id: "how-payouts-work",
    title: "How & When Cash Prizes Are Paid Out",
    category: "Prizes & Payouts",
    keywords: ["paid", "payout", "withdraw", "cashout", "transfer", "when", "long", "receive", "collect", "money"],
    sampleQuestions: [
      "How do I withdraw or collect my winnings?",
      "How long does payout take after a session ends?",
    ],
    answer:
      "You do not need to submit a withdrawal form. Once a session closes and final standings are verified, the GuessWhat operations team transfers your prize directly to the Nigerian bank account saved in your Profile and sends an official Verified Payout Receipt straight to your Inbox.",
    ctaLabel: "Check Profile Bank Details",
    ctaHref: "/profile",
  },
  {
    id: "verified-payout-receipts",
    title: "Proof That GuessWhat Pays: Verified Payout Receipts",
    category: "Prizes & Payouts",
    keywords: ["receipt", "receipts", "proof", "legit", "scam", "real", "pays", "verified", "fake", "trust"],
    sampleQuestions: [
      "Does GuessWhat really pay? Is it legit?",
      "Where can I see proof of real payouts and receipts?",
    ],
    answer:
      "Yes, GuessWhat pays real cash! Whenever the team completes a winner transfer, an official Verified Payout Receipt (with a unique GW-PAY receipt ID and masked bank details for privacy) is sent to the winner's Inbox and published in the Community Arena under the Verified Payouts feed so everyone can verify and share real payout proof.",
    ctaLabel: "See Verified Payouts in Arena",
    ctaHref: "/community",
  },
  {
    id: "referrals-how-it-works",
    title: "How Referrals & Invite Links Work",
    category: "Referrals",
    keywords: ["referral", "referrals", "invite", "code", "link", "share", "friends", "refer"],
    sampleQuestions: [
      "How do I invite friends with my referral link?",
      "Where do I find my referral code?",
    ],
    answer:
      "Open the Referrals page to copy your personal referral code or 1-tap share link. When friends register using your link or enter your code on the Sign Up screen and complete at least one game session, they count as a verified playing referral toward your Referral Cash Leaderboard rank.",
    ctaLabel: "Open Referrals Page",
    ctaHref: "/referrals",
  },
  {
    id: "referral-cash-leaderboard",
    title: "Referral Cash Leaderboard & Verified Referrals Rule",
    category: "Referrals",
    keywords: ["referral", "leaderboard", "cash", "verified", "playing", "prize", "win", "friends", "active"],
    sampleQuestions: [
      "How do I win cash on the Referral Leaderboard?",
      "Why didn't a friend who signed up count yet?",
    ],
    answer:
      "GuessWhat runs a separate Referral Cash Leaderboard with its own cash prize pool! Only verified playing referrals (friends who signed up with your code AND completed at least 1 game session) count toward cash prize ranks. This keeps the board fair and blocks fake signups. You can track your standing on Referrals or on the Referrals tab inside Leaderboard.",
    ctaLabel: "View Referral Leaderboard",
    ctaHref: "/leaderboard?tab=referrals",
  },
  {
    id: "referral-cycle-resets",
    title: "Referral Leaderboard Cycle Resets & Past Winners",
    category: "Referrals",
    keywords: ["reset", "cycle", "archive", "past", "referral", "monthly", "new"],
    sampleQuestions: [
      "When does the referral leaderboard reset?",
      "What happens to winners when a referral cycle resets?",
    ],
    answer:
      "At the end of each referral prize cycle, Admin archives the winning referral leaders into the Past Cycles record so their prizes are locked in, then starts a fresh cycle so every player has a new shot at topping the Referral Cash Leaderboard.",
    ctaLabel: "Open Referrals",
    ctaHref: "/referrals",
  },
  {
    id: "community-arena-guide",
    title: "Community Arena: Live Chat, Polls, Reactions & Mentions",
    category: "Community Arena",
    keywords: ["community", "arena", "chat", "banter", "poll", "polls", "mention", "tag", "react", "emoji"],
    sampleQuestions: [
      "How does the Community Arena work?",
      "How do I tag another player or create a poll?",
    ],
    answer:
      "The Community Arena lets you banter live with players across Nigeria, vote on community polls, react with emojis, see live rank climb notices, and view Verified Payout proofs. Type @ followed by a username to tag someone (they'll get an Inbox alert), or tap Start topic or poll to spark a debate.",
    ctaLabel: "Enter Community Arena",
    ctaHref: "/community",
  },
  {
    id: "community-safety-rules",
    title: "Community Arena Safety & Moderation Rules",
    category: "Community Arena",
    keywords: ["blocked", "link", "links", "phone", "whatsapp", "number", "spam", "mute", "rules", "safety"],
    sampleQuestions: [
      "Why was my Arena message blocked?",
      "Can I post phone numbers or links in Community Chat?",
    ],
    answer:
      "To keep players safe from scammers and spam, external web links, URLs, phone numbers, and WhatsApp contacts are automatically blocked in the Community Arena. Keep conversations fun, respectful, and focused on the game and Nigerian culture.",
    ctaLabel: "Open Community Arena",
    ctaHref: "/community",
  },
  {
    id: "profile-avatar-state",
    title: "Setting Up Your Profile, Avatar & State Badge",
    category: "Account & Profile",
    keywords: ["profile", "avatar", "photo", "picture", "dp", "state", "badge", "username", "edit"],
    sampleQuestions: [
      "How do I upload a profile picture / avatar?",
      "How do I change my state badge?",
    ],
    answer:
      "Go to your Profile page to upload a square profile avatar (it shows on the Leaderboard, Community Arena, and Rank Notices), update your Nigerian state badge so you represent your city, and save your payout bank account.",
    ctaLabel: "Open Profile",
    ctaHref: "/profile",
  },
  {
    id: "account-login-google",
    title: "Sign Up, Google Sign-In & Login Help",
    category: "Account & Profile",
    keywords: ["login", "signin", "signup", "register", "google", "password", "account", "email"],
    sampleQuestions: [
      "Can I sign in with Google or my username?",
      "I am having trouble logging in.",
    ],
    answer:
      "You can sign up and log in using either Google Sign-In or your email/username + password. If you signed up with Google, always use Continue with Google. If you cannot access your account, open a Support ticket with your registered email and username so our team can assist.",
    ctaLabel: "Open Support",
    ctaHref: "/support",
  },
  {
    id: "session-results-popup",
    title: "How to View Full Past Session Results & My Picks",
    category: "Leaderboard",
    keywords: ["results", "past", "previous", "breakdown", "picks", "history", "popup", "closed"],
    sampleQuestions: [
      "Where can I see results from the last session?",
      "How do I inspect my picks and crowd vote shares?",
    ],
    answer:
      "Tap Results in the mobile top bar (or Session Results in the desktop sidebar) anytime. You can switch between closed sessions and browse three tabs: Votes (full 10-to-1 crowd percentages per question), Winners (ranked cash winners), and My Picks (your exact choices and points earned).",
    ctaLabel: "View Winners Board",
    ctaHref: "/leaderboard?tab=winners",
  },
  {
    id: "inbox-notifications",
    title: "Using Your Player Inbox & Notifications",
    category: "Account & Profile",
    keywords: ["inbox", "notification", "notifications", "alert", "alerts", "unread", "message"],
    sampleQuestions: [
      "What shows up in my Inbox?",
      "Where do I get notified if I win or get a support reply?",
    ],
    answer:
      "Your Inbox delivers live session alerts, winner announcements, official Verified Payout Receipts (with direct download links), @mention alerts from Community Arena, and replies from the GuessWhat Support Desk.",
    ctaLabel: "Open Inbox",
    ctaHref: "/inbox",
  },
  {
    id: "replay-onboarding-tour",
    title: "Replaying the In-App Guided Tour",
    category: "Account & Profile",
    keywords: ["tour", "onboarding", "walkthrough", "guide", "tutorial", "new", "user"],
    sampleQuestions: [
      "How do I replay the app tour?",
      "Is there a walkthrough for new users?",
    ],
    answer:
      "New players automatically get a 6-step interactive spotlight tour right after signing up. You can replay that guided tour anytime by tapping Take App Tour on Slide 3 of your Home screen or at the top of the How to Play page.",
    ctaLabel: "Open How to Play",
    ctaHref: "/how-to-play",
  },
  {
    id: "network-dns-troubleshooting",
    title: "Fix Loading Issues or Mobile Network DNS Errors",
    category: "Technical Help",
    keywords: ["dns", "reached", "error", "loading", "slow", "network", "mtn", "airtel", "glo", "pictures"],
    sampleQuestions: [
      "Why does the site say it can't be reached on my mobile data?",
      "Images or pages are loading slowly on my network.",
    ],
    answer:
      "Some mobile carriers occasionally throttle or drop DNS lookups on temporary domains. In Chrome, go to Settings -> Privacy and Security -> Security -> turn on Use Secure DNS and select Cloudflare (1.1.1.1) or Google Public DNS, then reload. Switching from weak 3G to 4G/Wi-Fi also helps picture questions preload instantly.",
    ctaLabel: "Contact Technical Support",
    ctaHref: "/support",
  },
  {
    id: "contact-human-support",
    title: "Contact Human Support or Submit Product Feedback",
    category: "Support",
    keywords: ["support", "human", "agent", "ticket", "help", "complain", "complaint", "issue", "feedback", "suggest"],
    sampleQuestions: [
      "How do I talk to a real support agent?",
      "Where can I report a bug or suggest a new feature?",
    ],
    answer:
      "If you have an account-specific issue (like a payout check, bank update help, or bug report), open the Support page to create a direct ticket with our team. Every admin reply syncs directly to your Support thread and Player Inbox. You can also share feature ideas anytime using Quick Feedback!",
    ctaLabel: "Open Support Desk",
    ctaHref: "/support",
  },
];

function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9₦]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const expanded: string[] = [];
  for (const token of raw) {
    if (token.length <= 1 && token !== "1") continue;
    if (STOP_WORDS.has(token)) continue;
    expanded.push(token);
    if (SYNONYM_MAP[token]) {
      expanded.push(...SYNONYM_MAP[token]);
    }
    // Simple plural stem
    if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
      expanded.push(token.slice(0, -1));
    }
  }
  return Array.from(new Set(expanded));
}

export function searchKnowledgeBank(
  query: string,
  extraArticles: FaqArticle[] = [],
): {
  matches: FaqSearchMatch[];
  topScore: number;
  tokens: string[];
} {
  const all = [...extraArticles, ...GUESSWHAT_KNOWLEDGE_BANK];
  const cleanQuery = query.toLowerCase().trim();
  const tokens = tokenize(cleanQuery);

  if (tokens.length === 0) {
    return { matches: [], topScore: 0, tokens: [] };
  }

  const scored: FaqSearchMatch[] = [];

  for (const article of all) {
    const titleLower = article.title.toLowerCase();
    const catLower = article.category.toLowerCase();
    const answerLower = article.answer.toLowerCase();
    const kwSet = new Set(article.keywords.map((k) => k.toLowerCase()));
    const samplesJoined = article.sampleQuestions.join(" ").toLowerCase();

    let score = 0;

    // Exact phrase boosts
    if (cleanQuery.length >= 4 && titleLower.includes(cleanQuery)) {
      score += 12;
    }
    if (cleanQuery.length >= 4 && samplesJoined.includes(cleanQuery)) {
      score += 10;
    }

    for (const tok of tokens) {
      if (kwSet.has(tok)) score += 4.5;
      if (titleLower.includes(tok)) score += 3.5;
      if (samplesJoined.includes(tok)) score += 2.8;
      if (catLower.includes(tok)) score += 1.5;
      if (answerLower.includes(tok)) score += 1.2;
    }

    // Slight boost for admin-authored custom entries when relevant
    if (article.id.startsWith("kb_") && score >= 4) {
      score += 2;
    }

    if (score > 0) {
      scored.push({ article, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return {
    matches: scored.slice(0, 5),
    topScore: scored[0]?.score ?? 0,
    tokens,
  };
}

export function pickFollowUpQuestions(matchedId?: string): string[] {
  const pool = [
    { id: "dynamic-scoring-10-to-1", q: "How does 10 to 1 scoring work?" },
    { id: "how-payouts-work", q: "How do I get paid if I win?" },
    { id: "verified-payout-receipts", q: "Does GuessWhat really pay?" },
    { id: "best-score-safety", q: "Does replaying lower my score?" },
    { id: "referral-cash-leaderboard", q: "How do referral cash prizes work?" },
    { id: "bank-account-setup", q: "How do I add my bank account?" },
  ];
  return pool
    .filter((item) => item.id !== matchedId)
    .slice(0, 3)
    .map((item) => item.q);
}
