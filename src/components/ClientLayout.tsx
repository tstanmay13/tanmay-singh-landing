"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import PixelNav from "@/components/PixelNav";
import CustomCursor from "@/components/CustomCursor";
import ParallaxBackground from "@/components/ParallaxBackground";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isImmersive = isHome || pathname === "/games/underworld";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <ThemeProvider>
      {!isImmersive && mounted ? <><CustomCursor /><ParallaxBackground /></> : null}
      <PixelNav />
      <main className="relative z-10 pt-16" data-home={isHome || undefined} data-immersive={isImmersive || undefined}>{children}</main>
    </ThemeProvider>
  );
}
