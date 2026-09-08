import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./present-day-card.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CPSTL Operations Portal",
  description: "Secure terminal operations and inventory dashboard for CPSTL.",
  icons: {
    icon: "/cpstl-logo.png",
    shortcut: "/cpstl-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestedScale = Number(import.meta.env.VITE_UI_FONT_SCALE || "1");
  const uiScale = Number.isFinite(requestedScale)
    ? Math.min(1.5, Math.max(0.8, requestedScale))
    : 1;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ "--ui-font-scale": uiScale } as CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
