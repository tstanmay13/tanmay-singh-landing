// One-time snapshot import. Runtime does not depend on these external services.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root = process.cwd();
const catalog = {};
const jobs = [];
for (const set of ["sv5", "sv8", "sve"]) {
  const response = await fetch(
    `https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/${set}.json`,
  );
  if (!response.ok) throw new Error(`Metadata ${set}: ${response.status}`);
  const cards = (await response.json()).filter(
    (card) => set !== "sve" || Number(card.number) <= 8,
  );
  catalog[set] = cards.map((card) => ({
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: set === "sve" ? "Basic Energy" : card.rarity,
  }));
  for (const card of cards)
    jobs.push({
      url: card.images.small,
      dest: `${set}/${card.number}.webp`,
      width: 245,
    });
}
const arts = {
  sv5: ["walking-wake", "iron-leaves", "raging-bolt", "iron-crown"],
  sv8: ["pikachu", "alolan-exeggutor", "archaludon", "latias"],
};
for (const [set, names] of Object.entries(arts)) {
  for (const [i, name] of names.entries())
    jobs.push({
      url: `https://www.pittpokeresearch.com/img/packs/sv-${set === "sv5" ? "temporal-forces" : "surging-sparks"}-${name}.jpg`,
      dest: `${set}/pack-${i}.webp`,
      width: 320,
    });
}
let completed = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (jobs.length) {
      const job = jobs.shift();
      const dest = path.join(root, "public/packs", job.dest);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      try {
        await fs.access(dest);
        completed++;
        continue;
      } catch {}
      let failure;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await fetch(job.url, {
            signal: AbortSignal.timeout(30000),
          });
          if (!result.ok) throw new Error(`${result.status}: ${job.url}`);
          const bytes = Buffer.from(await result.arrayBuffer());
          await sharp(bytes)
            .resize({ width: job.width, withoutEnlargement: true })
            .webp({ quality: 86 })
            .toFile(dest);
          failure = null;
          break;
        } catch (error) {
          failure = error;
        }
      }
      if (failure) throw failure;
      completed++;
      if (completed % 100 === 0)
        process.stdout.write(`${completed} assets ready\n`);
    }
  }),
);
await fs.writeFile(
  path.join(root, "src/lib/packs/catalog.json"),
  JSON.stringify(catalog),
);
process.stdout.write(
  `Done: ${completed} assets, ${Object.values(catalog).flat().length} cards\n`,
);
