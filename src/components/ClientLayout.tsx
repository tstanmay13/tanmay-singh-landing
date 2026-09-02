"use client";

import { useState, useCallback } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import PixelNav from "@/components/PixelNav";
import CustomCursor from "@/components/CustomCursor";
import ParallaxBackground from "@/components/ParallaxBackground";
import LoadingScreen from "@/components/LoadingScreen";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <ThemeProvider>
      {loading && <LoadingScreen onComplete={handleLoadingComplete} />}
      <CustomCursor />
      <ParallaxBackground />
      <PixelNav />
      <main className="relative z-10 pt-16">{children}</main>
    </ThemeProvider>
  );
}
