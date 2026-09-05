import type { CatalogCity } from "@/content/travel/types";

const DAY = 86_400_000;

export const MAP_WIDTH = 2560;
export const MAP_HEIGHT = 1280;
export const MAP_COLS = 320;
export const MAP_ROWS = 160;

export const MIN_SCALE = 0.12;
export const MAX_SCALE = 6.8;
/** CSS pixels per 320×160 world texel. Beyond this, swap to a regional layer. */
export const GLOBAL_RASTER_MAX_MAGNIFICATION = 6.5;
export const WORLD_UNITS_PER_TEXEL = MAP_WIDTH / MAP_COLS;

export type LodBand = "world" | "region" | "country" | "city";

export type MapPoint = { x: number; y: number };

export type Camera = { x: number; y: number; scale: number };

export type AtlasView = {
  band: LodBand;
  kicker: string;
  title: string;
  continent: string | null;
  countryCode: string | null;
  cityId: string | null;
  visibleCountryCodes: string[];
};

export const COUNTRY_TITLE: Record<string, string> = {
  US: "USA",
  JP: "JAPAN",
  MX: "MEXICO",
  TH: "THAILAND",
  IT: "ITALY",
  ES: "SPAIN",
  CH: "SWITZERLAND",
  VN: "VIETNAM",
  AU: "AUSTRALIA",
  FR: "FRANCE",
  VA: "VATICAN",
  IN: "INDIA",
};

export const CONTINENT_BY_COUNTRY: Record<string, string> = {
  US: "NORTH AMERICA",
  MX: "NORTH AMERICA",
  CA: "NORTH AMERICA",
  JP: "ASIA",
  TH: "ASIA",
  VN: "ASIA",
  IN: "ASIA",
  IT: "EUROPE",
  ES: "EUROPE",
  FR: "EUROPE",
  CH: "EUROPE",
  VA: "EUROPE",
  AU: "OCEANIA",
};

const BAND_KICKER: Record<LodBand, string> = {
  world: "OVERWORLD",
  region: "REGION",
  country: "COUNTRY",
  city: "CITY",
};

