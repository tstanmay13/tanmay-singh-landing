"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface FallingPixel {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const [pixels, setPixels] = useState<FallingPixel[]>([]);
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Falling pixels animation
  useEffect(() => {
    if (!mounted) return;

    const initialPixels: FallingPixel[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      speed: 0.3 + Math.random() * 0.7,
      size: 2 + Math.random() * 4,
      opacity: 0.1 + Math.random() * 0.4,
    }));
    setPixels(initialPixels);

    const interval = setInterval(() => {
      setPixels((prev) =>
        prev.map((p) => ({
          ...p,
          y: p.y > 105 ? -5 : p.y + p.speed,
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, [mounted]);

  // Random glitch bursts
  useEffect(() => {
    if (!mounted) return;

    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(glitchInterval);
  }, [mounted]);

  const handleTryAgain = useCallback(() => {
    window.location.reload();
  }, []);

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <p className="pixel-text" style={{ color: "var(--color-text-muted)" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Falling pixels background */}
      {pixels.map((pixel) => (
        <div
          key={pixel.id}
          className="absolute pointer-events-none"
          style={{
            left: `${pixel.x}%`,
            top: `${pixel.y}%`,
            width: `${pixel.size}px`,
            height: `${pixel.size}px`,
            backgroundColor: "var(--color-accent)",
            opacity: pixel.opacity,
          }}
        />
      ))}

      {/* Static noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center text-center px-4">
        {/* Pixel skull */}
        <div className="mb-8 relative" aria-hidden="true">
          <svg
            width="96"
            height="96"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ imageRendering: "pixelated" }}
            className="animate-float"
          >
            {/* Skull top */}
            <rect x="4" y="1" width="8" height="1" fill="var(--color-red)" />
            <rect x="3" y="2" width="10" height="1" fill="var(--color-red)" />
            <rect x="2" y="3" width="12" height="1" fill="var(--color-red)" />
            <rect x="2" y="4" width="12" height="1" fill="var(--color-red)" />
            {/* Eyes */}
            <rect x="2" y="5" width="3" height="1" fill="var(--color-red)" />
            <rect x="5" y="5" width="2" height="1" fill="var(--color-bg)" />
            <rect x="7" y="5" width="2" height="1" fill="var(--color-red)" />
            <rect x="9" y="5" width="2" height="1" fill="var(--color-bg)" />
            <rect x="11" y="5" width="3" height="1" fill="var(--color-red)" />
            <rect x="2" y="6" width="3" height="1" fill="var(--color-red)" />
            <rect x="5" y="6" width="2" height="1" fill="var(--color-bg)" />
            <rect x="7" y="6" width="2" height="1" fill="var(--color-red)" />
            <rect x="9" y="6" width="2" height="1" fill="var(--color-bg)" />
            <rect x="11" y="6" width="3" height="1" fill="var(--color-red)" />
            {/* Nose */}
            <rect x="2" y="7" width="5" height="1" fill="var(--color-red)" />
            <rect x="7" y="7" width="2" height="1" fill="var(--color-bg)" />
            <rect x="9" y="7" width="5" height="1" fill="var(--color-red)" />
            {/* Mouth area */}
            <rect x="2" y="8" width="12" height="1" fill="var(--color-red)" />
            <rect x="3" y="9" width="10" height="1" fill="var(--color-red)" />
            {/* Teeth */}
            <rect x="3" y="10" width="2" height="1" fill="var(--color-red)" />
            <rect x="5" y="10" width="1" height="1" fill="var(--color-bg)" />
            <rect x="6" y="10" width="1" height="1" fill="var(--color-red)" />
            <rect x="7" y="10" width="1" height="1" fill="var(--color-bg)" />
            <rect x="8" y="10" width="1" height="1" fill="var(--color-red)" />
            <rect x="9" y="10" width="1" height="1" fill="var(--color-bg)" />
            <rect x="10" y="10" width="1" height="1" fill="var(--color-red)" />
            <rect x="11" y="10" width="2" height="1" fill="var(--color-red)" />
            {/* Jaw */}
            <rect x="4" y="11" width="8" height="1" fill="var(--color-red)" />
          </svg>
        </div>

        {/* GAME OVER title */}
        <h1
          className="pixel-text text-4xl sm:text-5xl md:text-7xl mb-4 tracking-wider"
          style={{
            color: "var(--color-red)",
            textShadow: glitchActive
              ? "3px 0 var(--color-cyan), -3px 0 var(--color-pink)"
              : "0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2)",
            transform: glitchActive
              ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`
              : "none",
            transition: "text-shadow 0.1s",
          }}
        >
          GAME OVER
        </h1>

        {/* 404 subtitle */}
        <p
          className="pixel-text text-sm sm:text-base md:text-lg mb-2 animate-flicker"
          style={{ color: "var(--color-text-secondary)" }}
        >
          404 - PAGE NOT FOUND
        </p>

        {/* Flavor text */}
        <p
          className="mono-text text-xs sm:text-sm mb-10 max-w-md"
          style={{ color: "var(--color-text-muted)" }}
        >
          The page you are looking for has been eaten by a grue,
          <br />
          or maybe it never existed at all.
        </p>

        {/* INSERT COIN blink */}
        <p
          className="pixel-text text-xs sm:text-sm mb-10 animate-cursor-blink"
          style={{ color: "var(--color-accent)" }}
        >
          INSERT COIN TO CONTINUE
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/" className="pixel-btn">
            Return to Home
          </Link>
          <button onClick={handleTryAgain} className="pixel-btn">
            Try Again
          </button>
        </div>

        {/* Score display */}
        <div className="mt-12 flex gap-8">
          <div className="text-center">
            <p
              className="pixel-text text-[0.5rem] mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              SCORE
            </p>
            <p
              className="pixel-text text-sm"
              style={{ color: "var(--color-orange)" }}
            >
              0000404
            </p>
          </div>
          <div className="text-center">
            <p
              className="pixel-text text-[0.5rem] mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              HI-SCORE
            </p>
            <p
              className="pixel-text text-sm"
              style={{ color: "var(--color-orange)" }}
            >
              0000200
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
