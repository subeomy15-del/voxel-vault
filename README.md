# Voxel Vault — Living Wilds

Play: https://subeomy15-del.github.io/voxel-vault/

A browser voxel adventure with an Overworld → Nether → Ender Dragon journey, building, crafting, farming, gliding and local saves. Joinable lobbies support shared Creative worlds, Bed Wars and Manhunt. Natural green foliage, textured blocks and soft shadows; no bloom.

## Living Wilds update

New worlds have large climate regions, varied forests, rivers, oceans and 13 deterministic ruin families. Existing worlds retain their terrain and builds. Browser saves use a worker-backed durable store with recovery snapshots and JSON export/import.

Press **H** to use a firecracker directly from your backpack; clicking its hotbar slot or the touch boost button also works. **G** opens the equipped glider immediately; looking turns flight without the old steering delay. Inventory, storage, crafting, equipment and enchant counts update in place without replacing menus or unchanged icons. Auto graphics starts phones on Low and typical desktops on Medium.

The public site is a static GitHub Pages deployment. Public multiplayer rooms additionally require an HTTPS Voxel Vault server configured in Server settings; GitHub Pages cannot run that server.

## Build Together

Choose **Play together** or a multiplayer mode on the home screen. Create a public room or an invite-only room for 2–8 builders, or join using a six-character code. Guests mark themselves ready, then the host starts the world. Friends can join a running Creative world while there is space. Bed Wars and Manhunt require at least two players and lock their roster once the match starts.

- Shared placement and mining across the Overworld, Nether and End; late joiners receive existing builds.
- Visible teammates with names, smooth movement and held items. Press **P** or the crew beacon button to mark your position.
- Crew milestones at 25, 100 and 300 placed blocks. Everyone has unlimited Creative materials and flight.
- Automatic host transfer when the host leaves; connection recovery sends a fresh world snapshot. Reloading the same tab reconnects your session while it is still available. Building waits during a lost connection.
- Solo inventory, progress and saves stay separate and are restored when you leave. Shared mode focuses on building: solo bosses, storage and Rift challenges remain in solo worlds, and Blast Charges are disabled in shared worlds.

Rooms and builds are held in server memory. They end when the last player leaves, all disconnected players expire (two-minute grace), or the server restarts. A room supports up to 50,000 edited block positions. Public rooms appear in the server browser; private codes are invitations, so only share them with people you want to join.

### Bed Wars

Two teams, Ember and Tide, battle across floating islands. Protect your bed, bridge toward the enemy island, and mine their bed with your pickaxe. You respawn after three seconds while your bed survives; once it is gone, your next death eliminates you. The last team standing wins. A ten-minute round ends in a draw if neither team wins.

Each player starts with a sword, pickaxe, 32 blocks and 12 coins. Stay near your gold generator tile to earn two coins every three seconds. Press **K** (or tap **Base shop**) to buy 16 blocks for 8 coins, an iron sword for 24, or armor for 20. Base foundations and your own bed are protected. Place with right click / E; hold left click with a pickaxe to mine, or a sword to attack an opponent in reach. PvP health, equipment, block budgets, bed destruction and respawns are checked by the server.

### Manhunt

The host is the runner and everyone else is a hunter. The runner gets a 20-second head start. Then a six-minute chase begins: touch three marked beacons in any order and return to the starting beacon to escape. Hunters follow a live directional tracker. Catch the runner or let the clock run out to win as hunters. Hunters respawn after three seconds; the runner has one life. You have a sword, pickaxe and 32 building blocks; mining terrain replenishes the block pouch.

Both modes use separate match loadouts, show a result screen, and let the host start another round. Menus do not pause a multiplayer match. Leaving forfeits your place. Solo crafting, portals, hunger and damage from ordinary game creatures do not apply to these matches.

### Running a multiplayer server

```sh
npm start
# Or use port 3002 for a separate preview:
npm run preview
```

Open `http://localhost:3001`. The server listens on all network interfaces; friends on the same network can open `http://YOUR_LAN_IP:3001` and use the same lobby code. Share that address instead of `localhost`. Use `PORT` and `HOST` to customize the listener.

For internet play, run this Node server on a public HTTPS host that supports long-lived HTTP responses. Serving the game and API from the same host needs no extra configuration. Static GitHub Pages alone cannot run multiplayer: open **Server settings** in Build Together and enter your hosted server URL. The server permits the existing GitHub Pages origin by default; set `ALLOWED_ORIGINS` to a comma-separated list for other frontends. Invite links include a configured server address for the recipient to review. Proxy SSE routes without buffering and allow long-lived connections. No third-party runtime dependencies or accounts are needed.

