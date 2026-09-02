import type { Metadata } from "next";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

const DESCRIPTION =
  "Senior software engineer in NYC. I build SDK generators and agent tooling at Fern (acquired by Postman); before that, passkeys and auth at Amazon Identity. Also: a 33-game retro arcade.";

export const metadata: Metadata = {
  title: "Tanmay Singh — Senior Software Engineer",
  description: DESCRIPTION,
  keywords: [
    "Tanmay Singh",
    "Senior Software Engineer",
    "SDK generation",
    "developer experience",
    "AI agent tooling",
    "Fern",
    "Postman",
    "NYC",
  ],
  authors: [{ name: "Tanmay Singh" }],
  creator: "Tanmay Singh",
  openGraph: {
    title: "Tanmay Singh — Senior Software Engineer",
    description: DESCRIPTION,
    url: "https://tanmay-singh.com",
    siteName: "Tanmay Singh",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tanmay Singh — Senior Software Engineer",
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
  jobTitle: "Senior Software Engineer",
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
