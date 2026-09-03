import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { feature } from "@rapideditor/country-coder";
import { matchCity } from "./citiesIndex";

type TimelineRecord = {
  startTime: string;
  endTime: string;
  visit?: {
    hierarchyLevel?: string;
    topCandidate?: {
      semanticType?: string;
      placeID?: string;
      placeLocation?: string;
    };
  };
};

type Spot = {
  placeId: string;
  lat: number;
  lng: number;
  semantic: string;
  hierarchy: string;
  visitCount: number;
  dwellMs: number;
  firstSeen: string;
  lastSeen: string;
  years: string[];
};

type GeocodedSpot = Spot & {
  countryCode: string;
  country: string;
  flag: string;
  cityId: number | null;
  city: string;
  admin: string;
  cityLat: number;
  cityLng: number;
  cityPopulation: number;
  cityDistanceKm: number;
};

const GEO = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
};

function parseGeo(value: string | undefined) {
  if (!value) return null;
  const match = GEO.exec(value);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

function parseTime(value: string) {
  return Date.parse(value);
}

function formatDays(ms: number) {
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

function countryOf(lat: number, lng: number) {
  const info = feature([lng, lat]);
  const code = info?.properties?.iso1A2 ?? "??";
  const rawName = info?.properties?.nameEn ?? "Unknown";
  return {
    countryCode: code,
    country: COUNTRY_NAMES[code] ?? rawName,
    flag: info?.properties?.emojiFlag ?? "",
  };
}

function collectSpots(records: TimelineRecord[]) {
  const spots = new Map<string, Spot>();

  for (const record of records) {
    const candidate = record.visit?.topCandidate;
    const geo = parseGeo(candidate?.placeLocation);
    const placeId = candidate?.placeID;
    if (!geo || !placeId) continue;

    const start = parseTime(record.startTime);
    const end = parseTime(record.endTime);
    const dwellMs = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
    const year = record.startTime.slice(0, 4);
    const existing = spots.get(placeId);

    if (!existing) {
      spots.set(placeId, {
        placeId,
        lat: geo.lat,
        lng: geo.lng,
        semantic: candidate?.semanticType ?? "Unknown",
        hierarchy: record.visit?.hierarchyLevel ?? "0",
        visitCount: 1,
        dwellMs,
        firstSeen: record.startTime,
        lastSeen: record.endTime,
        years: year ? [year] : [],
      });
      continue;
    }

    existing.visitCount += 1;
    existing.dwellMs += dwellMs;
    if (record.startTime < existing.firstSeen) existing.firstSeen = record.startTime;
    if (record.endTime > existing.lastSeen) existing.lastSeen = record.endTime;
    if (year && !existing.years.includes(year)) existing.years.push(year);
  }

  return [...spots.values()];
}

function geocodeSpots(spots: Spot[]): GeocodedSpot[] {
  return spots.map((spot) => {
    const country = countryOf(spot.lat, spot.lng);
    const city = matchCity(spot.lat, spot.lng);
    return {
      ...spot,
      ...country,
      cityId: city?.cityId ?? null,
      city: city?.name ?? "Unknown",
      admin: city?.adminCode ?? "",
      cityLat: city?.loc.coordinates[1] ?? spot.lat,
      cityLng: city?.loc.coordinates[0] ?? spot.lng,
      cityPopulation: city?.population ?? 0,
      cityDistanceKm: city ? Number(city.distanceKm.toFixed(2)) : 0,
    };
  });
}

function groupTree(spots: GeocodedSpot[]) {
  const countries = new Map<
    string,
    {
      code: string;
      name: string;
      flag: string;
      visitCount: number;
      dwellMs: number;
      firstSeen: string;
      lastSeen: string;
      cities: Map<
        string,
        {
          id: string;
          name: string;
          admin: string;
          lat: number;
          lng: number;
          population: number;
          visitCount: number;
          dwellMs: number;
          firstSeen: string;
          lastSeen: string;
          years: string[];
          isHome: boolean;
          isWork: boolean;
          spots: GeocodedSpot[];
        }
      >;
    }
  >();

  for (const spot of spots) {
    const country =
      countries.get(spot.countryCode) ??
      {
        code: spot.countryCode,
        name: spot.country,
        flag: spot.flag,
        visitCount: 0,
        dwellMs: 0,
        firstSeen: spot.firstSeen,
        lastSeen: spot.lastSeen,
        cities: new Map(),
      };

    country.visitCount += spot.visitCount;
    country.dwellMs += spot.dwellMs;
    if (spot.firstSeen < country.firstSeen) country.firstSeen = spot.firstSeen;
    if (spot.lastSeen > country.lastSeen) country.lastSeen = spot.lastSeen;

    const cityKey = String(spot.cityId ?? `${spot.city}:${spot.admin}:${spot.countryCode}`);
    const city =
      country.cities.get(cityKey) ??
      {
        id: cityKey,
        name: spot.city,
        admin: spot.admin,
        lat: spot.cityLat,
        lng: spot.cityLng,
        population: spot.cityPopulation,
        visitCount: 0,
        dwellMs: 0,
        firstSeen: spot.firstSeen,
        lastSeen: spot.lastSeen,
        years: [],
        isHome: false,
        isWork: false,
        spots: [],
      };

    city.visitCount += spot.visitCount;
    city.dwellMs += spot.dwellMs;
    if (spot.firstSeen < city.firstSeen) city.firstSeen = spot.firstSeen;
    if (spot.lastSeen > city.lastSeen) city.lastSeen = spot.lastSeen;
    for (const year of spot.years) {
      if (!city.years.includes(year)) city.years.push(year);
    }
    city.isHome ||= /home/i.test(spot.semantic);
    city.isWork ||= /work/i.test(spot.semantic);
    city.spots.push(spot);

    country.cities.set(cityKey, city);
    countries.set(spot.countryCode, country);
  }

  return [...countries.values()]
    .map((country) => ({
      ...country,
      cities: [...country.cities.values()]
        .map((city) => ({
          ...city,
          years: city.years.sort(),
          spots: city.spots.sort((a, b) => b.dwellMs - a.dwellMs),
        }))
        .sort((a, b) => b.dwellMs - a.dwellMs),
    }))
    .sort((a, b) => b.dwellMs - a.dwellMs);
}

const SKIP_COUNTRIES = new Set(["IN"]);
const CITY_ALIASES: Record<string, string> = {
  "New York City": "New York",
};

function roundCoord(value: number) {
  return Math.round(value * 10000) / 10000;
}

function toPublicCatalog(tree: ReturnType<typeof groupTree>) {
  const countries = tree
    .filter((country) => !SKIP_COUNTRIES.has(country.code))
    .map((country) => ({
      code: country.code,
      name: country.name,
      flag: country.flag,
      visitCount: country.visitCount,
      dwellMs: country.dwellMs,
      firstSeen: country.firstSeen.slice(0, 10),
      lastSeen: country.lastSeen.slice(0, 10),
      cities: country.cities.map((city) => ({
        id: `${country.code}-${city.id}`,
        name: CITY_ALIASES[city.name] ?? city.name,
        admin: /^[A-Z]{2}$/.test(city.admin) ? city.admin : "",
        countryCode: country.code,
        country: country.name,
        flag: country.flag,
        lat: roundCoord(city.lat),
        lng: roundCoord(city.lng),
        population: city.population,
        visitCount: city.visitCount,
        spotCount: city.spots.length,
        dwellMs: city.dwellMs,
        firstSeen: city.firstSeen.slice(0, 10),
        lastSeen: city.lastSeen.slice(0, 10),
        years: city.years,
      })),
    }));

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      countries: countries.length,
      cities: countries.reduce((n, country) => n + country.cities.length, 0),
      visits: countries.reduce((n, country) => n + country.visitCount, 0),
    },
    countries,
  };
}

