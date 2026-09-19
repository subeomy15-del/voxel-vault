import { freshState } from './save.js?v=31';
import { ITEMS, BLOCKS } from './data.js?v=31';
import { MODE_RULES } from './mode-rules.js?v=31';

const dimensions = ['overworld', 'nether', 'ender'];
const emptyEdits = () => Object.fromEntries(dimensions.map(d => [d, new Map()]));

// A room owns geography; solo saves and each builder's controls stay on this device.
export class Multiplayer extends EventTarget {
  constructor(game, { fetcher = globalThis.fetch, eventSource = globalThis.EventSource } = {}) {
    super();
    this.game = game;
    this.fetcher = fetcher.bind(globalThis);
    this.EventSource = eventSource;
    this.room = null;
    this.rooms = [];
    this.playerId = null;
    this.token = null;
    this.status = 'idle';
    this.error = '';
    this.active = false;
    this.edits = emptyEdits();
    this.pending = 0;
    this.editQueue = Promise.resolve();
    this.generation = 0;
    this.poseTimer = 0;
    this.endpoint = '';
    try { this.endpoint = game.storage.getItem('voxel-vault-server') || ''; } catch {}
    game.multiplayer = this;
  }

  get isHost() { return !!this.room && this.room.hostId === this.playerId; }
  get competitive() { return this.active && ['bedwars', 'manhunt'].includes(this.room?.mode); }
  change() { this.dispatchEvent(new Event('change')); }

  remember() {
    try {
      if (this.room) sessionStorage.setItem('voxel-vault-session', JSON.stringify({ code: this.room.code, token: this.token, playerId: this.playerId, endpoint: this.endpoint }));
      else sessionStorage.removeItem('voxel-vault-session');
    } catch {}
  }

