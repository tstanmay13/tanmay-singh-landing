export const WIDTH = 480,
  HEIGHT = 240,
  TILE = 16;
export type Rect = { x: number; y: number; w: number; h: number };
export type Block = Rect & {
  kind: "ground" | "brick" | "question" | "used" | "pipe";
  reward?: boolean;
};
export type Enemy = Rect & {
  vx: number;
  vy: number;
  kind: "walker" | "turtle" | "boss";
  hp: number;
};
export type Item = Rect & {
  kind: "coin" | "mushroom" | "flower";
  vx: number;
  vy: number;
};
export type Input = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  down: boolean;
};
export const emptyInput = (): Input => ({
  left: false,
  right: false,
  jump: false,
  run: false,
  down: false,
});
export const worldNames = [
  "Green beginnings",
  "Below the surface",
  "After hours",
  "Cloud hopping",
  "Wild country",
  "Cold feet",
  "The long way home",
  "One last castle",
];
export type Level = {
  blocks: Block[];
  enemies: Enemy[];
  items: Item[];
  width: number;
  castle: boolean;
  underground: boolean;
  night: boolean;
  checkpoint: number;
  bonus?: boolean;
};
export function makeLevel(index: number): Level {
  const world = Math.floor(index / 4),
    stage = index % 4;
  const castle = stage === 3,
    underground = stage === 1;
  const blocks: Block[] = [],
    enemies: Enemy[] = [],
    items: Item[] = [];
  const width = (150 + world * 6) * TILE;
  const gaps = new Set<number>();
  for (let section = 0; section < 5; section++) {
    const start = 28 + section * 23 + ((world + stage) % 3);
    for (let n = 0; n < 2 + Math.min(2, Math.floor(world / 3)); n++)
      gaps.add(start + n);
  }
  for (let x = 0; x < width / TILE; x++)
    if (!gaps.has(x))
      blocks.push({ x: x * TILE, y: 208, w: 16, h: 32, kind: "ground" });
  for (let section = 0; section < 6; section++) {
    const x =
      (12 + section * 22 + (section ? (world * 3 + stage * 2) % 5 : 0)) * TILE;
    for (let n = 0; n < 5; n++)
      blocks.push({
        x: x + n * 16,
        y: 144 - ((section + stage) % 2) * 16,
        w: 16,
        h: 16,
        kind: n === 1 || n === 3 ? "question" : "brick",
        reward: n === 1,
      });
    for (let n = 0; n < 4; n++)
      items.push({
        x: x + n * 16,
        y: 104 - ((section + stage) % 2) * 16,
        w: 10,
        h: 12,
        kind: "coin",
        vx: 0,
        vy: 0,
      });
    const px = x + 128;
    if (
      !gaps.has(Math.floor(px / TILE)) &&
      !gaps.has(Math.floor(px / TILE) + 1)
    )
      blocks.push({
        x: px,
        y: 208 - 16 * (2 + (section % 2)),
        w: 32,
        h: 16 * (2 + (section % 2)),
        kind: "pipe",
      });
    enemies.push({
      x: x + 96,
      y: 194,
      w: 14,
      h: 14,
      vx: -26 - world * 2,
      vy: 0,
      kind: section % 3 === 2 ? "turtle" : "walker",
      hp: 1,
    });
  }
  if (castle)
    enemies.push({
      x: width - 180,
      y: 180,
      w: 28,
      h: 28,
      vx: -35,
      vy: 0,
      kind: "boss",
      hp: 5,
    });
  let checkpoint = Math.floor(width / 2 / 16) * 16;
  while (
    !blocks.some((b) => b.kind === "ground" && b.x === checkpoint) ||
    blocks.some(
      (b) =>
        b.kind === "pipe" && checkpoint >= b.x - 16 && checkpoint <= b.x + b.w,
    )
  )
    checkpoint += 16;
  return {
    blocks,
    enemies,
    items,
    width,
    castle,
    underground,
    night: stage === 2 || world > 5,
    checkpoint,
  };
}
/** A persistent side room per pipe: leaving and returning never refills its coins. */
function makeBonusRoom(): Level {
  const blocks: Block[] = [];
  for (let x = 0; x < WIDTH; x += TILE)
    blocks.push({ x, y: 208, w: 16, h: 32, kind: "ground" });
  blocks.push(
    { x: 0, y: 0, w: 16, h: 208, kind: "brick" },
    { x: 464, y: 0, w: 16, h: 208, kind: "brick" },
  );
  for (const x of [32, 416])
    blocks.push({ x, y: 176, w: 32, h: 32, kind: "pipe" });
  const items: Item[] = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 10; col++)
      items.push({
        x: 112 + col * 24,
        y: 184 - row * 24,
        w: 10,
        h: 12,
        kind: "coin",
        vx: 0,
        vy: 0,
      });
  return {
    blocks,
    items,
    enemies: [],
    width: WIDTH,
    castle: false,
    underground: true,
    night: false,
    checkpoint: Infinity,
    bonus: true,
  };
}
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export class Game {
  levelIndex = 0;
  level = makeLevel(0);
  player = {
    x: 40,
    y: 180,
    w: 12,
    h: 16,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
  };
  state: "title" | "playing" | "paused" | "dead" | "clear" | "over" | "won" =
    "title";
  coins = 0;
  score = 0;
  lives = 3;
  time = 300;
  power = 0;
  invincible = 0;
  camera = 0;
  checkpoint = false;
  jumpHeld = false;
  fireClock = 0;
  elapsed = 0;
  shots: (Rect & { vx: number; vy: number; enemy?: boolean })[] = [];
  message = "";
  private surface: Level | null = null;
  private returnPipe: Block | null = null;
  private rooms = new Map<number, Level>();
  private downHeld = false;
  pipeFade = 0;
  private pendingPipe: Block | null = null;
  private pipeSwitched = false;
  sound: (kind: string) => void = () => {};
  start(index = 0) {
    this.lives = 3;
    this.score = 0;
    this.coins = 0;
    this.power = 0;
    this.load(index);
  }
  load(index: number, retry = false) {
    this.surface = null;
    this.returnPipe = null;
    this.rooms.clear();
    this.pendingPipe = null;
    this.pipeFade = 0;
    this.downHeld = false;
    this.levelIndex = index;
    this.level = makeLevel(index);
    this.player = {
      x: retry && this.checkpoint ? this.level.checkpoint : 40,
      y: 160,
      w: 12,
      h: this.power ? 28 : 16,
      vx: 0,
      vy: 0,
      grounded: false,
      facing: 1,
    };
    if (!retry) this.checkpoint = false;
    this.time = 300;
    this.invincible = retry ? 2 : 0;
    this.shots = [];
    this.state = "playing";
    this.jumpHeld = false;
    this.camera = Math.max(0, this.player.x - 160);
    this.message = "";
  }
  private travelPipe(pipe: Block) {
    if (this.level.bonus && this.surface && this.returnPipe) {
      this.level = this.surface;
      pipe = this.returnPipe;
      this.surface = null;
      this.returnPipe = null;
      this.message = "Back above ground. Nice little detour.";
    } else {
      this.surface = this.level;
      this.returnPipe = pipe;
      let room = this.rooms.get(pipe.x);
      if (!room) {
        room = makeBonusRoom();
        this.rooms.set(pipe.x, room);
      }
      this.level = room;
      pipe = room.blocks.find((b) => b.kind === "pipe")!;
      this.message =
        "A little pocket money. Down on either pipe takes you back.";
    }
    Object.assign(this.player, {
      x: pipe.x + (pipe.w - this.player.w) / 2,
      y: pipe.y - this.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
    this.camera = Math.max(
      0,
      Math.min(this.level.width - WIDTH, this.player.x - 150),
    );
    this.shots = [];
  }
  advance() {
    if (this.levelIndex === 31) this.state = "won";
    else this.load(this.levelIndex + 1);
  }
  die() {
    if (this.state !== "playing") return;
    this.lives--;
    this.power = 0;
    this.state = this.lives > 0 ? "dead" : "over";
    this.sound("hurt");
  }
  hurt() {
    if (this.invincible > 0) return;
    if (this.power) {
      this.power = 0;
      this.player.y += this.player.h - 16;
      this.player.h = 16;
      this.invincible = 2;
      this.sound("hurt");
    } else this.die();
  }
  coin() {
    this.coins++;
    this.score += 100;
    if (this.coins % 100 === 0) this.lives++;
    this.sound("coin");
  }
  move(body: Rect & { vx: number; vy: number }, dt: number, player = false) {
    body.x += body.vx * dt;
    for (const b of this.level.blocks)
      if (overlaps(body, b)) {
        body.x = body.vx > 0 ? b.x - body.w : b.x + b.w;
        body.vx = player ? 0 : -body.vx;
      }
    body.y += body.vy * dt;
    let ground = false;
    for (const b of [...this.level.blocks])
      if (overlaps(body, b)) {
        if (body.vy >= 0) {
          body.y = b.y - body.h;
          ground = true;
        } else {
          body.y = b.y + b.h;
          if (player) this.hit(b);
        }
        body.vy = 0;
      }
    return ground;
  }
  hit(block: Block) {
    if (block.kind === "question") {
      block.kind = "used";
      if (block.reward)
        this.level.items.push({
          x: block.x + 1,
          y: block.y - 16,
          w: 14,
          h: 14,
          kind: this.power ? "flower" : "mushroom",
          vx: 38,
          vy: -70,
        });
      else this.coin();
      this.sound("bump");
    } else if (block.kind === "brick" && this.power) {
      this.level.blocks = this.level.blocks.filter((b) => b !== block);
      this.score += 50;
      this.sound("bump");
    }
  }
  tick(dt: number, input: Input) {
    if (this.state !== "playing") return;
    if (this.pipeFade > 0) {
      this.pipeFade = Math.max(0, this.pipeFade - dt);
      if (this.pipeFade <= 0.25 && !this.pipeSwitched && this.pendingPipe) {
        this.travelPipe(this.pendingPipe);
        this.pipeSwitched = true;
      }
      this.downHeld = input.down;
      return;
    }
    const enterPipe = input.down && !this.downHeld;
    this.downHeld = input.down;
    this.elapsed += dt;
    this.time -= dt;
    this.invincible = Math.max(0, this.invincible - dt);
    this.fireClock -= dt;
    if (this.time <= 0) {
      this.die();
      return;
    }
    const p = this.player;
    const direction = Number(input.right) - Number(input.left),
      speed = input.run ? 190 : 115;
    p.vx += (direction * speed - p.vx) * Math.min(1, dt * (direction ? 9 : 14));
    if (direction) p.facing = direction;
    if (input.jump && !this.jumpHeld && p.grounded) {
      p.vy = -350;
      p.grounded = false;
      this.sound("jump");
    }
    if (!input.jump && p.vy < -140) p.vy = -140;
    this.jumpHeld = input.jump;
    p.vy = Math.min(480, p.vy + 900 * dt);
    p.grounded = this.move(p, dt, true);
    p.x = Math.max(0, p.x);
    if (p.y > HEIGHT + 32) {
      this.die();
      return;
    }
    if (!this.level.bonus && p.x > this.level.checkpoint && !this.checkpoint) {
      this.checkpoint = true;
      this.message = "Checkpoint!";
    }
    if (enterPipe && p.grounded) {
      const pipe = this.level.blocks.find(
        (b) =>
          b.kind === "pipe" &&
          Math.abs(p.y + p.h - b.y) < 1 &&
          p.x + p.w / 2 >= b.x + 4 &&
          p.x + p.w / 2 <= b.x + b.w - 4,
      );
      if (pipe) {
        this.pendingPipe = pipe;
        this.pipeSwitched = false;
        this.pipeFade = 0.5;
        p.vx = 0;
        this.sound("pipe");
        return;
      }
    }
    if (input.run && this.power === 2 && this.fireClock <= 0) {
      this.shots.push({
        x: p.x + 6,
        y: p.y + 8,
        w: 6,
        h: 6,
        vx: p.facing * 250,
        vy: -80,
      });
      this.fireClock = 0.35;
      this.sound("bump");
    }
    for (const item of this.level.items) {
      if (item.kind !== "coin") {
        item.vy += 600 * dt;
        this.move(item, dt);
      }
      if (overlaps(p, item)) {
        if (item.kind === "coin") this.coin();
        else {
          this.power = item.kind === "flower" ? 2 : Math.max(1, this.power);
          p.y -= 28 - p.h;
          p.h = 28;
          this.score += 1000;
          this.sound("power");
        }
        item.y = 1000;
      }
    }
    this.level.items = this.level.items.filter((i) => i.y < 500);
    for (const e of this.level.enemies) {
      if (Math.abs(e.x - p.x) > 550) continue;
      e.vy += 900 * dt;
      this.move(e, dt);
      if (e.kind === "boss") {
        if (e.x < this.level.width - 260) e.vx = 35;
        if (e.x > this.level.width - 100) e.vx = -35;
        if (
          Math.floor((this.elapsed - dt) / 2) !== Math.floor(this.elapsed / 2)
        )
          this.shots.push({
            x: e.x,
            y: e.y + 8,
            w: 10,
            h: 8,
            vx: -100,
            vy: 0,
            enemy: true,
          });
      }
      if (overlaps(p, e)) {
        if (p.vy > 0 && p.y + p.h - p.vy * dt < e.y + 8) {
          p.vy = -240;
          e.hp--;
          this.score += 200;
          this.sound("bump");
          if (e.hp <= 0) e.y = 1000;
        } else this.hurt();
      }
    }
    this.level.enemies = this.level.enemies.filter(
      (e) => e.y < 500 && e.hp > 0,
    );
    for (const shot of this.shots) {
      if (shot.enemy) {
        shot.x += shot.vx * dt;
        if (overlaps(p, shot)) {
          this.hurt();
          shot.y = 1000;
        }
      } else {
        shot.vy += 700 * dt;
        if (this.move(shot, dt)) shot.vy = -160;
        for (const e of this.level.enemies)
          if (overlaps(shot, e)) {
            e.hp--;
            shot.y = 1000;
            this.score += 100;
          }
      }
    }
    this.shots = this.shots.filter(
      (s) => s.y < 400 && Math.abs(s.x - p.x) < 600,
    );
    this.camera = Math.max(0, Math.min(this.level.width - WIDTH, p.x - 150));
    if (
      this.state === "playing" &&
      !this.level.bonus &&
      p.x > this.level.width - 60 &&
      (!this.level.castle ||
        !this.level.enemies.some((e) => e.kind === "boss" && e.hp > 0))
    ) {
      this.score += Math.ceil(this.time) * 10;
      this.state = "clear";
      this.sound("power");
    }
  }
}
