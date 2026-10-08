// Original Tower Parkour courses. The eight coloured sections make two complete
// turns around a central tower; every section has its own movement mechanic.
// Surface arrays use the same inclusive voxel bounds as the existing courses.
const STAGE_TYPES = [
  ['Prism Pips', 'precision', 'Sprint and jump between small, rising stepping stones.'],
  ['Ribbon Switchbacks', 'beams', 'Follow the narrow zigzag ribbons. Crouch steadies your feet.'],
  ['Low Passage', 'crouch', 'Hold C or Ctrl through the low tunnel, then jump up the exit stairs.'],
  ['Rocket Bloom', 'launch', 'Walk onto the cyan launch pad. Aim for the wide elevated landing.'],
  ['Sky Elevator', 'lift', 'Ride the moving platform up. Step off when it meets the upper landing.'],
  ['Vanishing Steps', 'crumble', 'These tiles fall after you touch them. Keep moving to the next step.'],
  ['Pulse Doors', 'gates', 'Wait on the safe ledges. Cross each glowing door while it is open.'],
  ['Crown Sweep', 'sweepers', 'Jump over the rotating bars, then follow the gold bridge to the crown.'],
];

const WORLD_SPECS = [
  {
    id: 'tower-prism', seed: 91380, name: 'Prism Spire', subtitle: 'A rainbow climb above the clouds',
    difficulty: 'Explorer', color: '#71e5cb', variant: 0, crystalReward: 120,
    medalTimes: { gold: 150, silver: 240, bronze: 360 },
    colors: ['#ff7894', '#ffad65', '#ffdb6c', '#9beb89', '#61e2d4', '#75baff', '#b58bff', '#ff96d5'],
    materials: ['red_wool', 'copper_tiles', 'gold_block', 'green_wool', 'cyan_wool', 'blue_wool', 'purple_wool', 'moonstone_block'],
    structure: 'polished_marble', accent: 'white_wool', scenery: 'garden',
  },
  {
    id: 'tower-aurora', seed: 91381, name: 'Aurora Citadel', subtitle: 'Crystal ribbons, sky ferries and moonlit timing',
    difficulty: 'Challenger', color: '#bba4ff', variant: 1, crystalReward: 180,
    medalTimes: { gold: 180, silver: 270, bronze: 420 },
    colors: ['#ff94c9', '#ffc09a', '#ffe298', '#8fe6ba', '#67e5ec', '#91bbff', '#c2a0ff', '#efa4f7'],
    materials: ['red_wool', 'amber_glass', 'gold_block', 'green_wool', 'cyan_wool', 'blue_concrete', 'purple_wool', 'moonstone_block'],
    structure: 'moonstone_block', accent: 'violet_glass', scenery: 'crystal',
  },
  {
    id: 'tower-inferno', seed: 91382, name: 'Ember Crown', subtitle: 'An obsidian tower with faster hazards and finer landings',
    difficulty: 'Expert', color: '#ffae67', variant: 2, crystalReward: 260,
    medalTimes: { gold: 210, silver: 330, bronze: 480 },
    colors: ['#ff667c', '#ff9b52', '#ffd663', '#96d96c', '#50d6cb', '#6c9bff', '#b57af5', '#f585bd'],
    materials: ['red_wool', 'copper_tiles', 'gold_block', 'green_wool', 'cyan_wool', 'blue_concrete', 'purple_concrete', 'moonstone_block'],
    structure: 'obsidian', accent: 'copper_tiles', scenery: 'ember',
  },
];

const BASE = 13, RISE = 7, SIDE = 28;
const rotate = (x, z, turns) => {
  for (let n = 0; n < turns % 4; n++) [x, z] = [z, -x];
  return { x, z };
};
// Voxel coordinates rotate around the centre of the central voxel (.5, .5).
const point = (stage, along, across = 0) => {
  const p = rotate(-14 + along, 14 + across, stage);
  return { x: p.x + .5, z: p.z + .5 };
};
const bounds = (stage, a, b, c, d) => {
  const corners = [[a, c], [a, d], [b, c], [b, d]].map(([s, l]) => rotate(-14 + s, 14 + l, stage));
  return [Math.min(...corners.map(p => p.x)), Math.max(...corners.map(p => p.x)),
    Math.min(...corners.map(p => p.z)), Math.max(...corners.map(p => p.z))];
};
const boxAt = (stage, along, across, length, width, y, height) => {
  const p = point(stage, along, across), horizontal = stage % 2 === 0;
  const dx = (horizontal ? length : width) / 2, dz = (horizontal ? width : length) / 2;
  return { x1: p.x - dx, x2: p.x + dx, y1: y, y2: y + height, z1: p.z - dz, z2: p.z + dz };
};

