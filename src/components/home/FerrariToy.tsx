"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./sour.module.css";

export default function FerrariToy() {
  const [wind, setWind] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState(0);
  const car = useRef<SVGGElement>(null);
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      start = 0,
      lastLap = 0;
    const duration = wind * 1500;
    const render = (time: number) => {
      if (!start) start = time;
      const progress = Math.min((time - start) / duration, 1);
      const angle = progress * wind * Math.PI * 2 + Math.PI;
      const x = 160 + 125 * Math.cos(angle),
        y = 71 + 42 * Math.sin(angle);
      const rotation =
        (Math.atan2(42 * Math.cos(angle), -125 * Math.sin(angle)) * 180) /
        Math.PI;
      car.current?.setAttribute(
        "transform",
        `translate(${x} ${y}) rotate(${rotation})`,
      );
      const lap = Math.floor(progress * wind);
      if (lap !== lastLap) {
        lastLap = lap;
        setLaps(lap);
      }
      if (progress < 1) frame = requestAnimationFrame(render);
      else {
        setRunning(false);
        setWind(0);
      }
    };
    const visibility = () => {
      if (document.hidden) {
        setRunning(false);
        setWind(0);
      }
    };
    frame = requestAnimationFrame(render);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [running, wind]);
  const race = () => {
    if (!wind || running) return;
    setLaps(0);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLaps(wind);
      setWind(0);
    } else setRunning(true);
  };
  return (
    <section className={styles.ferrari} aria-label="Wind-up Ferrari toy">
      <div className={styles.gameTitle}>
        <span>A tiny victory lap.</span>
        <small>Forza Ferrari.</small>
      </div>
      <svg
        viewBox="0 0 320 142"
        role="img"
        aria-label="A red toy Ferrari on a small oval racetrack"
      >
        <path fill="#293c34" d="M0 0H320V142H0Z" />
        <ellipse
          cx="160"
          cy="71"
          rx="126"
          ry="42"
          fill="none"
          stroke="#adada0"
          strokeWidth="26"
        />
        <ellipse
          cx="160"
          cy="71"
          rx="126"
          ry="42"
          fill="none"
          stroke="#a34d3f"
          strokeWidth="25"
          strokeDasharray="9 12"
        />
        <ellipse
          cx="160"
          cy="71"
          rx="125"
          ry="42"
          fill="none"
          stroke="#485657"
          strokeWidth="19"
        />
        <ellipse
          cx="160"
          cy="71"
          rx="125"
          ry="42"
          fill="none"
          stroke="#c3c1a77a"
          strokeWidth="1"
          strokeDasharray="9 12"
        />
        <path fill="#d7d1b5" d="M25 63h20v4H25Zm0 8h20v4H25Zm0 8h20v4H25Z" />
        <text
          x="160"
          y="67"
          textAnchor="middle"
          fill="#dcbd83"
          fontSize="11"
          fontFamily="monospace"
        >
          SCUDERIA TANMAY
        </text>
        <text
          x="160"
          y="82"
          textAnchor="middle"
          fill="#afbb9e"
          fontSize="8"
          fontFamily="monospace"
        >
          just one more lap
        </text>
        <g ref={car} transform="translate(35 71) rotate(-90)">
          <path
            fill="#172328"
            d="M-6 -8h5v4h-5Zm0 12h5v4h-5Zm9-12h5v4H3Zm0 12h5v4H3Z"
          />
          <path fill="#d65542" d="M-10-5H5V-3H12V3H5V5H-10Z" />
          <path fill="#f2c18c" d="M-3-2H1V2H-3Z" />
          <path fill="#ed8a69" d="M-9-5h2v10h-2Z" />
        </g>
      </svg>
      <p role="status">
        {running
          ? `Around we go… ${laps} ${laps === 1 ? "lap" : "laps"}.`
          : wind
            ? `${wind} ${wind === 1 ? "turn" : "turns"} of the key. Ready when you are.`
            : laps
              ? `${laps} ${laps === 1 ? "lap" : "laps"}. A very small Ferrari celebration.`
              : "Wind the key, then let it go."}
      </p>
      <div className={styles.toyControls}>
        <button
          disabled={running || wind === 3}
          onClick={() => setWind((v) => Math.min(3, v + 1))}
        >
          Wind it up {"●".repeat(wind)}
          {"○".repeat(3 - wind)}
        </button>
        <button disabled={running || !wind} onClick={race}>
          Let it go →
        </button>
      </div>
    </section>
  );
}
