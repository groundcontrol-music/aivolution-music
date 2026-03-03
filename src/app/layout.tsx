import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/contexts/PlayerContext";
import AppShell from "@/components/AppShell";
import { headers } from 'next/headers';

type PlatformEvent = {
  id: string;
  event_name: string;
  country_code: string;
  start_date: string;
  end_date: string;
  theme_color_hex: string;
  aivo_skin_id: string;
  is_active: boolean;
  created_at?: string;
};

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aivolution Music | The AI Music Revolution",
  description: "Platform for AI generated music and creators.",
};

function EventBackgroundWrapper({ activeEvent, children }: { activeEvent: PlatformEvent | null, children: React.ReactNode }) {
  let holidayStyle = "bg-white/80"; // Standard-Hintergrund

  if (activeEvent && activeEvent.theme_color_hex) {
    const hex = activeEvent.theme_color_hex;
    // Konvertiere Hex zu RGB, um rgba zu erstellen
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    } else if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    }
    // Erstelle einen sehr dezenten Gradienten
    holidayStyle = `bg-gradient-to-br from-transparent via-transparent to-[rgba(${r},${g},${b},0.05)]`;
  } else if (activeEvent && activeEvent.aivo_skin_id === 'national') {
    // Beispiel: Nationalfarben für Deutschland (Schwarz-Rot-Gold)
    if (activeEvent.country_code === 'DE') {
      holidayStyle = "bg-gradient-to-br from-black/5 via-red-600/5 to-yellow-500/5";
    } else if (activeEvent.country_code === 'FR') {
      holidayStyle = "bg-gradient-to-br from-blue-600/5 via-white/5 to-red-600/5";
    } else if (activeEvent.country_code === 'ES') {
      holidayStyle = "bg-gradient-to-br from-red-600/5 via-yellow-500/5 to-red-600/5";
    }
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${holidayStyle}`}>
      <div className="absolute inset-0 border-[1.5rem] border-slate-100 rounded-[2.5rem] pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const activeEventHeader = headersList.get('x-active-event');
  const activeEvent: PlatformEvent | null = activeEventHeader ? JSON.parse(activeEventHeader) : null;

  return (
    <html lang="de">
      <head>
        {/* Referrer Policy für YouTube Embeds (Fehler 153 Fix) */}
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </head>
       <body className={inter.className}>
        <div id="video-lightbox-portal" /> {/* Portal für VideoLightbox */}
        <EventBackgroundWrapper activeEvent={activeEvent}>
          <PlayerProvider>
            <AppShell>{children}</AppShell>
          </PlayerProvider>
        </EventBackgroundWrapper>
      </body>
    </html>
  );
}
