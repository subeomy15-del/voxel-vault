# Release 37 — creatures, biomes and controls

- 51 selectable creature types, including the existing Voxel Vault roster, camel, NPC, 67, Bobino Musculino and Capitano Explovissimo. Event characters use original simplified models and passive behavior.
- Appearance selector for sheep, cow, horse, wolf, wildcat, cave golem, undead variants, stalker and NPC. Passive creature appearances persist with the world.
- 31 surface biomes plus Caves and Deep Caves. Added Grassy/Hilly Plains, Meadows, Maple/Aspen/Pear/Plum/Bluebell/Cedar/Spectral Forests, Many Cactus Desert, Red Sand Desert and Oasis.
- Terrain version 10 is used for newly created worlds. Saved versions 5–9 remain unchanged. The Creative explorer includes backup export and a confirmed new-world action.
- U opens the creature/biome explorer; Creative can summon creatures and search/travel to biomes. N opens character colors and equipment. Z opens three emotes. G shows the player list. I opens invite information.
- Faster ground acceleration and braking; C/Ctrl/Caps Lock/backslash crouch, V zoom, P/F5 camera, O settings, Tab inventory, Q drop, 1–9/0 ten-slot solo hotbar, middle-click or Alt-click Creative pick block. L glides, Y pings. B opens the Bed Wars shop or solo catalogue.
- Original crisp pixel textures, SVG voxel illustrations and new hotbar styling. Inverted look and character colors are saved on the device.

Reference checks: live Bloxd.io Controls panel and update log (2026-09-23), https://github.com/Bloxdy/code-api/blob/main/MOB_SETTINGS.md and https://bloxd-io.fandom.com/wiki/Category:Biomes . This is an independent implementation, not full Bloxd.io parity. Account cosmetics, all game-specific actions, custom scripting, replay/free-camera tools, exact creature AI, taming and two-player camel riding are not implemented. Multiplayer retains its authoritative mode inventories and does not allow the solo summon/travel tools.

Validation: full Node tests, including legacy terrain fixtures, all-biome generation, save migration, creature appearances, drops, controls, multiplayer and new panel behavior. Chrome successfully loaded the game; full interactive visual playtesting was interrupted by browser availability/user activity.
