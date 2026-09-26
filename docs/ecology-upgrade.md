# Ecological realism checkpoint — 2026-09-26

Run `npm start` in this repository, then open http://localhost:3001. Native JavaScript modules; no build step. New worlds use generator 11. Existing worlds retain their saved generator (5–10): their builds, seed and terrain are not regenerated or reset. Consequently the new terrain and vegetation appear in new version-11 worlds, not automatically in unexplored areas of older worlds. An explicit, backed-up per-region migration remains unfinished.

## Working changes

- Jungle tree anchors use a 6-block grid instead of 8 (approximately 1.78 times the candidate density), with dark broad canopies, connected buttress roots, hanging vines, ferns and mushrooms.
- Wet climate contours create shallow marsh basins with sea-level water, muddy banks, dry hummocks, reed beds and mangrove roots. Grounded movement on mud is 78% of normal speed; flying and gliding are unaffected.
- Seagrass grows on shallow beds; taller kelp grows in deeper water. Both are waterlogged, non-solid and remain below the intact surface water. Mining them leaves water behind.
- Mangroves grow only on shallow marsh or warm shoreline beds; deep ocean does not grow land trees.
- Fixed fish renderer descriptor lookup. River fish, tropical fish and pufferfish have different proportions/details, articulated tails and fins. Small local schools steer toward neighbors, avoid close players and turn at obstacles. Candidate movement must remain in water without solid collision.
- Schools spawn through the actual update loop, capped at 12 ordinary local fish. Ordinary distant fish despawn beyond 72 blocks; named/tamed fish are exempt. Existing generic wildlife spawning can add occasional fish between school checks; the schooling check itself never exceeds its cap.
- Water is more transparent. Submerged cameras hide the sky and use blue water fog or shorter green marsh visibility.
- Added original 32-pixel SVG icons and in-world plant textures for the new ecology items. The existing full item set is not yet converted to pixel art.

## Reproducible locations

Seed 7821, generator 11, Overworld. Absolute coordinates survive render rebasing.

| Scene | X | Z | Notes |
|---|---:|---:|---|
| Jungle | -5000 | -3176 | Ground height 16; canopy and understory |
| Marsh | -4840 | 1144 | Ground height 2; water, mud, reeds and mangroves |
| Seabed | -5000 | 1112 | Ground height -8; seagrass, kelp and naturally spawned fish |

Actual screenshots and browser results: `reports/upgrade-2026-09-24/ecology-{jungle,marsh,seabed}.png`, `ecology.json`. Browser fixtures use an isolated world and direct positioning; these are not screenshots of a fresh survival playthrough.

## Verification

- `npm test`: 286/286 tests pass, including generated ecology, cross-chunk preparation order, waterlogged collision, fish models/animation and bounded dry-land-safe schooling.
- `node tests/ecology-browser.js`: all three locations loaded; ocean naturally spawned seven fish; no console errors or failed requests.
- `node tests/upgrade-assets-browser.js`: 407 registered icons resolve, zero missing; far render origin and absolute position survive save/reload. Updated full contact sheet is in the reports directory.
- Earlier save isolation, 1,000 accelerated boundary checks, and two 120-second creative-flight measurements are retained in the upgrade report. Those measurements predate this ecology pass and are not current ecology performance claims.

## Limits and remaining original specification

This is an ecological realism improvement, not completion of the entire survival upgrade. Original End progression is still awaiting connection to centralized validation: `portal-rules.js` and stronghold support are work in progress and do not yet replace all old gameplay travel routes. Fresh resource gathering through dragon victory, all ten structure interiors, full mob polish, every icon in pixel art, per-region old-world migration, and all requested map/respawn/performance regressions remain incomplete.

World edits accept horizontal coordinates up to ±2^40 and vertical blocks -63 through 94. Floating rendering and wide-coordinate hashing improve distant travel; numerical support is finite. Storage is subject to the browser's IndexedDB quota, with surfaced save failures. No claim of mathematically infinite coordinates/storage or a completed 1,000-boundary manual play session is made.
