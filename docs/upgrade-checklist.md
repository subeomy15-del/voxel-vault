# Survival upgrade checkpoint — updated 2026-09-26

Latest existing-world ocean visuals and persistent wrecks: [ocean-release.md](ocean-release.md).

Earlier biome-wide detail: [biome-detail-upgrade.md](biome-detail-upgrade.md). Generator 12 is now the default; versions 5–11 stay pinned.

Earlier ecology changes and verification: [ecology-upgrade.md](ecology-upgrade.md). Overall survival specification remains incomplete.

Repository: /Users/danielyoo/voxel-vault. Entry: index.html → src/main.js → Game/Renderer.
Baseline: 267/267 Node tests pass (localhost binding requires sandbox escalation).
Source backup: reports/upgrade-2026-09-24/source-before.tgz. This is NOT a browser-save backup.
Browser saves must be preserved by transactional backups before any migration. No terrain/schema migration yet.
Pre-existing untracked world-progression.js, lingo-loop and soak-progress.json are unrelated and untouched.

## Dependency checklist

- [x] Save protection: fail closed on IndexedDB errors; isolate aborted worker transactions; consistent edit/metadata snapshots; regression tests.
- [x] Streaming: bound pending geometry and revision caches; chunk-local vertices; floating render origin; coordinate limits; regression and sustained browser checks.
- [ ] Reconcile biome reference, aliases, four cave variants and coverage locations. Reference fetch currently unavailable (HTTP 402).
- [ ] Audit/extend ten persistent structure families and loot.
- [ ] Replace direct Nether → End with crafting, blazes, pearls, Eyes, stronghold and validated twelve-frame portal; safe rollback/loading.
- [ ] Dragon persistence, crystal and re-entry tests; encounter polish.
- [ ] Mob animation audit and full icon contact sheet.
- [ ] Connected exploration features and journal.
- [ ] Performance comparison, 1,000-boundary test, real sustained flight, gameplay screenshots, fresh survival victory.

## Audit findings

- Stack: native ES modules, vendored Three.js, Web Workers, Node HTTP server; no build dependency.
- Version 2 saves and generator versions 5–10. Old generation is pinned. IndexedDB snapshots retain two recovery snapshots and before-replacement backup; localStorage legacy migration remains.
- Generation/collision runs synchronously through World.get/prepare; missing render meshes are not interpreted as air. Worker meshes sample neighboring voxels; edits dirty adjacent borders.
- Baseline renderer had absolute Float32 geometry (no actual floating origin), one worker and one upload per frame; ready results and chunkVersions need explicit lifetime bounds.
- Baseline terrain hash functions folded coordinates to 32 bits. WORLD_LIMIT=Infinity overstates numerical support.
- Existing biome/structure registries and substantial terrain tests; cave display only cave/deep_cave, not all requested stone variants.
- Nether fortress is a simple courtyard, with a direct End gate. Game.travel, walking gates, interaction, pause-menu return and mode start all need a shared policy.
- Dragon already has an articulated model and circle/breath/swoop/perch states. Starting/rematching restores crystals; first-victory reward is guarded.
- Existing crafting, enchanting, potions, farming, fishing, gliding, quick-use fireworks, doors, ladders, maps, beds and storage must remain functional.
- Item registry resolves PNGs plus three SVG leaves; asset/animation visual QA remains necessary.

No complete upgrade, fresh survival victory, or measured 60 fps claim is made by this checkpoint.

Generator 11 now adds wide-coordinate hashes, Snowy Cedar Forest, four cave rock variants, coherent biome subfamilies, wetland basins and denser jungle ecology. Tests locate every surface biome and cave variant on three seeds. Versions 5–10 remain pinned. The biome-coverage audit document still describes the earlier version-10 baseline.

Stronghold stamping and portal-policy helpers have been drafted but gameplay transition call sites remain unconnected; do not treat the new progression ingredients as a completed survival route.
