import type { Metadata } from "next";
import { Cormorant_Garamond, Karla } from "next/font/google";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-travel-display",
});

const sans = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-travel-sans",
});

export const metadata: Metadata = {
  title: "Travel — Tanmay Singh",
  description: "A souvenir globe of places I've been.",
};

export default function TravelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={`${display.variable} ${sans.variable}`}>{children}</div>;
}
