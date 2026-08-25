# App screenshots

Generates the iPhone screenshots in `assets/img/phone/` that the landing page uses.

```bash
node tools/screens/generate.js          # all screens
node tools/screens/generate.js today    # just one
```

Output is **1179×2556 WebP** — the native pixel size of an iPhone 15/16 Pro
screenshot (393×852 at 3×), including the iOS status bar, Dynamic Island and home
indicator. WebP at q88 is visually indistinguishable from a lossless capture and
keeps the whole set near 1MB; the same eight screens as PNG come to 4.6MB, which
is not a reasonable weight for one landing page.

## What these are

Faithful HTML rebuilds of the real Vive 2.0 screens, rendered by headless
Chromium. They use the app's own theme tokens (`src/theme.js`), its fonts
(Fraunces + Spline Sans), its icon set (MaterialCommunityIcons, through the
semantic map in `src/components/Icon.js`), and its actual copy.

They are rebuilt rather than captured because the screens are empty until you
have a physical iPhone, an Apple Watch, and several days of HealthKit history —
none of which a build machine has.

**The rule that keeps this honest: nothing here may show a state the app cannot
actually produce.** Numbers follow the real models — verdict colours from
`verdictColor()`, body scores from `metabolic.js` (`≥75` Calm, `≥50` Moderate,
else Big response), heart-rate levels from `mealResponse.js` (`classify()`:
`<10` bpm calm, `<18` moderate), sleep components and labels from
`sleepScore.js`, and the longevity total from `longevity.js`. If you change a
screen in the app, change it here too.

## Screens

| File | Screen |
|------|--------|
| `today.webp` | Today — body strip, coach, and the Response feed |
| `scan-good.webp` | A scan returning GOOD |
| `scan-avoid.webp` | A scan returning AVOID, with a better-option swap |
| `response.webp` | Meal detail — the body's verdict, from real Apple Watch HR |
| `patterns.webp` | Patterns — weekly report, foods loved and fought, experiments |
| `sleep.webp` | Nightly sleep score and its five components |
| `zone2.webp` | Weekly Zone 2 minutes |
| `recipes.webp` | The recipe library |

## Food photography

Photos come from Unsplash (free for commercial use, no attribution required) and
are listed by ID in `photos.json`. They are fetched into `cache/` at build time
and never committed.

Each ID is paired with a description of what the photo actually shows and the
meal it stands in for. **If you swap an ID, look at the photo first and make the
meal name match it** — a screenshot captioned with food it isn't showing is the
same lie as a fabricated number.

Note that Recipes has no photography, because the recipe cards in the app don't
either. The photos appear only where the app really shows one: the scan result
and the logged-meal detail, which display the user's own photo.

## Cache

`cache/` (fonts, icon font, photos, generated HTML) and `out/` are gitignored and
rebuilt on demand. Only the WebP files are committed, since those are what the
site serves. Delete `cache/` to force a re-fetch.

`CHROME_PATH` overrides the Chromium binary (defaults to `/opt/pw-browsers/chromium`).
