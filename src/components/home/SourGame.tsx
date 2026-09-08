"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  HOLD_MS,
  INITIAL_SOUR,
  STAGES,
  sourReducer,
  type Stage,
} from "@/lib/sour/game";
import styles from "./sour.module.css";

const COPY: Record<Stage, { title: string; hint: string; action: string }> = {
  rye: {
    title: "Start with 2 oz of rye.",
    hint: "Hold to pour. I’ll help with the measuring.",
    action: "Hold to pour rye",
  },
  lemon: {
    title: "Now 1 oz of fresh lemon.",
    hint: "Freshly squeezed. A little sunshine in the tin.",
    action: "Hold to pour lemon",
  },
  syrup: {
    title: "½ oz of turbinado syrup.",
    hint: "Just enough sweetness.",
    action: "Hold to pour syrup",
  },
  egg: {
    title: "One fresh egg white.",
    hint: "Tap to crack the egg, then drop in the white.",
    action: "Crack the egg",
  },
  dry: {
    title: "First, shake without ice.",
    hint: "Swipe the tin back and forth, or tap Shake.",
    action: "Shake",
  },
  ice: {
    title: "Time for ice.",
    hint: "Three cubes. Plink, plink, plink.",
    action: "Drop an ice cube",
  },
  wet: {
    title: "Give it another good shake.",
    hint: "Swipe the tin or tap Shake. Get it nice and cold.",
    action: "Shake",
  },
  strain: {
    title: "Into the coupe.",
    hint: "Hold to pour through both strainers.",
    action: "Hold to double strain",
  },
  bitters: {
    title: "The finishing touch.",
    hint: "Three little sprays of Angostura over the foam.",
    action: "Spray the bitters",
  },
  done: {
    title: "One whiskey sour. Made by you.",
    hint: "Good foam. Cold glass. Excellent company.",
    action: "Make another",
  },
};