function buildTower(spec) {
  const platforms = [], platformStages = [], stages = [], checkpoints = [], pads = [], dynamics = [];
  const platform = (stage, a, b, c, d, y, type = spec.materials[stage]) => {
    const p = [...bounds(stage, a, b, c, d), y, type];
    platforms.push(p); platformStages.push(stage); return p;
  };
  const node = (stage, along, across, y, width = 2, length = width, type) => {
    // Keep 2-block stepping stones centred consistently, including after turns.
    const half = Math.floor(width / 2), front = Math.floor(length / 2);
    return platform(stage, along - front, along + length - front - 1,
      across - half, across + width - half - 1, y, type);
  };
  const checkpoint = (stage, y, name) => {
    const p = { ...point(stage, 0), y, yaw: -Math.PI / 2 + stage % 4 * Math.PI / 2, name };
    checkpoints.push(p); return p;
  };

  for (let i = 0; i < STAGE_TYPES.length; i++) {
    const [baseName, kind, hint] = STAGE_TYPES[i], y = BASE + i * RISE, end = y + RISE;
    const cp = checkpoint(i, y, baseName), startIndex = platforms.length;
    platform(i, -2, 2, -2, 2, y);
    const stage = { index: i, name: baseName, kind, color: spec.colors[i], hint,
      checkpoint: cp, height: y, endHeight: end, startIndex };
    stages.push(stage);

    if (kind === 'precision') {
      // Two-block gaps and one-block rises fit the normal sprint/jump controller.
      for (let n = 1; n <= 6; n++) {
        const offset = n % 2 ? -1 : 1;
        node(i, n * 4, offset, y + n, spec.variant === 2 ? 1 : 2, 2);
      }
    } else if (kind === 'beams') {
      const offsets = spec.variant === 0 ? [-1, 1, -1, 1, -1, 0] : [-2, 0, 2, 0, -2, 0];
      for (let n = 0; n < 6; n++) platform(i, 3 + n * 4, n === 5 ? 25 : 6 + n * 4,
        offsets[n], offsets[n] + (spec.variant === 0 ? 1 : 0), y + n + 1);
    } else if (kind === 'crouch') {
      platform(i, 3, 12, -1, 1, y);
      dynamics.push({ id: 'low-ceiling', kind: 'ceiling', stage: i,
        // Clear space at both ends lets players stand before the exit jump.
        bounds: boxAt(i, 7, 0, 8, 4.2, y + 1.45, .6), color: spec.colors[i] });
      for (let n = 1; n <= 6; n++) node(i, 13 + n * 2, 0, y + n, spec.variant === 2 ? 2 : 3, 2);
    } else if (kind === 'launch') {
      platform(i, 3, 7, -2, 2, y + 1);
      const p = point(i, 5), vector = rotate(8.4, 0, i);
      pads.push({ ...p, y: y + 1, radius: 1.15, vx: vector.x, vz: vector.z,
        velocity: 16.5, stage: i });
      platform(i, 12, 17, -2, 2, y + 5);
      platform(i, 19, 22, spec.variant === 2 ? -1 : -2, 1, y + 6);
      platform(i, 24, 26, -1, 1, end);
    } else if (kind === 'lift') {
      platform(i, 3, 6, -1, 1, y + 1);
      dynamics.push({ id: 'sky-lift', kind: 'lift', stage: i,
        from: { ...point(i, 9), y: y + 1 }, to: { ...point(i, 9), y: y + 5 },
        size: { x: 3, z: 3 }, period: spec.variant === 0 ? 6.8 : spec.variant === 1 ? 6 : 5.2,
        phase: 0, color: spec.colors[i], type: spec.materials[i] });
      platform(i, 11, 16, -1, 1, y + 5);
      if (spec.variant === 0) {
        platform(i, 18, 22, -1, 1, y + 6);
        platform(i, 24, 26, -1, 1, end);
      } else {
        stage.name = spec.variant === 1 ? 'Moonrise Ferry' : 'Ember Elevator';
        stage.hint = 'Ride the lift up, then jump onto the ferry and leap to the far landing.';
        dynamics.push({ id: 'sky-ferry', kind: 'moving', stage: i,
          from: { ...point(i, 19), y: y + 6 }, to: { ...point(i, 23), y: y + 6 },
          size: { x: spec.variant === 2 ? 2.5 : 3, z: spec.variant === 2 ? 2.5 : 3 },
          period: spec.variant === 1 ? 5.6 : 4.5, phase: 0,
          color: spec.colors[i], type: spec.materials[i] });
        platform(i, 25, 26, -1, 1, end);
      }
    } else if (kind === 'crumble') {
      for (let n = 1; n <= 6; n++) {
        const across = spec.variant === 0 ? 0 : n % 2 ? -1 : 1;
        const p = node(i, n * 4, across, y + n, spec.variant === 0 ? 3 : 2, 2);
        dynamics.push({ id: 'crumble-' + n, kind: 'crumble', stage: i, platform: p.slice(0, 5),
          delay: spec.variant === 0 ? .9 : spec.variant === 1 ? .75 : .6,
          restore: 3.5, color: spec.colors[i] });
      }
    } else if (kind === 'gates') {
      for (let n = 0; n < 6; n++) platform(i, 3 + n * 4, n === 5 ? 25 : 6 + n * 4, -1, 1, y + n + 1);
      for (let n = 0; n < (spec.variant === 2 ? 4 : 3); n++) {
        const along = [5, 13, 21, 25][n], floor = y + [1, 3, 5, 6][n];
        dynamics.push({ id: 'pulse-door-' + n, kind: 'gate', stage: i,
          bounds: boxAt(i, along, 0, .35, 4.2, floor, 3.7),
          period: spec.variant === 0 ? 4.8 : spec.variant === 1 ? 4.2 : 3.7,
          openDuration: spec.variant === 0 ? 2.5 : spec.variant === 1 ? 2.1 : 1.65,
          phase: n * .95, color: spec.colors[i] });
      }
    } else if (kind === 'sweepers') {
      platform(i, 3, 8, -2, 2, y + 1);
      platform(i, 10, 15, -2, 2, y + 2);
      for (const [n, along, floor] of [[0, 5, y + 1], [1, 12, y + 2]]) {
        dynamics.push({ id: 'crown-bar-' + n, kind: 'sweeper', stage: i,
          // An offset hub leaves a safe place to land before jumping the sweep.
          center: { ...point(i, along, n ? -1.35 : 1.35), y: floor + .62 }, radius: 3.1,
          beamRadius: .16, speed: (spec.variant === 0 ? .85 : spec.variant === 1 ? 1.1 : 1.45) * (n ? -1 : 1),
          phase: n * Math.PI / 2, color: spec.colors[i] });
      }
      platform(i, 17, 20, -1, 1, y + 3);
      for (let n = 4; n <= 6; n++) node(i, n === 6 ? 25 : 14 + n * 2, 0, y + n,
        spec.variant === 2 ? 2 : 3, n === 6 ? 1 : 2);
    }
    // Wide, safe turn landings double as the next section's checkpoint.
    platform(i, SIDE - 2, SIDE + 2, -2, 2, end);
    stage.endIndex = platforms.length - 1;
  }

  const summitY = BASE + STAGE_TYPES.length * RISE;
  const summit = checkpoint(8, summitY, 'Summit');
  // An unbroken diagonal golden causeway leads from the last turn onto the roof.
  for (let n = 2; n <= 8; n += 2) {
    // The first span starts inside the turn, leaving the final rising step clear.
    const inward = n === 2 ? 1 : 0;
    platforms.push([-14 + n - 1 + inward, -14 + n + 1 + inward,
      14 - n - 1, 14 - n + 1, summitY, 'gold_block']);
    platformStages.push(7);
  }
  platforms.push([-7, 7, -7, 7, summitY, spec.structure]); platformStages.push(7);
  return {
    ...spec, tower: true, level: spec.variant + 1, stages, dynamics, platforms, platformStages,
    checkpoints, spawn: { ...checkpoints[0] }, fallY: 5, pads,
    finish: { x: .5, y: summitY, z: .5, radius: 2.3 },
    summit, parTime: spec.medalTimes.gold, reward: { crystals: spec.crystalReward },
    trim: spec.materials[0], height: summitY - BASE,
  };
}

