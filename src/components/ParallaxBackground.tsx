"use client";

import { useEffect, useState } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

export default function ParallaxBackground() {
  const [scrollY, setScrollY] = useState(0);
  const [stars] = useState<Star[]>(() =>
    Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1,
      opacity: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.3 + 0.1,
    }))
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="parallax-bg">
      {/* Grid pattern layer - moves slowest */}
      <div
        className="absolute inset-0 grid-pattern"
        style={{ transform: `translateY(${scrollY * 0.05}px)` }}
      />

      {/* Stars layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      >
        {stars.map((star, i) => (
          <rect
            key={i}
            x={`${star.x}%`}
            y={`${star.y}%`}
            width={star.size}
            height={star.size}
            fill="var(--color-accent)"
            opacity={star.opacity}
            style={{
              transform: `translateY(${scrollY * star.speed}px)`,
            }}
          />
        ))}
      </svg>

      {/* Floating pixel shapes - mid layer */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      >
        {/* Large square */}
        <div
          className="absolute w-16 h-16 border-2 border-[var(--color-accent)] opacity-5 rotate-45"
          style={{ top: "20%", left: "10%" }}
        />
        {/* Small diamond */}
        <div
          className="absolute w-8 h-8 border-2 border-[var(--color-purple)] opacity-5 rotate-45"
          style={{ top: "60%", right: "15%" }}
        />
        {/* Circle */}
        <div
          className="absolute w-12 h-12 border-2 border-[var(--color-cyan)] opacity-5 rounded-full"
          style={{ top: "40%", left: "80%" }}
        />
        {/* Cross */}
        <div
          className="absolute w-6 h-6 opacity-5"
          style={{ top: "75%", left: "25%" }}
        >
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[var(--color-pink)] -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-[var(--color-pink)] -translate-x-1/2" />
        </div>
      </div>
    </div>
  );
}
