import { bossName, type Run, WIDTH, HEIGHT } from "./engine";
const palettes = [
  {
    floor: "#252b2e",
    tile: "#2e3535",
    line: "#3b4440",
    wall: "#384944",
    trim: "#91a48a",
    glow: "#86d3b2",
    void: "#101c20",
  },
  {
    floor: "#362826",
    tile: "#402e2a",
    line: "#563b30",
    wall: "#574338",
    trim: "#c89a6c",
    glow: "#ee9460",
    void: "#2a171c",
  },
  {
    floor: "#253b3d",
    tile: "#2d4847",
    line: "#3d5850",
    wall: "#547566",
    trim: "#bdcda6",
    glow: "#9cddd1",
    void: "#162d35",
  },
  {
    floor: "#30313d",
    tile: "#3b3c49",
    line: "#50505d",
    wall: "#616476",
    trim: "#c5c3d5",
    glow: "#c6d9e1",
    void: "#1c202e",
  },
];
type Palette = (typeof palettes)[number];
const rect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
function column(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette,
) {
  rect(c, x - 6, y + h - 5, w + 17, 15, "#111a2088");
  rect(c, x, y, w, h, p.wall);
  rect(c, x + 7, y, 7, h, p.trim);
  rect(c, x + w - 9, y, 5, h, "#182a2b");
  rect(c, x - 7, y - 9, w + 14, 15, p.trim);
  rect(c, x - 7, y + h - 7, w + 14, 12, p.trim);
  rect(c, x - 3, y - 6, w + 6, 4, p.wall);
  rect(c, x + 1, y + h - 4, w - 2, 3, p.wall);
}
function background(run: Run) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const c = canvas.getContext("2d")!;
  const p = palettes[Math.floor((run.room - 1) / 3)];
  rect(c, 0, 0, WIDTH, HEIGHT, p.void);
  for (let row = 0; row < 12; row++)
    for (let col = 0; col < 22; col++) {
      const x = 40 + col * 40 + (row % 2) * 20,
        y = 62 + row * 36;
      rect(
        c,
        x,
        y,
        39,
        35,
        (row * 13 + col * 7 + run.seed) % 5 === 0 ? p.tile : p.floor,
      );
      rect(c, x + 2, y + 1, 34, 1, p.line);
      if ((row * 7 + col) % 13 === 0) {
        rect(c, x + 17, y + 4, 2, 9, p.line);
        rect(c, x + 19, y + 13, 7, 2, p.line);
      }
    }
  // Carved border and Greek-key stonework frame the arena.
  rect(c, 40, 57, 880, 14, p.wall);
  rect(c, 40, 490, 880, 20, p.wall);
  rect(c, 39, 60, 17, 450, p.wall);
  rect(c, 904, 60, 17, 450, p.wall);
  for (let x = 58; x < 900; x += 24) {
    rect(c, x, 61, 16, 3, p.trim);
    rect(c, x, 61, 3, 8, p.trim);
    rect(c, x + 8, 66, 8, 3, p.trim);
    rect(c, x + 13, 61, 3, 8, p.trim);
    rect(c, x, 496, 16, 3, p.trim);
  }
  // Entrance steps and far arch.
  for (let i = 0; i < 4; i++)
    rect(c, 420 - i * 9, 506 + i * 7, 120 + i * 18, 6, i % 2 ? p.wall : p.line);
  rect(c, 416, 5, 128, 54, p.wall);
  rect(c, 436, 12, 88, 47, p.void);
  column(c, 410, 15, 22, 40, p);
  column(c, 528, 15, 22, 40, p);
  rect(c, 431, 8, 99, 7, p.trim);
  for (const x of [66, 854])
    for (const y of [90, 400]) column(c, x, y, 30, 63, p);
  c.strokeStyle = p.line;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(480, 285, 139, 86, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(480, 285, 130, 78, 0, 0, Math.PI * 2);
  c.stroke();
  c.save();
  c.translate(480, 285);
  c.rotate(Math.PI / 4);
  c.strokeRect(-43, -43, 86, 86);
  c.rotate(Math.PI / 4);
  c.strokeRect(-36, -36, 72, 72);
  c.restore();
  for (const o of run.obstacles) column(c, o.x, o.y - 18, o.w, o.h + 18, p);
  // Static light pools are baked once per chamber.
  for (const x of [105, 855])
    for (const y of [160, 350]) {
      const g = c.createRadialGradient(x, y, 2, x, y, 85);
      g.addColorStop(0, p.glow + "28");
      g.addColorStop(1, p.glow + "00");
      c.fillStyle = g;
      c.fillRect(x - 85, y - 85, 170, 170);
      rect(c, x - 8, y - 4, 16, 18, p.wall);
      rect(c, x - 11, y - 6, 22, 5, p.trim);
    }
  return canvas;
}
const hero = [
  "      gg      ",
  "     gggg     ",
  "    hhHhhh    ",
  "    hksshh    ",
  "    hssssh    ",
  "     ssss     ",
  "   rrrSww     ",
  "  rrrrSwww    ",
  " rr rrSw ww   ",
  " rr rrSw ww   ",
  "    rrrww     ",
  "    bbbbb     ",
  "    bb bb     ",
  "    bb bb     ",
  "   kk   kk    ",
];
const shade = [
  "    pp    ",
  "   pppp   ",
  "  pPPPPp  ",
  "  pExEpP  ",
  "  pPPPPp  ",
  "   pPPp   ",
  " pppPPppp ",
  "p ppPPpp p",
  "  ppPPpp  ",
  "  pppppp  ",
  " ppp  ppp ",
];
const spriteColors: Record<string, string> = {
  g: "#a8c77b",
  h: "#181e25",
  H: "#424c50",
  k: "#171e26",
  s: "#eac5a4",
  S: "#e3c885",
  r: "#bd554b",
  w: "#e0dfc3",
  b: "#464e50",
  p: "#514c76",
  P: "#8175a4",
  E: "#daedbd",
  x: "#262737",
};
function sprite(
  c: CanvasRenderingContext2D,
  map: string[],
  x: number,
  y: number,
  scale: number,
  flash = false,
  enemyColor?: string,
) {
  const width = map[0].length * scale;
  c.fillStyle = "#07121766";
  c.beginPath();
  c.ellipse(x, y + 2, width * 0.46, 7, 0, 0, Math.PI * 2);
  c.fill();
  for (let row = 0; row < map.length; row++)
    for (let col = 0; col < map[row].length; col++) {
      const key = map[row][col];
      if (key !== " ")
        rect(
          c,
          x - width / 2 + col * scale,
          y - map.length * scale + row * scale,
          scale,
          scale,
          flash
            ? "#fff1d2"
            : enemyColor && (key === "p" || key === "P")
              ? enemyColor
              : spriteColors[key],
        );
    }
}
export function createRenderer(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d", { alpha: false })!;
  c.imageSmoothingEnabled = false;
  let room = -1;
  let floor: HTMLCanvasElement | null = null;
  return (run: Run, reduced = false) => {
    if (run.room !== room) {
      floor = background(run);
      room = run.room;
    }
    c.save();
    if (run.shake && !reduced)
      c.translate(
        Math.sin(run.time * 113) * run.shake,
        Math.cos(run.time * 97) * run.shake * 0.5,
      );
    c.drawImage(floor!, 0, 0);
    const palette = palettes[Math.floor((run.room - 1) / 3)];
    for (const x of [105, 855])
      for (const y of [160, 350]) {
        const flicker = reduced ? 0 : Math.sin(run.time * 8 + x + y) * 3;
        rect(c, x - 5, y - 18 - flicker, 10, 17 + flicker, palette.glow);
        rect(c, x - 2, y - 23 - flicker, 5, 16, "#edf1ca");
      }
    const p = run.player;
    for (const e of run.enemies) {
      if (e.telegraph > 0) {
        c.strokeStyle = "#f39880";
        c.lineWidth = 3;
        c.setLineDash([7, 6]);
        c.beginPath();
        c.arc(e.x, e.y, e.kind === "boss" ? 110 : e.r + 38, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.strokeStyle = "#f3988055";
        c.beginPath();
        c.moveTo(e.x, e.y);
        c.lineTo(e.x + Math.cos(e.aim) * 240, e.y + Math.sin(e.aim) * 240);
        c.stroke();
      }
    }
    const actors = [
      ...run.enemies.map((e) => ({ y: e.y, enemy: e })),
      { y: p.y, enemy: null },
    ].sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      const e = actor.enemy;
      if (e) {
        const color =
          e.chill > 1
            ? "#95cbd3"
            : e.kind === "boss"
              ? "#b06c66"
              : e.kind === "brute"
                ? "#8b917b"
                : e.kind === "archer"
                  ? "#a08c65"
                  : undefined;
        const scale = e.kind === "boss" ? 4 : e.kind === "brute" ? 3 : 2.4;
        sprite(c, shade, e.x, e.y, scale, e.flash > 0, color);
        if (e.kind === "archer" || e.kind === "witch") {
          rect(c, e.x + 13, e.y - 28, 3, 29, "#d7b380");
          rect(
            c,
            e.x + 10,
            e.y - 32,
            9,
            7,
            e.kind === "witch" ? "#c09ce0" : "#d7b380",
          );
        }
        if (e.kind === "boss") {
          rect(c, e.x - 21, e.y - 48, 42, 5, "#dac094");
          rect(c, e.x - 24, e.y - 57, 6, 13, "#dac094");
          rect(c, e.x + 18, e.y - 57, 6, 13, "#dac094");
        }
        const w = e.kind === "boss" ? 70 : 32;
        rect(c, e.x - w / 2, e.y - scale * 12 - 7, w, 4, "#171a23");
        rect(
          c,
          e.x - w / 2,
          e.y - scale * 12 - 7,
          w * Math.max(0, e.hp / e.maxHp),
          4,
          e.elite ? "#e0bd7a" : "#c57476",
        );
        if (e.doom > 0) {
          c.fillStyle = "#ef887b";
          c.font = "14px monospace";
          c.fillText("⚔", e.x - 5, e.y - 49);
        }
        if (e.poison > 0) rect(c, e.x - 3, e.y - 5, 5, 5, "#c38dda");
      } else {
        if (p.dash > 0) {
          c.strokeStyle = "#85d6c7";
          c.lineWidth = 8;
          c.beginPath();
          c.moveTo(p.x, p.y - 12);
          c.lineTo(p.x - p.dashX * 45, p.y - 12 - p.dashY * 45);
          c.stroke();
        }
        c.globalAlpha =
          p.invuln > 0 && Math.floor(run.time * 14) % 2 === 0 ? 0.55 : 1;
        sprite(c, hero, p.x, p.y, 2.7);
        c.globalAlpha = 1;
        c.save();
        c.translate(p.x, p.y - 17);
        c.rotate(p.angle);
        rect(
          c,
          9,
          -2,
          run.weapon === "spear" ? 40 : run.weapon === "bow" ? 20 : 25,
          4,
          "#e6dfc0",
        );
        rect(c, 10, -6, 5, 13, "#be9865");
        c.restore();
        if (run.slash > 0) {
          c.strokeStyle = run.weapon === "bow" ? "#b6d593" : "#f4e4b2";
          c.lineWidth = run.slash * 40;
          c.beginPath();
          c.arc(
            p.x,
            p.y - 12,
            run.slashSize * 0.78,
            p.angle - 1.1,
            p.angle + 1.1,
          );
          c.stroke();
        }
      }
    }
    for (const s of run.shots) {
      rect(c, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2, s.color);
      rect(c, s.x - 2, s.y - 2, 4, 4, "#fff1d2");
    }
    for (const f of run.particles) {
      c.globalAlpha = Math.max(0, f.life / f.max);
      rect(c, f.x, f.y, f.size, f.size, f.color);
    }
    c.globalAlpha = 1;
    c.font = "bold 15px monospace";
    c.textAlign = "center";
    for (const f of run.floats) {
      c.globalAlpha = Math.min(1, f.life * 2);
      c.fillStyle = "#121620";
      c.fillText(f.text, f.x + 1, f.y - 24);
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y - 25);
    }
    c.globalAlpha = 1;
    const boss = run.enemies.find((e) => e.kind === "boss");
    if (boss) {
      rect(c, 280, 23, 400, 7, "#111a20");
      rect(c, 280, 23, 400 * Math.max(0, boss.hp / boss.maxHp), 7, "#cf8378");
      c.font = "12px monospace";
      c.fillStyle = "#ecdac1";
      c.fillText(bossName(run.room), 480, 46);
    }
    if (run.spawnIn > 0) {
      c.fillStyle = "#dbceb7";
      c.font = "15px monospace";
      c.fillText("More shades approach…", 480, 120);
    }
    c.restore();
  };
}
