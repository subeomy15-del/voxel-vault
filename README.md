# Voxel Vault — Relic Trails

A playable browser voxel adventure with connected Overworld and Ender dimensions, building, farming, crafting, gliding and a three-anchor expedition. Original block-world visuals take direction from the requested bloxd.io reference. Single player, with local saves.

## Relic Trails update

237 usable items and 145 crafting recipes, with rendered 3D item artwork throughout the backpack and hotbar. Find three treasure outposts near home: Wayfarer Lodge, Old Watchtower and Crystal Sanctuary. Follow the map markers, open their chests with E and spend relic shards at a Relic Forge. The lodge chest gives enough shards to buy your first grappling hook. Equip it, aim at solid terrain within 24 blocks and press E to pull yourself toward it.

Forge ruby and sapphire blades, a heavy warhammer, Vanguard armor, Storm Glider and Starfall Bow. Ruby blades restore health on a hit; sapphire blades slow enemies. New deep gem veins and building materials expand crafting. Rift anchors award relic shards too, connecting both dimensions to the same equipment progression.

## Show it in class

1. Run `npm start` and open http://localhost:3001.
2. Choose **Adventure** and walk through the glowing portal near home, or use **Enter the Rift** in the lobby to resume the same adventure in its Ender dimension.
3. Walk onto the cyan launch pad on the north side of the arrival island. Hold W and look slightly down. Your starter glider opens near the top of the jump.
4. Follow the colored beacons. Press E near each of the three anchors. Every anchor awards moonstone and food; the third unlocks a Moonstone Sword, Armor and Glider.
5. Walk through the home portal, or choose **Return home with your gear** from Pause. Your inventory, equipment, health and rewards travel with you. Buildings and chests stay in their respective dimensions.

Press **V / F5** to cycle first person, third person behind, and third person front. The camera button works on touch devices too. **G** closes the glider to land; launch pads open it automatically near the apex. **E/right click** activates anchors, enters gates, uses orbs or places blocks. **Tab** opens inventory. A completed Rift Run can be replayed from its HUD button; best time is saved and the equipment reward is awarded once.

## Visual update

Animated portals, glowing crystals and navigation beams, a ringed planet, an animated Ender sky, drifting particles, improved shadows, textured materials and a subtle glow pass in High quality. Performance mode skips post-processing and reduces terrain range. The lobby uses captures from the actual game renderer. Third-person views include an animated character, held tools and glider, with camera collision near walls.

The adventure now has one shared player inventory and separate geographic snapshots for the two dimensions. Existing Overworld saves are supported. Creative and Daily remain separate game modes. The old standalone Ender save slot is left untouched; the new lobby enters the connected adventure.

## Play

Live site: https://subeomy15-del.github.io/voxel-vault/

For local development, use Node.js 20 or newer:

```sh
npm start
```

Open http://localhost:3001. No installation or build step is needed. Three.js is bundled locally. Serve over HTTP so browser modules and the terrain worker can load.

## Controls

- **WASD** move, **mouse** look, **Space** jump, swim or climb. Hold Space for repeated jumps.
- **Shift** sprint, **X** crouch, **Z** zoom, **R** short dodge.
- **Left click** attack or hold to mine. Hold with a longbow or recurve bow, then release to shoot. Crossbows reload between shots.
- **E/right click** interact, eat a held food, plant, harvest or place. Hold to place continuously. Crouch to place against a station.
- **G** open or close an equipped glider while airborne. Look down to dive; up for a slower descent.
- **1–9/wheel** select hotbar. **Middle click** selects an owned targeted block, or adds it in Creative.
- **Tab** backpack, **C** crafting, **M** map, **J** field notes, **Esc** pause.
- **F** eat the held food or an available ordinary meal; **Q** drink a legacy healing tonic.
- **T** rotate stairs; **B** place a bridge block.
- Creative flight: double tap Space; Space to rise, X to descend.

Touch controls provide a movement stick, drag look, jump, mine/attack, use, food, dodge and a glider button when equipped. Bow drawing supports looking around with a second finger.

## Horizon improvements

Holding attack with a pickaxe, axe, building block or food now keeps hitting an animal in range. Animal targeting uses the visible body bounds, ignores flowers and respects solid walls. The crosshair shows the animal’s health and whether it is close enough to hit. Left click attacks; use E/right click or F to eat.

