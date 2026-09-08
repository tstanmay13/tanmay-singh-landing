# Real-set booster opener

The keepsakes corner has free digital openings for the complete English Temporal Forces (218 cards) and Surging Sparks (252 cards) sets. It replaces the three guaranteed favorite cards. The Gengar chase has been removed from the main room; the whiskey-sour game, wind-up Ferrari and ambient room interactions remain.

## Probability model

These are observed estimates, not official Pokémon probabilities or a reconstruction of factory collation. Each set uses the percentage table in TCGplayer's study of more than 8,000 packs:

- [Temporal Forces](https://www.tcgplayer.com/content/article/robot/28c0ad22-00a4-428f-b22d-e7fee9ec50bc)
- [Surging Sparks](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Surging-Sparks-Pull-Rates/6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e/)
- [Official pack contents](https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack)

The implementation and in-game disclosure use the published percentages, avoiding discrepancies from rounded “1 in N” labels. A pack contains four commons, three uncommons, three foil slots and an additional Basic Energy. ACE SPEC replaces reverse slot one; illustration/special illustration/hyper rare replaces reverse slot two; double/ultra rare replaces the rare slot. Slots are independent in this model. Cards are selected uniformly within a rarity; ordinary/reverse card collation is simplified. The common and uncommon base groups are sampled without replacement. No guaranteed higher-rarity hits, pity timer, price or purchase mechanism is present.

Browser crypto randomness drives openings. The pure model accepts seeded randomness for repeatable probability tests; production does not expose an odds override. Tests check set boundaries, pack contents, multi-hit and ordinary packs, estimated frequency across 30,000 packs per set, and save restoration.

## Images and provenance

Metadata and card scan URLs come from [PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data), downloaded on 2026-09-08. Card images retain their original artwork and are locally compressed to WebP at up to 245px wide. Eight representative Scarlet & Violet Basic Energy prints complete the energy pool. They are not counted toward either set's binder completion.

The eight actual wrapper scans (four per expansion) come from the [Pitt Poké Research booster pack art gallery](https://www.pittpokeresearch.com/booster-pack-art-gallery). These are scans of real wrappers, not invented packaging. Card art © Pokémon / Nintendo / Creatures / GAME FREAK; source links and the unofficial simulator disclosure are available within the opener.

Run `node scripts/packs/import-assets.mjs` to import missing assets and regenerate the compact catalog. Runtime openings use local files and require no external API, credentials or service. Assets comprise 478 card images and eight wrapper images, approximately 13 MB on disk. Only the chosen wrapper, current revealed card or visible binder page is requested; the catalog/component load only when the keepsakes corner opens.

## Interaction and storage

Tap or swipe across a pack to open. Cards reveal individually, ending with the rare slot; visitors can also reveal the whole pack. Reverse and higher-rarity cards receive a brief foil animation. Reduced-motion preferences disable animation. All set cards have a chance to appear, and the binder tracks distinct card numbers, finishes and duplicate counts.

Pulls save immediately on opening in `tanmay-pokemon-binder-v1` in localStorage. Saves are browser-local, validated on restoration, and have a graceful in-memory fallback if storage is blocked. Clearing browser data removes the binder. There are no accounts, physical rewards, redeemable codes or paid openings.

## Verification (2026-09-08)

- 119 unit tests pass across 15 files; changed files pass ESLint, and the production build completes (existing unrelated game-page warnings remain).
- Chrome desktop and 390×844 mobile: tap/swipe opening, all eleven reveals including the last rare, full-pack view, energy inspection, saved binder after reload, duplicate count, pagination, rarity filter and displayed source rates checked.
- Every catalog card has a nonempty local WebP image (478 checked). The home route is 7.44 kB / 111 kB first-load JavaScript in the production build, compared with 8.03 kB / 112 kB for the preceding toy preview.
