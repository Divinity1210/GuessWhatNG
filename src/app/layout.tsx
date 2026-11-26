import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, Poppins } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaInstallManager } from "@/components/pwa/PwaInstallManager";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://guesswhat9ja.com"),
  title: {
    default: "GuessWhat | Predict the Crowd & Win",
    template: "%s | GuessWhat",
  },
  description:
    "Live social prediction rounds across Nigeria. Pick what most players choose, climb the leaderboard, and win cash prizes.",
  applicationName: "GuessWhat",
  openGraph: {
    type: "website",
    url: "https://guesswhat9ja.com",
    siteName: "GuessWhat",
    title: "GuessWhat | Predict the Crowd & Win",
    description:
      "Live social prediction rounds across Nigeria. Pick what most players choose, climb the leaderboard, and win cash prizes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GuessWhat | Predict the Crowd & Win",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GuessWhat | Predict the Crowd & Win",
    description:
      "Live social prediction rounds across Nigeria. Pick what most players choose, climb the leaderboard, and win cash prizes.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GuessWhat",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e17",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <PwaInstallManager />
        </AuthProvider>
      </body>
    </html>
  );
}