function printSummary(
  tree: ReturnType<typeof groupTree>,
  stats: { records: number; visits: number; spots: number },
) {
  const cityCount = tree.reduce((n, country) => n + country.cities.length, 0);
  const first = tree.map((country) => country.firstSeen).sort()[0]?.slice(0, 10);
  const last = tree.map((country) => country.lastSeen).sort().at(-1)?.slice(0, 10);

  console.log(
    `${tree.length} countries · ${cityCount} cities · ${stats.spots} spots · ${stats.visits} visits`,
  );
  console.log(`${stats.records} timeline records  ${first} → ${last}`);
  console.log("");

  for (const country of tree) {
    console.log(
      `${country.flag} ${country.name}  ${formatDays(country.dwellMs)}  ${country.firstSeen.slice(0, 4)}–${country.lastSeen.slice(0, 4)}  ${country.cities.length} cities`,
    );
    for (const city of country.cities.slice(0, 12)) {
      const admin = /^[A-Z]{2}$/.test(city.admin) ? `, ${city.admin}` : "";
      const tags = [city.isHome ? "home" : "", city.isWork ? "work" : ""].filter(Boolean);
      const tag = tags.length ? `  [${tags.join(", ")}]` : "";
      console.log(
        `  ${city.name}${admin}  ${formatDays(city.dwellMs)}  ${city.years[0]}–${city.years.at(-1)}  ${city.spots.length} spots  ${city.visitCount} visits${tag}`,
      );
    }
    if (country.cities.length > 12) {
      console.log(`  … ${country.cities.length - 12} more cities`);
    }
    console.log("");
  }
}

async function main() {
  const source = path.resolve(
    process.argv[2] ?? path.join(homedir(), "Downloads", "Timeline.json"),
  );
  const outDir = path.resolve(process.argv[3] ?? "travel-studio");

  const records = JSON.parse(await readFile(source, "utf8")) as TimelineRecord[];
  const visits = records.filter((record) => record.visit?.topCandidate?.placeLocation);
  const spots = geocodeSpots(collectSpots(records));
  const tree = groupTree(spots);

  await mkdir(outDir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    source,
    stats: {
      records: records.length,
      visits: visits.length,
      uniqueSpots: spots.length,
      cities: tree.reduce((n, country) => n + country.cities.length, 0),
      countries: tree.length,
    },
    countries: tree,
  };
  const outFile = path.join(outDir, "timeline-places.json");
  await writeFile(outFile, JSON.stringify(payload, null, 2));

  const publicCatalog = toPublicCatalog(tree);
  const catalogFile = path.resolve("src/content/travel/catalog.json");
  await mkdir(path.dirname(catalogFile), { recursive: true });
  await writeFile(catalogFile, `${JSON.stringify(publicCatalog, null, 2)}\n`);

  printSummary(tree, {
    records: records.length,
    visits: visits.length,
    spots: spots.length,
  });
  console.log(`wrote ${outFile}`);
  console.log(`wrote ${catalogFile} (${publicCatalog.stats.cities} public cities, skipped ${SKIP_COUNTRIES.size} countries)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
