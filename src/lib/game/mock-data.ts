/**
 * Mock data used until Supabase env vars are configured.
 * Shapes mirror the SQL schema so the swap is mechanical.
 */

export const mockSession = {
  id: "mock-session-1",
  name: "Weekend Showdown",
  status: "active" as const,
  endsAt: new Date(Date.now() + 41 * 3600_000).toISOString(),
  entryFeeCoins: 100,
  prizePool: 250_000,
  playersJoined: 4_218,
  questionCount: 10,
};

export const mockQuestions = [
  {
    id: "q1",
    title: "Which country will be selected the most?",
    options: [
      "Nigeria",
      "USA",
      "UK",
      "Canada",
      "Japan",
      "Germany",
      "France",
      "South Africa",
      "Brazil",
      "China",
    ],
  },
  {
    id: "q2",
    title: "Which colour will most players pick?",
    options: ["Red", "Blue", "Green", "Black", "Purple", "Orange"],
  },
  {
    id: "q3",
    title: "Pick the number most people will pick.",
    options: ["1", "3", "7", "9", "13", "21", "42", "99"],
  },
  {
    id: "q4",
    title: "Which meal will be chosen the most?",
    options: ["Jollof rice", "Pizza", "Fried rice", "Pounded yam", "Suya", "Shawarma"],
  },
  {
    id: "q5",
    title: "Which superpower will most players want?",
    options: ["Fly", "Invisibility", "Time travel", "Mind reading", "Super strength"],
  },
];

export const mockStats = {
  currentRank: 87,
  totalPoints: 1_240,
  coinBalance: 850,
  winRate: 0.31,
  gamesPlayed: 26,
  currentStreak: 4,
};

export const mockLeaderboard = [
  { rank: 1, username: "ada_thinks", points: 96, timeMs: 41_320, prize: "₦100,000" },
  { rank: 2, username: "kelvin_o", points: 96, timeMs: 55_870, prize: "₦50,000" },
  { rank: 3, username: "zippy", points: 94, timeMs: 38_990, prize: "₦25,000" },
  { rank: 4, username: "mrgw", points: 91, timeMs: 47_211, prize: "₦10,000" },
  { rank: 5, username: "thelma.a", points: 90, timeMs: 61_002, prize: "₦10,000" },
];
