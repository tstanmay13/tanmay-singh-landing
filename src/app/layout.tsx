import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tanmay Singh - Full-Stack Developer & Game Creator",
  description: "Building interactive web experiences and games. Passionate about creating things that live on the internet.",
  keywords: ["Tanmay Singh", "Full-Stack Developer", "Game Developer", "Web Developer", "Portfolio"],
  authors: [{ name: "Tanmay Singh" }],
  creator: "Tanmay Singh",
  openGraph: {
    title: "Tanmay Singh - Full-Stack Developer & Game Creator",
    description: "Building interactive web experiences and games. Passionate about creating things that live on the internet.",
    url: "https://tanmay-singh.com",
    siteName: "Tanmay Singh",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tanmay Singh - Full-Stack Developer & Game Creator",
    description: "Building interactive web experiences and games. Passionate about creating things that live on the internet.",
    creator: "@tanmaysingh",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
