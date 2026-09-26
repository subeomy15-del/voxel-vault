# Detailed biome pass — 2026-09-26

This pass expands habitat detail across all 32 existing surface biomes. It is not completion of the larger game/progression specification.

## Implemented in gameplay

- Every surface biome has an explicit ground-cover palette, density, rock material, fallen-log eligibility and atmospheric visibility in `src/biome-detail.js`.
- Forests: patches of soil beneath litter, moss, mushrooms and ferns; fallen timber and grounded rock outcrops. Aspen uses birch timber; conifers use pine. Cherry groves have fallen blossom carpets. Bluebell forests have clustered blue flowers. Spectral, cedar, maple, aspen, pear, plum and blossom forests have appropriate lighting palettes instead of a plains fallback.
- Plains and meadows: different densities and combinations of grasses and flowers, with open gaps and occasional limestone outcrops.
- Arid regions: branching cactus forms, dry brush, pebbles, sandstone or terracotta outcrops. Savannah uses dry grass and occasional fallen timber.
- Cold regions: shallow snow layers over terrain and outcrops. Mountains expose stone/gravel on steep slopes, with scree and higher snow deposits.
- Shores and rivers: pebbles, reeds and occasional driftwood. Existing mangrove, marsh mud, kelp, seagrass and fish systems remain connected.
- Details are persistent generated blocks with real item identities, icons, harvesting and collision appropriate to their shape. Low carpets and loose pebbles do not act as full block obstacles. Large outcrops/logs use collision blocks.
- Feature anchors use absolute seeded coordinates, small bounded footprints, slope checks, protected structure areas and existing chunk meshing. No per-block scene objects are added.

## Save compatibility

New worlds use generator 12. Worlds created with generator 11, and all older supported versions, remain pinned. No old world is reset or silently migrated. New ground detail therefore requires a new world; introducing new generation into old unexplored regions remains an unfinished separate migration task. Generator-12 encounter IDs now survive save/load validation.

## Files

Generation: `src/biome-detail.js`, `src/world.js`, `src/biome-registry.js`.
Presentation/content: `src/data.js`, `src/textures.js`, `src/block-style.js`, `src/scenery.js`, `src/atmosphere-profiles.js`, `src/item-assets.js`, seven new SVG assets in `assets/items/`.
Persistence: `src/save.js`.
Verification: `tests/biome-detail.test.js`, `tests/biome-detail-browser.js`, version expectations in existing tests, `scripts/audit-biome-detail.mjs`.

## Evidence and running

Run `npm start` from `/Users/danielyoo/voxel-vault`, then open http://localhost:3001. Run `npm test` for regressions.

`reports/upgrade-2026-09-24/biome-detail-locations.json` contains generated locations and observed chunk contents for all 32 biomes, seed 7821 / generator 12. Tests verify actual generated detail, registered materials, negative-coordinate chunk order, edited detail after eviction and pinned save versions.

`biome-detail-browser.json` records five actual rendered scenes: Bluebell Forest, Cactus Fields, Snowy Cedar Forest, Meadows and Cherry Blossom Forest. Their screenshots are `biome-*.png` in the same report directory. Browser scenes use isolated creative fixtures and direct positioning, not a survival playthrough. No console errors or failed requests occurred. The asset browser check resolves 414 icons with zero missing assets and verifies distant-coordinate save/reload.

Frame telemetry in the browser report is a short scene sample, not a sustained performance benchmark. Realistic climate simulation, a finished whole-game visual overhaul, the original complete dragon progression, and the full original acceptance suite remain incomplete.
