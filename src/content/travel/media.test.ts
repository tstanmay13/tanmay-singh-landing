import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { travelPlaces } from "./catalog";
import { PLACE_MEDIA } from "./media";
import { matchCity } from "../../../scripts/travel/citiesIndex";

describe("reviewed travel media", () => {
  it("uses existing canonical destinations and lightweight local assets", async () => {
    const places = new Map(travelPlaces().map(place => [place.canonicalKey, place]));
    const paths = new Set<string>();
    let total = 0;
    for (const [key, gallery] of Object.entries(PLACE_MEDIA)) {
      expect(places.has(key), key).toBe(true);
      expect(gallery[0].type).toBe("image");
      for (const item of gallery) {
        expect(paths.has(item.src)).toBe(false);
        paths.add(item.src);
        expect(item.alt.trim().length).toBeGreaterThan(10);
        expect(item.width).toBeGreaterThan(0);
        expect(item.height).toBeGreaterThan(0);
        for (const src of [item.src, ...(item.poster ? [item.poster] : [])]) {
          expect(src).toMatch(/^\/travel\/media\/[a-z-]+\/[a-z-]+\.(webp|mp4)$/);
          const file = resolve("public", src.slice(1));
          expect(existsSync(file), src).toBe(true);
          total += statSync(file).size;
          if (src.endsWith(".webp")) {
            const meta = await sharp(file).metadata();
            expect(meta.exif).toBeUndefined();
            expect(meta.xmp).toBeUndefined();
            expect(meta.orientation).toBeUndefined();
            if (src === item.src) expect([meta.width, meta.height]).toEqual([item.width, item.height]);
          }
        }
        if (item.type === "video") {
          expect(item.poster).toMatch(/\.webp$/);
          expect(item.duration).toBeLessThan(30);
        }
      }
    }
    expect(total).toBeLessThan(20 * 1024 * 1024);
  });

  it("does not pull Haad Rin across the water to populous Samui", () => {
    expect(matchCity(9.6794, 100.0600)?.cityId).toBe(1596216);
    expect(matchCity(9.719, 99.995)?.cityId).toBe(1596216);
    expect(matchCity(9.535, 100.061)?.cityId).not.toBe(1596216);
  });
});