The backpack now has an **All items** catalogue. Its **Gliders** and **Cotton** buttons show those items even when you do not own them. Inspect an item to equip an owned stack or jump directly to its crafting recipe. Pressing G without an equipped wing opens the glider catalogue. Cotton seeds can also be separated from harvested cotton in crafting.

New worlds blend hills and alpine terrain smoothly and use spaced, varied oak, birch and pine trees. New spawns face an open view. Existing worlds retain their previous terrain layout. Animals use bounded local pathfinding to navigate around obstacles, avoid water and stay near their herds; nearby herd members flee together when attacked. Animals save their positions and health, including when you leave their area. Distant animals stop simulating, and each world has a 128-animal cap.

Enemies use line of sight and follow their last known sighting briefly after losing you. Item icons have shaded materials and more distinct meat, seed and plant designs. Held tools have shaped, beveled heads and visible grips. The brand mark, catalogue and glider camera motion have also been refined.

Browser modules and worker imports carry the same release version so refreshing loads a consistent update. For future releases, run `node scripts/stamp.mjs RELEASE` before publishing.

## Food, hunting and farming

Deer drop raw venison and leather; pigs pork; cows beef and leather; sheep mutton and wool; chickens poultry and feathers; rabbits rabbit meat and hides. Animals wander, graze, flee when hurt and follow suitable held foods. Species vary by biome. Walk over their dropped items to collect them. Drops persist in saves and expire after ten minutes of active play.

Craft a furnace from eight stone, place it and interact with it. Cooking a batch requires one ingredient and one coal or timber. All six raw meats cook in furnaces; cooked meat provides substantially more food and stored energy. Campfires cook bread, mushrooms, potatoes and corn. Furnaces also turn copper, iron and gold ore into ingots, sand into glass and clay into bricks.

Food refills a 20-point hunger meter and stores up to 20 points of energy. Movement, sprinting, jumping, mining and healing use energy before hunger. With at least 16 food, health recovers gradually: one point every 2.5 seconds with reserves, every five seconds without. Low hunger prevents sprinting. Ordinary meals do not heal instantly; the older healing tonic retains its direct healing behavior.

Use a hoe on clear grass or dirt to prepare garden soil. Iron and gold hoes till a clear 3 × 3 patch. Plant seeds, carrots or potatoes with E; harvest ripe plants with E or mining. Crops grow during active play, survive saves, and return their seed when harvested early. Water within four blocks when planting shortens growth time by 25%.

| Crop | Normal growth | Harvest |
| --- | --- | --- |
| Wheat | 90 s | Wheat and seeds |
| Carrot | 75 s | Carrots |
| Cotton | 100 s | Cotton and seeds |
| Watermelon | 140 s | Watermelon and seeds |
| Honey melon | 130 s | Melon and seeds |
| Potato | 90 s | Potatoes |
| Tomato | 90 s | Tomatoes and seeds |
| Corn | 110 s | Corn and kernels |
| Berries | 100 s | Berries and seeds |

Wild plants grow in sparse local patches with open ground between them. Cotton makes cloth, which substitutes for ordinary cloth in recipes. Sugar cane refines into sugar. Melons cut into slices, which can also produce seeds. Gather ferns for fiber and wheat seeds. Flowers, lavender, mushrooms and cane add biome variety without covering every clearing.

## Special meals

Eat these crafted foods to gain an effect, including at full health. Timers pause with the game and persist in saves. The HUD shows remaining duration.

| Food | Effect |
| --- | --- |
| Swift melon smoothie | 50% faster movement for 90 s |
| Springroot salad | Higher jumps for 90 s |
| Mistberry stew | Invisibility for 75 s; attacks reveal you for 4 s; nearby enemies can still notice you |
| Prospector pie | Ore sight through rock within 14 blocks for 60 s |
| Miner’s lunch | 60% faster mining for 120 s |
| Moonberry compote | Brighter caves and nights for 120 s |
| Featherlight bread | Slow falling and no fall damage for 90 s |

Garden salad, berry pie, trail mix and venison stew provide larger ordinary meals and energy reserves. Ingredients and exact food values appear in the crafting book and backpack.

## Gliders, gold and ranged equipment

