import { describe, it, expect } from "vitest";
import {
  buy,
  chooseBoon,
  createRun,
  EMPTY_META,
  hurtPlayer,
  idleInput,
  nextRoom,
  purchaseUpgrade,
  readMeta,
  settleRun,
  takeDoor,
  tick,
  type Run,
} from "./engine";
const advance = (r: Run, seconds: number) => {
  for (let i = 0; i < Math.ceil(seconds / 0.02); i++)
    tick(r, idleInput(), 0.02);
};
const clear = (r: Run) => {
  r.enemies = [];
  r.wave = 1;
  tick(r, idleInput(), 0.02);
};
describe("Underworld runs", () => {
  it("replays the same chamber layout and initial enemies for a seed", () => {
    const a = createRun(42, "sword"),
      b = createRun(42, "sword");
    expect(a.enemies).toEqual(b.enemies);
    expect(a.obstacles).toEqual(b.obstacles);
    expect(createRun(43, "sword").enemies).not.toEqual(a.enemies);
  });
  it("normalizes diagonal movement and keeps the player inside walls", () => {
    const a = createRun(1, "sword"),
      b = createRun(1, "sword");
    const input = idleInput();
    input.x = 1;
    input.y = 1;
    const straight = { ...input, y: 0 };
    const pa = { ...a.player },
      pb = { ...b.player };
    tick(a, input, 0.02);
    tick(b, straight, 0.02);
    expect(Math.hypot(a.player.x - pa.x, a.player.y - pa.y)).toBeCloseTo(
      Math.hypot(b.player.x - pb.x, b.player.y - pb.y),
    );
    for (let i = 0; i < 500; i++) tick(a, input, 0.02);
    expect(a.player.x).toBeLessThanOrEqual(893);
    expect(a.player.y).toBeLessThanOrEqual(483);
  });
  it("spends dash charges, prevents damage during a dash, and recharges", () => {
    const r = createRun(1, "sword");
    r.player.invuln = 0;
    const input = idleInput();
    input.dash = true;
    input.x = 1;
    tick(r, input, 0.02);
    expect(r.player.charges).toBe(1);
    expect(input.dash).toBe(false);
    hurtPlayer(r, 30);
    expect(r.player.hp).toBe(r.player.maxHp);
    advance(r, 0.9);
    expect(r.player.charges).toBe(2);
  });
  it("death defiance revives once, then ends the run", () => {
    const r = createRun(1, "sword", EMPTY_META, 0, "tooth");
    r.player.invuln = 0;
    hurtPlayer(r, 999);
    expect(r.phase).toBe("combat");
    expect(r.player.hp).toBe(r.player.maxHp / 2);
    expect(r.player.defiance).toBe(0);
    r.player.invuln = 0;
    hurtPlayer(r, 999);
    expect(r.phase).toBe("dead");
    expect(r.player.hp).toBe(0);
  });
  it("presents three distinct boons and grants only the chosen reward once", () => {
    const r = createRun(1, "sword");
    clear(r);
    expect(r.phase).toBe("boon");
    expect(new Set(r.offers.map((b) => b.god)).size).toBe(3);
    const offered = { ...r.offers[0] };
    chooseBoon(r, 0);
    const gold = r.gold;
    chooseBoon(r, 0);
    expect(r.boons[offered.god]).toBe(offered.power);
    expect(Object.keys(r.boons)).toHaveLength(1);
    expect(r.phase).toBe("doors");
    tick(r, idleInput(), 0.02);
    expect(r.gold).toBe(gold);
    takeDoor(r, 0);
    expect(r.room).toBe(2);
    expect(r.phase).toBe("combat");
  });
  it("awards chosen heart, gold, darkness and hammer rewards", () => {
    for (const reward of ["heart", "gold", "darkness", "hammer"] as const) {
      const r = createRun(3, "bow");
      r.reward = reward;
      const hp = r.player.maxHp;
      clear(r);
      expect(r.phase).toBe("doors");
      if (reward === "heart") expect(r.player.maxHp).toBe(hp + 25);
      if (reward === "gold") expect(r.gold).toBe(95);
      if (reward === "darkness") expect(r.darkness).toBe(49);
      if (reward === "hammer") expect(r.hammer).toBe(1);
    }
  });
  it("opens a shop after a boss; prevents double purchase and overspending", () => {
    const r = createRun(5, "spear");
    r.room = 2;
    nextRoom(r, "boon");
    expect(r.enemies[0].kind).toBe("boss");
    clear(r);
    expect(r.phase).toBe("shop");
    r.gold = 100;
    buy(r, "heart");
    expect(r.gold).toBe(40);
    const hp = r.player.maxHp;
    buy(r, "heart");
    expect(r.gold).toBe(40);
    expect(r.player.maxHp).toBe(hp);
    buy(r, "boon");
    expect(r.phase).toBe("shop");
  });
  it("ends at the twelfth guardian and banks darkness with a win", () => {
    const r = createRun(5, "spear");
    r.room = 11;
    nextRoom(r, "boon");
    clear(r);
    expect(r.phase).toBe("victory");
    const meta = settleRun(EMPTY_META, r);
    expect(meta.wins).toBe(1);
    expect(meta.runs).toBe(1);
    expect(meta.best).toBe(12);
    expect(meta.darkness).toBeGreaterThan(100);
  });
  it("does not update finished simulations", () => {
    const r = createRun(1, "sword");
    r.phase = "dead";
    const before = JSON.stringify(r);
    tick(r, { ...idleInput(), attack: true, dash: true }, 0.03);
    expect(JSON.stringify(r)).toBe(before);
  });
  it("all weapons can damage a nearby foe", () => {
    for (const weapon of ["sword", "spear", "bow"] as const) {
      const r = createRun(6, weapon);
      const e = r.enemies[0];
      r.enemies = [e];
      e.x = r.player.x + 55;
      e.y = r.player.y;
      e.cooldown = 99;
      const hp = e.hp;
      const input = {
        ...idleInput(),
        attack: true,
        aimed: true,
        aimX: e.x,
        aimY: e.y,
      };
      tick(r, input, 0.02);
      advance(r, 0.15);
      expect(e.hp).toBeLessThan(hp);
    }
  });
  it("Athena reflects shots while dashing", () => {
    const r = createRun(2, "sword");
    r.boons.athena = 1;
    r.player.dash = 0.15;
    r.player.dashX = 0;
    r.player.dashY = 0;
    r.shots = [
      {
        x: r.player.x,
        y: r.player.y,
        vx: 10,
        vy: 0,
        r: 5,
        damage: 10,
        life: 2,
        friendly: false,
        color: "#fff",
        piercing: false,
        hit: [],
      },
    ];
    tick(r, idleInput(), 0.02);
    expect(r.shots[0].friendly).toBe(true);
    expect(r.shots[0].vx).toBeLessThan(0);
  });
  it("sanitizes corrupt saves and constrains permanent upgrades", () => {
    expect(readMeta("nope")).toEqual(EMPTY_META);
    expect(
      readMeta('{"darkness":-10,"vitality":900,"defiance":12,"wins":"oops"}'),
    ).toMatchObject({ darkness: 0, vitality: 5, defiance: 1, wins: 0 });
    const rich = { ...EMPTY_META, darkness: 150 };
    const next = purchaseUpgrade(rich, "vitality");
    expect(next.vitality).toBe(1);
    expect(next.darkness).toBe(125);
    expect(purchaseUpgrade(EMPTY_META, "defiance")).toBe(EMPTY_META);
    expect(createRun(1, "sword", next).player.maxHp).toBe(130);
  });
});
