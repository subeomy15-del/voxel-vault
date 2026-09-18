// Shared game rules; this module deliberately has no browser dependencies.
export const BEDWARS_BLOCKS = ['plank', 'wood', 'stonebrick', 'cobblestone', 'brick', 'glass', 'white_wool', 'red_wool', 'blue_wool'];
export const BEDWARS_SPAWNS = {
  ember: { x: -48.5, y: 25, z: 3.5, dimension: 'ender' },
  tide: { x: 48.5, y: 25, z: 3.5, dimension: 'ender' },
};
export const BEDWARS_BEDS = {
  ember: { x: -48, y: 25, z: -4, dimension: 'ender' },
  tide: { x: 48, y: 25, z: -4, dimension: 'ender' },
};
export const BEDWARS_SHOP = {
  blocks: { id: 'blocks', name: '16 bridge blocks', cost: 8, amount: 16 },
  sword: { id: 'sword', name: 'Iron sword', cost: 24, weapon: 'iron_sword', damage: 8 },
  armor: { id: 'armor', name: 'Iron armor', cost: 20, reduction: .25 },
};
export const MODE_RULES = {
  creative: { id: 'creative', name: 'Build Together', title: 'Build Together', dimension: 'overworld', minPlayers: 1, help: 'Create a shared world. Everyone gets unlimited blocks and flight.' },
  bedwars: { id: 'bedwars', name: 'Bed Wars', title: 'Bed Wars', dimension: 'ender', minPlayers: 2, durationMs: 600000, respawnMs: 3000, generatorMs: 3000, generatorIncome: 2, shopRange: 8, initialBlocks: 32, initialCurrency: 12, fallY: 0, allowedBlocks: BEDWARS_BLOCKS, help: 'Protect your bed, bridge to the enemy island, and eliminate the other team. Beds keep your team respawning. Earn coins near your generator; K opens the shop. Ten-minute rounds end in a draw if both teams remain.' },
  manhunt: { id: 'manhunt', name: 'Manhunt', title: 'Manhunt', dimension: 'overworld', minPlayers: 2, durationMs: 360000, headStartMs: 20000, respawnMs: 3000, initialBlocks: 32, fallY: -66, help: 'The host runs; everyone else hunts. The runner gets a 20-second head start, then six minutes to touch three beacons and return to the start. Catch the runner or run out the clock to win as hunters.' },
};

/** A deterministic arena overlay, using the same [cellKey, block] format as saves. */
export function mapEdits(mode = 'bedwars') {
  const edits = { overworld: [], nether: [], ender: [] };
  if (mode !== 'bedwars') return edits;
  const blocks = new Map(), put = (x, y, z, block) => blocks.set(`${x},${y},${z}`, block);
  for (const [cx, trim] of [[-48, 'red_wool'], [0, 'white_wool'], [48, 'blue_wool']]) {
    for (let dx = -7; dx <= 7; dx++) for (let z = -7; z <= 7; z++) {
      put(cx + dx, 23, z, 'dark_bricks');
      put(cx + dx, 24, z, Math.abs(dx) === 7 || Math.abs(z) === 7 ? trim : 'stonebrick');
      for (let y = 25; y <= 31; y++) put(cx + dx, y, z, null);
    }
    if (!cx) continue;
    for (let dx = -6; dx <= 6; dx++) if (Math.abs(dx) > 1) put(cx + dx, 25, -6, 'stonebrick');
    for (const dx of [-6, 6]) for (const z of [-6, 6]) for (let y = 25; y <= 28; y++) put(cx + dx, y, z, y === 28 ? trim : 'stonebrick');
  }
  for (const team of ['ember', 'tide']) {
    const bed = BEDWARS_BEDS[team], spawn = BEDWARS_SPAWNS[team];
    put(bed.x, bed.y, bed.z, 'bed');
    put(Math.floor(spawn.x), 24, Math.floor(spawn.z), 'gold_block');
  }
  edits.ender = [...blocks];
  return edits;
}

export function manhuntBeacons(origin, heightAt = () => origin.y) {
  return [[82, 24], [-62, 82], [-86, -55]].map(([dx, dz], index) => {
    const x = Math.floor(origin.x + dx) + .5, z = Math.floor(origin.z + dz) + .5;
    return { id: `beacon-${index + 1}`, x, y: heightAt(x, z), z, dimension: 'overworld', collected: false };
  });
}
