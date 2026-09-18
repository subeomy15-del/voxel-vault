import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { BLOCKS, ITEMS } from '../src/data.js';
import { MODE_RULES } from '../src/mode-rules.js';
import { createMatches } from './matches.js';

const DIMENSIONS = ['overworld', 'nether', 'ender'];
const COLORS = ['#77dcc3', '#e9b66a', '#9eb8ff', '#ed9ec1', '#bdadf5', '#e49d82', '#b7d77d', '#88cfe7'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
function label(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') fail(400, 'Names must be text.');
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length > max) fail(400, `Names must contain 1–${max} characters.`);
  return cleaned;
}
function dimension(value = 'overworld') {
  if (!DIMENSIONS.includes(value)) fail(400, 'Unknown dimension.');
  return value;
}
function coordinates(body, integers = false) {
  const values = [body.x, body.y, body.z];
  if (!values.every(value => typeof value === 'number' && Number.isFinite(value) && (!integers || Number.isInteger(value))) || Math.abs(body.x) > 1e6 || Math.abs(body.z) > 1e6 || body.y < (integers ? -63 : -1024) || body.y > (integers ? 94 : 1024)) fail(400, 'Coordinates are outside the world.');
  return { x: body.x, y: body.y, z: body.z, dimension: dimension(body.dimension) };
}

