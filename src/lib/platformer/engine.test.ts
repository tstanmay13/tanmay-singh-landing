import { describe, it, expect } from "vitest";
import { Game, makeLevel, emptyInput } from "./engine";
describe("homepage platformer", () => {
  it("builds all 32 stages with a safe checkpoint and a reachable finish", () => {
    for (let i = 0; i < 32; i++) {
      const l = makeLevel(i);
      expect(
        l.blocks.some((b) => b.kind === "ground" && b.x === l.checkpoint),
      ).toBe(true);
      expect(
        l.blocks.some((b) => b.kind === "ground" && b.x === l.width - 16),
      ).toBe(true);
      expect(l.enemies.some((e) => e.kind === "boss")).toBe(i % 4 === 3);
    }
  });
  it("starts idle and pauses simulation", () => {
    const g = new Game();
    g.tick(1, emptyInput());
    expect(g.time).toBe(300);
    g.start();
    g.state = "paused";
    g.tick(1, emptyInput());
    expect(g.time).toBe(300);
  });
  it("lands, jumps, and makes held jumps higher than tapped jumps", () => {
    function jump(hold: boolean) {
      const g = new Game();
      g.start();
      for (let i = 0; i < 60; i++) g.tick(1 / 60, emptyInput());
      expect(g.player.grounded).toBe(true);
      g.tick(1 / 60, { ...emptyInput(), jump: true });
      for (let i = 0; i < 10; i++)
        g.tick(1 / 60, { ...emptyInput(), jump: hold });
      return g.player.y;
    }
    expect(jump(true)).toBeLessThan(jump(false));
  });
  it("question blocks release a power-up once", () => {
    const g = new Game();
    const b = g.level.blocks.find((b) => b.kind === "question" && b.reward)!;
    g.hit(b);
    g.hit(b);
    expect(g.level.items.filter((i) => i.kind === "mushroom")).toHaveLength(1);
  });
  it("takes a power-up hit before losing a life and respawns at checkpoints", () => {
    const g = new Game();
    g.start();
    g.power = 1;
    g.hurt();
    expect(g.lives).toBe(3);
    g.invincible = 0;
    g.checkpoint = true;
    g.hurt();
    expect(g.state).toBe("dead");
    g.load(0, true);
    expect(g.player.x).toBe(g.level.checkpoint);
    expect(g.lives).toBe(2);
  });
  it("awards an extra life for 100 coins and finishes the campaign", () => {
    const g = new Game();
    for (let i = 0; i < 100; i++) g.coin();
    expect(g.lives).toBe(4);
    g.load(31);
    g.state = "clear";
    g.advance();
    expect(g.state).toBe("won");
  });
  it("requires defeating the castle boss before clearing", () => {
    const g = new Game();
    g.start(3);
    g.player.x = g.level.width - 50;
    g.tick(1 / 60, emptyInput());
    expect(g.state).toBe("playing");
    g.level.enemies = [];
    g.tick(1 / 60, emptyInput());
    expect(g.state).toBe("clear");
  });
});

describe("pipe travel", () => {
  function onPipe(g: Game) {
    const pipe = g.level.blocks.find((b) => b.kind === "pipe")!;
    Object.assign(g.player, {
      x: pipe.x + 10,
      y: pipe.y - g.player.h,
      vx: 0,
      vy: 0,
      grounded: true,
    });
  }
  function enter(g: Game) {
    g.tick(1 / 60, { ...emptyInput(), down: true });
    for (let i = 0; i < 32; i++) g.tick(1 / 60, emptyInput());
  }
  it("enters and returns through pipes in all stages without resetting the surface", () => {
    for (let stage = 0; stage < 32; stage++) {
      const g = new Game();
      g.start(stage);
      const surface = g.level;
      onPipe(g);
      const x = g.player.x;
      enter(g);
      expect(g.level.bonus).toBe(true);
      expect(g.coins).toBe(0);
      expect(g.level.items).toHaveLength(30);
      onPipe(g);
      enter(g);
      expect(g.level).toBe(surface);
      expect(g.player.x).toBe(x);
      expect(g.state).toBe("playing");
      expect(g.time).toBeLessThan(300);
    }
  });
  it("requires standing on top, and cannot retrigger while Down is held", () => {
    const g = new Game();
    g.start();
    g.player.x = 320;
    g.player.y = 100;
    enter(g);
    expect(g.level.bonus).not.toBe(true);
    onPipe(g);
    g.tick(1 / 60, emptyInput());
    for (let i = 0; i < 120; i++)
      g.tick(1 / 60, { ...emptyInput(), down: true });
    expect(g.level.bonus).toBe(true);
  });
  it("keeps collected coins gone on revisits and cannot clear a level in a room", () => {
    const g = new Game();
    g.start();
    onPipe(g);
    enter(g);
    const coin = g.level.items[0];
    Object.assign(g.player, { x: coin.x, y: coin.y, vx: 0, vy: 0 });
    g.tick(1 / 60, emptyInput());
    expect(g.coins).toBeGreaterThan(0);
    const remaining = g.level.items.length;
    g.player.x = 430;
    g.tick(1 / 60, emptyInput());
    expect(g.state).toBe("playing");
    onPipe(g);
    enter(g);
    onPipe(g);
    enter(g);
    expect(g.level.items).toHaveLength(remaining);
  });
});
