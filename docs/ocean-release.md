# Ocean and wreck update — 2026-09-26

Live destination: https://subeomy15-del.github.io/voxel-vault/

This visual update applies to existing worlds. It does not reset saves or change their terrain generator. The earlier generator-12 ground-block additions still apply only to new worlds; the new render-only foliage, water and atmosphere improvements also work in older worlds.

## Working changes

- Water now uses actual meshed water-column depth for shallow/deep color and transparency, softer wave normals, a restrained shallow foam pattern, and a visible surface from below. Underwater fog is deeper blue, with shorter visibility in marshes.
- Sparse, seeded visual seagrass and taller kelp have original tapered fronds and gentle current animation. Kelp patches leave open sandy areas. Density is capped per chunk (4 aquatic instances on Low, 8 otherwise). Existing voxel kelp remains unchanged. Ground foliage uses biome palettes across the surface biome catalogue.
- Visual foliage never writes blocks or saves. It avoids edited columns and immediate neighbors, including chunk boundaries, and disappears with chunk eviction.
- Saltwake shipwrecks are actual persistent blocks with collision: breached hulls, exposed ribs, broken bow planks, missing deck sections, partly collapsed stern cabins, snapped/fallen masts, seabed timber debris, ladders and flooded holds. A salvage chest awards iron, gold, arrows and a breathing potion once.
- Wrecks are added near players at deterministic submerged locations only when their full footprint is clear of prior edits. They never replace an existing build or restamp a previously installed wreck. Supported uneven seabeds, open side breaches and deck access keep the hold reachable. The shipwreck record and block edits share the existing save checkpoint. At most 512 installed wreck records per world; installation currently applies to solo Overworld play.
- Release module URLs are refreshed to `?v=38` so the existing live URL loads the new code after refresh.

## Validation

295 Node regression tests pass. Targeted tests cover deterministic shipwreck anchors, multi-chunk footprints, flooded entry/hold spaces, edit protection, single-use salvage after save/reload, visual density bounds, old terrain versions and water depth attributes.

The isolated browser test used an existing generator-10 world. Its seed (7821), 17 diamonds, chest containing 9 wood, and gold-block build survived save/reload. No runtime errors or failed requests occurred. A separate browser test verified automatic wreck installation through normal gameplay updates; screenshot: `reports/upgrade-2026-09-24/shipwreck.png`.

Screenshots and result JSON are in `reports/upgrade-2026-09-24/`. Short scene telemetry is not a sustained performance guarantee. The original complete survival progression/dragon specification remains unfinished; this release does not claim that broader work is complete.

Run locally with `npm start`, then open http://localhost:3001. Run tests with `npm test`.
