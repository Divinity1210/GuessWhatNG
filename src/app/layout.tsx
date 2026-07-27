import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, Poppins } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Aileron is the brand body face but has no Google Fonts distribution;
// Inter stands in until the font files are added to /public/fonts.
const body = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Guess What — Think & Win",
    template: "%s · Guess What",
  },
  description:
    "The social prediction game. Guess what most players will pick, climb the leaderboard, and win rewards.",
  applicationName: "Guess What",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guess What",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1117",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${poppins.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
