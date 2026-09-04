"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BOOT_SESSION_KEY = "boot-complete";
const BOOT_LINE_MS = 160;
const BOOT_MAX_MS = 800;
export const BOOT_TIMING_BUDGET_MS = 900;

const bootMessages = [
  "BIOS v1.0 - TANMAY OS",
  "Loading pixel assets...",
  "SYSTEM READY.",
];

function skipBoot(onComplete: () => void) {
  sessionStorage.setItem(BOOT_SESSION_KEY, "1");
  onComplete();
}

export default function LoadingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [currentLine, setCurrentLine] = useState(0);
  const [phase, setPhase] = useState<"boot" | "done">("boot");
  const startedAt = useRef(
    typeof performance !== "undefined" ? performance.now() : 0,
  );
  const completed = useRef(false);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    sessionStorage.setItem(BOOT_SESSION_KEY, "1");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (sessionStorage.getItem(BOOT_SESSION_KEY)) {
      finish();
      return;
    }

    const bootInterval = window.setInterval(() => {
      setCurrentLine((prev) => {
        if (prev >= bootMessages.length - 1) {
          window.clearInterval(bootInterval);
          setPhase("done");
          return prev;
        }
        return prev + 1;
      });
    }, BOOT_LINE_MS);

    const hardCap = window.setTimeout(finish, BOOT_MAX_MS);

    return () => {
      window.clearInterval(bootInterval);
      window.clearTimeout(hardCap);
    };
  }, [finish]);

  useEffect(() => {
    if (phase !== "done") return;
    const timeout = window.setTimeout(finish, 80);
    return () => window.clearTimeout(timeout);
  }, [finish, phase]);

  useEffect(() => {
    const skip = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (!["Enter", " ", "Escape"].includes(event.key)) return;
        event.preventDefault();
      }
      finish();
    };

    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [finish]);

  const elapsed = Math.round(
    (typeof performance !== "undefined" ? performance.now() : 0) -
      startedAt.current,
  );

  return (
    <div
      className={`fixed inset-0 z-[10000] bg-[#0a0a0f] flex items-center justify-center transition-opacity duration-150 ${
        phase === "done" ? "opacity-0" : "opacity-100"
      }`}
      data-boot="1"
      data-boot-ms={elapsed}
      data-boot-budget={BOOT_TIMING_BUDGET_MS}
      role="dialog"
      aria-label="System boot"
    >
      <div className="max-w-lg w-full px-6">
        <div className="mb-2 font-mono text-sm space-y-1">
          {bootMessages.slice(0, currentLine + 1).map((msg, i) => (
            <div
              key={i}
              className={`${
                i === currentLine ? "text-[#00ff88]" : "text-[#00ff88]/50"
              } ${i === bootMessages.length - 1 ? "font-bold" : ""}`}
            >
              <span className="text-[#00ff88]/30 mr-2">&gt;</span>
              {msg}
              {i === currentLine && phase === "boot" && (
                <span className="inline-block w-2 h-4 bg-[#00ff88] ml-1 animate-cursor-blink" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
