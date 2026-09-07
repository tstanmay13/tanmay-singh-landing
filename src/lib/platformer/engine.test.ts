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
