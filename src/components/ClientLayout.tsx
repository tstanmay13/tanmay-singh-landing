"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import PixelNav from "@/components/PixelNav";
import CustomCursor from "@/components/CustomCursor";
import ParallaxBackground from "@/components/ParallaxBackground";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const quietPage =
    pathname === "/" || pathname === "/portfolio" || pathname === "/games";

  return (
    <ThemeProvider>
      {!quietPage && <CustomCursor />}
      {!quietPage && <ParallaxBackground />}
      <PixelNav />
      <main className="relative z-10 pt-16">{children}</main>
    </ThemeProvider>
  );
}
