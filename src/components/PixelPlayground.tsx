"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PixelPlayground.module.css";

const COINS = [165, 320, 475];
const FLOOR = 122;

/** A tiny, user-started platformer. Its keyboard controls stay inside this region. */
export default function PixelPlayground() {
  const actor = useRef<SVGGElement>(null);
  const motion = useRef({
    x: 24,
    y: FLOOR,
    vy: 0,
    collected: new Set<number>(),
  });
  const [running, setRunning] = useState(false);
  const [collected, setCollected] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState(0);

  function jump() {
    if (!running) {
      motion.current = { x: 24, y: FLOOR, vy: -310, collected: new Set() };
      setCollected([]);
      setFinished(false);
      setRunning(true);
    } else if (motion.current.y >= FLOOR) {
      motion.current.vy = -310;
    }
  }

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous = 0;
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.035) : 0;
      previous = now;
      const player = motion.current;
      player.x += dt * 95;
      player.vy += dt * 880;
      player.y = Math.min(FLOOR, player.y + player.vy * dt);
      if (player.y === FLOOR) player.vy = 0;
      for (const coin of COINS) {
        if (
          !player.collected.has(coin) &&
          Math.abs(player.x - coin) < 18 &&
          Math.abs(player.y - 13 - 69) < 20
        ) {
          player.collected.add(coin);
          setCollected([...player.collected]);
        }
      }
      actor.current?.setAttribute(
        "transform",
        `translate(${player.x.toFixed(2)} ${player.y.toFixed(2)})`,
      );
      if (player.x >= 571) {
        setBest((value) => Math.max(value, player.collected.size));
        setFinished(true);
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <div
      className={styles.playground}
      role="region"
      aria-label="Little coin run"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          (event.key === " " && event.target === event.currentTarget) ||
          event.key === "ArrowUp"
        ) {
          event.preventDefault();
          if (!event.repeat) jump();
        }
      }}
    >
      <svg
        viewBox="0 0 640 152"
        className={styles.scene}
        aria-hidden="true"
        shapeRendering="crispEdges"
      >
        <rect width="640" height="152" fill="var(--run-sky)" />
        <path
          d="M42 35h16v-8h32v8h16v12H42zM410 22h14v-8h30v8h16v12h-60z"
          fill="var(--run-cloud)"
        />
        <path
          d="M0 122V98h22V82h20V66h24V82h20v16h22v24M356 122V98h22V82h20V66h24V82h20v16h22v24"
          fill="var(--run-hill)"
        />
        <path
          d="M64 122v-18h20V88h24V72h24v16h22v16h24v18M470 122v-18h20V88h24V72h24v16h22v16h24v18"
          fill="var(--run-hill-light)"
        />
        {[264, 288, 312].map((x) => (
          <g key={x}>
            <rect
              x={x}
              y="14"
              width="23"
              height="22"
              fill="var(--run-brick)"
              stroke="var(--run-ink)"
              strokeWidth="2"
            />
            <path
              d={`M${x + 2} 24h19m-10-8v8m-5 0v10`}
              stroke="var(--run-ink)"
              opacity=".35"
            />
          </g>
        ))}
        {COINS.map(
          (x) =>
            !collected.includes(x) && (
              <g key={x}>
                <path
                  d={`M${x - 5} 60h10v3h3v12h-3v3h-10v-3h-3V63h3z`}
                  fill="var(--run-coin)"
                />
                <path
                  d={`M${x} 64v10`}
                  stroke="var(--run-brick)"
                  strokeWidth="3"
                />
              </g>
            ),
        )}
        <path
          d="M582 99h36v25h-36zM577 88h46v13h-46z"
          fill="var(--run-pipe)"
          stroke="var(--run-ink)"
          strokeWidth="3"
        />
        <path
          d="M588 103v19m-5-30v6"
          stroke="var(--run-pipe-light)"
          strokeWidth="5"
        />
        <rect y="124" width="640" height="28" fill="var(--run-dirt)" />
        <path d="M0 124h640" stroke="var(--run-grass)" strokeWidth="6" />
        {Array.from({ length: 32 }, (_, i) => (
          <path
            key={i}
            d={`M${i * 20} 138h20m-10 0v14m-10-24v10`}
            stroke="var(--run-ink)"
            strokeWidth="2"
            opacity=".3"
          />
        ))}
        <g ref={actor} transform="translate(24 122)">
          <path d="M-8-26h14v4h5v4H-10v-4h2z" fill="var(--run-red)" />
          <path d="M-7-18H6v10H-7zM6-16h5v5H6z" fill="var(--run-skin)" />
          <path d="M2-17h3v4H2z" fill="var(--run-ink)" />
          <path d="M-8-8H7v5H-8z" fill="var(--run-red)" />
          <path
            d="M-5-9h8v8h-8zM-8-3h6v3h-6zM3-3h7v3H3z"
            fill="var(--run-overalls)"
          />
        </g>
      </svg>
      <div className={styles.controls}>
        <span className={styles.score} role="status">
          {finished
            ? collected.length === 3
              ? "ALL THREE!"
              : `${collected.length}/3. ONE MORE GO?`
            : `COINS ${collected.length}/3`}
          {best === 3 && !finished ? " ★" : ""}
        </span>
        <span className={styles.hint}>Focus here + Space</span>
        <button type="button" onClick={jump} className={styles.jump}>
          {finished ? "AGAIN" : "JUMP"}
          <span aria-hidden="true"> ↑</span>
        </button>
      </div>
    </div>
  );
}
