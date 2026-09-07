"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/writing", label: "Writing" },
  { href: "/travel", label: "Travel" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/resume.pdf", label: "Resume", external: true },
  { href: "/contact", label: "Contact" },
];

export default function PixelNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuOpen = openPath === pathname;

  function links(mobile = false) {
    return navLinks.map((link) => {
      const active =
        !link.external &&
        (pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(link.href)));
      const props = {
        className: "site-nav-link",
        "aria-current": active ? ("page" as const) : undefined,
        "data-interactive": true,
        onClick: () => setOpenPath(null),
      };
      return link.external ? (
        <a
          key={`${mobile}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {link.label}
        </a>
      ) : (
        <Link key={`${mobile}-${link.href}`} href={link.href} {...props}>
          {link.label}
        </Link>
      );
    });
  }

  return (
    <nav
      className="pixel-nav site-nav"
      aria-label="Main navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setOpenPath(null);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="site-nav-inner">
        <Link
          href="/"
          className="site-nav-brand"
          onClick={() => setOpenPath(null)}
          data-interactive
        >
          <span>TS</span>
          <span>tanmay singh</span>
        </Link>
        <div className="site-nav-desktop">{links()}</div>
        <div className="site-nav-actions">
          <button
            className="site-nav-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            data-interactive
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button
            ref={menuButton}
            className="site-nav-button site-nav-menu-button"
            onClick={() => setOpenPath(menuOpen ? null : pathname)}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="site-nav-menu"
            data-interactive
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div id="site-nav-menu" className="site-nav-mobile">
          {links(true)}
        </div>
      )}
    </nav>
  );
}
