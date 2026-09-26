# Biome generation audit

Generator 10; actual World.biome/height sampling, seeds 7821, 42; grid ±6000 in steps of 96, dry locations beyond the legacy center. Reproduce with `node scripts/audit-biome-coverage.mjs`. Locations are test evidence, not automatically safe teleports.

Reference: [Bloxd community biome page](https://bloxd-io.fandom.com/wiki/Biomes), retrieved through indexed search on 2026-09-25 (crawl two months old; direct fetch blocked). It lists 21 surface biomes and four cave variants. Current completeness is not claimed from that crawl.

Aliases normalize Cactus Fields → many_cactus_desert and Red Desert → red_sand_desert in this audit; no duplicate biomes were added.

Generation: src/regional-climate.js, src/expanded-biomes.js, src/world.js. Tree geometry/assets: src/regional-trees.js, src/landscape.js, src/textures.js and assets/items.

| Reference biome | Stable game ID | Seed 7821: x, y, z | Existing tree templates | Ground asset |
|---|---|---|---|---|
| Plains | meadow | -432, 7, -432 | oak | grass |
| Grassy Plains | grassy_plains | -528, 14, -336 | oak | grass |
| Meadows | flower_meadow | -336, 9, -528 | open / no trees | grass |
| Maple Forest | maple_forest | 1104, 17, 432 | oak, amber | grass |
| Pear Forest | pear_forest | 528, 8, -336 | pear | grass |
| Aspen Forest | aspen_forest | 624, 21, -336 | birch | grass |
| Plum Forest | plum_forest | -48, 11, -720 | plum | grass |
| Bluebell Forest | bluebell_forest | 48, 15, -624 | oak | grass |
| Autumn Forest | autumn_forest | 912, 15, -48 | amber, amber, birch | grass |
| Cherry Blossom Forest | cherry | 816, 19, 1296 | cherry | grass |
| Desert | desert | -1008, 8, 432 | open / no trees | sand |
| Cactus Fields | many_cactus_desert | -1104, 8, 432 | open / no trees | sand |
| Red Desert | red_sand_desert | 528, 23, -1296 | open / no trees | red_sand |
| Snowy Plains | snow_plains | 528, 22, 432 | pine | snow |
| Snowy Pine Forest | snow | -912, 27, -528 | pine, tall_pine | snow |
| Snowy Cedar Forest | MISSING | — | — | — |
| Frozen Badlands | frozen_badlands | -48, 36, 2064 | open / no trees | snow |
| Spectral Forest | spectral_forest | 240, 19, -624 | spectral | grass |
| Pine Forest | conifer | 912, 14, -144 | conifer, tall_conifer | grass |
| Cedar Forest | cedar_forest | -48, 7, -624 | tall_conifer | grass |
| Jungle | jungle | -528, 24, 432 | jungle, great_oak | grass |

## Separate Voxel Vault additions / terrain variants

| Rivers | river | 336, 10, 816 | palm | gravel |
| Oakwood Forest | forest | 1008, 33, -432 | oak, birch, oak | grass |
| Deepwood | dense_forest | 1008, 9, 48 | great_oak, pine | grass |
| Redstone Mesas | badlands | -240, 34, 720 | open / no trees | red_sand |
| Mountain | mountain | -1584, 44, 816 | pine | stone |
| Broken Coast | beach | -1200, 25, 432 | palm | sand |
| Outer Sea | ocean | -1488, 14, 2640 | open / no trees | sand |
| Reedwater Marsh | marsh | -432, 15, 1008 | oak | grass |
| Sungrass Savannah | savanna | -336, 10, 528 | acacia, oak | grass |
| Hilly Plains | hilly_plains | 624, 14, 48 | oak | grass |
| Oasis | oasis | -48, 11, 624 | palm | grass |

## Gaps

Snowy Cedar Forest has no distinct generated ID. Caves are currently labeled cave/deep_cave; granite exists as a block, but the requested Stony/Andesite/Granite/Diorite cave regions are not implemented. Existing terrain-10 sub-biomes select from warped 210-block cells; coherent replacement requires a new pinned generator version. The table verifies reachability, not full ecology parity or unique rewards.
