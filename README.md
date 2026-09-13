# Voxel Vault — Dragon Isles

A single-player browser voxel adventure with connected Overworld, Nether and Ender dimensions, a fightable Ender Dragon, building, crafting, farming and gliders. Cool forest greens, muted blue skies, textured blocks and simple item silhouettes give the game a calmer look. Saves stay in your browser.

Play: https://subeomy15-del.github.io/voxel-vault/

## Fight the Ender Dragon

1. Walk through the portal near home to enter the **Nether**. Find the **Ashen Fortress** at X 72, Z −48 and use its portal to reach the Ender. Ender portals return you to the fortress; the Nether arrival portal leads home.
2. Find the **Dragon Altar** at X 0, Z −7 on the arrival island. Press **E** nearby to awaken the dragon. Your first challenge supplies a longbow and 64 arrows.
3. Shoot the four healing crystals on the obsidian pillars. Each surviving crystal slowly restores the dragon's health.
4. Use a bow while it circles. Keep moving during breath attacks, dodge its swoop, and attack with a sword when it lands. Step outside the marked circle before a tail slam.
5. The first victory awards a **Dragon Egg**, 16 moonstone, 10 diamonds and a Forge Seal. Return through the portal with your trophy and gear.

The dragon has 260 health and becomes more aggressive below 40% health. Its health and destroyed crystals survive saving and travel. Death lets you retry from the altar. Rematches do not duplicate the first-victory rewards or starter bow kit. Build cover, bring food and craft armor before a difficult fight.

The separate **Rift Run** remains available: use cyan launch pads and a glider to reach three island anchors, press E to activate each, and earn moonstone equipment. Close the glider with G to land. The challenge records your best time.

## Five-resource progression

- **Coal:** furnace fuel only. It cannot be placed or used to craft equipment. Campfires burn timber.
- **Iron:** ore for smelting into tool and building materials.
- **Gold:** deeper ore for fast tools, bows and armor.
- **Diamond:** deep gem for durable equipment and building blocks.
- **Moonstone:** Ender material for advanced equipment, orbs and shared storage.

The release has 218 usable catalogue items and 131 recipes. Older copper stacks convert to iron; Aether crystal, ruby, sapphire and emerald stacks convert to diamond; violet crystal converts to moonstone. Equivalent older equipment, storage contents and placed mineral blocks retain their value through conversion. Old resource identifiers remain readable by the save loader.

## Explore and build

Find Wayfarer Lodge, Old Watchtower and Crystal Sanctuary near home. Open treasure chests with E and trade diamonds at a Relic Forge. The lodge chest supplies enough diamonds for a grappling hook: equip it, aim at solid terrain within 24 blocks, and press E.

The Relic Forge also offers sacred gear: Dawnblade, Aegis Armor, Seraph Glider and Sacred Orb. Save diamonds from deep mines, outposts and Rift anchors for these final-tier rewards. Ender islands now spawn swift Enderlings and ranged Void Archers; cold Overworld nights can call in Frost Howlers.

Build with wood, masonry, slabs, stairs, glass, fabrics and metals. Matching slabs stack, stairs rotate, ladders climb and beds set your respawn point. Chests store stacks; moonstone chests share storage across dimensions. The placement preview shows blocked spaces before spending a block.

Nine crops grow during active play. Plant on tilled soil; nearby water speeds growth. Hunt six animal species and cook their meat in a furnace. Food restores hunger and energy; crafted meals can grant timed movement, mining or vision effects.

## Controls

- **WASD / mouse:** move and look. **Space:** jump, swim or climb.
- **Shift:** sprint. **X:** crouch. **R:** dodge. **Z:** zoom.
- **Left click:** attack or hold to mine. Hold with a bow, then release to shoot.
- **E / right click:** interact, grapple, eat, plant, harvest or place.
- **Firecrackers:** craft 4 with 1 coal and 2 sunstone sand, equip them, then press E for a bright burst. While gliding, press E to boost forward and upward; each boost has a short recovery.
- **Blast Charges:** craft one with 3 coal, 2 iron ingots and 2 sand. Equip it and press E to arm a timed mining explosion. Clear the area before it detonates.
- **V / F5:** first person, third person behind, third person front.
- **G:** open or close an equipped glider while airborne.
- **1–9 / wheel:** select hotbar. **Middle click:** select a targeted owned block.
- **Tab / C / M / J:** backpack, crafting, map, field notes. **Esc:** pause.
- **F / Q:** eat food / drink a healing tonic. **T:** rotate stairs. **B:** place a bridge block.
- **Creative flight:** double tap Space, then Space to rise or X to descend.

Touch controls provide movement, drag look and action buttons. First-person tools and third-person characters have animated models. High quality adds shadows, antialiasing and restrained glow; Performance reduces terrain range and skips post-processing.

## Run locally

Use Node.js 20 or newer. No dependency installation or build step is required.

```sh
npm start
```

Open http://localhost:3001. Serve over HTTP so modules and the terrain worker load correctly. Three.js r160 is bundled locally under its MIT license in vendor/LICENSE.

## Verification

```sh
npm test
npm run test:browser
node tests/dragon-browser.js
```

The 68 unit tests cover connected saves, migration of old resources, the five-ore progression, furnace fuel, dragon phases and projectiles, destroyed healing crystals, persistent boss health, one-time rewards, terrain, building, movement, combat, farming and gliding.

Browser scripts use an isolated Chrome profile on debugging port 9224 and the local server on 3001. They reset only the isolated profile's test worlds and exercise real controls, rendering, item images, save reloads and compact layouts. Screenshots go to /private/tmp/voxel-vault-*.png.

Regenerate 3D item artwork with `npm run render:items`. Before publishing, run `node scripts/stamp.mjs RELEASE` to keep browser modules, the terrain worker and assets on the same release.

Inventory, terrain edits, containers, crops, food, gear, animals and realm progress save locally. Clearing site storage removes those saves. Starting a new Adventure asks before replacing that save.

The backpack uses square item slots, an equipment area with a character preview, and a separate nine-slot hotbar. Select a hotbar destination, then select an item. Crafting opens the recipe book. All-item browsing and search remain available.

Advanced recipes require a placed workbench within 3.5 blocks. Craft the workbench by hand from 6 timber. Planks, torches, basic arrows, cloth and simple ingredient preparation remain hand recipes. Mining stone by hand is slow; use pickaxes for rock, axes for timber and shovels for soil. Cracks, chips and the mining progress meter show your progress.
