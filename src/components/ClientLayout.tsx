"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import PixelNav from "@/components/PixelNav";
import CustomCursor from "@/components/CustomCursor";
import ParallaxBackground from "@/components/ParallaxBackground";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <CustomCursor />
      <ParallaxBackground />
      <PixelNav />
      <main className="relative z-10 pt-16">{children}</main>
    </ThemeProvider>
  );
}
