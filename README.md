# Voxel Vault — Wildfields Update

An open voxel sandbox with a 1,024 × 1,024 world, forests, hills, rivers, alpine terrain, dry underground caves, mining, smelting and building. The Wildfields update includes 116 usable items, farming, campfire cooking, varied world spawns, a searchable backpack, and a new lighting and texture pass.

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

## Wildfields additions

New Adventure and Creative worlds choose a random seed and a safe, dry starting clearing. Daily worlds share a repeatable seed and starting location. Continuing a saved world keeps your position and your bed spawn. Your home marker follows the starting clearing until you rest in a bed. Use Pause → Start a new adventure world to replace your Adventure save and try a fresh starting location.

The backpack has search and category filters. The 116 usable items include copper tools, diamond axes and shovels, a crossbow, two hoes, marble, basalt, cobblestone, sandstone, metal panels, fabric blocks, bookshelves, hedges and wild plants. Each item family has a distinct SVG icon with material details.

Use a stone hoe on clear grass or earth to prepare garden soil; an iron hoe prepares a clear 3 × 3 patch. Equip wheat seeds or carrots and use them on garden soil. Wheat matures after 90 seconds of active play, carrots after 75 seconds. Use E or mine a mature crop to harvest it. Growing crops survive saves and pause when the game is paused. An early harvest returns the planted seed. Wild wheat, carrots, ferns, flowers and mushrooms can be gathered in suitable biomes.

Ferns provide fiber and seeds. Weave fiber into cloth and use flowers to make colored fabric blocks. Campfires cook mushrooms and bread using timber or coal; furnaces also smelt metals. Garden stew and apple crumble provide stronger healing.

## Building controls

Oak, birch, pine, stone brick, marble and basalt each have slabs and stairs. Walk onto half-height steps without jumping. Press T while holding stairs to rotate their placement. Place a matching slab on top of another to combine them into a full block. Mining a rotated stair returns its original stair item.

A placement preview shows the block’s shape and whether the space is clear. Hold E or right click to place continuously; release to stop. Hold X to crouch when placing against chests, workbenches and furnaces. Your body cannot be enclosed by a placement. Middle click picks the material under the crosshair, including rotated stairs.

General crafting recipes accept a mix of oak, birch and pine logs, and furnaces use any of those logs as fuel. Beds and bookshelves accept mixed planks. Recipes for a named wood’s planks, slabs or stairs preserve that species.

Footsteps, mining and placement use different sounds for soft ground, wood and stone. Wind, river ambience and occasional daytime birds fade when the game is paused and follow the sound-volume setting.

## Sandbox systems

Collect timber and stone near camp. Craft a furnace with eight stone, place it, and interact to smelt ore with coal or timber fuel. Copper and iron produce ingots for tools. Sand produces glass, clay produces bricks, and grain produces bread.

Place a chest to store materials. Click a stack to transfer up to 64 items. Mining a storage chest returns its contents to your inventory. Use a placed bed to set your respawn point and rest until morning. Ladders help with mine shafts, and torches or lanterns light underground spaces.

Materials include oak, birch and pine logs/planks, granite, limestone, deepslate, polished stone, bricks, terracotta, mossy stone and glass. Tools include axes, shovels, several pickaxe tiers, swords, a bow and a compass.

The hillside entrance marked on the map slopes into dry caves. Ore occurs in veins at least eight blocks beneath the surface; deeper layers contain rarer materials. Water exists in river and lake cells, rather than a plane passing through the underground. The vertical world extends from Y −64 to 95.

## Saving

Adventure, Daily and Creative use separate localStorage saves. Daily worlds use the UTC date as a seed. Inventory, edits, growing crops, storage contents, bed spawn, starting location, position and settings persist. Saves happen every 15 seconds, when pausing and when leaving the page. Death preserves your inventory and builds.

Compatible inventories from the original `voxel-vault-player-v3` save are imported. Existing version 2 inventories and player edits remain readable. This update regenerates the natural terrain around retained edits; previous terrain and shrine geometry are not retained. Starting a new Adventure world requires the in-game replacement confirmation. Browser storage belongs to its URL/origin; clearing site data removes local saves.

## Rendering and performance

The sky changes through daylight, sunset and moonlight. Water has animated highlights and ripples. Grass is instanced per terrain chunk and sways in the wind. Clouds share a single instanced mesh. Block textures use a 32-pixel procedural atlas with dedicated patterns for bark, planks, masonry, metals, crops and stations. Held building blocks share the terrain textures; tools, lanterns, food and animals have more detailed models. Mining cracks and pickup notifications make actions easier to follow.

Terrain meshing runs in a Web Worker. Generated buffers transfer to the renderer without copying, and only exposed block faces are rendered. The renderer keeps a bounded neighborhood of chunks, prioritizes nearby and edited chunks, and uses a smaller radius underground. Worker epochs and chunk revision numbers prevent outdated work from replacing newer edits.

Water and glass have separate geometry/materials. Textures use mipmaps and anisotropic filtering. Local sun shadows are enabled on High quality; Performance mode reduces resolution, view range and shadow cost. Tree and column caches are periodically bounded during exploration.

## Verification

```sh
npm test
```

The 28 tests cover slab and stair collision, rotation, raycasts, slab merging, mixed-timber recipes, safe and varied spawns, position retention, planting and harvest accounting, crop save persistence, campfire restrictions, healing, terrain determinism and bounds, buried ores, dry caves and river water, edits, raycasts, crafting, furnace requirements, storage, save validation/migration, jump height and momentum, jump buffering and coyote time, underground gravity, collisions, projectiles and worker mesh output.

Browser scripts use an isolated Chrome profile with remote debugging on port 9224 and the local game server on port 3001:

```sh
npm run test:browser
node tests/wildfields-browser.js
node tests/touch-check.js
node tests/inspect.js
```

The browser suite clears the isolated test profile’s game storage. Do not point it at a profile containing a world you want to preserve. It exercises actual keyboard/mouse controls, stations, world edits, reloads, menus and compact layouts. Screenshots are saved to `/private/tmp/voxel-vault-*.png`.

Three.js r160 is bundled under its MIT license in `vendor/LICENSE`.
