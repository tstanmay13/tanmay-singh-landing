"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import styles from "./PixelNav.module.css";

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { href: "/", label: "Drive" },
  { href: "/portfolio", label: "Work" },
  { href: "/games", label: "Games" },
  { href: "/writing", label: "Writing" },
  { href: "/resume.pdf", label: "Résumé", external: true },
  { href: "/contact", label: "Contact" },
];

export default function PixelNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`${styles.nav} ${isHome ? styles.navHome : ""}`}
      aria-label="Primary navigation"
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.identity} aria-label="Tanmay Singh, home">
          <span className={styles.mark}>TS</span>
          <span className={styles.name}>Tanmay Singh</span>
        </Link>

        <div className={styles.desktopLinks}>
          {navLinks.map((link) => {
            const isActive =
              !link.external &&
              (pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href)));
            const className = `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

            return link.external ? (
              <a
                key={link.href}
                href={link.href}
                className={className}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={className}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}

          {!isHome ? (
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "DAY" : "NIGHT"}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="primary-mobile-menu"
        >
          <span>{menuOpen ? "Close" : "Menu"}</span>
          <i aria-hidden="true" />
        </button>
      </div>

      <div
        id="primary-mobile-menu"
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}
      >
        <div className={styles.mobileMenuInner}>
          {navLinks.map((link) => {
            const isActive =
              !link.external &&
              (pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href)));
            const className = `${styles.mobileLink} ${isActive ? styles.mobileLinkActive : ""}`;

            return link.external ? (
              <a
                key={link.href}
                href={link.href}
                className={className}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
              >
                <span>{link.label}</span>
                <i aria-hidden="true">↗</i>
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={className}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <span>{link.label}</span>
                <i aria-hidden="true">→</i>
              </Link>
            );
          })}

          {!isHome ? (
            <button type="button" className={styles.mobileTheme} onClick={toggleTheme}>
              Switch to {theme === "dark" ? "day" : "night"} mode
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
