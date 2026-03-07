"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    // Only show custom cursor on non-touch devices
    const isTouchDevice = "ontouchstart" in window;
    if (isTouchDevice) return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };

    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);
    const handleLeave = () => setVisible(false);
    const handleEnter = () => setVisible(true);

    // Track hover state on interactive elements
    const handleOverCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.closest("a, button, [role='button'], input, textarea, select, [data-interactive]");
      setHovering(!!isInteractive);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);
    document.addEventListener("mouseover", handleOverCapture);

    // Hide default cursor
    document.body.style.cursor = "none";
    const style = document.createElement("style");
    style.textContent = "a, button, input, textarea, select, [role='button'] { cursor: none !important; }";
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
      document.removeEventListener("mouseover", handleOverCapture);
      document.body.style.cursor = "";
      style.remove();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Main cursor - pixel crosshair */}
      <div
        className="fixed pointer-events-none z-[9999] transition-transform duration-75"
        style={{
          left: pos.x,
          top: pos.y,
          transform: hovering
            ? `translate(-10px, -2px) scale(${clicking ? 0.8 : 1.4})`
            : `scale(${clicking ? 0.8 : 1})`,
        }}
      >
        {/* Pixel art cursor */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ imageRendering: "pixelated" }}
        >
          {hovering ? (
            // Pointer hand pixel art
            <>
              <rect x="8" y="0" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="8" y="4" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="8" y="8" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="4" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="8" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="12" y="8" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="12" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="16" y="8" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="16" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="16" width="20" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="20" width="20" height="4" fill="var(--cursor-color, #00ff88)" />
            </>
          ) : (
            // Arrow pixel art
            <>
              <rect x="0" y="0" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="4" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="8" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="16" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="4" y="4" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="4" y="8" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="4" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="8" y="8" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="8" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="12" y="12" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="4" y="16" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
              <rect x="0" y="20" width="4" height="4" fill="var(--cursor-color, #00ff88)" />
            </>
          )}
        </svg>
      </div>
      {/* Trailing glow */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-full transition-all duration-300 ease-out"
        style={{
          left: pos.x,
          top: pos.y,
          width: hovering ? 48 : 32,
          height: hovering ? 48 : 32,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
    </>
  );
}
