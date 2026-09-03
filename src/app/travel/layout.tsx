import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel — Tanmay Singh",
  description: "An 8-bit overworld of places I've been.",
};

export default function TravelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