## Daily expeditions

Daily World now has three tracked goals: gather 30 blocks, craft five batches and place 20 blocks. Complete all three to earn 45 aura and three bread once per daily seed. Progress and claimed rewards survive reloads and resetting the same daily world. The HUD points to the next useful action. A new seed arrives at 00:00 UTC.

## Endless Horizons

Explore and build beyond the old 511-block border in every dimension. Terrain streams around the player and distant chunks are unloaded; new continents rise beyond the original island’s ocean. Existing island terrain and builds remain intact. Distant positions, beds, animals and dropped items persist on reload. Vertical build limits still apply.

A carved stone title and brass vault crest accompany a softer terrain horizon. Terrain meshing uses cached transparency and direct neighbor lookups, while cache cleanup retains nearby columns and trees to reduce regeneration during exploration.

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

## Cloudstep Circuit and movement upgrade

Choose **Play Parkour** on the main menu for an original floating garden course: warm-up hops, rising ledges, sprint gaps, a launch pad, four checkpoints and a finish arch. Move to start the timer; checkpoints record splits, falls return you to your last checkpoint with a short fade, and completion records a local personal best. **R** retries the checkpoint; the pause menu can restart the full run. Pausing stops this solo timer. Your other worlds are saved separately and restored when you leave. The course is currently solo; Creative, Bed Wars and Manhunt keep their joinable multiplayer lobbies.

The shared movement controller adds coyote time, jump buffering, release-sensitive jumps, air momentum, firm ground braking, safe ledge mantling and collision-aware steps. Hold Space for full jump height or release early for short hops. Mantling requires forward movement and a recent jump near a low ledge with enough space for the entire player; it cannot pull you through ceilings. Mobile Parkour uses the **»** button to toggle sprint.

Settings include sensitivity, FOV, hold/toggle sprint and crouch, independent camera-motion switches, three graphics presets and individual graphics controls. Chunk distance, baked voxel ambient occlusion, shadow maps, FXAA and pooled particle density change live. Sustained slow rendering gradually reduces resolution and recovers it when headroom returns. Master, music and effects volume control separate Web Audio buses. All textures and synthesized audio are original; no external audio assets are required.

Implementation: `movement.js` owns collision and parkour movement; `parkour-course.js` provides the same deterministic geometry to `World` and the terrain worker; `parkour.js` / `game-timer.js` manage runs; `parkour-ui.js` / `parkour-view.js` render course feedback. Rendering uses `particles.js`, `camera-motion.js`, `render-performance.js`, existing chunk meshes and the procedural atlas. `settings.js` normalizes and migrates persistent preferences. Add further course definitions and corresponding world geometry to extend the course catalogue. Optional future work includes more courses, moving platforms and networked parkour races.

## Controls

- WASD / mouse: move and look. Space: jump, swim or climb.
- Shift: sprint. Ctrl / X: crouch (C also crouches in Parkour). R: dodge, or retry a checkpoint in Parkour. Z: zoom.
- F3: FPS, frame time, draw calls, triangles and chunk/particle counts.
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
npm run test:infinite
npm run test:multiplayer
npm run test:competitive
npm run test:parkour
npm run test:settings
npm run test:render
```

Open http://localhost:3001. The multiplayer and competitive browser tests default to `http://localhost:3002`; set `VOXEL_TEST_URL` to your server address. It uses three isolated browser contexts to check invites, readiness, shared edits, avatars, reconnects, late joins, host migration and mobile layouts. Browser tests use an isolated Chrome profile on debugging port 9224, exercising actual rendering, crafting, gear, aura upgrades, saves, mobile layouts and portal travel. The newer Parkour/settings/render suites default to debugging port 9234; set `VOXEL_CDP_PORT` to use another port for these or the multiplayer suites. Screenshots go to /private/tmp/voxel-vault-*.png.

Run `npm run render:items` to regenerate shared 3D item artwork. Before publishing, run `node scripts/stamp.mjs RELEASE` to keep browser modules, terrain worker imports, styles and entry assets synchronized. Three.js r160 is bundled locally under its MIT license in vendor/LICENSE.

### Release 33: prepare and explore

Craft a brewing station and empty flasks at a workbench, fill flasks near water, then brew normal, strong or extended potions. Use a potion directly from the inventory or hotbar. Altars offer three XP investments with visible probabilities; rerolling replaces the current enchantment package.

Craft a fishing rod, aim at water and press E to cast; press E again when the splash signals a bite. Sea catches can reveal treasure charts. Existing outposts now have merchants with limited daily stock. Craft and activate waystones with E for travel between registered stones in the same realm.
