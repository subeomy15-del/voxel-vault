# Realism pass — 2026-09-27

Live destination: https://subeomy15-del.github.io/voxel-vault/

This is an additional visual/ecology release, not completion of the original full survival specification. Existing terrain versions and save schemas remain unchanged. No reset or regeneration is required.

## Implemented through the running game

- Original crisp material patterns: clustered leaves, grass blades, sand ripples, differentiated stone and soil; subtle material relief on Medium/High, disabled on Low.
- Drifting procedural cloud banks, restrained moving cloud shadows, climate-sensitive rain/snow, wet surface shading and gradual drying. Weather derives from the saved seed/time. Deserts stay dry. Precipitation uses one bounded buffer, hides indoors/underwater, and respects the particles setting. It does not accumulate snow or change blocks.
- Biome-colored canopy fringe and ground foliage, small rock instances, sparse branching sea fans, existing kelp and seagrass. Details are deterministic and render-only, avoid edited columns and their neighbors, and dispose with chunks. Aquatic detail remains capped at 4 instances/chunk on Low and 8 otherwise; canopy at 4/16. Ocean plants deliberately leave open seabed.
- Moving underwater light patterns; ocean swell ambience, muffled underwater ambience and rain noise using the existing audio system.
- Passive reef rays spawn in ocean/beach water within the existing aquatic population budget, with paired animated fins, tail, eyes and real fish drops. Their collision bounds cover their model. Ordinary animals gain ear, head, wing and tail motion.
- The previous release's persistent broken shipwrecks, interiors and one-use salvage remain available. This pass does not alter their terrain stamps or reset loot.
- Module URLs advance to `?v=39` so refresh loads the new build.

Main implementation files: `natural-materials.js`, `terrain-lighting.js`, `weather.js`, `weather-view.js`, `textures.js`, `scenery.js`, `visual-habitat.js`, `mesh.js`, `render.js`, `audio.js`, `models.js`, `creature-model.js`, `wildlife.js` under `src/`.

## Actual evidence

298 Node tests pass. New checks cover deterministic climate weather, bounded precipitation, indoor/underwater suppression, ray articulation and model/collision bounds.

`tests/ocean-visual-browser.js` exercised a generator-10 world and saved/reloaded seed 7821, 17 diamonds, a chest holding 9 wood, and a gold-block build. All were preserved. No runtime errors or failed requests. Reports were copied into `reports/realism-2026-09-27/` to preserve the prior release's evidence.

`tests/realism-browser.js` compared the published commit fe3c385 with the upgrade at the same seed, positions, camera, time, viewport and Medium setting. It also checked visible rain/snow and the runtime ray model. Both runs had zero console errors and failed requests. Actual screenshots and JSON are in `reports/realism-2026-09-27/` (`before-*`, `after-*`, `rain.png`, `snow.png`, `ray.png`).

Device: Apple M4, 10 logical cores; Headless Chrome 153, ANGLE Metal; 1280×800. Medium uses 4-chunk surface render distance; underwater residency reduced to 25 chunks. Each scene sampled 5 stationary seconds after settling. Simulation was frozen for equal time/position, while streaming/rendering continued; these are rendering comparisons, not full gameplay benchmarks. The separate save test ran normal game updates.

| Scene | p95 before / after (ms) | Draw calls before / after | Resident chunks | Pending queue |
|---|---:|---:|---:|---:|
| Ocean underwater | 17.5 / 17.2 | 45 / 45 | 25 | 0 |
| Forest | 17.4 / 17.3 | 82 / 103 | 81 | 0 |
| Snow | 17.6 / 17.5 | 99 / 135 | 81 | 0 |

p50 was 16.7 ms throughout. Heap snapshots ranged 31–70 MB before and 32–65 MB after; GC timing makes these unsuitable as a memory improvement claim. Diagnostics clamp frame delta at 50 ms, so do not use these figures to rule out longer stalls. No sustained 1,000-boundary traversal was repeated in this visual pass, and no new fresh-survival dragon playthrough was performed. Broader progression work remains incomplete as recorded in the upgrade checklist.

Run: `npm start`, open http://localhost:3001. Tests: `npm test`. Browser checks require isolated Chrome CDP on port 9224 (override `VOXEL_CDP_PORT`); run `node tests/realism-browser.js`. Baseline comparison uses `REALISM_LABEL=before VOXEL_TEST_URL=http://localhost:3013` with the prior committed build served there. Never use a personal save profile for the fixture tests.
