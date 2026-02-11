import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

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
      <body className={inter.className}>
        {/* Header ist hier global, aber wir haben ihn auch in page.tsx importiert? 
            Checken wir page.tsx. Dort ist er auch. 
            Doppelt ist schlecht. Ich nehme ihn hier raus oder in page.tsx raus.
            Besser: Header in Layout, damit er überall ist (auch auf /onboarding etc.)
            Aber page.tsx hat ihn auch. Ich lasse ihn hier erstmal WEG, 
            damit wir keine doppelten Header haben, da ich ihn in page.tsx und admin/layout.tsx habe.
            Warte, admin/layout hat einen eigenen Header? Nein, admin/layout nutzt AdminNav.
            Normale Seiten brauchen den Header.
            Ich lasse es so wie es war (ohne Header hier), nur Title ändern.
        */}
        {children}
      </body>
    </html>
  );
}