  async restore() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem('voxel-vault-session') || 'null'); } catch {}
    if (!saved?.code || !saved.token || !saved.playerId) return false;
    try {
      this.setEndpoint(saved.endpoint || '');
      await this.connectTo(async () => ({ ...await this.request(`/rooms/${saved.code}?token=${encodeURIComponent(saved.token)}`), token: saved.token, playerId: saved.playerId }));
      if (!this.active) { this.game.screen = 'multiplayer'; this.game.emit('screen'); }
      return true;
    } catch { try { sessionStorage.removeItem('voxel-vault-session'); } catch {} return false; }
  }

  setEndpoint(value) {
    if (this.room) throw Error('Leave your current lobby before changing servers.');
    const clean = String(value || '').trim().replace(/\/+$/, '');
    if (clean) {
      const url = new URL(clean);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Enter a server address such as https://play.example.com.');
      if (globalThis.location?.protocol === 'https:' && url.protocol !== 'https:') throw Error('This page needs an HTTPS multiplayer server.');
      this.endpoint = url.origin;
    } else this.endpoint = '';
    try { this.game.storage.setItem('voxel-vault-server', this.endpoint); } catch {}
    this.error = '';
    this.change();
  }

  async request(path, body) {
    let response;
    try {
      response = await this.fetcher(this.endpoint + '/api' + path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
    } catch { throw Error('Could not reach the multiplayer server. Check your connection and server address.'); }
    let data;
    try { data = await response.json(); } catch { throw Error('Multiplayer needs a running Voxel Vault server. Enter its address in Server settings.'); }
    if (!response.ok) {
      const error = Error(data.error || 'The server could not complete that request.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async listRooms() {
    try { const data = await this.request('/rooms'); this.rooms = data.rooms || []; this.error = ''; this.change(); return this.rooms; }
    catch (error) { this.error = error.message; this.change(); throw error; }
  }

  async create(options) {
    if (this.room) throw Error('You are already in a lobby.');
    return this.connectTo(() => this.request('/rooms', options));
  }

  async join(code, playerName) {
    if (this.room) throw Error('You are already in a lobby.');
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw Error('Enter the six-character invite code.');
    return this.connectTo(() => this.request(`/rooms/${code}/join`, { playerName }));
  }

  async connectTo(connect) {
    if (this.status === 'connecting') throw Error('Already connecting.');
    const generation = ++this.generation;
    this.status = 'connecting'; this.error = ''; this.change();
    try {
      const data = await connect();
      if (generation !== this.generation) {
        await this.request(`/rooms/${data.room.code}/action`, { token: data.token, type: 'leave' }).catch(() => {});
        throw Error('Connection cancelled.');
      }
      this.room = data.room; this.token = data.token; this.playerId = data.playerId;
      this.remember();
      this.replaceSnapshot(data.snapshot);
      this.connectEvents();
      this.heartbeat = setInterval(() => this.action('heartbeat').catch(error => {
        if (generation === this.generation && [401, 404, 410].includes(error.status)) this.disconnected(error.message);
      }), 10000);
      this.heartbeat.unref?.();
      if (this.room.status === 'playing') this.enterWorld();
      this.change();
      return data;
    } catch (error) {
      if (generation === this.generation) {
        if (this.room) {
          this.request(`/rooms/${this.room.code}/action`, { token: this.token, type: 'leave' }).catch(() => {});
          this.reset();
        }
        this.status = 'idle'; this.error = error.message; this.change();
      }
      throw error;
    }
  }

  connectEvents() {
    this.source?.close();
    const generation = this.generation;
    const source = this.source = new this.EventSource(`${this.endpoint}/api/rooms/${this.room.code}/events?token=${encodeURIComponent(this.token)}`);
    source.onopen = () => {
      if (generation !== this.generation || this.source !== source) return;
      this.status = 'connected'; this.error = ''; this.change();
    };
    source.onerror = () => {
      if (generation !== this.generation || this.source !== source || !this.room) return;
      this.status = 'reconnecting';
      this.error = 'Reconnecting to your crew… Building resumes when the connection returns.';
      this.change();
    };
    source.onmessage = event => {
      if (generation !== this.generation || this.source !== source) return;
      try { this.receive(JSON.parse(event.data)); } catch (error) { console.error('Multiplayer update failed', error); }
    };
  }

  receive(event) {
    if (event.type === 'snapshot' || event.type === 'start') {
      const previousMatch = this.room?.match?.id;
      this.room = event.room;
      this.replaceSnapshot(event.snapshot);
      this.status = 'connected'; this.error = '';
      if (this.room.status === 'playing' && !this.active) this.enterWorld();
      else if (this.active && event.room.match && previousMatch !== event.room.match.id) this.loadSharedWorld();
      else if (this.active) this.bindWorld();
      this.modes?.receive(this.room.match);
      this.change();
    } else if (event.type === 'match') {
      if (this.room?.match?.id === event.match.id && (this.room.match.revision || 0) > (event.match.revision || 0)) return;
      if (this.room) this.room.match = event.match;
      this.modes?.receive(event.match);
    } else if (event.type === 'room') {
      const old = this.room;
      this.room = event.room;
      this.modes?.receive(event.room.match);
      if (this.active && old?.hostId !== this.room.hostId && this.isHost) this.game.toast('You’re the crew leader', 'The shared world stays open. Invite more friends from the Crew menu.');
      this.change();
    } else if (event.type === 'pose') {
      const player = this.room?.players.find(p => p.id === event.playerId);
      if (player) player.pose = event.pose;
    } else if (event.type === 'edit') {
      const map = this.edits[event.dimension];
      if (!map) return;
      map.set(`${event.x},${event.y},${event.z}`, event.block);
      this.revision = event.revision;
      if (this.room) this.room.buildCount = event.buildCount;
      if (this.active && this.game.state.dimension === event.dimension) {
        this.applying = true;
        try { this.game.world.set(event.x, event.y, event.z, event.block); } finally { this.applying = false; }
      }
    } else if (event.type === 'ping') {
      const player = this.room?.players.find(p => p.id === event.playerId);
      this.game.toast(`${player?.name || 'A teammate'} marked a spot`, `${event.dimension} · ${Math.round(event.x)}, ${Math.round(event.z)}`);
      this.pingMarker = { ...event, until: Date.now() + 12000 };
      this.change();
    }
  }

  replaceSnapshot(snapshot) {
    if (!snapshot) return;
    this.edits = Object.fromEntries(dimensions.map(d => [d, new Map(snapshot.edits?.[d] || [])]));
    this.revision = snapshot.revision || 0;
    if (this.room) this.room.buildCount = snapshot.buildCount || 0;
  }

  enterWorld() {
    if (this.active) return;
    const g = this.game;
    g.save(true);
    this.soloState = structuredClone(g.state);
    this.active = true;
    this.loadSharedWorld();
  }

  loadSharedWorld() {
    const g = this.game;
    this.pending = 0; this.editQueue = Promise.resolve();
    this.modes?.leave();
    g.state = freshState(this.room.seed, this.competitive ? 'arena' : 'creative');
    if (this.competitive) {
      g.state.dimension = MODE_RULES[this.room.mode].dimension;
      const self = this.room.match?.players.find(player => player.id === this.playerId);
      if (self?.spawn) { g.state.pos = { ...self.spawn }; g.state.spawn = { ...self.spawn }; g.state.origin = { ...self.spawn }; }
    }
    g.state.bar = ['stone_pickaxe', 'plank', 'stonebrick', 'glass', 'oak_stairs', 'torch', 'wood', 'grass', 'bed'].map((name, i) => ITEMS[name] ? name : g.state.bar[i]);
    g.state.selected = this.competitive ? 0 : 1;
    g.loadWorld();
    const previousPose = this.room.players.find(player => player.id === this.playerId)?.pose;
    if (!this.competitive && previousPose && previousPose.dimension === 'overworld' && !g.world.intersects(previousPose.x, previousPose.y, previousPose.z)) {
      g.pos = { x: previousPose.x, y: previousPose.y, z: previousPose.z };
      g.yaw = previousPose.yaw; g.pitch = previousPose.pitch;
    } else if (!this.competitive) {
      const slot = this.room.players.findIndex(player => player.id === this.playerId);
      if (slot > 0) for (const radius of [2.5, 4, 6]) {
        const angle = slot / 8 * Math.PI * 2;
        const x = g.pos.x + Math.cos(angle) * radius, z = g.pos.z + Math.sin(angle) * radius;
        const y = g.world.ground(x, z, g.pos.y + 3);
        if (Math.abs(y - g.pos.y) < 4 && !g.world.intersects(x, y, z) && !g.world.waterAt(Math.floor(x), y, Math.floor(z))) {
          g.pos = { x, y, z }; break;
        }
      }
    }
    g.resume();
    if (this.competitive) this.modes?.enter();
    else g.toast('Your crew. Your world.', 'Build together · Double tap Space to fly · P to ping your position', 'reward');
    g.emit('screen');
  }

  bindWorld() {
    if (!this.active) return;
    const g = this.game, world = g.world, dimension = g.state.dimension;
    g.mobs = []; g.boss = null;
    if (!world.multiplayerSet) {
      const original = world.set.bind(world);
      world.multiplayerSet = original;
      world.multiplayerInitialEdits = new Map(world.edits);
      world.multiplayerBaseline = new Map();
      world.set = (x, y, z, block) => {
        if (this.applying) return original(x, y, z, block);
        if (block === 'bedrock' || BLOCKS[block]?.renderOnly) {
          g.toast('Choose another block', 'Worldstone and boss structures are reserved in shared worlds.');
          return false;
        }
        if (this.status !== 'connected' || this.pending >= 128) {
          if (!this.blockedToast || Date.now() - this.blockedToast > 3000) { g.toast('Waiting for your connection', 'Your crew’s world will catch up automatically.'); this.blockedToast = Date.now(); }
          return false;
        }
        if (world.get(x, y, z) === block) return true;
        const key = `${x},${y},${z}`;
        if (!world.multiplayerBaseline.has(key)) world.multiplayerBaseline.set(key, world.get(x, y, z));
        if (!original(x, y, z, block)) return false;
        const generation = this.generation;
        const matchId = this.room?.match?.id;
        this.pending++;
        this.editQueue = this.editQueue.then(async () => {
          if (generation !== this.generation || matchId !== this.room?.match?.id) return;
          try { await this.action('edit', { x, y, z, block, dimension, ...(matchId ? { matchId } : {}) }); }
          catch (error) {
            if (generation !== this.generation || matchId !== this.room?.match?.id) return;
            const canonical = this.edits[dimension];
            if (world.get(x, y, z) === block) original(x, y, z, canonical.has(key) ? canonical.get(key) : world.multiplayerBaseline.get(key));
            this.error = error.message; this.change();
          }
        }).finally(() => { if (generation === this.generation && matchId === this.room?.match?.id) this.pending = Math.max(0, this.pending - 1); });
        return true;
      };
    }
    this.applying = true;
    try {
      for (const [key, block] of this.edits[dimension]) world.set(...key.split(',').map(Number), block);
    } finally { this.applying = false; }
  }

  async action(type, payload = {}) {
    if (!this.room || !this.token) throw Error('Join a lobby first.');
    return this.request(`/rooms/${this.room.code}/action`, { token: this.token, type, ...(this.room.match ? { matchId: this.room.match.id } : {}), ...payload });
  }

  captureEdits(world) {
    // Realm travel must never turn an unacknowledged optimistic edit into terrain.
    return [...new Map([...(world.multiplayerInitialEdits || world.edits), ...this.edits[world.dimension]])];
  }

  async ready(ready) { return this.action('ready', { ready }); }
  async start() { return this.action('start'); }
  async ping() {
    if (!this.active) return;
    return this.action('ping', { ...this.game.pos, dimension: this.game.state.dimension });
  }

  inviteURL() {
    const url = new URL(globalThis.location.href);
    url.search = ''; url.hash = '';
    url.searchParams.set('room', this.room.code);
    // The address is visible to invitees and is never applied without showing it.
    if (this.endpoint) url.searchParams.set('server', this.endpoint);
    return url.href;
  }

  async copyInvite() {
    const url = this.inviteURL();
    if (!globalThis.navigator?.clipboard?.writeText) throw Error(`Copy this invite: ${url}`);
    await navigator.clipboard.writeText(url);
    return url;
  }

  async leave() {
    const generation = this.generation;
    try { if (this.room) await this.action('leave'); }
    catch { /* Local departure must always work, including when the server is down. */ }
    finally { if (generation === this.generation) this.reset(); }
  }

  disconnected(reason) { this.reset(); this.error = reason || 'This lobby has ended. Create or join another one.'; this.change(); }

  reset() {
    this.generation++;
    this.source?.close(); this.source = null;
    clearInterval(this.heartbeat);
    const g = this.game, restore = this.soloState;
    this.modes?.leave();
    this.active = false; this.room = null; this.token = null; this.playerId = null;
    this.status = 'idle'; this.error = ''; this.edits = emptyEdits(); this.soloState = null;
    this.pending = 0; this.editQueue = Promise.resolve(); this.sendingPose = false;
    this.remember();
    this.pingMarker = null;
    if (restore) { g.state = restore; g.loadWorld(); }
    g.screen = 'multiplayer'; g.emit('screen'); this.change();
  }

  update(dt) {
    if (!this.active || this.status !== 'connected') return;
    this.poseTimer += dt;
    if (this.poseTimer < .15 || this.sendingPose) return;
    this.poseTimer = 0;
    const g = this.game;
    const generation = this.generation;
    this.sendingPose = true;
    this.action('pose', { ...g.pos, yaw: g.yaw, pitch: g.pitch, dimension: g.state.dimension, held: g.held, moving: !g.screen && g.moving })
      .catch(error => { if (generation === this.generation && [401, 404, 410].includes(error.status)) this.disconnected(error.message); })
      .finally(() => { if (generation === this.generation) this.sendingPose = false; });
  }
}
