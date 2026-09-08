import type { Metadata } from "next";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

const DESCRIPTION =
  "Come hang out. A little pixel world of games, travel, mythology, music, and things I make. Tanmay Singh, New York.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tanmay-singh.com"),
  title: "Tanmay Singh",
  description: DESCRIPTION,
  keywords: [
    "Tanmay Singh",
    "games",
    "NYC",
  ],
  authors: [{ name: "Tanmay Singh" }],
  creator: "Tanmay Singh",
  openGraph: {
    title: "Tanmay Singh",
    description: DESCRIPTION,
    url: "https://tanmay-singh.com",
    siteName: "Tanmay Singh",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tanmay Singh",
    description: DESCRIPTION,
    creator: "@tanmaysingh",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Structured data so AI sourcing tools and crawlers get the facts without
// parsing pixel art.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Tanmay Singh",
  url: "https://tanmay-singh.com",
  worksFor: { "@type": "Organization", name: "Fern (acquired by Postman)" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "University of Texas at Austin" },
  address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY" },
  sameAs: [
    "https://github.com/tstanmay13",
    "https://linkedin.com/in/tsingh13",
  ],
  knowsAbout: [
    "SDK code generation",
    "developer experience",
    "AI agent tooling",
    "authentication and identity",
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
      <body className="scanlines crt-vignette antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
