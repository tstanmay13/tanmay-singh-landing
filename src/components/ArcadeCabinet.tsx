import Link from "next/link";

interface ArcadeCabinetProps {
  title: string;
  subtitle?: string;
  /** Widen the cabinet for games that need more horizontal room (dashboards, wide boards). */
  wide?: boolean;
  children: React.ReactNode;
}

/**
 * Shared page chrome for every game in the arcade.
 *
 * Renders the back link, title bar, and a pixel-border "cabinet" bezel around
 * the game area so all games share one visual identity. Client-safe: no hooks,
 * no browser APIs — importable from both server and client game pages.
 */
export default function ArcadeCabinet({
  title,
  subtitle,
  wide = false,
  children,
}: ArcadeCabinetProps) {
  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <div className={`${wide ? "max-w-7xl" : "max-w-4xl"} mx-auto`}>
        {/* Top bar: back to arcade */}
        <div className="mb-6">
          <Link
            href="/games"
            className="pixel-text text-xs inline-block transition-opacity duration-200 hover:opacity-75"
            style={{ color: "var(--color-accent)" }}
          >
            &lt;- ARCADE
          </Link>
        </div>

        {/* Marquee: title + optional subtitle */}
        <header className="text-center mb-6">
          <h1
            className="pixel-text text-[0.75rem] sm:text-base md:text-xl"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mono-text text-sm mt-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {subtitle}
            </p>
          )}
        </header>

        {/* Bezel: the game screen */}
        <div
          className="pixel-border p-4 sm:p-6"
          style={{ background: "var(--color-bg-card)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
