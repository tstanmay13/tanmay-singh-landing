# Travel globe — product and architecture

Personal travel atlas on tanmay-singh.com. This page is allowed to look unlike the rest of the site; the site can later be adapted *to* this, not the other way around.

Status: ingest transform exists (`npm run travel:timeline`). Public globe is still unbuilt.

## What it is

A **souvenir globe** you spin. Pins are **places you’ve been**. Zoomed out you only see cities; zooming in reveals more specific spots, with a hard cap so the globe never becomes confetti. Click a pin and a **place story** lifts off: header, curated photos/videos, and visit chapters if you went back years later.

Photos and videos come from your life dump (Google Photos). **Google Timeline** tells us *where you were* at the time a file was shot. AI picks the good ones, lightly enhances winners, and you approve in chat (“use this picture for Kyoto”). Visitors never see GPS crumbs, rejects, or the dump.

Polarsteps is out of scope. Timeline is enough for location.

---

## Gemini and Google Photos

Yes: **Gemini can view Google Photos** — inside Google’s products.

- **Ask Photos** in the Google Photos app (Gemini-powered search/chat over your library).
- **Gemini app** with Google Photos connected (`@Google Photos`). It can find “Kyoto 2024” shots and show them *in Gemini*.

That does **not** give this website a library dump.

- Since 31 Mar 2025, third-party apps cannot read a user’s full Photos library. The old `photoslibrary.readonly` path is gone.
- The remaining **Picker API** is “user selects some albums in Google’s UI.” Fine for a few extras, useless for “all photos ever.”
- Gemini chat export does **not** include the photos. On Android you can sometimes drag **one** image at a time out of Gemini.
- There is no Google Photos → S3 bucket. Drive is the wrong tool. GCS/R2 would just be “you uploaded Takeout somewhere that isn’t your laptop.”

**Use Gemini as a human scout if you want** (“best shrine photos from Kyoto”), not as the ingest pipeline.

**Actual ingest:** Google Takeout of Photos (original quality) + Timeline export from your phone (`Timeline.json` via Maps → Your Timeline → Export). Originals stay on disk. The site only stores published winners.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Place** | Public pin. A city by default; a neighborhood/spot only when it deserves its own story. Identity is the location, not the trip. Tokyo 2022 and Tokyo 2025 are the same Place. |
| **Visit** | One time you were at that Place. Stacked inside the pin. “Tuesday 2pm, ramen in Kyoto” is a Visit (or a finer Place once you zoom in). |
| **Media** | A photo or video attached to a Visit (and thus a Place). |
| **Dump** | Private originals: Takeout + Timeline. Never public. |
| **Candidate** | A dump file time-matched to a Place/Visit, not yet published. |
| **Winner** | Media you approved for the public story. Lightly enhanced derivative. |
| **Studio** | Not a web admin. Your laptop + this chat (later: “use this picture”). |
| **Globe** | The public page: a desk-object Earth with pins and lifting story cards. |

---

## Locked decisions

1. **Audience:** Hybrid. Public curated globe; private dump/GPS/AI.
2. **Pin:** Place, not trip, not GPS point.
3. **Revisits:** One pin per place; visits stack inside.
4. **Density:** Zoom LOD + cluster/cap. Photos never create pins.
5. **Click:** Place story (header + curated media + visit chapters).
6. **Look:** Souvenir globe, not a map app. Real-ish coastlines so Kyoto is on Japan; no Google chrome.
7. **Location source:** Google Timeline only (no Polarsteps).
8. **Photo source:** Takeout (and/or a local copy). Match to Timeline **by time**.
9. **Originals:** Local disk (cheapest way for AI to see everything). Cheap bucket only if it physically doesn’t fit. Published winners on **Vercel Blob**.
10. **AI:** Sees local **thumbnails**, not 12MP API uploads. Heuristics first (blur, near-dup), then vision on remaining candidates.
11. **Enhance:** Light exposure / color / crop on **winners only**. No generative fill, no face-restore. Videos: pick, don’t “enhance.”
12. **Approval UI:** None. Chat later (“use this one”). You are the privacy filter for other people in frame.
13. **This page’s visual system** is independent of the current pixel/CRT site.

