import { Game, WIDTH, HEIGHT } from "./engine";
// Original, deliberately low-resolution sprites. No external artwork or ROM data.
const hero = [
  "...rrrrrr.....",
  "..rrrrrrrrrr..",
  "..hhhssks.....",
  ".hshsssksss...",
  ".hshhsssksss..",
  "..hsssskkkk...",
  "...sssssss....",
  "..rrbrrbrr....",
  ".rrrbrrbrrrr..",
  "sssbbbbbbsss..",
  "sssbybbybsss..",
  "...bbbbbb.....",
  "..bbb..bbb....",
  ".kkk....kkk...",
  "kkkk....kkkk..",
];
const walker = [
  "....aaaa....",
  "...aaaaaa...",
  "..aaaaaaaa..",
  ".aakkaakkaa.",
  "aaakkaakkaaa",
  "aaaaaaaaaaaa",
  "..ssssssss..",
  "...ssssss...",
  "..kk..kk....",
  ".kkk..kkk...",
];
const colors: Record<string, string> = {
  r: "#df493b",
  h: "#673e26",
  s: "#f8bd79",
  k: "#17252c",
  b: "#4584d8",
  y: "#ffe18a",
  a: "#bd7042",
};
function sprite(
  ctx: CanvasRenderingContext2D,
  data: string[],
  x: number,
  y: number,
  scale = 1,
  flip = false,
  fire = false,
) {
  ctx.save();
  ctx.translate(Math.round(x) + (flip ? data[0].length : 0), Math.round(y));
  ctx.scale(flip ? -1 : 1, scale);
  data.forEach((row, yy) =>
    [...row].forEach((pixel, xx) => {
      if (pixel !== ".") {
        ctx.fillStyle = fire && pixel === "r" ? "#fff5d6" : colors[pixel];
        ctx.fillRect(xx, yy, 1, 1);
      }
    }),
  );
  ctx.restore();
}
export function draw(ctx: CanvasRenderingContext2D, g: Game) {
  const { level: l } = g,
    world = Math.floor(g.levelIndex / 4);
  const sky = l.castle
    ? "#211c30"
    : l.underground
      ? "#101d2c"
      : l.night
        ? "#152e51"
        : "#619bd0";
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  for (let n = 0; n < 9; n++) {
    const x = ((((n * 90 - g.camera * 0.2) % 700) + 700) % 700) - 100;
    if (l.castle || l.underground) {
      rect(x, 32, 12, 176, "#293347");
      rect(x - 4, 32, 20, 8, "#3c4960");
    } else if (l.night) {
      rect(x, 25 + (n % 3) * 12, 2, 2, "#e8e5c8");
      rect(x + 31, 68, 2, 2, "#e8e5c8");
    } else {
      rect(x, 35 + (n % 3) * 13, 42, 10, "#d7e8dd");
      rect(x + 8, 27 + (n % 3) * 13, 26, 8, "#d7e8dd");
    }
  }
  if (!l.castle && !l.underground)
    for (let n = 0; n < 7; n++) {
      const x = n * 150 - ((g.camera * 0.35) % 150);
      rect(x, 176, 96, 32, "#437e58");
      rect(x + 16, 160, 64, 16, "#437e58");
      rect(x + 32, 144, 32, 16, "#437e58");
      rect(x + 44, 161, 3, 7, "#28543e");
    }
  ctx.save();
  ctx.translate(-Math.floor(g.camera), 0);
  if (l.castle) {
    rect(0, 217, l.width, 23, "#d45538");
    for (let x = 0; x < l.width; x += 16)
      rect(x, 217 + (Math.floor(g.elapsed * 4) % 2) * 3, 8, 3, "#ffc568");
  }
  for (const b of l.blocks) {
    if (b.x + b.w < g.camera || b.x > g.camera + WIDTH) continue;
    const base =
      b.kind === "ground"
        ? l.underground
          ? "#466c91"
          : l.castle
            ? "#635469"
            : world === 5
              ? "#bbcbd2"
              : "#b47b49"
        : b.kind === "pipe"
          ? "#388d53"
          : b.kind === "question"
            ? "#edbd53"
            : b.kind === "used"
              ? "#806847"
              : "#bc744b";
    rect(b.x, b.y, b.w, b.h, "#253b3e");
    rect(b.x + 1, b.y + 1, b.w - 2, b.h - 1, base);
    if (b.kind === "pipe") {
      rect(b.x + 3, b.y + 3, 5, b.h - 3, "#91cb68");
      rect(b.x - 2, b.y, b.w + 4, 7, "#2b613e");
      rect(b.x, b.y + 1, b.w, 4, "#7abc5c");
    } else if (b.kind === "question") {
      ctx.fillStyle = "#774923";
      ctx.font = "bold 13px monospace";
      ctx.fillText("?", b.x + 4, b.y + 12);
      rect(b.x + 2, b.y + 2, 1, 1, "#fff0a0");
    } else if (b.kind !== "used") {
      rect(b.x + 1, b.y + 8, b.w - 2, 1, "#543e36");
      rect(b.x + 8, b.y + 1, 1, 7, "#543e36");
      rect(b.x + 4, b.y + 9, 1, 7, "#543e36");
      if (b.kind === "ground" && !l.underground && !l.castle)
        rect(b.x, b.y, b.w, 3, world === 5 ? "#edf8ed" : "#94b45d");
    }
  }
  for (const i of l.items) {
    if (i.kind === "coin") {
      rect(i.x + 2, i.y, 6, 12, "#ffdc64");
      rect(i.x, i.y + 2, 10, 8, "#ffdc64");
      rect(i.x + 4, i.y + 2, 2, 8, "#c28a37");
    } else {
      rect(i.x + 3, i.y + 7, 8, 7, "#f2dfa2");
      rect(i.x, i.y + 2, 14, 7, i.kind === "flower" ? "#f69f46" : "#e45541");
      rect(i.x + 2, i.y + 2, 3, 3, "#fff1da");
      rect(i.x + 9, i.y + 4, 3, 3, "#fff1da");
    }
  }
  for (const e of l.enemies) {
    if (e.hp <= 0) continue;
    if (e.kind === "boss") {
      rect(e.x, e.y + 6, 28, 22, "#75a254");
      rect(e.x - 4, e.y + 8, 14, 10, "#e7bf70");
      rect(e.x + 7, e.y, 16, 12, "#75a254");
      rect(e.x + 8, e.y + 3, 3, 4, "#fff6d9");
      rect(e.x + 8, e.y + 4, 2, 3, "#1a292e");
      for (let n = 0; n < 3; n++)
        rect(e.x + 22, e.y + 4 + n * 7, 7, 4, "#f7df9c");
    } else if (e.kind === "turtle") {
      rect(e.x + 2, e.y + 3, 12, 11, "#619b51");
      rect(e.x - 2, e.y, 7, 8, "#e7c777");
      rect(e.x, e.y + 12, 16, 3, "#e7c777");
    } else sprite(ctx, walker, e.x, e.y + 4);
  }
  if (!l.bonus) {
    const flagX = l.width - 54;
    rect(flagX, 66, 2, 142, "#e6dfb8");
    rect(flagX - 2, 62, 6, 6, "#ffdc64");
    rect(flagX + 2, 71, 20, 12, l.castle ? "#e96748" : "#e8e4c7");
    rect(flagX + 7, 74, 5, 5, "#599750");
  }
  if (g.checkpoint && !l.bonus) {
    rect(l.checkpoint, 174, 2, 34, "#f6d67d");
    rect(l.checkpoint + 2, 174, 14, 8, "#72bd75");
  }
  for (const s of g.shots) rect(s.x, s.y, s.w, s.h, "#ffd26e");
  const p = g.player;
  if (g.invincible === 0 || Math.floor(g.elapsed * 12) % 2 === 0)
    sprite(
      ctx,
      p.grounded && Math.abs(p.vx) > 15 && Math.floor(g.elapsed * 12) % 2
        ? [
            ...hero.slice(0, 12),
            "...bbb.bb.....",
            "...kk..kk.....",
            "..kkk..kkk....",
          ]
        : hero,
      p.x - 1,
      p.y,
      p.h / 15,
      p.facing < 0,
      g.power === 2,
    );
  ctx.restore();
  if (g.pipeFade > 0) {
    ctx.fillStyle = `rgba(16, 28, 43, ${1 - Math.abs(g.pipeFade - 0.25) * 4})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}
