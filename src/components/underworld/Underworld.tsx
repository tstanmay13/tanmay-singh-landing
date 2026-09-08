"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  biome,
  bossName,
  buy,
  chooseBoon,
  createRun,
  EMPTY_META,
  GODS,
  HEIGHT,
  idleInput,
  leaveShop,
  purchaseUpgrade,
  readMeta,
  settleRun,
  takeDoor,
  tick,
  upgradeCost,
  WIDTH,
  type God,
  type Input,
  type Meta,
  type Reward,
  type Run,
  type Weapon,
} from "@/lib/underworld/engine";
import { createRenderer } from "@/lib/underworld/render";
import styles from "./underworld.module.css";
const SAVE_KEY = "tanmay-underworld-v1";
const rewards: Record<
  Reward,
  { name: string; glyph: string; description: string }
> = {
  boon: {
    name: "Olympian boon",
    glyph: "✦",
    description: "Choose a blessing from the gods",
  },
  heart: {
    name: "Centaur heart",
    glyph: "♥",
    description: "+25 maximum life and restore 40 life",
  },
  gold: {
    name: "Obols",
    glyph: "◉",
    description: "75 coins for the next shop",
  },
  darkness: {
    name: "Darkness",
    glyph: "◆",
    description: "40 darkness for permanent upgrades",
  },
  hammer: {
    name: "Daedalus hammer",
    glyph: "⚒",
    description: "+30% weapon damage; bow upgrades pierce",
  },
};
const weapons: {
  id: Weapon;
  name: string;
  glyph: string;
  description: string;
}[] = [
  {
    id: "sword",
    name: "Stygian blade",
    glyph: "⚔",
    description: "Quick slashes · circular special",
  },
  {
    id: "spear",
    name: "Eternal spear",
    glyph: "♆",
    description: "Long thrusts · piercing throw",
  },
  {
    id: "bow",
    name: "Heart-seeking bow",
    glyph: "➶",
    description: "Ranged shots · spreading volley",
  },
];
function view(run: Run) {
  return {
    phase: run.phase,
    hp: Math.ceil(run.player.hp),
    maxHp: run.player.maxHp,
    charges: run.player.charges,
    defiance: run.player.defiance,
    room: run.room,
    gold: run.gold,
    darkness: run.darkness,
    kills: run.kills,
    time: run.time,
    boons: { ...run.boons },
    offers: [...run.offers],
    doors: [...run.doors],
    hammer: run.hammer,
    castReady: run.player.castCd <= 0,
    shopBought: [...run.shopBought],
  };
}
type View = ReturnType<typeof view>;
export default function Underworld() {
  const [meta, setMeta] = useState<Meta>({ ...EMPTY_META });
  const [loaded, setLoaded] = useState(false);
  const [storage, setStorage] = useState(true);
  const [weapon, setWeapon] = useState<Weapon>("sword");
  const [keepsake, setKeepsake] = useState<"rose" | "coin" | "tooth">("rose");
  const [heat, setHeat] = useState(0);
  const [daily, setDaily] = useState(false);
  const [hud, setHud] = useState<View | null>(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [music, setMusic] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const run = useRef<Run | null>(null);
  const input = useRef<Input>(idleInput());
  const keys = useRef(new Set<string>());
  const mouseHeld = useRef({ attack: false, special: false });
  const settled = useRef<Run | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundOn = useRef(false);
  const lastSound = useRef(0);
  const draw = useRef<ReturnType<typeof createRenderer> | null>(null);
  useEffect(() => {
    try {
      setMeta(readMeta(localStorage.getItem(SAVE_KEY)));
    } catch {
      setStorage(false);
    }
    setLoaded(true);
    return () => {
      void audio.current?.close();
    };
  }, []);
  const save = useCallback((next: Meta) => {
    setMeta(next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      setStorage(false);
    }
  }, []);
  const refresh = useCallback(() => {
    if (run.current) setHud(view(run.current));
  }, []);
  const release = useCallback(() => {
    keys.current.clear();
    mouseHeld.current = { attack: false, special: false };
    input.current = idleInput();
  }, []);
  const phase = hud?.phase;
  const playing = hud !== null;
  useEffect(() => {
    const r = run.current;
    if (!r || !canvas.current) return;
    draw.current = createRenderer(canvas.current);
    draw.current(r, matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [playing]);
  useEffect(() => {
    const r = run.current;
    if (!r || !canvas.current || paused || phase !== "combat") return;
    let frame = 0,
      last = performance.now(),
      lastHud = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const k = keys.current;
      input.current.x =
        (k.has("d") || k.has("arrowright") ? 1 : 0) -
        (k.has("a") || k.has("arrowleft") ? 1 : 0);
      input.current.y =
        (k.has("s") || k.has("arrowdown") ? 1 : 0) -
        (k.has("w") || k.has("arrowup") ? 1 : 0);
      input.current.attack =
        input.current.attack || k.has("j") || mouseHeld.current.attack;
      input.current.special =
        input.current.special || k.has("k") || mouseHeld.current.special;
      input.current.cast = input.current.cast || k.has("q") || k.has("l");
      tick(r, input.current, dt);
      draw.current?.(r, reduced);
      if (
        soundOn.current &&
        r.events.length &&
        now - lastSound.current > 65 &&
        audio.current
      ) {
        lastSound.current = now;
        const ctx = audio.current;
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        const event = r.events.includes("hurt")
          ? "hurt"
          : r.events.includes("clear")
            ? "clear"
            : r.events[0];
        oscillator.type = event === "dash" ? "triangle" : "square";
        oscillator.frequency.setValueAtTime(
          event === "hurt"
            ? 90
            : event === "clear"
              ? 520
              : event === "dash"
                ? 240
                : 170,
          ctx.currentTime,
        );
        oscillator.frequency.exponentialRampToValueAtTime(
          event === "clear" ? 780 : 55,
          ctx.currentTime + 0.09,
        );
        gain.gain.setValueAtTime(0.018, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.13);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      }
      input.current.attack = k.has("j") || mouseHeld.current.attack;
      input.current.special = k.has("k") || mouseHeld.current.special;
      input.current.cast = k.has("q") || k.has("l");
      if (now - lastHud > 90 || r.phase !== "combat") {
        refresh();
        lastHud = now;
      }
      if (r.phase === "combat") frame = requestAnimationFrame(loop);
      else release();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, phase, refresh, release]);
  useEffect(() => {
    const r = run.current;
    if (
      r &&
      (phase === "dead" || phase === "victory") &&
      settled.current !== r
    ) {
      settled.current = r;
      save(settleRun(meta, r));
    }
  }, [phase, meta, save]);
  useEffect(() => {
    if (!playing) return;
    const pointerUp = () => {
      mouseHeld.current = { attack: false, special: false };
    };
    const onPause = () => {
      release();
      if (run.current?.phase === "combat") setPaused(true);
    };
    const visibility = () => {
      if (document.hidden) onPause();
    };
    window.addEventListener("blur", onPause);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", onPause);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing, release]);
  function start() {
    const today = new Date().toISOString().slice(0, 10);
    const seed = daily
      ? Array.from(today).reduce(
          (n, c) => Math.imul(n, 31) + c.charCodeAt(0),
          7,
        ) >>> 0
      : crypto.getRandomValues(new Uint32Array(1))[0];
    run.current = createRun(seed, weapon, meta, heat, keepsake);
    draw.current = null;
    release();
    setPaused(false);
    refresh();
    requestAnimationFrame(() => {
      if (canvas.current) {
        draw.current = createRenderer(canvas.current);
        draw.current(run.current!);
        canvas.current.focus();
      }
    });
  }
  function act(action: () => void) {
    action();
    refresh();
    release();
    canvas.current?.focus();
  }
  function resume() {
    release();
    setPaused(false);
    canvas.current?.focus();
  }
  const keyDown = (event: React.KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if ((event.target as HTMLElement).tagName !== "CANVAS") return;
    if (
      [
        " ",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
        "j",
        "k",
        "l",
        "q",
        "p",
        "escape",
      ].includes(key)
    )
      event.preventDefault();
    if (key === "p" || key === "escape") {
      if (run.current?.phase === "combat") {
        release();
        setPaused((value) => !value);
      }
      return;
    }
    if (paused) return;
    keys.current.add(key);
    if (key === "j") input.current.attack = true;
    if (key === "k") input.current.special = true;
    if (key === "q" || key === "l") input.current.cast = true;
    if (key === " " && !event.repeat) input.current.dash = true;
  };
  const touch = (key: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (key === " ") input.current.dash = true;
      else keys.current.add(key);
      if (key === "j") input.current.attack = true;
      if (key === "k") input.current.special = true;
      if (key === "q") input.current.cast = true;
      canvas.current?.focus();
    },
    onPointerUp: () => keys.current.delete(key),
    onPointerCancel: () => keys.current.delete(key),
    onLostPointerCapture: () => keys.current.delete(key),
  });
  return (
    <div
      className={styles.page}
      onKeyDown={keyDown}
      onKeyUp={(event) => {
        keys.current.delete(event.key.toLowerCase());
      }}
    >
      <header className={styles.header}>
        <Link href="/">← Back to the room</Link>
        <span>Tanmay’s arcade</span>
        <Link href="/games">All games</Link>
      </header>
      <div className={styles.title}>
        <div>
          <p>A little love letter to Hades</p>
          <h1>Underworld</h1>
        </div>
        <p>
          One more room.
          <br />
          One more boon. One more run.
        </p>
      </div>
      {!hud ? (
        <section className={styles.house}>
          <div className={styles.houseArt} aria-hidden="true">
            <span className={styles.moon} />
            <div className={styles.temple}>
              <i />
              <i />
              <i />
              <i />
              <b>Ω</b>
            </div>
            <div className={styles.stairs} />
            <span className={styles.houseCaption}>
              There is always another way out.
            </span>
          </div>
          <div className={styles.preparation}>
            <p className={styles.eyebrow}>The House of Ash</p>
            <h2>Choose your escape.</h2>
            <p>
              Twelve chambers. Four guardians. The gods may help, but the way
              out is yours to earn.
            </p>
            <fieldset>
              <legend>Your weapon</legend>
              <div className={styles.weaponList}>
                {weapons.map((w) => (
                  <button
                    key={w.id}
                    aria-pressed={weapon === w.id}
                    onClick={() => setWeapon(w.id)}
                  >
                    <b aria-hidden="true">{w.glyph}</b>
                    <strong>{w.name}</strong>
                    <small>{w.description}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>A keepsake for the road</legend>
              <div className={styles.keepsakes}>
                {(
                  [
                    {
                      id: "rose",
                      name: "Pomegranate",
                      detail: "+20 starting life",
                    },
                    {
                      id: "coin",
                      name: "Old coin",
                      detail: "+100 starting obols",
                    },
                    {
                      id: "tooth",
                      name: "Lucky tooth",
                      detail: "One extra death defiance",
                    },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.id}
                    aria-pressed={keepsake === k.id}
                    onClick={() => setKeepsake(k.id)}
                  >
                    {k.name}
                    <small>{k.detail}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className={styles.options}>
              <label>
                Heat{" "}
                <select
                  value={heat}
                  onChange={(e) => setHeat(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                      {n === 0 ? " · first escape" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={daily}
                  onChange={(e) => setDaily(e.target.checked)}
                />{" "}
                Daily seed
              </label>
            </div>
            <button
              className={styles.primary}
              disabled={!loaded}
              onClick={start}
            >
              Begin escape <span>↗</span>
            </button>
            <p className={styles.small}>
              WASD / arrows to move · J attack · K special · Q cast · Space
              dash. Mouse aiming and touch controls also work.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.game} aria-label="Underworld game">
            <div className={styles.hud}>
              <div>
                <span>{biome(hud.room)}</span>
                <strong>
                  Chamber {hud.room} / 12{" "}
                  {bossName(hud.room) ? "· Guardian" : ""}
                </strong>
              </div>
              <div className={styles.health}>
                <span>
                  ♥ {hud.hp} / {hud.maxHp}
                </span>
                <meter
                  min="0"
                  max={hud.maxHp}
                  value={hud.hp}
                  aria-label="Health"
                />
              </div>
              <span title="Obols">◉ {hud.gold}</span>
              <span title="Darkness">◆ {hud.darkness}</span>
              <button
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (paused) resume();
                  else {
                    release();
                    setPaused(true);
                  }
                }}
                disabled={phase !== "combat"}
              >
                {paused ? "Resume" : "Pause"}
              </button>
            </div>
            <div className={styles.stage}>
              <canvas
                ref={canvas}
                width={WIDTH}
                height={HEIGHT}
                tabIndex={0}
                aria-label="Underworld arena. WASD to move, J attack, K special, Q cast, Space dash, P pause."
                onBlur={() => {
                  release();
                  if (run.current?.phase === "combat") setPaused(true);
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerMove={(e) => {
                  if (e.pointerType !== "mouse") return;
                  const r = e.currentTarget.getBoundingClientRect();
                  input.current.aimX = ((e.clientX - r.left) / r.width) * WIDTH;
                  input.current.aimY =
                    ((e.clientY - r.top) / r.height) * HEIGHT;
                  input.current.aimed = true;
                }}
                onPointerLeave={() => {
                  input.current.aimed = false;
                }}
                onPointerDown={(e) => {
                  e.currentTarget.focus();
                  if (paused) return;
                  input.current.attack = e.button === 0;
                  input.current.special = e.button === 2;
                  if (e.pointerType === "mouse")
                    mouseHeld.current = {
                      attack: e.button === 0,
                      special: e.button === 2,
                    };
                }}
              />
              {paused && phase === "combat" && (
                <div className={styles.overlay}>
                  <div className={styles.panel}>
                    <p className={styles.eyebrow}>Take a breath</p>
                    <h2>Paused</h2>
                    <p>The underworld can wait.</p>
                    <button className={styles.primary} onClick={resume}>
                      Return to the escape
                    </button>
                    <button
                      className={styles.quiet}
                      onClick={() => {
                        if (run.current) {
                          run.current.phase = "dead";
                          refresh();
                          setPaused(false);
                        }
                      }}
                    >
                      End this run & keep darkness
                    </button>
                  </div>
                </div>
              )}
              {phase === "boon" && (
                <div className={styles.overlay}>
                  <div className={`${styles.panel} ${styles.widePanel}`}>
                    <p className={styles.eyebrow}>A gift from Olympus</p>
                    <h2>Choose your boon</h2>
                    <div className={styles.boonChoices}>
                      {hud.offers.map((offer, i) => {
                        const g = GODS[offer.god];
                        return (
                          <button
                            key={offer.god}
                            style={
                              { "--god-color": g.color } as React.CSSProperties
                            }
                            onClick={() =>
                              act(() => chooseBoon(run.current!, i))
                            }
                          >
                            <span className={styles.godGlyph}>{g.glyph}</span>
                            <small>
                              {g.name} · {offer.rarity}
                            </small>
                            <h3>{g.title}</h3>
                            <p>{g.description}</p>
                            <strong>
                              {hud.boons[offer.god]
                                ? "Strengthen existing boon"
                                : "Accept blessing"}{" "}
                              ↗
                            </strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {phase === "doors" && (
                <div className={styles.overlay}>
                  <div className={`${styles.panel} ${styles.widePanel}`}>
                    <p className={styles.eyebrow}>Chamber cleared</p>
                    <h2>Where to next?</h2>
                    <p>Choose the reward waiting beyond the next encounter.</p>
                    <div className={styles.doorChoices}>
                      {hud.doors.map((reward, i) => (
                        <button
                          key={`${reward}${i}`}
                          onClick={() => act(() => takeDoor(run.current!, i))}
                        >
                          <span>{rewards[reward].glyph}</span>
                          <h3>{rewards[reward].name}</h3>
                          <p>{rewards[reward].description}</p>
                          <strong>Enter chamber {hud.room + 1} ↗</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {phase === "shop" && (
                <div className={styles.overlay}>
                  <div className={`${styles.panel} ${styles.widePanel}`}>
                    <p className={styles.eyebrow}>A quiet crossing</p>
                    <h2>The ferryman’s shop</h2>
                    <p>
                      The fountain restored 30 life. Spend your obols before you
                      go.
                    </p>
                    <div className={styles.shop}>
                      {(
                        [
                          {
                            id: "heal",
                            name: "Food · restore 45 life",
                            cost: 35,
                          },
                          {
                            id: "heart",
                            name: "Heart · +25 maximum life",
                            cost: 60,
                          },
                          {
                            id: "boon",
                            name: "An Olympian blessing",
                            cost: 90,
                          },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          disabled={
                            hud.gold < item.cost ||
                            hud.shopBought.includes(item.id)
                          }
                          onClick={() => act(() => buy(run.current!, item.id))}
                        >
                          <span>{item.name}</span>
                          <strong>
                            {hud.shopBought.includes(item.id)
                              ? "Sold"
                              : `${item.cost} ◉`}
                          </strong>
                        </button>
                      ))}
                    </div>
                    <button
                      className={styles.primary}
                      onClick={() => act(() => leaveShop(run.current!))}
                    >
                      Continue the escape
                    </button>
                  </div>
                </div>
              )}
              {(phase === "dead" || phase === "victory") && (
                <div className={styles.overlay}>
                  <div className={styles.panel}>
                    <p className={styles.eyebrow}>
                      {phase === "victory"
                        ? "The sky, at last"
                        : "Back to the House"}
                    </p>
                    <h2>
                      {phase === "victory"
                        ? "You made it out."
                        : "There is no escape."}
                    </h2>
                    <p>
                      {phase === "victory"
                        ? "For tonight, at least. A harder run is waiting."
                        : "But there is another attempt."}
                    </p>
                    <div className={styles.runStats}>
                      <span>
                        Chamber <b>{hud.room}</b>
                      </span>
                      <span>
                        Foes slain <b>{hud.kills}</b>
                      </span>
                      <span>
                        Darkness kept <b>{hud.darkness}</b>
                      </span>
                    </div>
                    <button
                      className={styles.primary}
                      onClick={() => {
                        run.current = null;
                        setHud(null);
                        setPaused(false);
                        release();
                      }}
                    >
                      Return to the House
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.status}>
              <span>
                Dashes{" "}
                <b>
                  {"◆".repeat(hud.charges)}
                  {"◇".repeat(2 - hud.charges)}
                </b>
              </span>
              <span>Cast {hud.castReady ? "◆ ready" : "recharging"}</span>
              <span>Death defiance ×{hud.defiance}</span>
              <span>
                {weapons.find((w) => w.id === weapon)?.name}
                {hud.hammer ? ` · hammer +${hud.hammer * 30}%` : ""}
              </span>
            </div>
            <div
              className={styles.touchControls}
              aria-label="Touch game controls"
            >
              <div className={styles.dpad}>
                <button aria-label="Move up" {...touch("w")}>
                  ↑
                </button>
                <button aria-label="Move left" {...touch("a")}>
                  ←
                </button>
                <button aria-label="Move down" {...touch("s")}>
                  ↓
                </button>
                <button aria-label="Move right" {...touch("d")}>
                  →
                </button>
              </div>
              <div className={styles.touchActions}>
                <button {...touch("j")}>Attack</button>
                <button {...touch("k")}>Special</button>
                <button {...touch("q")}>Cast</button>
                <button {...touch(" ")}>Dash</button>
              </div>
            </div>
          </section>
          <div className={styles.build}>
            <span>Your blessings</span>
            {Object.keys(hud.boons).length === 0 ? (
              <p>
                The gods are watching. Clear a chamber to earn your first boon.
              </p>
            ) : (
              (Object.entries(hud.boons) as [God, number][]).map(
                ([god, power]) => (
                  <span
                    key={god}
                    title={GODS[god].description}
                    style={{ color: GODS[god].color }}
                  >
                    {GODS[god].glyph} {GODS[god].name}{" "}
                    <small>{power.toFixed(1)}</small>
                  </span>
                ),
              )
            )}
            {hud.boons.ares && hud.boons.dionysus ? (
              <strong>Curse of wine · Hangover deals +25%</strong>
            ) : null}
          </div>
          <p className={styles.controls}>
            WASD / arrows move · J / click attack · K / right-click special · Q
            cast · Space dash · P pause. Keyboard and touch attacks aim at the
            nearest foe. Dash through danger; gold stays in the run, darkness
            comes home.
          </p>
        </>
      )}
      {!hud && (
        <section className={styles.mirror}>
          <div>
            <p className={styles.eyebrow}>The mirror remembers</p>
            <h2>Make the next run yours.</h2>
            <p>
              <strong>◆ {meta.darkness}</strong> darkness · {meta.runs} attempts
              · {meta.wins} escapes
            </p>
            <p className={styles.small}>
              {storage
                ? "Progress stays in this browser. Darkness is saved when a run ends."
                : "Browser storage is unavailable. Progress lasts for this visit."}
            </p>
          </div>
          <div className={styles.upgrades}>
            {(
              [
                {
                  key: "vitality",
                  name: "Thick skin",
                  detail: "+10 starting life per rank",
                  max: 5,
                },
                {
                  key: "strength",
                  name: "Shadow presence",
                  detail: "+6% damage per rank",
                  max: 5,
                },
                {
                  key: "defiance",
                  name: "Death defiance",
                  detail: "Return once at half life",
                  max: 1,
                },
              ] as const
            ).map((u) => (
              <button
                key={u.key}
                disabled={
                  !loaded ||
                  meta[u.key] >= u.max ||
                  meta.darkness < upgradeCost(meta, u.key)
                }
                onClick={() => save(purchaseUpgrade(meta, u.key))}
              >
                <span>
                  <strong>
                    {u.name}{" "}
                    <small>
                      {meta[u.key]}/{u.max}
                    </small>
                  </strong>
                  <small>{u.detail}</small>
                </span>
                <b>
                  {meta[u.key] === u.max
                    ? "Max"
                    : `${upgradeCost(meta, u.key)} ◆`}
                </b>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className={styles.audio}>
        <div>
          <h2>A soundtrack for the escape</h2>
          <p>Darren Korb’s original Hades soundtrack, from Supergiant Games.</p>
          <div className={styles.audioButtons}>
            <button
              onClick={() => {
                if (!audio.current) audio.current = new AudioContext();
                void audio.current.resume();
                soundOn.current = !sound;
                setSound(!sound);
              }}
              aria-pressed={sound}
            >
              {sound ? "Effects on" : "Enable game effects"}
            </button>
            <button
              onClick={() => {
                release();
                if (run.current?.phase === "combat") setPaused(true);
                setMusic((v) => !v);
              }}
              aria-expanded={music}
            >
              {music ? "Close soundtrack" : "Open official soundtrack"}
            </button>
            <a
              href="https://supergiantgames.bandcamp.com/album/hades-original-soundtrack"
              target="_blank"
              rel="noreferrer"
            >
              Bandcamp ↗
            </a>
          </div>
        </div>
        {music && (
          <iframe
            width="480"
            height="270"
            src="https://www.youtube.com/embed/3GRKJ87S5cI"
            title="Hades Original Soundtrack — Supergiant Games"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </section>
      <footer className={styles.footer}>
        <p>
          An unofficial, small browser homage inspired by Hades. Original code
          and pixel scenes; Hades and its soundtrack belong to Supergiant Games.
        </p>
        <Link href="/">Back to Tanmay’s room</Link>
      </footer>
    </div>
  );
}