Gliders equip separately from the hotbar. Craft a canvas glider with cloth, timber and leather; upgrade it with an ore or metal ingots. They turn height into forward travel. Landing, water or G closes the wing.

| Glider | Level-look cruise | Descent |
| --- | --- | --- |
| Canvas | 11 blocks/s | 1.5 blocks/s |
| Reinforced | 14 | 1.05 |
| Coal | 11.5 | 1.4 |
| Copper | 12.5 | 1.25 |
| Iron | 14 | 1.1 |
| Gold | 16 | 1.35 |
| Diamond | 15 | 0.8 |
| Aether crystal | 16 | 0.65 |

Gold also crafts a sword, pickaxe, axe, shovel, hoe, armor, recurve bow and crossbow. Gold tools dig quickly; gold armor reduces incoming damage by 30%.

The ash longbow favors power and range; the recurve draws more quickly. Heavy and repeating crossbows trade damage for reload speed. Equip an ammunition stack in the backpack: iron arrows add damage; frost arrows slow targets for four seconds. Bows and crossbows fall back to ordinary arrows if the selected special ammunition runs out. Projectiles have gravity, collide with terrain and can hit animals.

## World, building and saving

New worlds choose safe random starting locations; Daily worlds use the UTC date as a repeatable seed. Continue preserves your position and bed spawn. Home follows the starting clearing until you use a bed. Adventure, Daily and Creative have separate saves; Overworld and Ender are connected dimensions inside each mode.

The terrain reaches from Y −64 to 95. Ore veins occur underground, with rarer ores in deeper layers. Rivers contain actual water cells; caves beneath dry land stay dry. These are original voxel algorithms with familiar sandbox mechanics, not Minecraft source code.

Build with oak, birch and pine, masonry, polished stone, glass, metals and fabric. Six material families have slabs and directional stairs with matching collision and raycast shapes. Walk onto half steps smoothly. Matching slabs combine into full blocks. A placement ghost previews shape, orientation and blocked spaces.

General recipes accept mixed timber; named wood recipes preserve species. Chests transfer up to 64 items per click and return their contents when mined. Beds set home and rest until morning. Ladders, torches and lanterns help with underground exploration.

Inventory, placed blocks, crop growth, containers, home, position, food reserves, effects, ammunition, gliders and item drops save every 15 seconds, on pause and when leaving. Animal positions and health persist across reloads. Death preserves inventory and builds. Existing version 2 saves and compatible original inventories remain readable. Existing terrain generation stays attached to its save; the new terrain and tree generator applies to new worlds.

Pause → Start a new adventure world asks before replacing an Adventure save. Browser storage belongs to the site origin; clearing site data removes saves.

## Rendering and verification

The game uses a procedural block atlas, rendered 3D item icons, articulated voxel animals, textured glider sails, food models, arrows, swaying instanced grass, clouds, day/night lighting, sun shadows and animated water. Ore sight uses a bounded incremental scan and one instanced draw. Terrain meshes run in a Web Worker; epochs and revisions keep older meshes from overwriting new edits. High and Performance settings control resolution, view range and shadows.

```sh
npm test
```

The 62 automated tests include outpost generation, one-time treasure, forge payment and proximity, grappling collision, weapon effects, complete item artwork, connected realms and the full Rift route. They also cover terrain, shapes, movement, crafting, saves, stations, all animals and meat drops, eating and regeneration, timed effects, bow charging/ammunition, every crop, hydration, glider tiers, gold armor, vegetation density, repeated tool attacks, animal navigation and persistence, terrain compatibility, smooth elevation transitions and consistent tree generation.

Browser scripts use an isolated Chrome profile on debugging port 9224 and the local server on 3001:

```sh
npm run test:browser
node tests/wildfields-browser.js
node tests/wildlands-browser.js
node tests/horizon-browser.js
node tests/touch-check.js
```

These scripts reset the isolated profile’s test worlds. They exercise real keyboard, mouse and touch inputs, reload persistence, cooking, farming, hunting, gliding, visual effects and compact layouts. Screenshots go to `/private/tmp/voxel-vault-*.png`.

Three.js r160 is bundled under its MIT license in `vendor/LICENSE`.

The browser suite also verifies treasure interaction, forging, grappling, all catalogue images and mobile inventory. Regenerate item artwork with `npm run render:items` using the isolated test browser described above.