export function latLngToXY(lat: number, lng: number): MapPoint {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

export function xyToLatLng(x: number, y: number) {
  return {
    lng: (x / MAP_WIDTH) * 360 - 180,
    lat: 90 - (y / MAP_HEIGHT) * 180,
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
  if (scale < 0.98) return "world";
  if (scale < 1.62) return "region";
  if (scale < 2.55) return "country";
  return "city";
}

export function nextExplodeScale(scale: number) {
  const band = lodBandFromScale(scale);
  if (band === "world") return 1.18;
  if (band === "region") return 1.82;
  if (band === "country") return 2.85;
  return clamp(scale * 1.35, MIN_SCALE, MAX_SCALE);
}

/** Country strip fly-to stays readable without clipping the HUD. */
export const COUNTRY_FOCUS_MIN_SCALE = 1.35;
export const COUNTRY_FOCUS_SCALE = 6.4;
export const COUNTRY_FOCUS_MIN_SPAN_X = 96;
export const COUNTRY_FOCUS_MIN_SPAN_Y = 64;

export function visibleCities(
  cities: CatalogCity[],
  band: LodBand,
  selectedId: string | null,
  highlightCountry: string | null = null,
) {
  const byCountry = new Map<string, CatalogCity[]>();
  for (const city of cities) {
    const list = byCountry.get(city.countryCode) ?? [];
    list.push(city);
    byCountry.set(city.countryCode, list);
  }

  const keep = new Set<string>();
  const takeHero = (group: CatalogCity[]) =>
    [...group].sort((a, b) => b.dwellMs - a.dwellMs)[0];

  if (band === "world") {
    for (const group of byCountry.values()) {
      const hero = takeHero(group);
      if (hero) keep.add(hero.id);
    }
    const us = [...(byCountry.get("US") ?? [])].sort(
      (a, b) => b.dwellMs - a.dwellMs,
    );
    for (const city of us.slice(0, 6)) keep.add(city.id);
  } else if (band === "region") {
    for (const group of byCountry.values()) {
      const ranked = [...group].sort((a, b) => b.dwellMs - a.dwellMs);
      const cap = group[0]?.countryCode === "US" ? 22 : ranked.length;
      for (const city of ranked.slice(0, cap)) keep.add(city.id);
    }
  } else {
    for (const city of cities) keep.add(city.id);
  }

  if (selectedId) keep.add(selectedId);
  if (highlightCountry) {
    for (const city of byCountry.get(highlightCountry) ?? []) keep.add(city.id);
  }

  return cities.filter((city) => keep.has(city.id));
}

export function pinScale(dwellMs: number, selected: boolean) {
  const days = Math.max(0.2, dwellMs / DAY);
  const size = 0.82 + Math.log10(days + 1) * 0.34;
  return selected ? size * 1.28 : size;
}

export function countryFrame(cities: CatalogCity[], code: string) {
  const points = cities
    .filter((city) => city.countryCode === code)
    .map((city) => cityPoint(city));
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const pad = 28;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

export function continentFromLatLng(lat: number, lng: number): string | null {
  if (lat > 12 && lng >= -170 && lng <= -30) return "NORTH AMERICA";
  if (lat <= 12 && lat > -58 && lng >= -92 && lng <= -30) return "SOUTH AMERICA";
  if (lat > 36 && lng > -25 && lng < 42) return "EUROPE";
  if (lat <= 36 && lat > -35 && lng > -20 && lng < 52) return "AFRICA";
  if (lat > -12 && lng >= 26 && lng < 150) return "ASIA";
  if (lng >= 110 && lat <= -10) return "OCEANIA";
  if (lng >= 125 && lat > -10 && lat < 50) return "ASIA";
  return null;
}

export function continentForCountry(code: string) {
  return CONTINENT_BY_COUNTRY[code] ?? null;
}

export function countryTitle(code: string, fallback = "") {
  return COUNTRY_TITLE[code] ?? fallback.toUpperCase();
}

function cityInView(
  city: CatalogCity,
  cam: Camera,
  viewW: number,
  viewH: number,
  pad = 0.06,
) {
  const point = cityPoint(city);
  const sx = viewW / 2 + (point.x - cam.x) * cam.scale;
  const sy = viewH / 2 + (point.y - cam.y) * cam.scale;
  return (
    sx > -viewW * pad &&
    sx < viewW * (1 + pad) &&
    sy > -viewH * pad &&
    sy < viewH * (1 + pad)
  );
}

export function describeAtlasView(
  cam: Camera,
  viewW: number,
  viewH: number,
  cities: CatalogCity[],
  selectedId: string | null,
  focusCountry: string | null = null,
): AtlasView {
  const band = lodBandFromScale(cam.scale);
  const kicker = BAND_KICKER[band];
  const geo = xyToLatLng(cam.x, cam.y);
  const inView = cities.filter((city) => cityInView(city, cam, viewW, viewH));
  const scored = inView.map((city) => {
    const point = cityPoint(city);
    const sx = viewW / 2 + (point.x - cam.x) * cam.scale;
    const sy = viewH / 2 + (point.y - cam.y) * cam.scale;
    const dist = Math.hypot(sx - viewW / 2, sy - viewH / 2);
    const gauss = Math.exp(-(dist * dist) / (2 * 80 * 80));
    const boost = city.countryCode === focusCountry ? 3.2 : 1;
    return { city, dist, weight: gauss * boost };
  });

  const visibleCountryCodes = [
    ...new Set(inView.map((city) => city.countryCode)),
  ];

  const continentVotes = new Map<string, number>();
  const countryVotes = new Map<string, number>();
  for (const { city, weight } of scored) {
    countryVotes.set(
      city.countryCode,
      (countryVotes.get(city.countryCode) ?? 0) + weight,
    );
    const continent = continentForCountry(city.countryCode);
    if (continent) {
      continentVotes.set(
        continent,
        (continentVotes.get(continent) ?? 0) + weight,
      );
    }
  }

  const nearest = [...scored].sort((a, b) => a.dist - b.dist)[0];
  const topCountry = [...countryVotes.entries()].sort((a, b) => b[1] - a[1])[0];
  const topContinent = [...continentVotes.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const countryTotal = [...countryVotes.values()].reduce((a, b) => a + b, 0);
  const continentTotal = [...continentVotes.values()].reduce(
    (a, b) => a + b,
    0,
  );

  const mixedContinents =
    continentVotes.size > 1 &&
    topContinent &&
    continentTotal > 0 &&
    topContinent[1] / continentTotal < 0.55;
  const mixedCountries =
    countryVotes.size > 1 &&
    topCountry &&
    countryTotal > 0 &&
    topCountry[1] / countryTotal < 0.42;

  const continent = mixedContinents
    ? continentFromLatLng(geo.lat, geo.lng)
    : (topContinent?.[0] ?? continentFromLatLng(geo.lat, geo.lng));

  const focusNear =
    Boolean(focusCountry) &&
    scored.some((item) => item.city.countryCode === focusCountry && item.dist < 220);

  let countryCode: string | null = null;
  if (focusNear) countryCode = focusCountry;
  else if (!mixedCountries && topCountry) countryCode = topCountry[0];
  else if (nearest && nearest.dist < 160) countryCode = nearest.city.countryCode;

  const country = countryCode
    ? cities.find((city) => city.countryCode === countryCode)
    : null;

  let cityId: string | null = null;
  if (band === "city" && nearest && nearest.dist < 120) {
    cityId = nearest.city.id;
  }

  if (selectedId && (band === "city" || band === "country")) {
    const selected = cities.find((city) => city.id === selectedId);
    if (selected && cityInView(selected, cam, viewW, viewH, 0.28)) {
      cityId = selected.id;
    }
  }

  const namedCity = cityId
    ? cities.find((city) => city.id === cityId)
    : null;

  let title = "WORLD MAP";
  if (selectedId && namedCity && namedCity.id === selectedId) {
    title = namedCity.name.toUpperCase();
  } else if (
    countryCode &&
    country &&
    (band === "country" || band === "city" || focusCountry === countryCode)
  ) {
    title = countryTitle(countryCode, country.country);
  } else if (band !== "world" && continent) title = continent;

  return {
    band,
    kicker,
    title,
    continent,
    countryCode: band === "world" ? null : countryCode,
    cityId,
    visibleCountryCodes,
  };
}

export function sparkleDelay(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  }
  return `${(hash % 96) / 10}s`;
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

export function clampCam(cam: Camera, viewW: number, viewH: number): Camera {
  const marginX = viewW / (2 * cam.scale);
  const marginY = viewH / (2 * cam.scale);
  return {
    scale: cam.scale,
    x:
      MAP_WIDTH * cam.scale <= viewW
        ? MAP_WIDTH / 2
        : clamp(cam.x, marginX, MAP_WIDTH - marginX),
    y:
      MAP_HEIGHT * cam.scale <= viewH
        ? MAP_HEIGHT / 2
        : clamp(cam.y, marginY, MAP_HEIGHT - marginY),
  };
}

export function globalTexelCssSize(scale: number) {
  return scale * WORLD_UNITS_PER_TEXEL;
}

export type WorldRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function visibleWorldRect(
  camera: Camera,
  viewW: number,
  viewH: number,
  pad = 0.28,
): WorldRect {
  const halfW = viewW / (2 * Math.max(camera.scale, 1e-6));
  const halfH = viewH / (2 * Math.max(camera.scale, 1e-6));
  return {
    x: camera.x - halfW * (1 + pad),
    y: camera.y - halfH * (1 + pad),
    width: halfW * 2 * (1 + pad),
    height: halfH * 2 * (1 + pad),
  };
}

export function clampWorldRectToMap(rect: WorldRect): WorldRect {
  const x = clamp(rect.x, 0, MAP_WIDTH - 8);
  const y = clamp(rect.y, 0, MAP_HEIGHT - 8);
  return {
    x,
    y,
    width: clamp(rect.width, 8, MAP_WIDTH - x),
    height: clamp(rect.height, 8, MAP_HEIGHT - y),
  };
}

export function worldRectToSourceRect(
  rect: WorldRect,
  sourceWidth: number,
  sourceHeight: number,
) {
  return {
    x: (rect.x / MAP_WIDTH) * sourceWidth,
    y: (rect.y / MAP_HEIGHT) * sourceHeight,
    width: (rect.width / MAP_WIDTH) * sourceWidth,
    height: (rect.height / MAP_HEIGHT) * sourceHeight,
  };
}

export function regionalRasterSize(
  sourceRect: { width: number; height: number },
  maxEdge = 768,
) {
  const srcW = Math.max(16, sourceRect.width);
  const srcH = Math.max(16, sourceRect.height);
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  return {
    width: Math.max(16, Math.round(srcW * scale)),
    height: Math.max(16, Math.round(srcH * scale)),
  };
}
