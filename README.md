# Voxel Vault — Frontier Update

An open voxel sandbox with a 1,024 × 1,024 world, forests, hills, rivers, alpine terrain, dry underground caves, mining, smelting and building. There are no shrine or campaign requirements.

## Play

Live site: https://subeomy15-del.github.io/voxel-vault/

For local development, use Node.js 20 or newer:

```sh
npm start
```

Open http://localhost:3001. No package installation or build step is required. The Three.js dependency is bundled locally. Serve the project over HTTP; opening index.html directly cannot load browser modules or the terrain worker.

## Controls

- **WASD** move, **mouse** look, **Space** jump, swim upward, or climb ladders. Hold Space for repeated jumps.
- **Shift** sprint, **X** crouch or descend in Creative flight, **Z** hold to zoom.
- **Left click** attack or hold to mine. **E/right click** use an item, interact with a station, or place a block.
- **1–9/mouse wheel** select a hotbar slot. **Middle click** selects the targeted block if owned, or adds it in Creative.
- **Tab** backpack, **C** crafting, **M** map, **J** field notes, **Esc** pause.
- **F/Q** food/healing, **B** bridge block, **R** short dodge.
- Creative flight: double tap Space, then Space to rise and X to descend.

Touch controls provide a movement stick, drag-to-look, jumping, mining, interaction, healing and dodging.

## Sandbox systems

Collect timber and stone near camp. Craft a furnace with eight stone, place it, and interact to smelt ore with coal or timber fuel. Copper and iron produce ingots for tools. Sand produces glass, clay produces bricks, and grain produces bread.

Place a chest to store materials. Click a stack to transfer up to 64 items. Mining a storage chest returns its contents to your inventory. Use a placed bed to set your respawn point and rest until morning. Ladders help with mine shafts, and torches or lanterns light underground spaces.

Materials include oak, birch and pine logs/planks, granite, limestone, deepslate, polished stone, bricks, terracotta, mossy stone and glass. Tools include axes, shovels, several pickaxe tiers, swords, a bow and a compass.

The nearby hillside entrance slopes into dry caves. Ore occurs in veins at least eight blocks beneath the surface; deeper layers contain rarer materials. Water exists in river and lake cells, rather than a plane passing through the underground. The vertical world extends from Y −64 to 95.

## Saving

Adventure, Daily and Creative use separate localStorage saves. Daily worlds use the UTC date as a seed. Inventory, edits, storage contents, bed spawn, position and settings persist. Saves happen every 15 seconds, when pausing and when leaving the page. Death preserves your inventory and builds.

Compatible inventories from the original `voxel-vault-player-v3` save are imported. Existing version 2 inventories and player edits remain readable. This update regenerates the natural terrain around retained edits; previous terrain and shrine geometry are not retained. Starting a new Adventure world requires the in-game replacement confirmation. Browser storage belongs to its URL/origin; clearing site data removes local saves.

## Rendering and performance

Terrain meshing runs in a Web Worker. Generated buffers transfer to the renderer without copying, and only exposed block faces are rendered. The renderer keeps a bounded neighborhood of chunks, prioritizes nearby and edited chunks, and uses a smaller radius underground. Worker epochs and chunk revision numbers prevent outdated work from replacing newer edits.

Water and glass have separate geometry/materials. Textures use mipmaps and anisotropic filtering. Local sun shadows are enabled on High quality; Performance mode reduces resolution, view range and shadow cost. Tree and column caches are periodically bounded during exploration.

## Verification

```sh
npm test
```

Tests cover terrain determinism and bounds, buried ores, dry caves and river water, edits, raycasts, crafting, furnace requirements, storage, save validation/migration, jump height and momentum, jump buffering and coyote time, underground gravity, collisions, projectiles and worker mesh output.

Browser scripts use an isolated Chrome profile with remote debugging on port 9224 and the local game server on port 3001:

```sh
npm run test:browser
node tests/touch-check.js
node tests/inspect.js
```

The browser suite clears the isolated test profile’s game storage. Do not point it at a profile containing a world you want to preserve. It exercises actual keyboard/mouse controls, stations, world edits, reloads, menus and compact layouts. Screenshots are saved to `/private/tmp/voxel-vault-*.png`.

Three.js r160 is bundled under its MIT license in `vendor/LICENSE`.
