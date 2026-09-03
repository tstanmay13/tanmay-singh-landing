import type { CatalogCity } from "@/content/travel/types";

const DAY = 86_400_000;

export const MAP_WIDTH = 2560;
export const MAP_HEIGHT = 1280;
export const MAP_COLS = 320;
export const MAP_ROWS = 160;

export const MIN_SCALE = 0.42;
export const MAX_SCALE = 5.2;

export type LodBand = "world" | "region" | "close";

export type MapPoint = { x: number; y: number };

export function latLngToXY(lat: number, lng: number): MapPoint {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

export function cityPoint(city: CatalogCity): MapPoint {
  const point = latLngToXY(city.lat, city.lng);
  if (city.countryCode === "VA") {
    point.x += 14;
    point.y += 10;
  }
  return point;
}

export type PlacedPin = {
  city: CatalogCity;
  x: number;
  y: number;
  members: CatalogCity[];
  stacked: boolean;
};

function pinRank(city: CatalogCity, selectedId: string | null) {
  if (city.id === selectedId) return Number.POSITIVE_INFINITY;
  return city.population + city.dwellMs / DAY / 100;
}

export function placePins(
  cities: CatalogCity[],
  scale: number,
  selectedId: string | null,
  explode: boolean,
): PlacedPin[] {
  const minWorld = 32 / Math.max(scale, 0.05);
  const ranked = [...cities].sort(
    (a, b) => pinRank(b, selectedId) - pinRank(a, selectedId),
  );
  const clusters: CatalogCity[][] = [];

  for (const city of ranked) {
    const point = cityPoint(city);
    const host = clusters.find((group) => {
      const head = cityPoint(group[0]);
      return Math.hypot(point.x - head.x, point.y - head.y) < minWorld;
    });
    if (host) host.push(city);
    else clusters.push([city]);
  }

  const placed: PlacedPin[] = [];
  for (const group of clusters) {
    const head = group[0];
    const origin = cityPoint(head);
    const selected = group.find((city) => city.id === selectedId);

    if (!explode || group.length === 1) {
      placed.push({
        city: head,
        x: origin.x,
        y: origin.y,
        members: group,
        stacked: group.length > 1,
      });
      if (selected && selected.id !== head.id) {
        placed.push({
          city: selected,
          x: origin.x + 18 / scale,
          y: origin.y - 10 / scale,
          members: [selected],
          stacked: false,
        });
      }
      continue;
    }

    const radius = (14 + group.length * 3) / scale;
    group.forEach((city, index) => {
      const angle = (Math.PI * 2 * index) / group.length - Math.PI / 2;
      placed.push({
        city,
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
        members: [city],
        stacked: false,
      });
    });
  }
  return placed;
}

export function lodBandFromScale(scale: number): LodBand {
  if (scale < 1.08) return "world";
  if (scale < 2.15) return "region";
  return "close";
}

export function visibleCities(
  cities: CatalogCity[],
  band: LodBand,
  selectedId: string | null,
) {
  const us = cities
    .filter((city) => city.countryCode === "US")
    .sort((a, b) => b.dwellMs - a.dwellMs);
  const intl = cities.filter((city) => city.countryCode !== "US");

  const usKeep =
    band === "world" ? us.slice(0, 8) : band === "region" ? us.slice(0, 22) : us;

  const kept = new Set([...usKeep, ...intl].map((city) => city.id));
  if (selectedId) kept.add(selectedId);
  return cities.filter((city) => kept.has(city.id));
}

export function pinScale(dwellMs: number, selected: boolean) {
  const days = Math.max(0.2, dwellMs / DAY);
  const size = 0.82 + Math.log10(days + 1) * 0.34;
  return selected ? size * 1.28 : size;
}

export function countryPaths(cities: CatalogCity[]) {
  const byCountry = new Map<string, CatalogCity[]>();
  for (const city of cities) {
    const list = byCountry.get(city.countryCode) ?? [];
    list.push(city);
    byCountry.set(city.countryCode, list);
  }

  const paths: { key: string; points: MapPoint[] }[] = [];
  for (const [code, group] of byCountry) {
    const notable =
      code === "US"
        ? [...group]
            .sort((a, b) => b.dwellMs - a.dwellMs)
            .filter((city) => city.dwellMs >= DAY)
            .slice(0, 12)
        : group;
    const ordered = [...(notable.length >= 2 ? notable : group)].sort((a, b) =>
      a.firstSeen.localeCompare(b.firstSeen),
    );
    if (ordered.length < 2) continue;
    paths.push({
      key: code,
      points: ordered.map((city) => latLngToXY(city.lat, city.lng)),
    });
  }
  return paths;
}

export function fitScale(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  viewW: number,
  viewH: number,
  padding = 0.28,
) {
  const spanX = Math.max(80, (maxX - minX) * (1 + padding));
  const spanY = Math.max(80, (maxY - minY) * (1 + padding));
  return clamp(Math.min(viewW / spanX, viewH / spanY), MIN_SCALE, MAX_SCALE);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