export function createLobbyService(options = {}) {
  const rooms = new Map(), requestBuckets = new Map(), admissionBuckets = new Map();
  const now = options.now || Date.now;
  const reconnectGraceMs = options.reconnectGraceMs ?? 120000;
  const maxRooms = options.maxRooms ?? 100;
  const maxEdits = options.maxEdits ?? 50000;
  let closed = false;

  function consume(buckets, key, capacity, rate, message = 'Too many requests. Please wait a moment.') {
    const time = now();
    const bucket = buckets.get(key) || { balance: capacity, at: time };
    bucket.balance = Math.min(capacity, bucket.balance + Math.max(0, time - bucket.at) * rate / 1000);
    bucket.at = time;
    buckets.set(key, bucket);
    if (bucket.balance < 1) fail(429, message);
    bucket.balance--;
  }
  function publicPlayer(player) { return { id: player.id, name: player.name, color: player.color, ready: player.ready, pose: player.pose }; }
  function roomView(room) {
    return { code: room.code, name: room.name, public: room.public, mode: room.mode, match: matches.view(room), maxPlayers: room.maxPlayers, status: room.status, hostId: room.hostId, players: [...room.players.values()].map(publicPlayer), seed: room.seed, buildCount: room.buildCount };
  }
  function snapshot(room) { return { seed: room.seed, edits: Object.fromEntries(DIMENSIONS.map(dim => [dim, [...room.edits[dim]]])), revision: room.revision, buildCount: room.buildCount }; }
  function write(player, event) {
    const stream = player.stream;
    if (!stream || stream.destroyed || stream.writableEnded) return;
    if (stream.writableLength > 256 * 1024) return stream.destroy();
    stream.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  function broadcast(room, event) { for (const player of room.players.values()) write(player, event); }
  const matches = createMatches({ now, broadcast, fail });
  function updateRoom(room) { broadcast(room, { type: 'room', room: roomView(room) }); }
  function remove(room, player) {
    room.players.delete(player.id);
    room.tokens.delete(player.token);
    player.stream?.end();
    matches.leave(room, player);
    if (room.hostId === player.id) {
      room.hostId = room.players.keys().next().value || null;
      if (room.hostId) room.players.get(room.hostId).ready = true;
    }
    if (!room.players.size) rooms.delete(room.code);
    else updateRoom(room);
  }
  function sweep() {
    const time = now();
    for (const room of rooms.values()) for (const player of room.players.values()) {
      const connected = player.stream && !player.stream.destroyed && !player.stream.writableEnded;
      if (!connected && time - player.lastSeen >= reconnectGraceMs) remove(room, player);
      else if (connected) {
        if (player.stream.writableLength > 256 * 1024) player.stream.destroy();
        else player.stream.write(': heartbeat\n\n');
      }
    }
    for (const buckets of [requestBuckets, admissionBuckets]) for (const [key, bucket] of buckets) if (time - bucket.at > 120000) buckets.delete(key);
  }
  const timer = setInterval(sweep, options.sweepIntervalMs ?? 15000);
  timer.unref();
  const matchTimer = setInterval(() => { for (const room of rooms.values()) matches.tick(room); }, options.matchTickMs ?? 250);
  matchTimer.unref();
  function findRoom(code) {
    sweepExpired();
    const room = rooms.get(code);
    if (!room) fail(404, 'Lobby not found. It may have closed or expired.');
    matches.tick(room);
    return room;
  }
  // Requests enforce expiry too, without writing heartbeats on every request.
  function sweepExpired() {
    const time = now();
    for (const room of rooms.values()) for (const player of room.players.values()) if ((!player.stream || player.stream.destroyed || player.stream.writableEnded) && time - player.lastSeen >= reconnectGraceMs) remove(room, player);
  }
  function authenticate(code, token) {
    const room = findRoom(code);
    const player = typeof token === 'string' && token.length <= 128 ? room.tokens.get(token) : null;
    if (!player) fail(401, 'Session expired. Join the lobby again.');
    player.lastSeen = now();
    return { room, player };
  }
  function addPlayer(room, playerName) {
    if (room.mode !== 'creative' && room.status === 'playing') fail(409, 'This match has already started. Join a waiting lobby.');
    if (room.players.size >= room.maxPlayers) fail(409, 'This lobby is full.');
    const name = label(playerName, 'Builder', 24);
    const taken = new Set([...room.players.values()].map(player => player.color));
    const player = { id: randomUUID(), token: randomBytes(32).toString('base64url'), name, color: COLORS.find(color => !taken.has(color)), ready: !room.players.size, pose: null, lastSeen: now(), stream: null, buckets: new Map() };
    room.players.set(player.id, player);
    room.tokens.set(player.token, player);
    if (!room.hostId) room.hostId = player.id;
    return player;
  }
  function membership(room, player) { return { token: player.token, playerId: player.id, room: roomView(room), snapshot: snapshot(room) }; }

  return {
    reconnectGraceMs,
    checkRequest(address) { consume(requestBuckets, address, options.requestBurst ?? 1500, options.requestRate ?? 150); },
    checkAdmission(address) { consume(admissionBuckets, address, options.admissionBurst ?? 30, options.admissionRate ?? .5, 'Too many lobby joins. Please wait a moment.'); },
    list() {
      sweepExpired();
      return [...rooms.values()].filter(room => room.public).map(room => ({ code: room.code, name: room.name, mode: room.mode, players: room.players.size, maxPlayers: room.maxPlayers, status: room.status, hostName: room.players.get(room.hostId)?.name || 'Builder' }));
    },
    create(body) {
      sweepExpired();
      if (rooms.size >= maxRooms) fail(503, 'The server is full. Please try again shortly.');
      const name = label(body.name, 'Our little world', 36);
      const playerName = label(body.playerName, 'Builder', 24);
      const mode = body.mode ?? 'creative';
      if (typeof mode !== 'string' || !Object.hasOwn(MODE_RULES, mode)) fail(400, 'Unknown multiplayer mode.');
      const maxPlayers = body.maxPlayers ?? 8;
      if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) fail(400, 'Lobbies hold 2–8 players.');
      if (body.public !== undefined && typeof body.public !== 'boolean') fail(400, 'Lobby visibility must be true or false.');
      let code;
      do { code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''); } while (rooms.has(code));
      const room = { code, name, public: body.public ?? true, mode, match: null, maxPlayers, hostId: null, status: 'waiting', seed: randomInt(1, 2147483647), players: new Map(), tokens: new Map(), edits: Object.fromEntries(DIMENSIONS.map(dim => [dim, new Map()])), revision: 0, buildCount: 0, editCount: 0 };
      const player = addPlayer(room, playerName);
      rooms.set(code, room);
      return membership(room, player);
    },
    join(code, body) { const room = findRoom(code), player = addPlayer(room, body.playerName); updateRoom(room); return membership(room, player); },
    get(code, token) { const { room } = authenticate(code, token); return { room: roomView(room), snapshot: snapshot(room) }; },
    connect(code, token, res) {
      const { room, player } = authenticate(code, token);
      player.stream?.end();
      player.stream = res;
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      res.write('retry: 1500\n\n');
      write(player, { type: 'snapshot', room: roomView(room), snapshot: snapshot(room) });
      res.on('close', () => { if (player.stream === res) { player.stream = null; player.lastSeen = now(); } });
    },
    action(code, body) {
      const { room, player } = authenticate(code, body.token);
      const type = body.type;
      if (!['heartbeat', 'leave', 'ready', 'start', 'pose', 'edit', 'ping', 'chat', 'attack', 'fall', 'buy', 'objective', 'rematch'].includes(type)) fail(400, 'Unknown lobby action.');
      if (body.matchId !== undefined && !['heartbeat', 'leave', 'chat'].includes(type) && body.matchId !== room.match?.id) fail(409, 'That round has ended. Wait for the current match to load.');
      const rates = { pose: [60, 30], edit: [160, 80], ping: [4, 1], chat: [5, .5], attack: [8, 4] };
      const [capacity, rate] = rates[type] || [20, 5];
      consume(player.buckets, type, capacity, rate);
      if (type === 'heartbeat') return { ok: true };
      if (type === 'leave') { remove(room, player); return { ok: true }; }
      if (type === 'ready') {
        if (room.status !== 'waiting') fail(409, 'The build has already started.');
        if (typeof body.ready !== 'boolean') fail(400, 'Ready must be true or false.');
        player.ready = body.ready;
        updateRoom(room);
        return { room: roomView(room) };
      }
      if (type === 'start' || type === 'rematch') {
        if (player.id !== room.hostId) fail(403, 'Only the host can start the build.');
        if (type === 'rematch' && (!room.match || room.match.phase !== 'ended')) fail(409, 'Finish the current match before a rematch.');
        if (type === 'start' && room.status === 'playing') return { room: roomView(room), snapshot: snapshot(room) };
        if (type === 'start' && [...room.players.values()].some(member => member.id !== room.hostId && !member.ready)) fail(409, 'Wait for everyone to be ready.');
        matches.start(room);
        room.status = 'playing';
        const result = { room: roomView(room), snapshot: snapshot(room) };
        broadcast(room, { type: 'start', ...result });
        return result;
      }
      if (['attack', 'fall', 'buy', 'objective'].includes(type)) return matches.action(room, player, type, body);
      if (type === 'pose') {
        let pose = coordinates(body);
        for (const angle of ['yaw', 'pitch']) {
          const value = body[angle] ?? 0;
          if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e9) fail(400, 'Invalid player rotation.');
          pose[angle] = value;
        }
        if (body.held != null && (typeof body.held !== 'string' || !Object.hasOwn(ITEMS, body.held))) fail(400, 'Unknown held item.');
        if (body.moving !== undefined && typeof body.moving !== 'boolean') fail(400, 'Moving must be true or false.');
        pose.held = body.held ?? null;
        pose.moving = body.moving ?? false;
        pose = matches.pose(room, player, pose);
        player.pose = pose;
        broadcast(room, { type: 'pose', playerId: player.id, pose });
        return { ok: true };
      }
      if (type === 'edit') {
        if (room.status !== 'playing') fail(409, 'Start the build before changing blocks.');
        const point = coordinates(body, true), block = body.block;
        if (block !== null && (typeof block !== 'string' || !Object.hasOwn(BLOCKS, block) || block === 'bedrock' || BLOCKS[block].renderOnly)) fail(400, 'Unknown or unavailable block.');
        const edits = room.edits[point.dimension], key = `${point.x},${point.y},${point.z}`;
        if (!edits.has(key) && room.editCount >= maxEdits) fail(409, 'This shared world has reached its block edit limit.');
        matches.edit(room, player, point, block);
        if (!edits.has(key)) room.editCount++;
        edits.set(key, block);
        room.revision++;
        if (block !== null) room.buildCount++;
        const event = { type: 'edit', playerId: player.id, ...point, block, revision: room.revision, buildCount: room.buildCount };
        broadcast(room, event);
        if (room.match) matches.publish(room);
        return event;
      }
      if (type === 'ping') {
        if (room.status !== 'playing') fail(409, 'Start the build before placing a beacon.');
        const event = { type: 'ping', playerId: player.id, ...coordinates(body) };
        broadcast(room, event);
        return event;
      }
      if (type === 'chat') {
        const text = label(body.text, '', 160);
        if (!text) fail(400, 'Write a message first.');
        const event = { type: 'chat', playerId: player.id, text };
        broadcast(room, event);
        return event;
      }
      fail(400, 'Unknown lobby action.');
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      clearInterval(matchTimer);
      for (const room of rooms.values()) for (const player of room.players.values()) player.stream?.end();
      rooms.clear();
    },
  };
}
