import { buildMapSprites } from "./mapLife";
import { paintTerrain, type TerrainPalette } from "./terrainPaint";
import { MAP_WIDTH, MAP_HEIGHT } from "./geo";

// Build one immutable, world-aligned raster off the UI thread. Camera motion
// only transforms this texture; it never resamples or reclassifies geography.
self.onmessage = (event: MessageEvent<{ source: ImageBitmap; palette: TerrainPalette; destinations: Array<{ x: number; y: number }> }>) => {
  const { source, palette, destinations } = event.data;
  const terrain = paintTerrain({ source, palette, width: MAP_WIDTH, height: MAP_HEIGHT });
  source.close();
  const bitmap = (terrain.baseCanvas as OffscreenCanvas).transferToImageBitmap();
  const spots = buildMapSprites(terrain, destinations);
  (self as unknown as Worker).postMessage({ bitmap, spots }, [bitmap]);
};
