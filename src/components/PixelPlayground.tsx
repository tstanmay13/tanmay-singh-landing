"use client";

import { useEffect, useRef, useState } from "react";
import {
  Game,
  emptyInput,
  worldNames,
  WIDTH,
  HEIGHT,
  type Input,
} from "@/lib/platformer/engine";
import { draw } from "@/lib/platformer/render";
import styles from "./PixelPlayground.module.css";
const SAVE = "homepage-platformer-v1";
export default function PixelPlayground() {
  const canvas = useRef<HTMLCanvasElement>(null),
    region = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null),
    input = useRef(emptyInput()),
    audio = useRef<AudioContext | null>(null),
    soundOn = useRef(false);
  const [hud, setHud] = useState({
    state: "title",
    level: 0,
    score: 0,
    coins: 0,
    lives: 3,
    time: 300,
    message: "",
  });
  const [unlocked, setUnlocked] = useState(0),
    [selected, setSelected] = useState(0),
    [sound, setSound] = useState(false);
  useEffect(() => {
    const g = new Game();
    game.current = g;
    let saved = 0;
    try {
      saved = Math.max(
        0,
        Math.min(31, Number(localStorage.getItem(SAVE)) || 0),
      );
      setUnlocked(saved);
    } catch {}
    g.sound = (kind) => {
      const a = audio.current;
      if (!a || !soundOn.current) return;
      const o = a.createOscillator(),
        v = a.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(
        kind === "coin"
          ? 880
          : kind === "jump"
            ? 220
            : kind === "power"
              ? 440
              : 130,
        a.currentTime,
      );
      o.frequency.exponentialRampToValueAtTime(
        kind === "hurt" ? 45 : 660,
        a.currentTime + 0.12,
      );
      v.gain.setValueAtTime(0.035, a.currentTime);
      v.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.16);
      o.connect(v);
      v.connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.17);
    };
    let frame = 0,
      previous = 0,
      accumulator = 0,
      lastHud = "",
      lastDrawState = "";
    const pause = () => {
      input.current = emptyInput();
      if (g.state === "playing") g.state = "paused";
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) pause();
    });
    if (region.current) observer.observe(region.current);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    const tick = (now: number) => {
      accumulator += previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      while (accumulator >= 1 / 60) {
        g.tick(1 / 60, input.current);
        accumulator -= 1 / 60;
      }
      const ctx = canvas.current?.getContext("2d");
      if (ctx && (g.state === "playing" || lastDrawState !== g.state))
        draw(ctx, g);
      lastDrawState = g.state;
      const next = {
        state: g.state,
        level: g.levelIndex,
        score: g.score,
        coins: g.coins,
        lives: g.lives,
        time: Math.ceil(g.time),
        message: g.message,
      };
      const signature = JSON.stringify(next);
      if (signature !== lastHud) {
        setHud(next);
        lastHud = signature;
      }
      if (
        g.state === "clear" &&
        g.levelIndex < 31 &&
        g.levelIndex + 1 > saved
      ) {
        saved = g.levelIndex + 1;
        setUnlocked(saved);
        try {
          localStorage.setItem(SAVE, String(saved));
        } catch {}
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
      void audio.current?.close();
    };
  }, []);
  function act() {
    const g = game.current;
    if (!g) return;
    input.current = emptyInput();
    if (g.state === "paused") g.state = "playing";
    else if (g.state === "clear") g.advance();
    else if (g.state === "dead") g.load(g.levelIndex, true);
    else g.start(selected);
    region.current?.focus({ preventScroll: true });
  }
  function key(event: React.KeyboardEvent, pressed: boolean) {
    if (
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLButtonElement
    )
      return;
    const map: Record<string, keyof Input> = {
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
      ArrowUp: "jump",
      w: "jump",
      " ": "jump",
      z: "jump",
      Shift: "run",
      x: "run",
      ArrowDown: "down",
      s: "down",
    };
    const action = map[event.key];
    if (action) {
      event.preventDefault();
      input.current[action] = pressed;
    }
    if (
      pressed &&
      !event.repeat &&
      (event.key === "Escape" || event.key === "p")
    ) {
      event.preventDefault();
      const g = game.current;
      if (g) {
        if (g.state === "playing") {
          g.state = "paused";
          input.current = emptyInput();
        } else if (g.state === "paused") act();
      }
    }
    if (pressed && event.key === "Enter" && game.current?.state !== "playing")
      act();
  }
  const touch = (label: string, action: keyof Input) => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        input.current[action] = true;
      }}
      onPointerUp={() => {
        input.current[action] = false;
      }}
      onPointerCancel={() => {
        input.current[action] = false;
      }}
      onLostPointerCapture={() => {
        input.current[action] = false;
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      ref={region}
      className={styles.playground}
      role="region"
      aria-label="Super Tanmay Bros game"
      tabIndex={0}
      onKeyDown={(e) => key(e, true)}
      onKeyUp={(e) => key(e, false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          input.current = emptyInput();
          if (game.current?.state === "playing") game.current.state = "paused";
        }
      }}
    >
      <div className={styles.top}>
        <span>SUPER TANMAY BROS.</span>
        <span>
          WORLD {Math.floor(hud.level / 4) + 1}-{(hud.level % 4) + 1}
        </span>
      </div>
      <div className={styles.screen}>
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Side-scrolling platform game. Arrow keys move, Space jumps, Shift runs. Press P to pause."
        />
        <div className={styles.hud} aria-hidden="true">
          <span>
            SCORE
            <br />
            {String(hud.score).padStart(6, "0")}
          </span>
          <span>
            COINS
            <br />
            {String(hud.coins).padStart(2, "0")}
          </span>
          <span>
            LIVES
            <br />
            {hud.lives}
          </span>
          <span>
            TIME
            <br />
            {hud.time}
          </span>
        </div>
        {hud.state !== "playing" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <span className={styles.eyebrow}>
                8 WORLDS · 32 STAGES · ONE DISTRACTION
              </span>
              <h3>
                {hud.state === "title"
                  ? "Just one level."
                  : hud.state === "paused"
                    ? "Take a breather."
                    : hud.state === "dead"
                      ? "That gap was personal."
                      : hud.state === "over"
                        ? "Okay. One more try."
                        : hud.state === "won"
                          ? "You actually did it."
                          : "Flag secured."}
              </h3>
              <p>
                {hud.state === "title"
                  ? "I like Mario. This got a little out of hand."
                  : hud.state === "won"
                    ? "All 32 stages. You deserve a very long walk outside."
                    : hud.state === "clear"
                      ? worldNames[Math.floor(hud.level / 4)] + " — cleared."
                      : hud.state === "dead"
                        ? "Your checkpoint is waiting."
                        : "Your next good jump is right there."}
              </p>
              {(hud.state === "title" ||
                hud.state === "over" ||
                hud.state === "won") &&
                unlocked > 0 && (
                  <label className={styles.select}>
                    Start at{" "}
                    <select
                      value={selected}
                      onChange={(e) => setSelected(Number(e.target.value))}
                    >
                      {Array.from({ length: unlocked + 1 }, (_, i) => (
                        <option key={i} value={i}>
                          World {Math.floor(i / 4) + 1}-{(i % 4) + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              <button type="button" className={styles.start} onClick={act}>
                {hud.state === "paused"
                  ? "RESUME"
                  : hud.state === "clear"
                    ? "ONWARD →"
                    : hud.state === "dead"
                      ? "TRY AGAIN"
                      : "LET’S PLAY →"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <span>← → move · SPACE jump · SHIFT run / fire · P pause</span>
        <div>
          <button
            type="button"
            onClick={() => {
              const g = game.current;
              if (g?.state === "playing") {
                g.state = "paused";
                input.current = emptyInput();
              } else if (g?.state === "paused") act();
            }}
            disabled={hud.state !== "playing" && hud.state !== "paused"}
          >
            {hud.state === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            aria-pressed={sound}
            onClick={() => {
              const next = !sound;
              setSound(next);
              soundOn.current = next;
              if (next) {
                audio.current ??= new AudioContext();
                void audio.current.resume();
              }
            }}
          >
            Sound {sound ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void region.current?.requestFullscreen?.().catch(() => {});
            }}
          >
            Expand
          </button>
        </div>
      </div>
      <div className={styles.touch}>
        <div>
          {touch("←", "left")}
          {touch("→", "right")}
          {touch("↓", "down")}
        </div>
        <div>
          {touch("RUN", "run")}
          {touch("JUMP", "jump")}
        </div>
      </div>
      <p className={styles.note} role="status">
        {hud.message ||
          "An original, homemade tribute. Hit ? blocks from below. Find a mushroom. Watch your step."}
      </p>
    </div>
  );
}
