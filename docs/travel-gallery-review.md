# Expanded travel galleries

The galleries contain 63 photographs and one silent golf video across 12
destinations. This expansion adds 44 photographs to the previous selection.
Public media, including the video poster, totals 27,611,522 bytes (26.33 MiB).

| Destination | Photos | Videos |
| --- | ---: | ---: |
| Ko Phangan | 11 | 0 |
| Chiang Mai | 11 | 0 |
| Ko Samui | 3 | 0 |
| Bangkok | 7 | 0 |
| Ninh Bình | 14 | 1 |
| Hanoi | 8 | 0 |
| Tokyo | 4 | 0 |
| Kyoto | 1 | 0 |
| Osaka | 1 | 0 |
| Rome | 1 | 0 |
| Vatican | 1 | 0 |
| San Gimignano | 1 | 0 |

Haad Rin pier belongs to Ko Phangan. The imported Poggibonsi stop is
canonicalized as San Gimignano using the original visit coordinates, while
preserving the visit count and year. Residence classifications are unchanged.

Images retain their original framing and aspect ratio. Public WebP copies
are limited to 1,800 pixels on the longest edge, with sensitive metadata
removed. Originals and private source manifests remain in ignored
`travel-studio/media-review/`. Portrait selection uses Google Photos' existing
Tanmay label and visual quality review. No people were removed or cropped out.

The viewer loads one main item at a time, keeps the active thumbnail visible
on narrow screens, supports arrows/Home/End/Escape, and restores focus to the
gallery opener. The golf video remains click-to-play, without autoplay or
eager video loading.

## Validation

- 124 unit tests passed, including canonical mappings, file availability,
  image dimensions, metadata removal, and per-file/total size limits.
- All 19 travel Playwright tests passed, including mobile navigation,
  focus restoration, map gestures, decorative layers, and reduced motion.
- Desktop and mobile pan tests recorded no long tasks above 50 ms.
- Production build passed. Twelve existing lint warnings in unrelated game
  files remain.
- Desktop and mobile gallery screenshots were visually inspected.

![Desktop gallery](screenshots/travel-expanded/desktop-gallery.webp)

![Mobile gallery](screenshots/travel-expanded/mobile-gallery.webp)

## Review still outstanding

This is a reviewed expansion, not an exhaustive library audit. The approximate
targets of ten public photographs and thirty private originals per destination
have not been reached everywhere. Japan expansion, the remaining Europe trips,
Mexico, Australia, and US travel destinations still need further review.
Destinations without suitable reviewed media remain empty.

Chrome blocked Google's original-download host with `ERR_BLOCKED_BY_CLIENT`
during the Japan review. Two further Tokyo candidates were recorded privately
but are excluded from the public counts because their originals were not saved.

A Ninh Bình cave video was inspected across all 480 frames and retained
privately. Its audio could not be reviewed in this session, so it is excluded
from the website. No additional unreviewed videos are published.

iCloud personal-library backup completeness has not been established. Selected
Google Photos items show original-quality backups; this does not prove that all
iCloud items have matching Google copies. Shared-album review is also partial.
Neither photo library was modified or reorganized.
