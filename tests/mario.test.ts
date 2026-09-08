import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";

function runtime() {
  const context = createContext({ console, setTimeout, clearTimeout });
  const html = readFileSync("public/mario/index.html", "utf8");
  for (const [, path] of html.matchAll(/<script src="([^"]+)"/g)) {
    if (path === "embed.js") continue;
    runInContext(readFileSync(`public/mario/${path}`, "utf8"), context, {
      filename: path,
    });
  }
  return context;
}
const context = runtime();
const proto = context.FullScreenMario.prototype;
describe("original Mario integration", () => {
  it("ships the pinned original course definitions rather than generated layouts", () => {
    expect(
      createHash("sha256")
        .update(readFileSync("public/mario/settings/maps.js"))
        .digest("hex"),
    ).toBe("12518145905d58a9a591f4fecc72deefa3a8091e974c40b9ae3d42dc22a63979");
    const maps = proto.settings.maps.library;
    for (let world = 1; world <= 8; world++)
      for (let course = 1; course <= 4; course++)
        expect(maps[`${world}-${course}`].areas.length).toBeGreaterThan(0);
    const opening = maps["1-1"].areas[0].creation;
    expect(
      opening
        .filter((x: any) => x.macro === "Pipe")
        .slice(0, 4)
        .map((x: any) => [x.x, x.height]),
    ).toEqual([
      [224, 16],
      [304, 24],
      [368, 32],
      [456, 32],
    ]);
    expect(
      opening.some(
        (x: any) => x.thing === "Block" && x.x === 184 && x.y === 32,
      ),
    ).toBe(true);
    expect(
      maps["2-2"].areas.some((x: any) => x.setting.includes("Underwater")),
    ).toBe(true);
    expect(maps["8-4"].areas.length).toBeGreaterThan(3);
  });
  it("never fires while running; fire is independent and requires a flower", () => {
    const fire = vi.fn();
    const game = {
      player: { keys: { sprint: 0 }, power: 3, fire, crouch: false },
      GamesRunner: { getPaused: () => false },
      MapScreener: {},
    };
    const controls = context.MarioControls(game);
    controls.input("run", true);
    expect(fire).not.toHaveBeenCalled();
    expect(game.player.keys.sprint).toBe(1);
    controls.input("fire", true);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(game.player.keys.sprint).toBe(1);
    controls.input("fire", true);
    expect(fire).toHaveBeenCalledTimes(1);
    controls.input("fire", false);
    game.player.power = 1;
    controls.input("fire", true);
    expect(fire).toHaveBeenCalledTimes(1);
    controls.release();
    expect(game.player.keys.sprint).toBe(0);
  });
  it("pops a coin upward, spins it, awards points once and shows score text", () => {
    const events: { fn: () => void; time: number }[] = [];
    const game = {
      unitsize: 4,
      switchClass: vi.fn(),
      GroupHolder: { switchObjectGroup: vi.fn() },
      AudioPlayer: { play: vi.fn() },
      StatsHolder: { increase: vi.fn() },
      TimeHandler: {
        cancelClassCycle: vi.fn(),
        addClassCycle: vi.fn(),
        addEventInterval: vi.fn(),
        addEvent: (fn: () => void, time: number) => events.push({ fn, time }),
      },
      scoreOn: vi.fn(),
      killNormal: vi.fn(),
    };
    const coin = { EightBitter: game, yvel: 0 };
    proto.animateEmergeCoin(coin, {});
    expect(coin.yvel).toBe(-4);
    expect(game.TimeHandler.addClassCycle).toHaveBeenCalled();
    expect(game.StatsHolder.increase.mock.calls).toEqual([
      ["coins", 1],
      ["score", 200],
    ]);
    expect(game.scoreOn).toHaveBeenCalledWith(200, coin, true);
    events.find((e) => e.time === 25)!.fn();
    expect(coin.yvel).toBe(4);
    events.find((e) => e.time === 49)!.fn();
    expect(game.killNormal).toHaveBeenCalledWith(coin);
    expect(proto.settings.objects.properties.Coin.animate).toBe(
      proto.animateEmergeCoin,
    );
  });
  it("coin question blocks bump and release their contents once on head contact", () => {
    const game = {
      animateSolidBump: vi.fn(),
      removeClass: vi.fn(),
      switchClass: vi.fn(),
      TimeHandler: { addEvent: vi.fn() },
      animateSolidContents: vi.fn(),
      AudioPlayer: { play: vi.fn() },
    };
    const block = { EightBitter: game, used: false, up: undefined };
    const player = { player: true };
    proto.collideBottomBlock(block, player);
    expect(game.animateSolidBump).toHaveBeenCalledWith(block);
    expect(game.TimeHandler.addEvent).toHaveBeenCalledWith(
      game.animateSolidContents,
      7,
      block,
      player,
    );
    proto.collideBottomBlock(block, player);
    expect(game.TimeHandler.addEvent).toHaveBeenCalledTimes(1);
  });
});