---

## Public product

**Route (proposed):** `/travel`

**Page object:** A stylized Earth you grab and spin (Three.js / R3F). Sparse land/water, themeable later. Pins are physical tacks. Camera dollies in on zoom: city pins at low zoom, spot pins past a threshold, with clustering so on-screen pin count stays bounded.

**Story card:** Lifts off the pin (not a 2D map overlay chrome dump).

- Place name, maybe first/last year
- Hero media
- If multiple visits: chapters (2022 / 2025)
- Small set of photos + videos per visit, not the cluster

**Not public:** Timeline paths, raw coordinates list, rejected shots, EXIF dumps, “Tuesday 2:03:17 PM” unless you wrote it into the story.

**Nav:** New item when this ships. Don’t restyle Drive/Work/Games to match until you say so.

---

## Data model (published)

Git-friendly catalog. Media bytes are not in git.

```
Place
  id, slug, name
  grain: country | city | spot
  lat, lng
  minZoom            // LOD
  firstSeen, lastSeen
  visits[]
    id, startedAt, endedAt
    title?, body?     // optional story text
    media[]
      id, type: photo | video
      blobUrl          // enhanced public file
      posterUrl?       // video
      capturedAt
      caption?
```

Store published catalog as JSON (or MDX later) under something like `src/content/travel/`. The globe reads this at build/request time. Editing a pin in chat = edit this catalog + upload/replace Blob.

Private matching state (dump paths, scores, rejects) lives **only on disk**, e.g. `travel-studio/` gitignored, never deployed.

---

## Pipeline (local, not a web app)

### Timeline → countries / cities (done)

Do **not** keep 27k raw segments in the app. The script loads Timeline once, then throws it away.

```bash
npm run travel:timeline -- ~/Downloads/Timeline.json
```

What it does:

1. Reads visits only (ignores GPS path crumbs).
2. Dedupes by Google `placeID` (~2k unique spots).
3. Country from `@rapideditor/country-coder` (offline polygons).
4. City from an in-memory world-cities index (`all-the-cities`, 135k places): most populous city ≥15k people within 25km, else nearest named place.
5. Writes `travel-studio/timeline-places.json` (gitignored — it includes home GPS).

The JSON is `countries[] → cities[]` in `src/content/travel/catalog.json` (committed, city centroids only). Re-run the script after a new Timeline export and the globe updates. Full spots with GPS stay in gitignored `travel-studio/`. India is omitted until you add Banaras by hand in `src/content/travel/manualCities.ts`.

Your export is a flat JSON array of `{ startTime, endTime, visit | activity | timelinePath }`, not the older Takeout `semanticSegments` wrapper.

```
Takeout photos/videos + Timeline.json
        │
        ▼
  1. Index dump (hash, size, EXIF time, duration)
        │
        ▼
  2. Parse Timeline (on-device Timeline.json and/or legacy Takeout)
        │      visits / path points with time + lat/lng (+ place name if present)
        ▼
  3. Time-match: media timestamp → overlapping visit or nearest point
        │      timezone + clock-skew rules
        ▼
  4. Cluster matches into Place drafts (city default; spots only if dense + named)
        │
        ▼
  5. Rank media per place (cheap local, then AI on thumbnails)
        │
        ▼
  6. You approve in chat → light enhance → Vercel Blob
        │
        ▼
  7. Write published catalog → deploy → globe pins update
```

### Timeline formats to support

Google moved Timeline on-device. Desktop Takeout often **no longer** has it.

- **Current:** phone export `Timeline.json` (`semanticSegments`, visits, path).
- **Legacy:** Takeout `Records.json` / monthly `timelineObjects` if you still have an old archive.

Parser should sniff the file, not assume one schema.

