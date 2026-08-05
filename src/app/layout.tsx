import type { Metadata, Viewport } from "next";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

const DESCRIPTION =
  "Tanmay Singh’s nighttime portfolio: software, daily games, odd tools, engineering stories, and a 33-game browser arcade.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tanmay-singh.com"),
  title: "Tanmay Singh — Software, Games, Side Quests",
  description: DESCRIPTION,
  keywords: [
    "Tanmay Singh",
    "software engineer",
    "browser games",
    "creative coding",
    "side projects",
    "NYC",
  ],
  authors: [{ name: "Tanmay Singh" }],
  creator: "Tanmay Singh",
  openGraph: {
    title: "Tanmay Singh — Software, Games, Side Quests",
    description: DESCRIPTION,
    url: "https://tanmay-singh.com",
    siteName: "Tanmay Singh",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tanmay Singh — Software, Games, Side Quests",
    description: DESCRIPTION,
    creator: "@tanmaysingh",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Structured data so AI sourcing tools and crawlers get the facts without
// parsing pixel art.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Tanmay Singh",
  url: "https://tanmay-singh.com",
  jobTitle: "Senior Software Engineer",
  worksFor: { "@type": "Organization", name: "Fern (acquired by Postman)" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "University of Texas at Austin" },
  address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY" },
  sameAs: [
    "https://github.com/tstanmay13",
    "https://linkedin.com/in/tsingh13",
  ],
  knowsAbout: [
    "Browser games",
    "Creative coding",
    "Software tools",
    "Real-time multiplayer games",
    "real-time streaming (WebSockets, SSE)",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
