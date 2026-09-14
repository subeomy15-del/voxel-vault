# Voxel Vault — Badlands Update

Play: https://subeomy15-del.github.io/voxel-vault/

A browser voxel adventure with an Overworld → Nether → Ender Dragon journey, building, crafting, farming, gliding and local saves. Natural green foliage, textured blocks and soft shadows; no bloom.

## Badlands, knights and aura

Three new Overworld biomes join the forests, meadows, mountains, deserts and snowfields:

- Badlands, around X 240, Z 180: red sand, layered terracotta, chalk and cacti. Draugr Knights patrol even in daylight. Track the Badlands landmark from the map.
- Savanna, around X 220, Z −60: dry grassland with scattered trees.
- Marsh, around X −240, Z 200: mud, shallow pools, reeds and spiders.

Zombies and skeleton archers roam at night. Husks haunt the desert. Each draugr knight drops 1–2 Knight Hearts; combine 4 Knight Hearts with 1 Diamond Sword at a workbench to craft the Knight Sword (21 base damage).

Natural blocks grant 1 aura when mined; coal, iron and gold grant 4, diamond and moonstone grant 8. Placed blocks do not grant mining aura. Animals grant 2 aura, ordinary hostiles 12, knights 35 and the dragon 200. Creative does not earn aura.

Open **Enchant** from your backpack or the aura HUD button. Upgrades apply to a gear type, including every copy you own, and persist through travel and reloads.

- Power: +12% weapon damage per level.
- Efficiency: +12% tool mining speed per level.
- Protection: +1 percentage point per armor piece per level.

Five levels cost 25, 100, 225, 400 and 625 aura respectively. Maximum combined armor protection is 80%.

## Armor, traps and crafting

Armor has five independent slots: helm, chestplate, gauntlets, leggings and boots. Wood, stone, iron, gold, diamond and moonstone pieces are available. Click an equipped armor piece to remove it. Complete unenchanted sets provide 15%, 25%, 40%, 30%, 60% and 65% protection respectively.

Place wood, stone, iron, gold or diamond spikes on solid ground. They deal 2, 3, 5, 4 or 8 damage per second to creatures crossing them, including the player. Trap Nets slow both mobs and players. Mine traps to recover them.

Every recipe has **Craft** and **Craft All** buttons. Craft All makes as many batches as your current materials allow; it obeys workbench requirements and shows the total output. Mixed timber species work in general wood recipes.

Firecrackers produce three layered aerial bursts, startle nearby ordinary mobs and give a stronger glider boost. They do not destroy terrain. Blast Charges remain a separate mining explosive.

The Relic Forge and its exclusive gear have been retired. Existing saves convert those items to ordinary tools, gear or materials; complete armor sets become five matching pieces. Retired forge blocks become stone bricks. Existing builds, containers and saved upgrades remain readable.

## Adventure progression

Eight saved chapters guide timber gathering, workbench placement, iron tools, the Nether, the fortress guardian, the End, the dragon and the journey home. Open the Journal for your progress and the Badlands field guide.

Follow the portal near home into the Nether. Defeat the guardian at the Ashen Fortress (72, −48) to unseal its End portal. Find the Dragon Altar at (0, −7) on the arrival island and press E. Bring your own weapons, arrows, food, armor and glider.

Destroy the four healing crystals, dodge breath attacks and swoops, and strike when the dragon lands. Its health, destroyed crystals and first-victory rewards persist. Return through the End portal to the Nether; use the Nether arrival portal to go home.

The optional Rift Run uses gliders and launch pads to reach three island anchors. Outposts offer travel supplies and building materials.

Adventure has tougher and faster hostiles, more frequent nighttime spawns, faster hunger loss and slower healing. Ore veins are scarce and separated by barren regions. Coal, iron, gold and diamond occur underground; moonstone is found in the End. Lava fills Nether pools and some deepest caves. Lava and magma hurt on contact.

## Controls

- WASD / mouse: move and look. Space: jump, swim or climb.
- Shift: sprint. X: crouch. R: dodge. Z: zoom.
- Left click: attack or hold to mine. Hold and release with a bow to shoot.
- E / right click: interact, eat, plant, harvest or place.
- Tab: backpack. C: crafting. M: map. J: journal. Esc: pause.
- V / F5: cycle first-person and third-person cameras.
- G: toggle an equipped glider while airborne.
- 1–9 / wheel: select hotbar. T: rotate stairs. B: bridge placement.
- F / Q: eat food / drink healing tonic.
- Creative: double-tap Space to fly; Space rises, X descends.

Touch controls provide movement, drag look and action buttons. Worlds save in your browser; starting a replacement Adventure asks first.

## Local development and verification

Requires Node.js 20 or newer. No dependencies or build step are needed.

```sh
npm start
npm test
npm run test:browser
npm run test:dragon
```

Open http://localhost:3001. Browser tests use an isolated Chrome profile on debugging port 9224, exercising actual rendering, crafting, gear, aura upgrades, saves, mobile layouts and portal travel. Screenshots go to /private/tmp/voxel-vault-*.png.

Run `npm run render:items` to regenerate shared 3D item artwork. Before publishing, run `node scripts/stamp.mjs RELEASE` to keep browser modules, terrain worker imports, styles and entry assets synchronized. Three.js r160 is bundled locally under its MIT license in vendor/LICENSE.