### Time matching

- Prefer `DateTimeOriginal` / `CreateDate` from EXIF; fall back carefully (WhatsApp strips EXIF; screenshots lie).
- Convert to UTC with the file’s offset if present; otherwise assume the Timeline local time of that day.
- Match window: photo time inside a visit segment, else nearest path point within ~15–30 minutes (tunable).
- Bursts: collapse near-dups with perceptual hash before AI sees them.
- Unmatched files: private “unknown place” bucket — do not pin.

### Place promotion

- Reverse-geocode (or Timeline semantic place names) → city/country.
- City Places are the default public pins.
- A spot Place is created only when a cluster is tight, named, and you (or later chat) promote it.
- Zoom LOD uses `grain` / `minZoom`.

### AI pick

1. Local: laplacian blur, exposure clip, phash duplicates, tiny files, screenshots.
2. Vision on small JPEGs: keep / maybe / no; hero vs supporting; closed eyes; landmark vs dinner-table spam.
3. Per Place, keep a short ranked list (e.g. 8–20 candidates). You pick winners in chat.
4. Same idea for video: sample frames + duration, pick clips, don’t transcode the whole dump until a clip is a winner.

Optional scout: you use Gemini Ask Photos to name albums/moments; we still need the files on disk to publish.

### Enhance (winners only)

- Autocrop / straighten, mild exposure and color.
- Keep the original in the dump; Blob gets the derivative.
- Never run this on the full library.

---

## Site architecture (when we build)

Fits the existing Next.js 15 app without forcing the pixel design system onto this route.

| Piece | Choice | Why |
|-------|--------|-----|
| Public UI | `src/app/travel/` client globe | Isolated visual system |
| Catalog | `src/content/travel/` | You already seed homepage content from `src/content/` |
| Media CDN | Vercel Blob (public) | Published files only; originals never go here |
| Ingest | Local scripts under `scripts/travel/` | Serverless is the wrong place for 200GB Takeout |
| AI | Local thumbs → cheap vision (AI Gateway / existing keys later) | Don’t upload originals |
| Auth | None | Studio is the laptop + git |
| Supabase | Not used for this | That’s games. Don’t overload the free project with a media library |

Globe tech (proposed): React Three Fiber + a simple Earth mesh, custom pins, camera dolly. Avoid Mapbox/MapLibre so it does not become a map app.

Cron/keep-alive and game tables stay untouched.

---

## Privacy and cost

- Dump and Timeline never ship to Vercel.
- Public media is only what you approved.
- Faces of other people: no auto-blur; approval is the filter. Be careful with kids/strangers.
- Cost stays low if AI sees thumbnails and Blob stores winners only. The failure mode is “upload Google Photos to the internet twice.”

---

## Phased build (later)

**Not starting until you say go.**

1. **Globe shell** — spin, mock city pins, one story card, zoom LOD with fake data.
2. **Catalog format** — real JSON, Blob upload helper, a couple of hand-approved places.
3. **Ingest index + Timeline parser + time-match** — run locally against a small slice first, then full Takeout.
4. **Rank + AI pick** — candidates file you can talk to in chat.
5. **Enhance + publish** — winners → Blob → catalog.
6. **Video** — same match/pick path, web-friendly poster + playback on the card.
7. Optional: Photos Picker for “add three shots from last weekend” without another Takeout.

---

## What you need on disk before ingest is real

1. **Timeline:** from the phone, not the desktop Takeout (unless you still have a pre-migration archive).
2. **Photos/videos:** Google Takeout, original quality, or any complete local copy.
3. Disk space for the dump + a `travel-studio/` working directory.

Until those exist, the only honest thing to build is the globe with mock pins.

---

## Open, non-blocking

- Exact pin/story-card motion and materials (brass tack vs photo chip on the globe).
- Whether visit chapters show clock times or just dates.
- `/travel` vs another slug.
- Whether a published Place can be unpublished without deleting Blob objects.
