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
          expect(src).toMatch(/^\/travel\/media\/[a-z-]+\/[a-z0-9-]+\.(webp|mp4)$/);
          const file = resolve("public", src.slice(1));
          expect(existsSync(file), src).toBe(true);
          const bytes = statSync(file).size;
          total += bytes;
          expect(bytes, src).toBeLessThan((src.endsWith(".mp4") ? 8 : 1.5) * 1024 * 1024);
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
    expect(total).toBeLessThan(128 * 1024 * 1024);
  });

  it("keeps the corrected island and Tuscany galleries with their visit history", () => {
    const places = travelPlaces();
    const phangan = places.find(place => place.canonicalKey === "TH::ko phangan")!;
    expect(phangan.media.some(item => item.src.endsWith("/haad-rin-pier.webp"))).toBe(true);
    expect(PLACE_MEDIA["TH::ko samui"].some(item => item.src.includes("pier"))).toBe(false);
    const tuscany = places.find(place => place.canonicalKey === "IT::san gimignano")!;
    expect(tuscany.name).toBe("San Gimignano");
    expect(tuscany.visitCount).toBe(1);
    expect(tuscany.yearsVisited).toContain(2025);
    expect(tuscany.media[0].src).toContain("/san-gimignano/");
    expect(places.some(place => place.canonicalKey === "IT::poggibonsi")).toBe(false);
  });

  it("does not pull Haad Rin across the water to populous Samui", () => {
    expect(matchCity(9.6794, 100.0600)?.cityId).toBe(1596216);
    expect(matchCity(9.719, 99.995)?.cityId).toBe(1596216);
    expect(matchCity(9.535, 100.061)?.cityId).not.toBe(1596216);
  });
});
