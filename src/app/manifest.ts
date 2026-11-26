import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GuessWhat | Predict the Crowd & Win",
    short_name: "GuessWhat",
    description:
      "Live social prediction rounds across Nigeria. Pick what most players choose, climb the leaderboard, and win cash prizes.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#0b0e17",
    theme_color: "#0b0e17",
    categories: ["games", "entertainment", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Play Live Session",
        short_name: "Play",
        description: "Jump straight into the active prediction round",
        url: "/play",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Live Leaderboard",
        short_name: "Leaderboard",
        description: "Check live crowd rankings and top winners",
        url: "/leaderboard",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
