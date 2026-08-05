"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import PixelNav from "@/components/PixelNav";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <ThemeProvider>
      <PixelNav />
      <main className={isHome ? "site-main site-main-home" : "site-main"}>
        {children}
      </main>
    </ThemeProvider>
  );
}
