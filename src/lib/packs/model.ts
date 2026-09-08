import catalog from "./catalog.json";

export type SetId = "sv5" | "sv8";
export type Card = { id: string; name: string; number: string; rarity: string };
export type Pull = { card: Card; finish: "standard" | "reverse" | "holo" };
export const HIT_RARITIES = [
  "Double Rare",
  "Ultra Rare",
  "ACE SPEC Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Hyper Rare",
] as const;
type HitRarity = (typeof HIT_RARITIES)[number];
export const SETS: Record<
  SetId,
  {
    name: string;
    total: number;
    printed: number;
    note: string;
    rates: Record<HitRarity, number>;
    source: string;
  }
> = {
  sv5: {
    name: "Temporal Forces",
    total: 218,
    printed: 162,
    note: "Gengar ex, Gastly, and a little time travel.",
    rates: {
      "Double Rare": 0.1683,
      "Ultra Rare": 0.0667,
      "ACE SPEC Rare": 0.05,
      "Illustration Rare": 0.0772,
      "Special Illustration Rare": 0.0117,
      "Hyper Rare": 0.0072,
    },
    source:
      "https://www.tcgplayer.com/content/article/robot/28c0ad22-00a4-428f-b22d-e7fee9ec50bc",
  },
  sv8: {
    name: "Surging Sparks",
    total: 252,
    printed: 191,
    note: "Pikachu, Latias, and a shelf full of possibilities.",
    rates: {
      "Double Rare": 0.1694,
      "Ultra Rare": 0.0674,
      "ACE SPEC Rare": 0.0503,
      "Illustration Rare": 0.0767,
      "Special Illustration Rare": 0.0115,
      "Hyper Rare": 0.0053,
    },
    source:
      "https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Surging-Sparks-Pull-Rates/6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e/",
  },
};
export const ALL_CARDS: Card[] = [
  ...catalog.sv5,
  ...catalog.sv8,
  ...catalog.sve,
];
export const CARD_BY_ID = new Map(ALL_CARDS.map((card) => [card.id, card]));
const POOLS = Object.fromEntries(
  (Object.keys(SETS) as SetId[]).map((id) => [
    id,
    {
      byRarity: Object.fromEntries(
        [...new Set(catalog[id].map((card) => card.rarity))].map((rarity) => [
          rarity,
          catalog[id].filter((card) => card.rarity === rarity),
        ]),
      ),
      reverse: catalog[id].filter((card) =>
        ["Common", "Uncommon", "Rare"].includes(card.rarity),
      ),
    },
  ]),
) as Record<SetId, { byRarity: Record<string, Card[]>; reverse: Card[] }>;
export function randomFraction() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] / 4294967296;
}
function pick<T>(items: readonly T[], random: () => number): T {
  return items[
    Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
  ];
}
function distinct(items: Card[], count: number, random: () => number): Card[] {
  const pool = [...items],
    result: Card[] = [];
  while (result.length < count) {
    const card = pick(pool, random);
    result.push(card);
    pool.splice(pool.indexOf(card), 1);
  }
  return result;
}
export function openBooster(
  set: SetId,
  random: () => number = randomFraction,
): Pull[] {
  const { byRarity, reverse } = POOLS[set],
    rates = SETS[set].rates;
  const choose = (rarity: string, finish: Pull["finish"] = "holo"): Pull => ({
    card: pick(byRarity[rarity], random),
    finish,
  });
  const cards: Pull[] = [
    ...distinct(byRarity.Common, 4, random),
    ...distinct(byRarity.Uncommon, 3, random),
  ].map((card) => ({ card, finish: "standard" }));
  cards.push(
    random() < rates["ACE SPEC Rare"]
      ? choose("ACE SPEC Rare")
      : { card: pick(reverse, random), finish: "reverse" },
  );
  // Exclusive outcomes within each slot; the three foil slots are independent.
  // This matches the published rarity marginals, not unpublished factory collation.
  const second = random();
  cards.push(
    second < rates["Hyper Rare"]
      ? choose("Hyper Rare")
      : second < rates["Hyper Rare"] + rates["Special Illustration Rare"]
        ? choose("Special Illustration Rare")
        : second <
            rates["Hyper Rare"] +
              rates["Special Illustration Rare"] +
              rates["Illustration Rare"]
          ? choose("Illustration Rare")
          : { card: pick(reverse, random), finish: "reverse" },
  );
  const rare = random();
  cards.push(
    rare < rates["Ultra Rare"]
      ? choose("Ultra Rare")
      : rare < rates["Ultra Rare"] + rates["Double Rare"]
        ? choose("Double Rare")
        : choose("Rare"),
  );
  cards.push({ card: pick(catalog.sve, random), finish: "standard" });
  return cards;
}
export const imageFor = (card: Card) =>
  `/packs/${card.id.replace("-", "/")}.webp`;
export const pullKey = (pull: Pull) => `${pull.card.id}:${pull.finish}`;
export const isHit = (card: Card) =>
  HIT_RARITIES.some((rarity) => rarity === card.rarity);
export type Collection = {
  version: 1;
  packs: Record<SetId, number>;
  cards: Record<string, number>;
};
export function emptyCollection(): Collection {
  return { version: 1, packs: { sv5: 0, sv8: 0 }, cards: {} };
}
export function addPack(
  collection: Collection,
  set: SetId,
  pack: Pull[],
): Collection {
  const cards = { ...collection.cards };
  for (const pull of pack)
    cards[pullKey(pull)] = (cards[pullKey(pull)] ?? 0) + 1;
  return {
    version: 1,
    packs: { ...collection.packs, [set]: collection.packs[set] + 1 },
    cards,
  };
}
export function restoreCollection(raw: string | null): Collection {
  if (!raw) return emptyCollection();
  try {
    const value = JSON.parse(raw);
    if (
      value?.version !== 1 ||
      !value.packs ||
      !value.cards ||
      typeof value.cards !== "object"
    )
      return emptyCollection();
    const result = emptyCollection();
    for (const set of ["sv5", "sv8"] as const)
      if (Number.isSafeInteger(value.packs[set]) && value.packs[set] >= 0)
        result.packs[set] = value.packs[set];
    for (const [key, count] of Object.entries(value.cards)) {
      const [id, finish] = key.split(":");
      if (
        CARD_BY_ID.has(id) &&
        ["standard", "reverse", "holo"].includes(finish) &&
        typeof count === "number" &&
        Number.isSafeInteger(count) &&
        count > 0
      )
        result.cards[key] = Math.min(count, 1000000);
    }
    return result;
  } catch {
    return emptyCollection();
  }
}
