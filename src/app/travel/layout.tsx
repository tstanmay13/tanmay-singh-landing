import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel — Tanmay Singh",
  description:
    "An explorable 8-bit world of places I've traveled and lived.",
};

export default function TravelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
