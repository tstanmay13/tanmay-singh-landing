import { describe, it, expect } from "vitest";
import {
  ALL_CARDS,
  SETS,
  HIT_RARITIES,
  openBooster,
  addPack,
  emptyCollection,
  restoreCollection,
  type SetId,
} from "./model";
function seeded(seed: number) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
describe("real booster simulation", () => {
  it("includes both complete sets, with no promo cards", () => {
    for (const set of ["sv5", "sv8"] as const)
      expect(ALL_CARDS.filter((c) => c.id.startsWith(`${set}-`))).toHaveLength(
        SETS[set].total,
      );
  });
  it("builds ten set cards plus energy, preserving the common/uncommon/foil slots", () => {
    for (const set of ["sv5", "sv8"] as const) {
      const pack = openBooster(set, seeded(51));
      expect(pack).toHaveLength(11);
      expect(
        pack
          .slice(0, 4)
          .every((p) => p.card.rarity === "Common" && p.finish === "standard"),
      ).toBe(true);
      expect(new Set(pack.slice(0, 4).map((p) => p.card.id)).size).toBe(4);
      expect(pack.slice(4, 7).every((p) => p.card.rarity === "Uncommon")).toBe(
        true,
      );
      expect(pack.slice(7, 10).every((p) => p.finish !== "standard")).toBe(
        true,
      );
      expect(
        pack.slice(0, 10).every((p) => p.card.id.startsWith(`${set}-`)),
      ).toBe(true);
      expect(pack[10].card.rarity).toBe("Basic Energy");
    }
  });
  it("allows three independent hits, and also packs without a higher-rarity hit", () => {
    expect(
      openBooster("sv5", () => 0)
        .slice(7, 10)
        .map((p) => p.card.rarity),
    ).toEqual(["ACE SPEC Rare", "Hyper Rare", "Ultra Rare"]);
    const dry = openBooster("sv5", () => 0.999);
    expect(dry[7].finish).toBe("reverse");
    expect(dry[8].finish).toBe("reverse");
    expect(dry[9].card.rarity).toBe("Rare");
  });
  it.each(["sv5", "sv8"] as SetId[])(
    "matches %s published rarity marginals over seeded samples",
    (set) => {
      const rng = seeded(2031),
        counts: Record<string, number> = {};
      for (let i = 0; i < 30000; i++)
        for (const pull of openBooster(set, rng))
          counts[pull.card.rarity] = (counts[pull.card.rarity] ?? 0) + 1;
      for (const rarity of HIT_RARITIES)
        expect(
          Math.abs(counts[rarity] / 30000 - SETS[set].rates[rarity]),
        ).toBeLessThan(0.006);
    },
  );
  it("keeps pulls and pack totals across valid saves while rejecting corrupt entries", () => {
    const saved = addPack(
      emptyCollection(),
      "sv5",
      openBooster("sv5", seeded(73)),
    );
    expect(saved.packs.sv5).toBe(1);
    expect(Object.values(saved.cards).reduce((a, b) => a + b, 0)).toBe(11);
    expect(restoreCollection(JSON.stringify(saved))).toEqual(saved);
    expect(restoreCollection("garbage")).toEqual(emptyCollection());
    expect(
      restoreCollection(
        JSON.stringify({
          version: 1,
          packs: { sv5: -2 },
          cards: { "made-up:holo": 10, "sv5-1:standard": -1 },
        }),
      ),
    ).toEqual(emptyCollection());
  });
});