export const TOWER_WORLDS = Object.freeze(WORLD_SPECS.map(buildTower));
const cache = new Map();

export function towerGeometry(course) {
  if (cache.has(course.id)) return cache.get(course.id);
  const blocks = new Map(), heights = new Map();
  const put = (x, y, z, type) => {
    blocks.set(`${x},${y},${z}`, type);
    heights.set(`${x},${z}`, Math.max(heights.get(`${x},${z}`) ?? -64, y));
  };
  const box = (x1, x2, y1, y2, z1, z2, type) => {
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) put(x, y, z, type);
  };
  // One block thick is intentional: disappearing tiles must not leave support.
  for (const [x1, x2, z1, z2, top, type] of course.platforms) box(x1, x2, top - 1, top - 1, z1, z2, type);

  // An open centre and a coloured outer shell keep the tower light to render.
  // The walking course stays well outside the shell, so ornament never blocks it.
  for (let y = 7; y < course.finish.y - 1; y++) {
    const band = Math.max(0, Math.min(7, Math.floor((y - BASE) / RISE)));
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
      if (Math.abs(x) !== 6 && Math.abs(z) !== 6) continue;
      const corner = Math.abs(x) === 6 && Math.abs(z) === 6;
      const stripe = (y - BASE) % RISE === 0;
      const window = !corner && y % RISE >= 2 && y % RISE <= 4 && (x === 0 || z === 0);
      put(x, y, z, corner ? course.structure : window ? 'glass' : stripe ? course.materials[band] : course.structure);
    }
  }
  // Every safe landing is recognisable from above and across the tower.
  for (const cp of course.checkpoints) {
    const x = Math.floor(cp.x), z = Math.floor(cp.z);
    box(x - 1, x + 1, cp.y - 1, cp.y - 1, z - 1, z + 1, 'white_wool');
    put(x, cp.y - 1, z, 'gold_block');
  }
  for (const pad of course.pads) {
    const x = Math.floor(pad.x), z = Math.floor(pad.z);
    box(x - 1, x + 1, pad.y - 1, pad.y - 1, z - 1, z + 1, 'launch_pad');
  }

  // The finish is a crown pavilion with space under the arch for the player.
  const roof = course.finish.y;
  box(-3, 3, roof - 1, roof - 1, -3, 3, 'gold_block');
  for (const x of [-5, 5]) for (const z of [-5, 5]) {
    box(x, x, roof, roof + 3, z, z, course.structure);
    put(x, roof + 4, z, 'gold_block'); put(x, roof + 5, z, 'lantern');
  }
  box(-5, 5, roof + 4, roof + 4, -5, -5, 'gold_block');
  box(-5, 5, roof + 4, roof + 4, 5, 5, 'gold_block');
  box(-5, -5, roof + 4, roof + 4, -5, 5, 'gold_block');
  box(5, 5, roof + 4, roof + 4, -5, 5, 'gold_block');

  // Each world has distinct scenery on distant floating islands below the route.
  for (let n = 0; n < 8; n++) {
    const angle = n * Math.PI / 4, x = Math.round(Math.cos(angle) * 25), z = Math.round(Math.sin(angle) * 25);
    const y = 8 + n % 3;
    box(x - 2, x + 2, y - 2, y - 1, z - 2, z + 2, course.structure);
    if (course.scenery === 'garden') {
      box(x - 2, x + 2, y, y, z - 2, z + 2, 'grass');
      box(x, x, y + 1, y + 3, z, z, 'wood');
      box(x - 1, x + 1, y + 4, y + 5, z - 1, z + 1, 'leaf');
    } else {
      box(x - 2, x + 2, y, y, z - 2, z + 2, course.accent);
      box(x, x, y + 1, y + 5, z, z, course.scenery === 'crystal' ? 'moonstone_block' : 'obsidian');
      put(x, y + 6, z, course.scenery === 'crystal' ? 'violet_crystal' : 'gold_block');
    }
    put(x + 2, y + 1, z, 'lantern');
  }
  const result = { blocks, heights }; cache.set(course.id, result); return result;
}
