import { randomUUID } from 'node:crypto';
import { World } from '../src/world.js';
import { BEDWARS_BEDS, BEDWARS_BLOCKS, BEDWARS_SHOP, BEDWARS_SPAWNS, MODE_RULES, manhuntBeacons, mapEdits } from '../src/mode-rules.js';

const cellKey = point => `${point.x},${point.y},${point.z}`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const teams = ['ember', 'tide'];
const poseAt = spawn => ({ ...spawn, yaw: spawn.x < 0 ? -Math.PI / 2 : Math.PI / 2, pitch: 0, held: 'wood_sword', moving: false });

/** Owns competitive rules; transport, membership and world edit broadcasts stay in lobbies. */
export function createMatches({ now, broadcast, fail }) {
  function view(room) {
    const match = room.match;
    if (!match) return null;
    return { id: match.id, revision: match.revision, serverNow: now(), mode: room.mode, phase: match.phase, winner: match.winner, title: match.title, startedAt: match.startedAt, endsAt: match.endsAt, headStartUntil: match.headStartUntil, huntersReleased: match.huntersReleased, beds: { ...match.beds }, origin: match.origin && { ...match.origin }, beacons: match.beacons.map(beacon => ({ ...beacon })), players: [...match.players.values()].map(player => ({ id: player.id, team: player.team, role: player.role, hp: player.hp, alive: player.alive, eliminated: player.eliminated, respawnAt: player.respawnAt, currency: player.currency, weapon: player.weapon, armor: player.armor, blocks: player.blocks, spawn: { ...player.spawn }, pose: { ...player.pose }, spawnSerial: player.spawnSerial })) };
  }
  function publish(room) { room.match.revision++; broadcast(room, { type: 'match', match: view(room) }); }
  function active(room, player) {
    if (!room.match || room.match.phase !== 'playing') fail(409, 'The match is not running.');
    const state = room.match.players.get(player.id);
    if (!state || !state.alive || state.eliminated) fail(409, 'Wait until you respawn.');
    return state;
  }
  function end(room, winner, title) {
    if (room.match.phase === 'ended') return;
    room.match.phase = 'ended';
    room.match.winner = winner;
    room.match.title = title;
    for (const player of room.match.players.values()) player.respawnAt = 0;
  }
  function decideBedwars(room) {
    const remaining = teams.filter(team => [...room.match.players.values()].some(player => player.team === team && !player.eliminated && room.players.has(player.id)));
    if (remaining.length < 2) end(room, remaining[0] || 'draw', remaining.length ? `${remaining[0] === 'ember' ? 'Ember' : 'Tide'} team wins!` : 'The round is a draw.');
  }
  function kill(room, player) {
    const match = room.match;
    player.hp = 0;
    player.alive = false;
    if (room.mode === 'manhunt' && player.role === 'runner') {
      player.eliminated = true;
      end(room, 'hunters', 'The hunters caught the runner!');
    } else if (room.mode === 'bedwars' && !match.beds[player.team]) {
      player.eliminated = true;
      player.respawnAt = 0;
      decideBedwars(room);
    } else player.respawnAt = now() + MODE_RULES[room.mode].respawnMs;
  }
  function setPose(room, player, pose, time) {
    player.pose = { ...pose };
    player.lastPoseAt = time;
    const member = room.players.get(player.id);
    if (member) member.pose = { ...pose };
  }
  function resetPose(room, player, time) {
    setPose(room, player, poseAt(player.spawn), time);
    player.spawnSerial++;
    broadcast(room, { type: 'pose', playerId: player.id, pose: player.pose });
  }
  function beaconPositions(world, origin) {
    return manhuntBeacons(origin, (x, z) => world.height(x, z) + 1).map(beacon => {
      // Move an awkward destination to dry, level terrain in its immediate area.
      for (let radius = 0; radius <= 24; radius += 4) for (let angle = 0; angle < 8; angle++) {
        const x = Math.floor(beacon.x + Math.cos(angle * Math.PI / 4) * radius) + .5;
        const z = Math.floor(beacon.z + Math.sin(angle * Math.PI / 4) * radius) + .5;
        const y = world.height(x, z) + 1;
        if (y > 5 && y < 70 && !world.intersects(x, y, z)) return { ...beacon, x, y, z };
      }
      return beacon;
    });
  }
  function start(room) {
    const mode = MODE_RULES[room.mode];
    if (room.players.size < mode.minPlayers) fail(409, `${mode.name} needs at least ${mode.minPlayers} players.`);
    if (room.mode === 'creative') { room.match = null; return; }
    const time = now(), edits = mapEdits(room.mode), world = new World(room.seed, edits[mode.dimension], 6, mode.dimension);
    const origin = room.mode === 'manhunt' ? { ...world.findSpawn(), dimension: 'overworld' } : null;
    room.edits = Object.fromEntries(Object.entries(edits).map(([dim, entries]) => [dim, new Map(entries)]));
    world.edits = room.edits[mode.dimension];
    room.editCount = Object.values(room.edits).reduce((total, entries) => total + entries.size, 0);
    room.revision = 0;
    room.buildCount = 0;
    room.match = { id: randomUUID(), revision: 0, phase: 'playing', winner: null, title: mode.name, startedAt: time, endsAt: time + mode.durationMs + (mode.headStartMs || 0), headStartUntil: room.mode === 'manhunt' ? time + mode.headStartMs : 0, huntersReleased: room.mode !== 'manhunt', origin, beacons: origin ? beaconPositions(world, origin) : [], beds: room.mode === 'bedwars' ? { ember: true, tide: true } : {}, players: new Map(), protected: new Set(edits.ender.filter(([, block]) => block !== null).map(([key]) => key)), placed: new Set(), world };
    let index = 0;
    for (const member of room.players.values()) {
      const team = room.mode === 'bedwars' ? teams[index % 2] : null;
      const role = room.mode === 'manhunt' ? member.id === room.hostId ? 'runner' : 'hunter' : null;
      const spawn = team ? { ...BEDWARS_SPAWNS[team] } : { ...origin };
      const player = { id: member.id, team, role, hp: 20, alive: true, eliminated: false, respawnAt: 0, currency: mode.initialCurrency || 0, weapon: 'wood_sword', armor: false, blocks: mode.initialBlocks, spawn, pose: poseAt(spawn), spawnSerial: 1, lastPoseAt: time, lastAttackAt: -Infinity, nextIncomeAt: time + (mode.generatorMs || 0) };
      member.pose = { ...player.pose };
      room.match.players.set(member.id, player);
      index++;
    }
  }
  function tick(room) {
    const match = room.match;
    if (!match || match.phase !== 'playing') return;
    const time = now();
    let changed = false;
    if (time >= match.endsAt) {
      end(room, room.mode === 'manhunt' ? 'hunters' : 'draw', room.mode === 'manhunt' ? 'Time is up — the hunters win!' : 'Time is up — the round is a draw.');
      publish(room);
      return;
    }
    if (room.mode === 'manhunt' && !match.huntersReleased && time >= match.headStartUntil) { match.huntersReleased = true; changed = true; }
    for (const player of match.players.values()) {
      if (!player.alive && !player.eliminated && player.respawnAt && time >= player.respawnAt) {
        if (room.mode === 'bedwars' && !match.beds[player.team]) { player.eliminated = true; player.respawnAt = 0; decideBedwars(room); }
        else { player.alive = true; player.hp = 20; player.respawnAt = 0; player.blocks = Math.max(player.blocks, 16); resetPose(room, player, time); }
        changed = true;
      }
      if (room.mode === 'bedwars' && time >= player.nextIncomeAt) {
        const periods = Math.floor((time - player.nextIncomeAt) / MODE_RULES.bedwars.generatorMs) + 1;
        player.nextIncomeAt += periods * MODE_RULES.bedwars.generatorMs;
        if (player.alive && distance(player.pose, player.spawn) <= MODE_RULES.bedwars.shopRange) {
          const currency = Math.min(128, player.currency + periods * MODE_RULES.bedwars.generatorIncome);
          if (currency !== player.currency) { player.currency = currency; changed = true; }
        }
      }
    }
    if (changed) publish(room);
  }
  function pose(room, member, incoming) {
    if (!room.match) return incoming;
    const player = room.match.players.get(member.id);
    if (!player) fail(403, 'You are not in this match.');
    if (room.match.phase !== 'playing' || !player.alive) return player.pose;
    const time = now(), elapsed = Math.max(0, Math.min(2, (time - player.lastPoseAt) / 1000));
    const horizontal = Math.hypot(incoming.x - player.pose.x, incoming.z - player.pose.z);
    const frozen = room.mode === 'manhunt' && player.role === 'hunter' && time < room.match.headStartUntil;
    if (incoming.dimension !== MODE_RULES[room.mode].dimension || horizontal > 4 + 16 * elapsed || Math.abs(incoming.y - player.pose.y) > 6 + 45 * elapsed || (frozen && distance(incoming, player.spawn) > 2)) {
      player.spawnSerial++;
      publish(room);
      return player.pose;
    }
    setPose(room, player, incoming, time);
    if (player.pose.y < MODE_RULES[room.mode].fallY) { kill(room, player); publish(room); }
    return player.pose;
  }
  function edit(room, member, point, block) {
    if (!room.match) return;
    const player = active(room, member), match = room.match, key = cellKey(point);
    if (point.dimension !== MODE_RULES[room.mode].dimension || distance(player.pose, { x: point.x + .5, y: point.y, z: point.z + .5 }) > 7) fail(403, 'That block is out of reach.');
    if (room.mode === 'manhunt' && player.role === 'hunter' && now() < match.headStartUntil) fail(409, 'The runner gets a head start.');
    if (room.mode === 'bedwars') {
      const bedTeam = teams.find(team => key === cellKey(BEDWARS_BEDS[team]));
      if (bedTeam) {
        if (block !== null || !match.beds[bedTeam]) fail(403, 'A destroyed bed cannot be rebuilt during the round.');
        if (bedTeam === player.team) fail(403, 'Protect your own bed.');
        if (distance(player.pose, BEDWARS_BEDS[bedTeam]) > 6) fail(403, 'Move closer to the enemy bed.');
        match.beds[bedTeam] = false;
        for (const teammate of match.players.values()) if (teammate.team === bedTeam && !teammate.alive) { teammate.eliminated = true; teammate.respawnAt = 0; }
        decideBedwars(room);
        return;
      }
      if (match.protected.has(key)) fail(403, 'The island foundation and generator are protected.');
      if (block === null && !match.placed.has(key)) fail(403, 'Only player-built bridge blocks can be mined.');
    }
    const edits = room.edits[point.dimension], previous = edits.get(key);
    if (block !== null) {
      if (!BEDWARS_BLOCKS.includes(block)) fail(403, 'That block is not available in this match.');
      if (player.blocks < 1) fail(409, 'You need more bridge blocks.');
      if (previous && match.placed.has(key)) fail(409, 'Mine the existing block first.');
      const existing = edits.has(key) ? previous : match.world.get(point.x, point.y, point.z);
      if (existing) fail(409, 'Choose an empty space for that block.');
      player.blocks--;
      match.placed.add(key);
    } else {
      if (room.mode === 'manhunt') {
        const existing = edits.has(key) ? previous : match.world.get(point.x, point.y, point.z);
        if (!existing || existing === 'bedrock') fail(403, 'There is no mineable block here.');
      }
      player.blocks = Math.min(128, player.blocks + 1);
      match.placed.delete(key);
    }
  }
  function action(room, member, type, body) {
    const player = active(room, member), match = room.match, time = now();
    if (type === 'attack') {
      if (room.mode === 'manhunt' && time < match.headStartUntil) fail(409, 'Combat starts when the hunters are released.');
      const target = match.players.get(body.targetId);
      if (!target || target.id === player.id || !target.alive || target.eliminated) fail(400, 'Choose an active opponent.');
      if (room.mode === 'bedwars' ? target.team === player.team : target.role === player.role) fail(403, 'You cannot attack a teammate.');
      if (distance(player.pose, target.pose) > 4.5) fail(403, 'That player is out of reach.');
      const eye = { x: player.pose.x, y: player.pose.y + 1.4, z: player.pose.z };
      const aim = { x: target.pose.x - eye.x, y: target.pose.y + 1.1 - eye.y, z: target.pose.z - eye.z };
      const length = Math.hypot(aim.x, aim.y, aim.z);
      if (length > .01) {
        const obstruction = match.world.raycast(eye, { x: aim.x / length, y: aim.y / length, z: aim.z / length }, length);
        if (obstruction && obstruction.distance < length - .15) fail(403, 'A block is in the way of your swing.');
      }
      if (time - player.lastAttackAt < 550) fail(429, 'Your next swing is not ready yet.');
      player.lastAttackAt = time;
      const damage = Math.max(1, Math.round((player.weapon === 'iron_sword' ? 8 : 5) * (target.armor ? .75 : 1)));
      target.hp = Math.max(0, target.hp - damage);
      if (!target.hp) kill(room, target);
    } else if (type === 'fall') {
      if (player.pose.y >= MODE_RULES[room.mode].fallY) fail(403, 'You have not fallen out of the world.');
      kill(room, player);
    } else if (type === 'buy') {
      if (room.mode !== 'bedwars') fail(409, 'The shop is only available in Bed Wars.');
      if (typeof body.item !== 'string' || !Object.hasOwn(BEDWARS_SHOP, body.item)) fail(400, 'Unknown shop item.');
      const offer = BEDWARS_SHOP[body.item];
      if (distance(player.pose, player.spawn) > MODE_RULES.bedwars.shopRange) fail(403, 'Return to your island generator to shop.');
      if (player.currency < offer.cost) fail(409, 'Collect more coins at your generator.');
      if (body.item === 'sword' && player.weapon === offer.weapon || body.item === 'armor' && player.armor) fail(409, 'You already own that upgrade.');
      if (body.item === 'blocks' && player.blocks + offer.amount > 128) fail(409, 'Your block pouch is full.');
      player.currency -= offer.cost;
      if (body.item === 'blocks') player.blocks += offer.amount;
      if (body.item === 'sword') player.weapon = offer.weapon;
      if (body.item === 'armor') player.armor = true;
    } else if (type === 'objective') {
      if (room.mode !== 'manhunt' || player.role !== 'runner') fail(403, 'Only the runner can collect beacons.');
      if (time < match.headStartUntil) fail(409, 'Beacons activate when the hunters are released.');
      if (body.id === 'escape') {
        if (!match.beacons.every(beacon => beacon.collected)) fail(409, 'Collect all three beacons before escaping.');
        if (distance(player.pose, match.origin) > 4) fail(403, 'Return to the starting beacon to escape.');
        end(room, 'runner', 'The runner escaped!');
      } else {
        const beacon = match.beacons.find(candidate => candidate.id === body.id);
        if (!beacon) fail(400, 'Unknown beacon.');
        if (distance(player.pose, beacon) > 4) fail(403, 'Move closer to that beacon.');
        if (beacon.collected) return { match: view(room) };
        beacon.collected = true;
      }
    } else fail(400, 'Unknown match action.');
    publish(room);
    return { match: view(room) };
  }
  function leave(room, member) {
    if (!room.match || room.match.phase !== 'playing') return;
    const player = room.match.players.get(member.id);
    if (!player) return;
    player.alive = false;
    player.eliminated = true;
    player.hp = 0;
    player.respawnAt = 0;
    if (room.mode === 'bedwars') decideBedwars(room);
    else if (player.role === 'runner') end(room, 'hunters', 'The runner left — the hunters win!');
    else if (![...room.match.players.values()].some(candidate => candidate.role === 'hunter' && !candidate.eliminated)) end(room, 'runner', 'The hunters left — the runner wins!');
    publish(room);
  }
  return { view, start, tick, pose, edit, action, leave, publish };
}
