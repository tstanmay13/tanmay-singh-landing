"use client";

import { useState, useEffect } from "react";

const bootMessages = [
  "BIOS v1.0 - TANMAY OS",
  "Checking memory... 16GB OK",
  "Loading pixel assets...",
  "Initializing creativity engine...",
  "Compiling portfolio data...",
  "Mounting game modules...",
  "Establishing neural link...",
  "SYSTEM READY.",
];

export default function LoadingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"boot" | "progress" | "done">("boot");

  useEffect(() => {
    // Skip loading screen if already seen this session
    if (sessionStorage.getItem("boot-complete")) {
      onComplete();
      return;
    }

    // Boot text phase
    const bootInterval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev >= bootMessages.length - 1) {
          clearInterval(bootInterval);
          setPhase("progress");
          return prev;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(bootInterval);
  }, [onComplete]);

  useEffect(() => {
    if (phase !== "progress") return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setPhase("done");
          return 100;
        }
        return prev + 4;
      });
    }, 40);

    return () => clearInterval(progressInterval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const timeout = setTimeout(() => {
      sessionStorage.setItem("boot-complete", "1");
      onComplete();
    }, 400);
    return () => clearTimeout(timeout);
  }, [phase, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[10000] bg-[#0a0a0f] flex items-center justify-center transition-opacity duration-500 ${
        phase === "done" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="max-w-lg w-full px-6">
        {/* Boot text */}
        <div className="mb-8 font-mono text-sm space-y-1">
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

        {/* Progress bar */}
        {phase !== "boot" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-[#00ff88]/70">
              <span>LOADING</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-3 border-2 border-[#00ff88]/50 relative overflow-hidden">
              <div
                className="h-full bg-[#00ff88] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
              {/* Pixel segments */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 border-r border-[#0a0a0f]/30 last:border-0"
                  />
                ))}
              </div>
            </div>
            <div className="text-center text-xs font-mono text-[#00ff88]/50 mt-4">
              PRESS START or wait...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
