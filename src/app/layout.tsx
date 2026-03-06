import type { Metadata } from "next";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tanmay Singh - Full-Stack Developer",
  description:
    "Welcome to my pixel-powered corner of the internet. Full-stack developer building interactive web experiences, retro games, and creative projects.",
  keywords: [
    "Tanmay Singh",
    "Full-Stack Developer",
    "Game Developer",
    "Web Developer",
    "Portfolio",
    "Pixel Art",
    "Retro",
  ],
  authors: [{ name: "Tanmay Singh" }],
  creator: "Tanmay Singh",
  openGraph: {
    title: "Tanmay Singh - Full-Stack Developer",
    description:
      "Welcome to my pixel-powered corner of the internet. Full-stack developer building interactive web experiences, retro games, and creative projects.",
    url: "https://tanmay-singh.com",
    siteName: "Tanmay Singh",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tanmay Singh - Full-Stack Developer",
    description:
      "Welcome to my pixel-powered corner of the internet. Full-stack developer building interactive web experiences, retro games, and creative projects.",
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
