"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const CURSOR_COLOR = "var(--cursor-color, var(--color-accent))";

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const pathname = usePathname();
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(false);
  const hoveringRef = useRef(false);
  const moveFrameRef = useRef(0);

  useEffect(() => {
    // Only show custom cursor on non-touch devices
    const isTouchDevice = "ontouchstart" in window;
    if (isTouchDevice) return;

    const handleMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }
      if (moveFrameRef.current) return;
      moveFrameRef.current = requestAnimationFrame(() => {
        moveFrameRef.current = 0;
        const { x, y } = positionRef.current;
        for (const node of [cursorRef.current, trailRef.current]) {
          if (!node) continue;
          node.style.left = `${x}px`;
          node.style.top = `${y}px`;
        }
      });
    };

    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);
    const handleLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const handleEnter = () => {
      visibleRef.current = true;
      setVisible(true);
    };

    // Track hover state on interactive elements
    const handleOverCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.closest("a, button, [role='button'], input, textarea, select, [data-interactive]");
      const next = Boolean(isInteractive);
      if (next === hoveringRef.current) return;
      hoveringRef.current = next;
      setHovering(next);
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
      if (moveFrameRef.current) cancelAnimationFrame(moveFrameRef.current);
      document.body.style.cursor = "";
      style.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Main cursor - pixel crosshair */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[9999] transition-transform duration-75"
        style={{
          left: positionRef.current.x,
          top: positionRef.current.y,
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
              <rect x="8" y="0" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="8" y="4" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="8" y="8" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="4" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="8" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="12" y="8" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="12" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="16" y="8" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="16" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="16" width="20" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="20" width="20" height="4" fill={CURSOR_COLOR} />
            </>
          ) : (
            // Arrow pixel art
            <>
              <rect x="0" y="0" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="4" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="8" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="16" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="4" y="4" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="4" y="8" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="4" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="8" y="8" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="8" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="12" y="12" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="4" y="16" width="4" height="4" fill={CURSOR_COLOR} />
              <rect x="0" y="20" width="4" height="4" fill={CURSOR_COLOR} />
            </>
          )}
        </svg>
      </div>
      {pathname.startsWith("/travel") ? null : (
        <div
          ref={trailRef}
          className="fixed pointer-events-none z-[9998] rounded-full transition-all duration-300 ease-out"
          style={{
            left: positionRef.current.x,
            top: positionRef.current.y,
            width: hovering ? 48 : 32,
            height: hovering ? 48 : 32,
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 15%, transparent) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
        />
      )}
    </>
  );
}
