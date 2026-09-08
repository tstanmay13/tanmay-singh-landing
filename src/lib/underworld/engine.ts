/** A bounded, deterministic simulation. Rendering and browser APIs live elsewhere. */
export const WIDTH = 960,
  HEIGHT = 540;
export type Weapon = "sword" | "spear" | "bow";
export type Reward = "boon" | "heart" | "gold" | "darkness" | "hammer";
export type Phase = "combat" | "boon" | "doors" | "shop" | "dead" | "victory";
export type God =
  | "zeus"
  | "poseidon"
  | "athena"
  | "artemis"
  | "ares"
  | "dionysus"
  | "demeter"
  | "hermes";
export type Meta = {
  darkness: number;
  runs: number;
  wins: number;
  best: number;
  vitality: number;
  strength: number;
  defiance: number;
};
export const EMPTY_META: Meta = {
  darkness: 0,
  runs: 0,
  wins: 0,
  best: 0,
  vitality: 0,
  strength: 0,
  defiance: 0,
};
export const GODS: Record<
  God,
  {
    name: string;
    title: string;
    description: string;
    color: string;
    glyph: string;
  }
> = {
  zeus: {
    name: "Zeus",
    title: "Thunder flourish",
    description: "Your hits arc lightning to nearby foes.",
    color: "#eacb70",
    glyph: "ϟ",
  },
  poseidon: {
    name: "Poseidon",
    title: "Tempest strike",
    description: "Push foes back. Slamming walls deals bonus damage.",
    color: "#6acdd3",
    glyph: "♆",
  },
  athena: {
    name: "Athena",
    title: "Divine dash",
    description: "Dashing reflects projectiles. Take less damage.",
    color: "#e8daa2",
    glyph: "◈",
  },
  artemis: {
    name: "Artemis",
    title: "Deadly strike",
    description: "Gain a chance to deal triple critical damage.",
    color: "#a6d68c",
    glyph: "➶",
  },
  ares: {
    name: "Ares",
    title: "Curse of agony",
    description: "Hits mark foes with Doom: delayed burst damage.",
    color: "#ef887b",
    glyph: "⚔",
  },
  dionysus: {
    name: "Dionysus",
    title: "Drunken strike",
    description: "Stack Hangover on foes for damage over time.",
    color: "#c99adc",
    glyph: "❦",
  },
  demeter: {
    name: "Demeter",
    title: "Frost flourish",
    description: "Hits chill and slow foes. Stacked chill adds damage.",
    color: "#a6dce4",
    glyph: "❄",
  },
  hermes: {
    name: "Hermes",
    title: "Greatest reflex",
    description: "Move faster, attack faster, and recover dashes sooner.",
    color: "#e9b985",
    glyph: "»",
  },
};
export type Boon = {
  god: God;
  rarity: "Common" | "Rare" | "Epic";
  power: number;
};
type Point = { x: number; y: number };
export type Enemy = Point & {
  id: number;
  kind: "shade" | "archer" | "witch" | "brute" | "boss";
  hp: number;
  maxHp: number;
  r: number;
  cooldown: number;
  telegraph: number;
  aim: number;
  flash: number;
  poison: number;
  chill: number;
  doom: number;
  doomTimer: number;
  elite: boolean;
};
export type Shot = Point & {
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  friendly: boolean;
  color: string;
  piercing: boolean;
  hit: number[];
};
export type Particle = Point & {
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};
export type Float = Point & { text: string; life: number; color: string };
export type Input = {
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  aimed: boolean;
  attack: boolean;
  special: boolean;
  cast: boolean;
  dash: boolean;
};
export const idleInput = (): Input => ({
  x: 0,
  y: 0,
  aimX: 0,
  aimY: 0,
  aimed: false,
  attack: false,
  special: false,
  cast: false,
  dash: false,
});
export type Run = {
  seed: number;
  rng: number;
  phase: Phase;
  room: number;
  time: number;
  weapon: Weapon;
  heat: number;
  player: Point & {
    hp: number;
    maxHp: number;
    angle: number;
    dash: number;
    dashX: number;
    dashY: number;
    charges: number;
    recharge: number;
    invuln: number;
    attackCd: number;
    specialCd: number;
    castCd: number;
    defiance: number;
  };
  enemies: Enemy[];
  shots: Shot[];
  particles: Particle[];
  floats: Float[];
  obstacles: (Point & { w: number; h: number })[];
  boons: Partial<Record<God, number>>;
  offers: Boon[];
  doors: Reward[];
  reward: Reward;
  gold: number;
  darkness: number;
  kills: number;
  hammer: number;
  baseDamage: number;
  wave: number;
  spawnIn: number;
  slash: number;
  slashSize: number;
  shake: number;
  events: ("hit" | "dash" | "hurt" | "clear")[];
  nextId: number;
  shopBought: string[];
};
export function readMeta(raw: string | null): Meta {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { ...EMPTY_META };
    const v = value as Record<string, unknown>;
    const meta = { ...EMPTY_META };
    for (const key of Object.keys(meta) as (keyof Meta)[]) {
      const n = v[key];
      meta[key] =
        typeof n === "number" && Number.isFinite(n)
          ? Math.max(
              0,
              Math.min(
                key === "vitality" || key === "strength"
                  ? 5
                  : key === "defiance"
                    ? 1
                    : 1e7,
                Math.floor(n),
              ),
            )
          : 0;
    }
    return meta;
  } catch {
    return { ...EMPTY_META };
  }
}
export function upgradeCost(
  meta: Meta,
  key: "vitality" | "strength" | "defiance",
) {
  return key === "defiance" ? 100 : 25 + meta[key] * 25;
}
export function purchaseUpgrade(
  meta: Meta,
  key: "vitality" | "strength" | "defiance",
): Meta {
  const cost = upgradeCost(meta, key);
  if (meta[key] >= (key === "defiance" ? 1 : 5) || meta.darkness < cost)
    return meta;
  return { ...meta, darkness: meta.darkness - cost, [key]: meta[key] + 1 };
}
export function settleRun(meta: Meta, run: Run): Meta {
  if (run.phase !== "dead" && run.phase !== "victory") return meta;
  return {
    ...meta,
    darkness: meta.darkness + run.darkness,
    runs: meta.runs + 1,
    wins: meta.wins + (run.phase === "victory" ? 1 : 0),
    best: Math.max(meta.best, run.room),
  };
}
export function random(run: Run) {
  let n = (run.rng += 0x6d2b79f5);
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
export const biome = (room: number) =>
  ["Tartarus", "Asphodel", "Elysium", "The surface"][
    Math.min(3, Math.floor((room - 1) / 3))
  ];
export const bossName = (room: number) =>
  ({
    3: "The Fury",
    6: "The Bone Hydra",
    9: "The Bronze Champion",
    12: "The Warden",
  })[room] ?? "";
export function createRun(
  seed: number,
  weapon: Weapon,
  meta = EMPTY_META,
  heat = 0,
  keepsake: "rose" | "coin" | "tooth" = "rose",
): Run {
  const hp = 100 + meta.vitality * 10 + (keepsake === "rose" ? 20 : 0);
  const run: Run = {
    seed,
    rng: seed >>> 0,
    phase: "combat",
    room: 0,
    time: 0,
    weapon,
    heat: clamp(heat, 0, 8),
    player: {
      x: 480,
      y: 400,
      hp,
      maxHp: hp,
      angle: -Math.PI / 2,
      dash: 0,
      dashX: 0,
      dashY: -1,
      charges: 2,
      recharge: 0,
      invuln: 0,
      attackCd: 0,
      specialCd: 0,
      castCd: 0,
      defiance: meta.defiance + (keepsake === "tooth" ? 1 : 0),
    },
    enemies: [],
    shots: [],
    particles: [],
    floats: [],
    obstacles: [],
    boons: {},
    offers: [],
    doors: [],
    reward: "boon",
    gold: keepsake === "coin" ? 100 : 0,
    darkness: 0,
    kills: 0,
    hammer: 0,
    baseDamage: 1 + meta.strength * 0.06,
    wave: 0,
    spawnIn: 0,
    slash: 0,
    slashSize: 90,
    shake: 0,
    events: [],
    nextId: 0,
    shopBought: [],
  };
  nextRoom(run, "boon");
  return run;
}
function particle(run: Run, p: Point, color: string, count = 8) {
  for (let i = 0; i < count && run.particles.length < 180; i++) {
    const a = random(run) * Math.PI * 2,
      speed = 30 + random(run) * 120;
    run.particles.push({
      ...p,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.25 + random(run) * 0.35,
      max: 0.6,
      color,
      size: 2 + Math.floor(random(run) * 3),
    });
  }
}
function floating(run: Run, p: Point, text: string, color = "#f1dcc0") {
  if (run.floats.length < 40) run.floats.push({ ...p, text, color, life: 0.8 });
}
function blocked(run: Run, x: number, y: number, r: number) {
  return run.obstacles.some(
    (o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h,
  );
}
function move(run: Run, p: Point, dx: number, dy: number, r: number) {
  const x = clamp(p.x + dx, 55 + r, WIDTH - 55 - r),
    y = clamp(p.y + dy, 70 + r, HEIGHT - 45 - r);
  if (!blocked(run, x, p.y, r)) p.x = x;
  if (!blocked(run, p.x, y, r)) p.y = y;
}
function spawn(run: Run) {
  if (run.room % 3 === 0) {
    const hp = (420 + run.room * 58) * (1 + run.heat * 0.12);
    run.enemies.push({
      id: run.nextId++,
      x: 480,
      y: 180,
      kind: "boss",
      hp,
      maxHp: hp,
      r: 30,
      cooldown: 1.5,
      telegraph: 0,
      aim: 0,
      flash: 0,
      poison: 0,
      chill: 0,
      doom: 0,
      doomTimer: 0,
      elite: true,
    });
    return;
  }
  const count = Math.min(12, 3 + Math.ceil(run.room * 0.6) + run.wave);
  const kinds: Enemy["kind"][] = ["shade", "archer", "witch", "brute"];
  for (let i = 0; i < count; i++) {
    const kind =
      kinds[
        Math.floor(random(run) * Math.min(4, 2 + Math.floor(run.room / 3)))
      ];
    const elite = run.room > 4 && random(run) < 0.2;
    const hp =
      (kind === "brute" ? 85 : kind === "shade" ? 38 : 30) *
      (1 + run.room * 0.07 + run.heat * 0.1) *
      (elite ? 1.5 : 1);
    let x = 100 + random(run) * 760,
      y = 105 + random(run) * 205;
    for (
      let j = 0;
      j < 20 &&
      (blocked(run, x, y, 24) || distance({ x, y }, run.player) < 145);
      j++
    ) {
      x = 100 + random(run) * 760;
      y = 105 + random(run) * 330;
    }
    if (blocked(run, x, y, 24)) {
      x = 480;
      y = 120;
    }
    run.enemies.push({
      id: run.nextId++,
      x,
      y,
      kind,
      hp,
      maxHp: hp,
      r: kind === "brute" ? 21 : 15,
      cooldown: 0.7 + random(run),
      telegraph: 0,
      aim: 0,
      flash: 0,
      poison: 0,
      chill: 0,
      doom: 0,
      doomTimer: 0,
      elite,
    });
    particle(run, { x, y }, "#b484d7");
  }
}
export function nextRoom(run: Run, reward: Reward) {
  run.room++;
  run.phase = "combat";
  run.reward = reward;
  run.enemies = [];
  run.shots = [];
  run.particles = [];
  run.floats = [];
  run.wave = 0;
  run.spawnIn = 0;
  run.player.x = 480;
  run.player.y = 425;
  run.player.invuln = 0.7;
  run.player.charges = 2;
  run.player.recharge = 0;
  run.shopBought = [];
  const offset = (Math.floor(random(run) * 3) - 1) * 28;
  run.obstacles =
    run.room % 3 === 0
      ? [
          { x: 230, y: 250, w: 45, h: 48 },
          { x: 685, y: 250, w: 45, h: 48 },
        ]
      : [
          { x: 230 + offset, y: 200, w: 52, h: 65 },
          { x: 678 - offset, y: 200, w: 52, h: 65 },
          ...(run.room > 4 ? [{ x: 450, y: 290, w: 60, h: 42 }] : []),
        ];
  spawn(run);
}
function offerBoons(run: Run) {
  const pool = Object.keys(GODS) as God[];
  run.offers = [];
  for (let i = 0; i < 3; i++) {
    const god = pool.splice(Math.floor(random(run) * pool.length), 1)[0];
    const roll = random(run);
    run.offers.push({
      god,
      rarity: roll > 0.88 ? "Epic" : roll > 0.55 ? "Rare" : "Common",
      power: roll > 0.88 ? 1.8 : roll > 0.55 ? 1.4 : 1,
    });
  }
  run.phase = "boon";
}
export function chooseBoon(run: Run, index: number) {
  if (run.phase !== "boon" || !run.offers[index]) return;
  const b = run.offers[index];
  run.boons[b.god] = (run.boons[b.god] ?? 0) + b.power;
  run.offers = [];
  openDoors(run);
}
function openDoors(run: Run) {
  run.phase = "doors";
  const pool: Reward[] = ["boon", "heart", "gold", "darkness", "hammer"];
  run.doors = ["boon", pool[1 + Math.floor(random(run) * 4)]];
  if (run.doors[1] === "hammer" && run.hammer >= 3) run.doors[1] = "heart";
}
export function takeDoor(run: Run, index: number) {
  if (run.phase !== "doors" || !run.doors[index]) return;
  nextRoom(run, run.doors[index]);
}
export function leaveShop(run: Run) {
  if (run.phase === "shop") openDoors(run);
}
export function buy(run: Run, item: "heal" | "boon" | "heart") {
  if (run.phase !== "shop" || run.shopBought.includes(item)) return;
  const cost = item === "heal" ? 35 : item === "heart" ? 60 : 90;
  if (run.gold < cost) return;
  run.gold -= cost;
  run.shopBought.push(item);
  if (item === "heal")
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 45);
  if (item === "heart") {
    run.player.maxHp += 25;
    run.player.hp += 25;
  }
  if (item === "boon") offerBoons(run);
}
function clearRoom(run: Run) {
  if (run.phase !== "combat") return;
  run.shots = [];
  run.darkness += 8 + Math.floor(run.room * 1.5);
  run.gold += 20;
  run.events.push("clear");
  if (run.room === 12) {
    run.darkness += 100;
    run.phase = "victory";
    return;
  }
  if (run.room % 3 === 0) {
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 30);
    run.darkness += 25;
    run.phase = "shop";
    return;
  }
  if (run.reward === "boon") {
    offerBoons(run);
    return;
  }
  if (run.reward === "heart") {
    run.player.maxHp += 25;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 40);
  }
  if (run.reward === "gold") run.gold += 75;
  if (run.reward === "darkness") run.darkness += 40;
  if (run.reward === "hammer") run.hammer++;
  openDoors(run);
}
export function hurtPlayer(run: Run, damage: number) {
  const p = run.player;
  if (p.invuln > 0 || p.dash > 0 || run.phase !== "combat") return;
  p.hp -= damage * (1 - Math.min(0.45, (run.boons.athena ?? 0) * 0.1));
  p.invuln = 0.65;
  run.shake = 6;
  run.events.push("hurt");
  particle(run, p, "#ef776d");
  if (p.hp <= 0) {
    if (p.defiance > 0) {
      p.defiance--;
      p.hp = p.maxHp * 0.5;
      p.invuln = 2;
      floating(run, p, "DEATH DEFIED", "#dcc3f4");
    } else {
      p.hp = 0;
      run.phase = "dead";
      run.shots = [];
    }
  }
}
function hitEnemy(run: Run, enemy: Enemy, damage: number, effects = true) {
  if (enemy.hp <= 0) return;
  const b = run.boons;
  const critical =
    effects && random(run) < Math.min(0.6, (b.artemis ?? 0) * 0.12);
  let dealt =
    damage * run.baseDamage * (1 + run.hammer * 0.3) * (critical ? 3 : 1);
  if ((b.demeter ?? 0) > 0 && enemy.chill > 1) dealt *= 1.15;
  enemy.hp -= dealt;
  enemy.flash = 0.12;
  particle(run, enemy, critical ? "#e7e8aa" : "#d78d82", 4);
  floating(
    run,
    enemy,
    `${Math.round(dealt)}${critical ? "!" : ""}`,
    critical ? "#bce599" : "#f1dcc0",
  );
  run.events.push("hit");
  if (effects) {
    if (b.ares) {
      enemy.doom = 16 * b.ares;
      enemy.doomTimer = 0.85;
    }
    if (b.dionysus)
      enemy.poison = Math.min(5, enemy.poison + 1 + b.dionysus * 0.3);
    if (b.demeter) enemy.chill = Math.min(4, enemy.chill + b.demeter);
    if (b.poseidon && enemy.kind !== "boss") {
      const a = Math.atan2(enemy.y - run.player.y, enemy.x - run.player.x);
      const before = { x: enemy.x, y: enemy.y };
      const d = 25 + b.poseidon * 15;
      move(run, enemy, Math.cos(a) * d, Math.sin(a) * d, enemy.r);
      if (distance(before, enemy) < d * 0.65) {
        enemy.hp -= 15 * b.poseidon;
        floating(run, enemy, "SLAM", "#6acdd3");
      }
    }
    if (b.zeus) {
      const target = run.enemies
        .filter(
          (e) => e.id !== enemy.id && e.hp > 0 && distance(enemy, e) < 180,
        )
        .sort((a, c) => distance(a, enemy) - distance(c, enemy))[0];
      if (target) {
        target.hp -= 9 * b.zeus;
        target.flash = 0.18;
        particle(run, target, "#eacb70", 6);
      }
    }
  }
}
function fire(
  run: Run,
  origin: Point,
  angle: number,
  friendly: boolean,
  damage: number,
  speed: number,
  color: string,
  r = 5,
  piercing = false,
) {
  if (run.shots.length >= 120) return;
  run.shots.push({
    ...origin,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    damage,
    life: 3,
    friendly,
    color,
    piercing,
    hit: [],
  });
}
function attack(run: Run, special: boolean) {
  const p = run.player,
    speed = 1 + (run.boons.hermes ?? 0) * 0.12;
  if (special ? p.specialCd > 0 : p.attackCd > 0) return;
  if (special) p.specialCd = 1.3 / speed;
  else
    p.attackCd =
      (run.weapon === "bow" ? 0.38 : run.weapon === "spear" ? 0.38 : 0.28) /
      speed;
  if (run.weapon === "bow" || (run.weapon === "spear" && special)) {
    const n = special && run.weapon === "bow" ? 5 + run.hammer * 2 : 1;
    for (let i = 0; i < n; i++)
      fire(
        run,
        p,
        p.angle + (i - (n - 1) / 2) * 0.15,
        true,
        special ? 22 : 28,
        580,
        "#bddb9d",
        5,
        run.weapon === "spear" || run.hammer > 1,
      );
    run.slash = 0.13;
    run.slashSize = 45;
    return;
  }
  const range = special ? 138 : run.weapon === "spear" ? 145 : 94;
  run.slash = 0.16;
  run.slashSize = range;
  if (special) run.shake = 3;
  for (const e of run.enemies) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    const delta = Math.atan2(Math.sin(a - p.angle), Math.cos(a - p.angle));
    if (
      distance(p, e) < range + e.r &&
      (special || Math.abs(delta) < (run.weapon === "spear" ? 0.45 : 1.2))
    )
      hitEnemy(run, e, special ? 38 : 24);
  }
}
export function tick(run: Run, input: Input, dt: number) {
  dt = clamp(dt, 0, 0.04);
  if (run.phase !== "combat") return;
  run.time += dt;
  run.events = [];
  run.shake = Math.max(0, run.shake - dt * 30);
  run.slash = Math.max(0, run.slash - dt);
  const p = run.player,
    b = run.boons;
  for (const k of ["invuln", "attackCd", "specialCd", "castCd"] as const)
    p[k] = Math.max(0, p[k] - dt);
  let dx = input.x,
    dy = input.y;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  if (input.aimed) p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  else {
    const target = run.enemies
      .filter((e) => e.hp > 0)
      .sort((a, c) => distance(a, p) - distance(c, p))[0];
    if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    else if (len) p.angle = Math.atan2(dy, dx);
  }
  if (p.charges < 2) {
    p.recharge += dt * (1 + (b.hermes ?? 0) * 0.2);
    if (p.recharge >= 0.85) {
      p.charges++;
      p.recharge = 0;
    }
  }
  if (input.dash && p.charges > 0 && p.dash <= 0) {
    p.charges--;
    p.dash = 0.16;
    p.dashX = len ? dx : Math.cos(p.angle);
    p.dashY = len ? dy : Math.sin(p.angle);
    run.events.push("dash");
  }
  input.dash = false;
  if (p.dash > 0) {
    p.dash = Math.max(0, p.dash - dt);
    move(run, p, p.dashX * 790 * dt, p.dashY * 790 * dt, 12);
    particle(run, p, b.athena ? "#e8daa2" : "#68ccb8", 2);
  } else
    move(
      run,
      p,
      dx * (215 + (b.hermes ?? 0) * 24) * dt,
      dy * (215 + (b.hermes ?? 0) * 24) * dt,
      12,
    );
  if (input.attack) attack(run, false);
  if (input.special) attack(run, true);
  if (input.cast && p.castCd <= 0) {
    p.castCd = 2.8;
    fire(run, p, p.angle, true, 55, 400, "#e96a80", 8, true);
  }
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.chill = Math.max(0, e.chill - dt * 0.12);
    if (e.poison > 0) {
      e.hp -= e.poison * 5 * dt * (b.ares ? 1.25 : 1);
      e.poison = Math.max(0, e.poison - dt * 0.3);
    }
    if (e.doom > 0) {
      e.doomTimer -= dt;
      if (e.doomTimer <= 0) {
        hitEnemy(run, e, e.doom, false);
        e.doom = 0;
      }
    }
    const dist = distance(e, p);
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    e.cooldown -= dt;
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        if (e.kind === "boss") {
          const furious = e.hp < e.maxHp * 0.5;
          const n =
            (run.room === 6 ? 16 : run.room === 12 ? 20 : 10) +
            (furious ? 4 : 0);
          for (let i = 0; i < n; i++)
            fire(
              run,
              e,
              e.aim + (i * Math.PI * 2) / n,
              false,
              12 + run.heat,
              150 + run.room * 5,
              "#ed837c",
              6,
            );
          if (dist < 115) hurtPlayer(run, 22 + run.heat);
          if (run.room === 3 || run.room === 9)
            move(run, e, Math.cos(e.aim) * 170, Math.sin(e.aim) * 170, e.r);
          e.cooldown = furious ? 0.9 : 1.5;
        } else if (e.kind === "archer" || e.kind === "witch") {
          const n = e.kind === "witch" ? 3 : 1;
          for (let i = 0; i < n; i++)
            fire(
              run,
              e,
              e.aim + (i - (n - 1) / 2) * 0.23,
              false,
              10 + run.heat,
              220,
              "#c799db",
              5,
            );
          e.cooldown = 1.6;
        } else {
          if (dist < e.r + 48) hurtPlayer(run, e.kind === "brute" ? 22 : 12);
          e.cooldown = 0.9;
        }
      }
    } else if (
      e.cooldown <= 0 &&
      (e.kind === "archer" ||
        e.kind === "witch" ||
        e.kind === "boss" ||
        dist < e.r + 40)
    ) {
      e.telegraph = e.kind === "boss" ? 0.72 : 0.5;
      e.aim = a;
    } else {
      const ranged = e.kind === "archer" || e.kind === "witch";
      const speed =
        (e.kind === "brute" ? 55 : e.kind === "boss" ? 48 : 85) *
        (1 + run.heat * 0.045) *
        (1 - Math.min(0.55, e.chill * 0.12));
      const direction =
        ranged && dist < 170 ? -1 : ranged && dist < 290 ? 0 : 1;
      move(
        run,
        e,
        Math.cos(a) * speed * dt * direction,
        Math.sin(a) * speed * dt * direction,
        e.r,
      );
    }
  }
  for (const s of run.shots) {
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (
      s.x < 55 ||
      s.x > 905 ||
      s.y < 70 ||
      s.y > 495 ||
      blocked(run, s.x, s.y, s.r)
    )
      s.life = 0;
    if (s.life <= 0) continue;
    if (s.friendly) {
      for (const e of run.enemies) {
        if (e.hp > 0 && !s.hit.includes(e.id) && distance(s, e) < s.r + e.r) {
          hitEnemy(run, e, s.damage);
          s.hit.push(e.id);
          if (!s.piercing) {
            s.life = 0;
            break;
          }
        }
      }
    } else if (distance(s, p) < s.r + 15) {
      if (p.dash > 0 && b.athena) {
        s.friendly = true;
        s.vx *= -1.4;
        s.vy *= -1.4;
        s.damage *= 2;
        s.color = "#e8daa2";
      } else if (p.dash <= 0) {
        hurtPlayer(run, s.damage);
        s.life = 0;
      }
    }
  }
  run.shots = run.shots.filter((s) => s.life > 0);
  const dead = run.enemies.filter((e) => e.hp <= 0);
  for (const e of dead) {
    run.kills++;
    run.gold += e.elite ? 8 : 3;
    particle(run, e, "#c9b8de", 12);
  }
  run.enemies = run.enemies.filter((e) => e.hp > 0);
  for (const f of run.floats) {
    f.life -= dt;
    f.y -= 28 * dt;
  }
  run.floats = run.floats.filter((f) => f.life > 0);
  for (const f of run.particles) {
    f.life -= dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
  }
  run.particles = run.particles.filter((f) => f.life > 0);
  if (!run.enemies.length && run.phase === "combat") {
    if (run.room % 3 !== 0 && run.wave < 1) {
      run.spawnIn += dt;
      if (run.spawnIn > 0.85) {
        run.wave++;
        run.spawnIn = 0;
        spawn(run);
      }
    } else clearRoom(run);
  }
}
