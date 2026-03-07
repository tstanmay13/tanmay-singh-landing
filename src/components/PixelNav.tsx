"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

const navLinks = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/games", label: "Games", icon: "🎮" },
  { href: "/blog", label: "Blog", icon: "📝" },
  { href: "/portfolio", label: "Portfolio", icon: "💼" },
  { href: "/contact", label: "Contact", icon: "💌" },
];

export default function PixelNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pixel-nav">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          data-interactive
        >
          <span className="text-2xl pixel-text font-bold text-[var(--color-accent)] group-hover:animate-pixel-bounce">
            TS
          </span>
          <span className="hidden sm:inline text-sm text-[var(--color-text-secondary)] pixel-text">
            tanmay singh
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                data-interactive
                className={`px-4 py-2 text-sm pixel-text transition-all duration-200 border-2 ${
                  isActive
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]"
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            data-interactive
            className="ml-3 px-3 py-2 border-2 border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] transition-all duration-200 pixel-text text-sm"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️ DAY" : "🌙 NIGHT"}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            data-interactive
            className="px-2 py-1.5 border-2 border-[var(--color-border)] text-sm"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            data-interactive
            className="px-3 py-1.5 border-2 border-[var(--color-border)] pixel-text text-[var(--color-text)] text-sm"
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"} MENU
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 flex flex-col gap-1 pixel-nav-mobile">
          {navLinks.map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                data-interactive
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 text-sm pixel-text transition-all duration-200 border-2 ${
                  isActive
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
