"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PixelPlayground.module.css";
type Action = "left" | "right" | "jump" | "down" | "run" | "fire";
const STAGES = Array.from(
  { length: 32 },
  (_, i) => `${Math.floor(i / 4) + 1}-${(i % 4) + 1}`,
);
const keys: Record<string, Action> = {
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
  ArrowUp: "jump",
  w: "jump",
  " ": "jump",
  z: "jump",
  ArrowDown: "down",
  s: "down",
  Shift: "run",
  x: "fire",
  k: "fire",
};
export default function PixelPlayground({ onExit, embedded = false }: { onExit?: () => void; embedded?: boolean }) {
  const region = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLIFrameElement>(null),
    desired = useRef("playing");
  const [loaded, setLoaded] = useState(false),
    [state, setState] = useState<
      "title" | "loading" | "playing" | "paused" | "error"
    >("title");
  const [expanded, setExpanded] = useState(false),
    [sound, setSound] = useState(false),
    [stage, setStage] = useState("1-1"),
    [power, setPower] = useState(1);
  const [lastStage, setLastStage] = useState("1-1");
  const send = useCallback(
    (type: string, data: Record<string, unknown> = {}) =>
      frame.current?.contentWindow?.postMessage(
        { source: "tanmay-home", type, ...data },
        location.origin,
      ),
    [],
  );
  const pause = useCallback(() => {
    desired.current = "paused";
    send("pause");
  }, [send]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mario-last-stage");
      if (saved && STAGES.includes(saved)) setLastStage(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.source !== "tanmay-mario"
      )
        return;
      const data = event.data;
      if (data.type === "ready") {
        setState("playing");
        if (desired.current === "paused") send("pause");
      } else if (data.type === "paused") setState("paused");
      else if (data.type === "playing") setState("playing");
      else if (data.type === "error") setState("error");
      else if (data.type === "exit") { setExpanded(false); onExit?.(); }
      else if (data.type === "status") {
        setPower(data.power);
        if (STAGES.includes(data.world)) {
          setStage(data.world);
          setLastStage(data.world);
          try {
            localStorage.setItem("mario-last-stage", data.world);
          } catch {}
        }
      }
    };
    window.addEventListener("message", receive);
    const visibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) pause();
    });
    if (region.current) observer.observe(region.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("message", receive);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pause, send, onExit]);
  useEffect(() => {
    if (!expanded) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    region.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = old;
    };
  }, [expanded]);
  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(
      () => setState((current) => (current === "loading" ? "error" : current)),
      20000,
    );
    return () => clearTimeout(timer);
  }, [state]);
  function play() {
    desired.current = "playing";
    if (!loaded) {
      setLoaded(true);
      setState("loading");
    } else send("resume");
    region.current?.focus({ preventScroll: true });
    if (!expanded)
      region.current?.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  function key(event: React.KeyboardEvent, pressed: boolean) {
    if (pressed && event.key === "Escape") {
      event.preventDefault();
      setExpanded(false);
      pause();
      return;
    }
    if (
      event.target instanceof HTMLButtonElement ||
      event.target instanceof HTMLSelectElement
    )
      return;
    const action =
      keys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (action) {
      event.preventDefault();
      send("input", { action, pressed });
    }
    if (pressed && !event.repeat && event.key === "p") {
      event.preventDefault();
      if (state === "paused") play();
      else pause();
    }
  }
  function touch(label: string, action: Action) {
    return (
      <button
        type="button"
        aria-label={label}
        disabled={state !== "playing" || (action === "fire" && power !== 3)}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          send("input", { action, pressed: true });
        }}
        onPointerUp={() => send("input", { action, pressed: false })}
        onPointerCancel={() => send("input", { action, pressed: false })}
        onLostPointerCapture={() => send("input", { action, pressed: false })}
      >
        {label}
      </button>
    );
  }
  return (
    <div
      ref={region}
      className={`${styles.playground} ${expanded ? styles.expanded : ""} ${embedded ? styles.embedded : ""}`}
      role="region"
      aria-label="Super Mario Bros game"
      tabIndex={0}
      onKeyDown={(e) => key(e, true)}
      onKeyUp={(e) => key(e, false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          send("release");
          pause();
        }
      }}
    >
      <div className={styles.top}>
        <span>SUPER MARIO BROS.</span>
        <span>WORLD {stage}</span>
      </div>
      <div className={styles.screen}>
        {loaded && (
          <iframe
            ref={frame}
            src="/mario/index.html"
            title="Super Mario Bros playable game"
            className={styles.frame}
            allow="autoplay"
          />
        )}
        {state !== "playing" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <span className={styles.eyebrow}>THE ORIGINAL 32 COURSES</span>
              <h3>
                {state === "paused"
                  ? "Take a breather."
                  : state === "loading"
                    ? "Warming up the pipes…"
                    : state === "error"
                      ? "One second."
                      : "Just one level."}
              </h3>
              <p>
                {state === "loading"
                  ? "Loading the game."
                  : state === "error"
                    ? "The game couldn’t load. Give it another try."
                    : state === "paused"
                      ? "Right where you left it."
                      : "Famous last words."}
              </p>
              {state !== "loading" && (
                <button
                  className={styles.start}
                  type="button"
                  onClick={() => {
                    if (state === "error") {
                      setLoaded(false);
                      setState("title");
                    } else play();
                  }}
                >
                  {state === "paused"
                    ? "RESUME"
                    : state === "error"
                      ? "RETRY"
                      : "LET’S PLAY →"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <span>
          ← → move · SPACE jump / swim
          <br />
          SHIFT run · X fire · ↓ pipe · P pause
        </span>
        <div>
          <button
            type="button"
            disabled={!loaded || state === "loading" || state === "error"}
            onClick={() => {
              if (state === "paused") play();
              else pause();
            }}
          >
            {state === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            aria-pressed={sound}
            disabled={!loaded || state === "loading" || state === "error"}
            onClick={() => {
              setSound(!sound);
              send("sound", { enabled: !sound });
              region.current?.focus({ preventScroll: true });
            }}
          >
            Sound {sound ? "on" : "off"}
          </button>
          {!embedded && <button type="button" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Back to page" : "Fit screen"}
          </button>}
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
          {touch("FIRE", "fire")}
          {touch("JUMP", "jump")}
        </div>
      </div>
      {loaded && state !== "loading" && (
        <div className={styles.course}>
          <label>
            Course{" "}
            <select
              aria-label="Choose course"
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                desired.current = "playing";
                send("stage", { stage: e.target.value });
                region.current?.focus({ preventScroll: true });
              }}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <span>
            {power === 3
              ? "Flower ready. X / FIRE to shoot."
              : "Find a fire flower to use X / FIRE."}
          </span>
        </div>
      )}
      {!loaded && lastStage !== "1-1" && (
        <p className={styles.note}>
          Last visit: world {lastStage}. You can choose a course after starting.
        </p>
      )}
      <p className={styles.note}>
        Game:{" "}
        <a
          href="https://github.com/dapperAuteur/FullScreenMario"
          target="_blank"
          rel="noreferrer"
        >
          FullScreenMario
        </a>{" "}
        by Josh Goldberg & contributors.{" "}
        <a href="/mario/CREDITS.md" target="_blank" rel="noreferrer">
          Credits & license
        </a>
        . Mario belongs to Nintendo.
      </p>
    </div>
  );
}