function BarScene({
  stage,
  progress,
  holding,
}: {
  stage: Stage;
  progress: number;
  holding: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const index = STAGES.indexOf(stage);
  const shaking = stage === "dry" || stage === "wet";
  const pours = index < 3;
  const poured = index >= 8;
  const glassFill = poured ? 1 : stage === "strain" ? progress : 0;
  const liquid = ["#c88a45", "#e6ca76", "#a97737"][index] ?? "#e7cf8a";
  const shakeAngle =
    shaking && progress > 0
      ? Math.round(progress * (stage === "dry" ? 6 : 8)) % 2
        ? -13
        : 13
      : 0;
  const iceCount =
    index > 5 ? 3 : stage === "ice" ? Math.round(progress * 3) : 0;
  return (
    <svg
      className={styles.bar}
      viewBox="0 0 360 206"
      role="img"
      aria-label={
        stage === "done"
          ? "A finished golden whiskey sour with egg-white foam and bitters in a coupe"
          : "A tiny pixel cocktail bar with a shaker, coupe, bottles and fresh ingredients"
      }
    >
      <defs>
        <linearGradient id={`${id}steel`}>
          <stop stopColor="#718487" />
          <stop offset=".35" stopColor="#d8ddd1" />
          <stop offset=".6" stopColor="#a7b7b3" />
          <stop offset="1" stopColor="#4d656c" />
        </linearGradient>
        <clipPath id={`${id}bowl`}>
          <path d="M264 132H326L321 150L312 160H278L269 150Z" />
        </clipPath>
      </defs>
      <path fill="#152931" d="M0 0H360V206H0Z" />
      <path fill="#233d40" d="M12 12H348V112H12Z" />
      <path fill="#11232c" d="M17 17H343V108H17Z" />
      {[30, 59, 88, 241, 274, 306].map((x, i) => (
        <g key={x} opacity=".7">
          <path
            fill={["#58715a", "#826348", "#485e65"][i % 3]}
            d={`M${x} 46h6v12h6v34h-18V58h6Z`}
          />
          <path fill="#c0a672" d={`M${x - 5} 69h16v11h-16Z`} />
          <path fill="#233437" d={`M${x} 43h6v5h-6Z`} />
        </g>
      ))}
      <path fill="#7a6248" d="M15 92H345V98H15Z" />
      <path fill="#b79763" d="M131 29H223V64H131Z" />
      <path fill="#253b3d" d="M134 32H220V61H134Z" />
      <text
        x="177"
        y="45"
        textAnchor="middle"
        fill="#e0c994"
        fontSize="8"
        fontFamily="monospace"
      >
        TANMAY’S
      </text>
      <text
        x="177"
        y="56"
        textAnchor="middle"
        fill="#d2b37c"
        fontSize="7"
        fontFamily="monospace"
      >
        ONE-DRINK BAR
      </text>
      <path fill="#5c483b" d="M0 174H360V206H0Z" />
      <path fill="#ae8757" d="M0 173H360V179H0Z" />
      <path
        stroke="#352e2c"
        strokeWidth="2"
        d="M0 192H145M185 186H360M20 201H320"
      />
      <ellipse cx="174" cy="181" rx="45" ry="5" fill="#17272b" opacity=".7" />
      <g
        className={styles.bottle}
        style={
          {
            transform:
              pours && holding
                ? "translate(30px,-15px) rotate(40deg)"
                : undefined,
          } as CSSProperties
        }
      >
        <path
          fill={pours ? liquid : "#827247"}
          d="M65 92H78V114H89V172H54V114H65Z"
        />
        <path fill="#e4d2a3" d="M58 137H85V159H58Z" />
        <path fill="#f5dfac" opacity=".4" d="M58 118H62V133H58Z" />
        <path fill="#172831" d="M64 88H79V96H64Z" />
        <text
          x="71"
          y="147"
          textAnchor="middle"
          fill="#3e4140"
          fontSize="7"
          fontFamily="monospace"
        >
          {stage === "lemon" ? "LEMON" : stage === "syrup" ? "SYRUP" : "RYE"}
        </text>
        <text
          x="71"
          y="155"
          textAnchor="middle"
          fill="#695e49"
          fontSize="5"
          fontFamily="monospace"
        >
          {stage === "lemon" ? "1 oz" : stage === "syrup" ? "½ oz" : "2 oz"}
        </text>
      </g>
      {pours && holding && (
        <path
          className={styles.pour}
          d="M121 101L165 123"
          stroke={liquid}
          strokeWidth="3"
          strokeDasharray="7 3"
        />
      )}
      <g
        className={styles.tin}
        style={
          {
            transform:
              stage === "strain"
                ? "translate(55px,-30px) rotate(38deg)"
                : `rotate(${shakeAngle}deg)`,
          } as CSSProperties
        }
      >
        <path
          fill={`url(#${id}steel)`}
          stroke="#203a42"
          strokeWidth="2"
          d="M147 116H197L190 175H154Z"
        />
        <path fill="#eff0d7" opacity=".7" d="M154 121H157L162 170H159Z" />
        <path fill="#475f62" d="M164 126H183V163H164Z" />
        <path
          fill="#e3c383"
          d={`M166 ${161 - (index < 3 ? (index + progress) / 4 : 1) * 30}H181V161H166Z`}
        />
        {index >= 4 && (
          <rect
            fill="#f4efdc"
            x="166"
            y={138 - (index === 4 ? progress : 1) * 7}
            width="15"
            height={(index === 4 ? progress : 1) * 7}
          />
        )}
        {shaking && (
          <g>
            <path fill="#859998" d="M146 113H198V118H146Z" />
            <path fill="#c3cec4" d="M151 105H193V113H151Z" />
            <path fill="#849b9a" d="M160 94H184V105H160Z" />
          </g>
        )}
        {stage === "ice" &&
          Array.from({ length: iceCount }, (_, i) => (
            <rect
              className={styles.ice}
              key={i}
              x={154 + i * 11}
              y={119 + i * 5}
              width="9"
              height="10"
              fill="#b6dadd"
              stroke="#eff7e6"
            />
          ))}
      </g>
      {stage === "egg" && (
        <g className={styles.egg} key={progress}>
          <path
            fill="#f1dec0"
            d="M160 80H180V86H186V102H180V108H160V102H154V86H160Z"
          />
          <path
            fill="none"
            stroke="#987a5e"
            strokeWidth="2"
            d={progress > 0 ? "M156 94l8 -3 7 6 6 -6 8 3" : "M159 87h5"}
          />
          {progress > 0 && (
            <path stroke="#eeeace" strokeWidth="3" d="M171 106v14" />
          )}
        </g>
      )}
      {stage === "ice" && (
        <g fill="#bdd9d5" stroke="#e2ebe0">
          <rect x="111" y="149" width="12" height="13" />
          <rect x="99" y="160" width="13" height="12" />
        </g>
      )}
      <path
        fill="#719498"
        opacity=".7"
        d="M260 129H330L324 152L313 164H299V182H315V187H275V182H291V164H277L266 152Z"
      />
      <g clipPath={`url(#${id}bowl)`}>
        <rect
          x="264"
          y={164 - glassFill * 32}
          width="64"
          height={glassFill * 32}
          fill="#dfbd6e"
        />
        {glassFill > 0 && (
          <rect
            x="264"
            y={164 - glassFill * 32}
            width="64"
            height="7"
            fill="#f4ebcb"
          />
        )}
        {stage === "bitters" &&
          Array.from({ length: Math.round(progress * 3) }, (_, i) => (
            <circle
              key={i}
              cx={281 + i * 13}
              cy={135 + (i % 2) * 2}
              r="2"
              fill="#a65439"
            />
          ))}
        {stage === "done" && (
          <path fill="#9c513b" d="M279 133h4v3h-4Zm13 2h4v3h-4Zm13-2h4v3h-4Z" />
        )}
      </g>
      <path fill="#d4e4d9" d="M260 129H330V132H260Z" />
      <path fill="#d5e5dc" opacity=".6" d="M270 138h3l6 17h-3Z" />
      {stage === "strain" && (
        <g>
          <path d="M244 110h48l-8 11h-32Z" fill="#a3b3a5" />
          <path d="M254 123h47l-13 7h-21Z" fill="#c4c5b1" />
          {holding && (
            <path
              className={styles.pour}
              d="M248 104l29 12 8 14"
              stroke="#e5cc8c"
              strokeWidth="3"
              strokeDasharray="6 2"
              fill="none"
            />
          )}
        </g>
      )}
      {stage === "bitters" && (
        <g>
          <path fill="#965b3b" d="M233 147H250V175H233Z" />
          <path fill="#d3c29d" d="M231 139H249V147H231Z" />
          <path fill="#263d41" d="M235 133H254V139H235Z" />
          <path fill="#e9d5a4" d="M235 155H248V168H235Z" />
          {progress > 0 && (
            <g className={styles.spray} key={progress} fill="#c5a273">
              <rect x="268" y="122" width="2" height="2" />
              <rect x="277" y="128" width="2" height="2" />
              <rect x="287" y="120" width="2" height="2" />
            </g>
          )}
        </g>
      )}
      {stage === "done" && (
        <g className={styles.cheers} fill="#ead59d">
          <path d="M256 106h3v-4h3v4h3v3h-3v4h-3v-4h-3Z" />
          <path d="M326 116h3v-4h3v4h3v3h-3v4h-3v-4h-3Z" />
        </g>
      )}
    </svg>
  );
}

export default function SourGame({ onServe }: { onServe?: () => void }) {
  const [state, dispatch] = useReducer(sourReducer, INITIAL_SOUR);
  const held = useRef(false);
  const actionButton = useRef<HTMLButtonElement>(null);
  const previousStage = useRef(state.stage);
  const swipe = useRef<{ x: number; direction: number } | null>(null);
  const serve = useRef(onServe);
  serve.current = onServe;
  const copy = COPY[state.stage];
  const canHold = !!HOLD_MS[state.stage];
  const shaking = state.stage === "dry" || state.stage === "wet";
  useEffect(() => {
    if (previousStage.current !== state.stage)
      actionButton.current?.focus({ preventScroll: true });
    previousStage.current = state.stage;
    if (state.stage === "done") serve.current?.();
  }, [state.stage]);
  useEffect(() => {
    if (!state.holding) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      if (last && now - last >= 30) {
        dispatch({ type: "tick", ms: now - last });
        last = now;
      }
      if (!last) last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.holding]);
  useEffect(() => {
    const release = () => {
      held.current = false;
      swipe.current = null;
      dispatch({ type: "release" });
    };
    const visibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const stop = () => {
    dispatch({ type: "release" });
  };
  const start = () => {
    held.current = true;
    dispatch({ type: "hold" });
  };
  const stroke = (event: PointerEvent<HTMLDivElement>) => {
    if (!shaking || !swipe.current) return;
    const delta = event.clientX - swipe.current.x;
    if (Math.abs(delta) < 24) return;
    const direction = Math.sign(delta);
    if (direction !== swipe.current.direction) dispatch({ type: "tap" });
    swipe.current = { x: event.clientX, direction };
  };
  return (
    <section className={styles.game} aria-label="Make Tanmay’s whiskey sour">
      <div className={styles.gameTitle}>
        <span>One-drink bar</span>
        <small>
          {state.stage === "done"
            ? "On the house."
            : `${STAGES.indexOf(state.stage) + 1} / 9`}
        </small>
      </div>
      <div
        className={styles.stage}
        data-shaking={shaking}
        onPointerDown={(e) => {
          if (shaking) {
            e.currentTarget.setPointerCapture(e.pointerId);
            swipe.current = { x: e.clientX, direction: 0 };
          }
        }}
        onPointerMove={stroke}
        onPointerUp={() => {
          swipe.current = null;
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <BarScene {...state} />
        {shaking && (
          <span className={styles.swipeHint} aria-hidden="true">
            ← shake the tin →
          </span>
        )}
      </div>
      <div
        className={styles.instructions}
        aria-live="polite"
        aria-atomic="true"
      >
        <h3>{copy.title}</h3>
        <p>{copy.hint}</p>
      </div>
      {state.stage !== "done" && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Current step progress"
          aria-valuenow={Math.round(state.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ transform: `scaleX(${state.progress})` }} />
        </div>
      )}
      <button
        className={styles.action}
        ref={actionButton}
        data-active={state.holding}
        onPointerDown={(e) => {
          if (canHold) {
            e.currentTarget.setPointerCapture(e.pointerId);
            start();
          }
        }}
        onPointerUp={stop}
        onPointerCancel={() => {
          held.current = false;
          stop();
        }}
        onLostPointerCapture={stop}
        onKeyDown={(e) => {
          if (canHold && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            if (!e.repeat) start();
          }
        }}
        onKeyUp={(e) => {
          if (held.current && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            stop();
            held.current = false;
          }
        }}
        onClick={() => {
          if (held.current) {
            held.current = false;
            return;
          }
          dispatch({ type: state.stage === "done" ? "reset" : "tap" });
        }}
      >
        {state.stage === "egg" && state.progress > 0
          ? "Drop in the egg white"
          : copy.action}
        <span aria-hidden="true">
          {state.stage === "done" ? "↶" : shaking ? "↔" : "+"}
        </span>
      </button>
      {canHold && (
        <button
          className={styles.tapAlternative}
          onClick={() => dispatch({ type: "tap" })}
        >
          Or tap to {state.stage === "strain" ? "strain" : "pour"} a little
        </button>
      )}
      <details className={styles.recipe}>
        <summary>The actual recipe & timings</summary>
        <p>The game is quick. The real drink takes a little patience.</p>
        <ul>
          <li>2 oz rye</li>
          <li>1 oz fresh lemon juice (or ½ oz bottled)</li>
          <li>½ oz turbinado syrup</li>
          <li>1 fresh egg white, not carton</li>
        </ul>
        <ol>
          <li>Dry shake vigorously for 30 seconds, without ice.</li>
          <li>Add ice. Shake for another 30–45 seconds.</li>
          <li>Fine strain through a second strainer into a coupe.</li>
          <li>Spray with Angostura bitters.</li>
        </ol>
      </details>
    </section>
  );
}
