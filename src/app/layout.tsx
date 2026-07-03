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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="scanlines crt-vignette antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
