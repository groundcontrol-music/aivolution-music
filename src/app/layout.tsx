import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import OnboardingHelper from "@/components/OnboardingHelper";
import { PlayerProvider } from "@/contexts/PlayerContext";
import GlobalPlayer from "@/components/GlobalPlayer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aivolution Music | The AI Music Revolution",
  description: "Platform for AI generated music and creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        {/* Referrer Policy für YouTube Embeds (Fehler 153 Fix) */}
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </head>
      <body className={inter.className}>
        <PlayerProvider>
          <Header />
          <OnboardingHelper />
          {children}
          <GlobalPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
