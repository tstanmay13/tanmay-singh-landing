# Travel life atlas

`/travel` is an explorable 8-bit world for two related stories:

- places Tanmay has visited;
- places that are home chapters.

It is a pixel overworld, not a conventional map product. The terrain is a
low-resolution equirectangular raster so markers still align with recognizable
geography.

## Public place model

The generated Timeline aggregate remains in
`src/content/travel/catalog.json`. It contains visit counts, dwell aggregates,
city coordinates, and observed visit years.

Editorial meaning lives separately in
`src/content/travel/curatedPlaces.ts`. That layer owns:

- canonical aliases;
- explicit importance and featured status;
- world/country/metro visibility;
- visited, lived, and current-home relationships;
- residence order;
- editable hub membership;
- empty media arrays ready for future real photos.

`src/content/travel/catalog.ts` merges generated and manual records, resolves
aliases, and returns one canonical `TravelPlace` per location. A residence can
retain independent travel years without creating a second city record. Austin
is the reference case: one canonical place, a past-home relationship, and the
Austin/Central Texas hub center.

## Residence chronology

The public life-path for this release has four chapters:

1. Murphy, Texas — past home
2. Richardson, Texas — past home
3. Austin, Texas — past home and travel hub
4. New York City, New York — current home

No residence dates are encoded. Timeline `firstSeen` and `lastSeen` values are
visit evidence and must never be presented as residence dates.

Earlier personal history mentioned outside this four-marker release
(Uttar Pradesh, Boston, and Bengaluru) is not part of the current path. It can
be added without changing the model after the intended Uttar Pradesh
granularity is chosen.

## Explicit travel hubs

Hub membership is curated rather than inferred from population or distance.
The current hubs are:

- Dallas–Fort Worth, including Murphy and Richardson as distinct home
  chapters at metro zoom;
- Austin / Central Texas, with Austin as both home and hub center;
- Houston;
- Tokyo;
- Kansai, grouping Osaka and Kyoto.

World view summarizes hub members. Country view keeps the hub dominant while
showing small member markers. Metro view expands members and separates dense
markers deterministically.

## Semantic zoom and labels

The semantic levels are world, country, and metro. Place metadata controls the
first level at which a place is eligible.

Labels are resolved in screen space without DOM measurement. Candidates are
sorted by selected place, current home, past homes, hover/focus, featured hub,
significant destination, then minor place. A label is accepted only when its
rectangle fits the viewport and avoids prior labels, reserved chrome/card
rectangles, and a small collision pad. World view keeps a tight persistent
label budget. Country view shows lived markers without permanently labeling
every DFW satellite. Metro view expands those chapters.

The header switches between TRAVEL MAP and LIFE PATH. Lived and visited
places stay distinguishable by marker shape, not only color. LIFE PATH
clusters Murphy and Richardson at broad zoom.

## Interaction and camera

Camera state is ref-driven and rendered through `requestAnimationFrame`.
Pointer interaction has an explicit six-pixel drag threshold. Dragging uses
pointer capture, freezes hover, and consumes the resulting synthetic click.
Hover and selection remain separate.

Wheel and pinch zoom preserve the world point under their screen-space anchor.
Buttons zoom around viewport center. Camera flights use short interruptible
400–700 ms easing. New pointer input cancels a flight immediately. Labels hide
during motion and return after a short settle delay.

The filters are intentionally small:

- `ALL` keeps the current camera;
- `LIVED` frames the four chapters and shows the dotted chronology path;
- `VISITED` emphasizes actual travel history;
- leaving `LIVED` restores the prior camera.

## Terrain and ambient motion

`terrainPaint.ts` quantizes the source earth raster with theme-backed colors,
then adds restrained land shades, dryland cactus speckle, vegetation groves,
coast bands, and sparse water glints without changing the land/water boundary.
Hub markers use chunky SNES-style buttons; lived chapters keep diamond and
house shapes so the distinction is not color-only.

`terrainRipple.ts` affects only the terrain canvas. It keeps at most three
short-lived, pixel-quantized ripples and writes bounded dirty rectangles from
an immutable base raster. Pins, labels, routes, panels, and navigation are
never part of the displaced canvas.

Ambient movement pauses while the document is hidden. Reduced-motion mode
removes nonessential ocean, cloud, marker, camera, and ripple animation.

## Media

Real photos are intentionally not part of this release. Every place starts
with empty `photos` and `media` arrays. Cards render
`STILLS // COMING SOON` and never borrow another city’s placeholder image.

The future publishing path remains: approved real media can be attached to the
canonical place without changing marker identity, residence history, hubs, or
visit counts.

## Validation

Run:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

Browser tests cover drag/click suppression, hover/selection separation, hub
expansion, residence chronology, contextual cards, anchored zoom, camera
interruption, stacking hit-tests, Escape, reduced motion, touch pinch, and
console errors.

Raw Timeline data, home GPS, unpublished spots, and original media remain
private under the ignored local travel-studio workflow.
