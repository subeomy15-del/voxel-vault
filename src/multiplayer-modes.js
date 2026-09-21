import { ITEMS } from './data.js?v=36';
import { BEDWARS_BEDS, BEDWARS_BLOCKS, BEDWARS_SHOP, MODE_RULES } from './mode-rules.js?v=36';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const point = value => value && ['x', 'y', 'z'].every(key => Number.isFinite(value[key]));
const distance = (a, b) => point(a) && point(b) ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : Infinity;
const time = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, Math.ceil(seconds)) % 60).padStart(2, '0')}`;
const teamName = team => ({ ember: 'Ember', tide: 'Tide', runner: 'Runner', hunter: 'Hunters', hunters: 'Hunters' }[team] || 'Your crew');
const modeScreens = new Set(['match-respawn', 'match-spectate', 'match-result', 'match-headstart', 'match-shop']);
const palette = BEDWARS_BLOCKS.filter(item => ITEMS[item]).slice(0, 6);
const offers = [
  { id: 'blocks', title: '16 building blocks', detail: 'Bridge to an island or protect your bed.', symbol: '▦' },
  { id: 'sword', title: 'Iron sword', detail: 'A permanent upgrade for this round.', symbol: '⚔' },
  { id: 'armor', title: 'Iron armor', detail: 'Take less damage in every sword fight.', symbol: '◇' }
].map(offer => ({ ...offer, price: BEDWARS_SHOP[offer.id].cost }));

export class MultiplayerModes {
  constructor(game, ui, client) {
    this.game = game; this.ui = ui; this.client = client; client.modes = this;
    this.match = null; this.spawnSerial = null; this.matchId = null; this.pending = new Set(); this.timer = 0; this.message = '';
    this.document = globalThis.document;
    if (!this.document) return;
    this.footer = this.document.querySelector('.hud-bottom>span'); this.defaultFooter = this.footer?.innerHTML;
    this.hud = this.document.createElement('aside'); this.hud.id = 'match-hud'; this.hud.hidden = true;
    this.markers = this.document.createElement('div'); this.markers.id = 'match-markers'; this.markers.setAttribute('aria-hidden', 'true');
    this.targetLabel = this.document.createElement('div'); this.targetLabel.id = 'match-target'; this.targetLabel.hidden = true;
    this.document.querySelector('#hud')?.append(this.hud, this.markers, this.targetLabel);
    const originalRender = ui.render.bind(ui);
    ui.render = (...args) => {
      if (this.active && modeScreens.has(game.screen)) this.renderScreen();
      else originalRender(...args);
      this.renderHud();
    };
    this.document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-mode-action]');
      if (!button || button.disabled || !this.active) return;
      event.preventDefault(); this.action(button.dataset.modeAction, button.dataset.item);
    });
    this.document.addEventListener('keydown', event => {
      if (!this.active || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
      if (event.code === 'KeyK' && (!game.screen || game.screen === 'match-shop')) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (game.screen === 'match-shop') this.closeShop(); else this.shop();
      } else if (event.code === 'Escape' && modeScreens.has(game.screen)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (game.screen === 'match-shop') this.closeShop();
      }
    }, true);
  }

  get active() { return !!this.client.active && ['bedwars', 'manhunt'].includes(this.client.room?.mode); }
  get mode() { return this.client.room?.mode; }
  get self() { return this.match?.players?.find(player => player.id === this.client.playerId); }
  now() { return Date.now() + (this.clockOffset || 0); }
  get frozen() { const p = this.self; return !p || !p.alive || this.match?.phase !== 'playing' || (this.mode === 'manhunt' && p.role === 'hunter' && this.now() < this.match.headStartUntil); }

  enter() {
    if (!this.active) return;
    this.match = this.client.room.match || this.match;
    this.matchId = this.match?.id; this.spawnSerial = null; this.pending.clear(); this.message = '';
    const g = this.game;
    g.state.mode = 'arena'; g.state.inv = {}; g.state.effects = {}; g.state.enchants = {}; g.state.glider = null;
    g.state.armorParts = {}; g.state.armor = null; g.state.food = 20; g.state.saturation = 20;
    g.flying = false; g.gliding = false; g.projectiles = []; g.mobs = [];
    this.document?.body?.setAttribute('data-match-mode', this.mode);
    this.receive(this.match);
    g.toast(this.mode === 'bedwars' ? `${teamName(this.self?.team)} team · protect your bed` : this.self?.role === 'runner' ? 'You are the runner' : 'You are a hunter', this.mode === 'bedwars' ? 'Bridge, collect coins at home, and break the enemy bed. K opens your base shop.' : this.self?.role === 'runner' ? 'Touch all three beacons, then return to the start. Keep moving!' : 'Track the runner on your compass. Catch them before they reach all three beacons.', 'reward');
    this.renderHud();
  }

  leave() {
    this.match = null; this.matchId = null; this.spawnSerial = null; this.pending.clear(); this.message = '';
    this.clockOffset = 0;
    this.document?.body?.removeAttribute('data-match-mode');
    if (this.footer && this.defaultFooter !== undefined) this.footer.innerHTML = this.defaultFooter;
    if (this.hud) this.hud.hidden = true;
    if (this.targetLabel) this.targetLabel.hidden = true;
    this.markers?.replaceChildren();
  }

  receive(match) {
    if (!match || !Array.isArray(match.players)) return;
    if (this.match?.id === match.id && Number.isFinite(match.revision) && Number.isFinite(this.match.revision) && match.revision < this.match.revision) return;
    if (Number.isFinite(match.serverNow)) this.clockOffset = match.serverNow - Date.now();
    this.match = match;
    if (this.client.room) this.client.room.match = match;
    if (!this.active) return;
    if (this.matchId !== match.id) { this.matchId = match.id; this.spawnSerial = null; this.pending.clear(); this.message = ''; }
    const self = this.self, g = this.game;
    if (!self) return;
    const hp = Math.min(20, number(self.hp));
    if (hp < g.state.hp && self.alive) { g.emit('hurt'); g.audio.play('hurt'); }
    g.state.hp = hp;
    const weapon = ITEMS[self.weapon]?.kind === 'sword' ? self.weapon : 'wood_sword';
    g.state.inv = { [weapon]: 1, stone_pickaxe: 1, compass: 1, ...Object.fromEntries(palette.map(item => [item, number(self.blocks)])) };
    if (self.armor) { g.state.inv.iron_chestplate = 1; g.state.armorParts = { [ITEMS.iron_chestplate.slot]: 'iron_chestplate' }; }
    else g.state.armorParts = {};
    const selected = Math.min(8, Math.max(0, g.state.selected | 0));
    g.state.bar = [weapon, 'stone_pickaxe', ...palette, 'compass'];
    g.state.selected = selected;
    if (self.spawnSerial !== this.spawnSerial) {
      this.spawnSerial = self.spawnSerial;
      const spawn = point(self.pose) ? self.pose : self.spawn;
      if (point(spawn)) {
        g.pos = { x: spawn.x, y: spawn.y, z: spawn.z }; g.velocity = 0; g.vx = 0; g.vz = 0;
        g.yaw = Number.isFinite(spawn.yaw) ? spawn.yaw : self.team === 'ember' ? -Math.PI / 2 : self.team === 'tide' ? Math.PI / 2 : g.yaw;
        g.pitch = Number.isFinite(spawn.pitch) ? spawn.pitch : 0;
        g.grounded = false; g.jumpBuffer = 0; g.coyote = 0; g.flying = false; g.gliding = false;
      }
    }
    this.syncScreen(); this.renderHud();
  }

  async send(type, payload = {}, quiet = false) {
    if (!this.active || this.client.status !== 'connected') return null;
    const generation = this.client.generation, round = this.match?.id;
    try {
      const result = await this.client.action(type, payload);
      if (generation !== this.client.generation || round !== this.match?.id) return null;
      if (result?.match) this.receive(result.match);
      return result;
    } catch (error) {
      if (generation !== this.client.generation || round !== this.match?.id) return null;
      if (!quiet) { this.message = error.message; this.game.toast('Try again', error.message); if (modeScreens.has(this.game.screen)) this.renderScreen(); }
      return null;
    }
  }

  opponent() {
    if (!this.active || this.frozen) return null;
    const g = this.game, eye = { x: g.pos.x, y: g.pos.y + 1.4, z: g.pos.z }, dir = g.direction();
    let closest = null;
    for (const player of this.match.players) {
      if (player.id === this.client.playerId || !player.alive || player.eliminated) continue;
      if (this.mode === 'bedwars' ? player.team === this.self.team : player.role === this.self.role) continue;
      const pose = this.client.room.players.find(member => member.id === player.id)?.pose || player.pose;
      if (!point(pose) || (pose.dimension && pose.dimension !== g.state.dimension)) continue;
      const delta = { x: pose.x - eye.x, y: pose.y + .95 - eye.y, z: pose.z - eye.z };
      const along = delta.x * dir.x + delta.y * dir.y + delta.z * dir.z;
      const offRay = Math.hypot(delta.x - dir.x * along, delta.y - dir.y * along, delta.z - dir.z * along);
      if (along < 0 || along > 4.5 || offRay > .82 || closest && closest.distance <= along) continue;
      const obstruction = g.world.raycast(eye, dir, along);
      if (obstruction && obstruction.distance < along - .65) continue;
      closest = { ...player, pose, distance: along };
    }
    return closest;
  }

  attack() {
    if (!this.active) return false;
    if (this.frozen) return true;
    if (this.mode === 'manhunt' && this.now() < this.match.headStartUntil) return true;
    if (ITEMS[this.game.held]?.kind !== 'sword') return false;
    const g = this.game;
    if (g.attackCooldown > 0 || g.screen) return true;
    g.attackCooldown = .6; g.renderer.swing = 1;
    const target = this.opponent();
    if (target) this.send('attack', { targetId: target.id }).then(result => {
      if (!result || !this.active) return;
      g.audio.play('hit'); g.renderer.burst(target.pose.x, target.pose.y + 1, target.pose.z, '#f3ba8a', 7);
    });
    return true;
  }

  interact() {
    if (!this.active) return false;
    if (this.frozen) return true;
    const g = this.game, nearby = g.nearest();
    if (g.held === 'compass') { g.toast('Follow your objective', this.mode === 'bedwars' ? 'Enemy bed: cross to the other team’s island. K opens the shop near your own base.' : 'Your objective and its distance appear in the match panel.'); return true; }
    if (!nearby || !['bed', 'bench', 'furnace', 'campfire', 'chest', 'moonstone_chest', 'ender_gate', 'supply', 'camp', 'dragon_altar', 'anchor'].includes(nearby.type)) return false;
    if (ITEMS[g.held]?.place) g.place();
    else g.toast(this.mode === 'bedwars' ? 'Protect yours. Break theirs.' : 'The chase is on', this.mode === 'bedwars' ? 'Use your pickaxe to destroy the enemy bed. Buy supplies with K near your own base.' : 'Touch the glowing objectives. Crafting and travel are disabled during the match.');
    return true;
  }

  shop() {
    if (!this.active || this.mode !== 'bedwars' || this.frozen) return;
    if (distance(this.game.pos, this.self.spawn) > MODE_RULES.bedwars.shopRange) { this.game.toast('Your base shop', 'Return to your team’s generator to buy supplies.'); return; }
    this.message = ''; this.game.pause('match-shop'); this.ui.render();
  }

  closeShop() { if (this.game.screen === 'match-shop') this.ui.resume(); }

  action(action, item) {
    if (action === 'shop') return this.shop();
    if (action === 'close') return this.closeShop();
    if (action === 'leave') return this.client.leave().then(() => this.ui.render());
    if (action === 'crew') { this.game.pause('multiplayer'); this.ui.render(); return; }
    if (action !== 'buy' && action !== 'rematch' || this.pending.has(action)) return;
    this.pending.add(action); this.message = ''; this.renderScreen();
    const generation = this.client.generation;
    this.send(action, action === 'buy' ? { item } : {}).then(result => { if (result && action === 'buy') this.game.audio.play('craft'); }).finally(() => {
      if (generation !== this.client.generation) return;
      this.pending.delete(action); if (modeScreens.has(this.game.screen)) this.renderScreen();
    });
  }

  syncScreen() {
    if (!this.active || !this.self) return;
    const g = this.game, self = this.self;
    const mandatory = this.match.phase === 'ended' ? 'match-result' : !self.alive ? self.eliminated ? 'match-spectate' : 'match-respawn' : this.mode === 'manhunt' && self.role === 'hunter' && this.now() < this.match.headStartUntil ? 'match-headstart' : null;
    if (mandatory && g.screen !== mandatory && g.screen !== 'multiplayer') { g.pause(mandatory); this.ui.render(); }
    else if (!mandatory && modeScreens.has(g.screen) && g.screen !== 'match-shop') { g.resume(); this.ui.render(); }
    if (this.frozen) { g.keys.clear(); g.touch = { x: 0, z: 0 }; g.attackHeld = false; g.placeHeld = false; }
  }

  objective() {
    if (!this.match || !this.self) return null;
    if (this.mode === 'bedwars') {
      const enemy = this.self.team === 'ember' ? 'tide' : 'ember';
      return { ...BEDWARS_BEDS[enemy], name: `${teamName(enemy)} bed` };
    }
    if (this.self.role === 'hunter') {
      const runner = this.match.players.find(player => player.role === 'runner');
      const pose = this.client.room.players.find(player => player.id === runner?.id)?.pose || runner?.pose;
      return point(pose) ? { ...pose, name: 'Runner' } : null;
    }
    const beacon = this.match.beacons?.filter(beacon => !beacon.collected).sort((a, b) => distance(a, this.game.pos) - distance(b, this.game.pos))[0];
    return beacon ? { ...beacon, name: `Beacon ${String(beacon.id).split('-').at(-1)}` } : point(this.match.origin) ? { ...this.match.origin, id: 'escape', name: 'Escape · return to the start' } : null;
  }

  update(dt) {
    if (!this.active) { if (this.hud && !this.hud.hidden) this.leave(); return; }
    if (!this.match && this.client.room.match) this.receive(this.client.room.match);
    if (!this.self) return;
    this.game.state.hp = Math.min(20, number(this.self.hp));
    this.game.state.food = 20; this.game.state.saturation = 20; this.game.state.exhaustion = 0;
    this.syncScreen();
    if (!this.frozen && this.client.status === 'connected') {
      if (this.game.pos.y < MODE_RULES[this.mode].fallY && !this.pending.has('fall')) {
        this.pending.add('fall'); const generation = this.client.generation;
        this.send('fall', {}, true).finally(() => { if (generation === this.client.generation) this.pending.delete('fall'); });
      }
      if (this.mode === 'manhunt' && this.self.role === 'runner' && this.now() >= this.match.headStartUntil) {
        const goal = this.objective();
        if (goal?.id && distance(this.game.pos, goal) < 3.6 && !this.pending.has(goal.id)) {
          this.pending.add(goal.id); const generation = this.client.generation, round = this.match.id;
          this.send('objective', { id: goal.id }, true).finally(() => { if (generation === this.client.generation && round === this.match?.id) this.pending.delete(goal.id); });
        }
      }
    }
    this.timer += dt;
    if (this.timer >= .1) { this.timer = 0; this.renderHud(); this.renderMarkers(); if (modeScreens.has(this.game.screen)) this.renderScreen(); }
  }

  renderHud() {
    if (!this.hud) return;
    this.hud.hidden = !this.active || !!this.game.screen || !this.self;
    if (this.hud.hidden) return;
    const self = this.self, match = this.match, goal = this.objective(), seconds = Math.ceil(((match.endsAt || this.now()) - this.now()) / 1000);
    const players = match.players.filter(player => player.alive && !player.eliminated);
    let content;
    if (this.mode === 'bedwars') content = `<div class="match-top"><span>BED WARS</span><b>${time(seconds)}</b></div><strong class="team-${escape(self.team)}">${teamName(self.team)} team</strong><div class="match-beds">${['ember', 'tide'].map(team => `<span class="team-${team}"><i>${match.beds?.[team] ? '▰' : '×'}</i><b>${teamName(team)}</b><small>${match.beds?.[team] ? 'Bed alive' : 'No respawns'}</small></span>`).join('')}</div><p>Break the enemy bed. Eliminate their team.</p><div class="match-wallet"><b>◈ ${number(self.currency)} coins</b><span>▦ ${number(self.blocks)} blocks</span></div><small>Home generator: +2 coins / 3s</small><button data-mode-action="shop">Base shop <kbd>K</kbd></button>`;
    else content = `<div class="match-top"><span>MANHUNT</span><b>${time(seconds)}</b></div><strong>${self.role === 'runner' ? 'Stay one step ahead' : 'Hunt the runner'}</strong><div class="match-beacons">${(match.beacons || []).map((beacon, i) => `<span class="${beacon.collected ? 'complete' : ''}">${beacon.collected ? '✓' : i + 1}</span>`).join('')}<b>${(match.beacons || []).filter(beacon => beacon.collected).length} / 3</b></div><p>${self.role === 'runner' ? 'Touch every beacon, then escape at the start.' : 'Catch the runner before all beacons are touched and they escape.'}</p><small>${this.now() < match.headStartUntil ? `Runner’s head start · ${Math.ceil((match.headStartUntil - this.now()) / 1000)}s` : `${players.filter(player => player.role === 'hunter').length} hunters on the trail`}</small>`;
    if (goal) {
      const dx = goal.x - this.game.pos.x, dz = goal.z - this.game.pos.z;
      const turn = Math.atan2(-dx, -dz) - this.game.yaw;
      content += `<div class="match-bearing"><i style="transform:rotate(${-turn}rad)">↑</i><span>${escape(goal.name)}<small>${Math.round(Math.hypot(dx, dz))}m away</small></span></div>`;
    }
    content += '<button class="match-crew" data-mode-action="crew">Your lobby · Invite friends</button>';
    if (this.hud.innerHTML !== content) this.hud.innerHTML = content;
    const target = this.opponent(); this.targetLabel.hidden = !target;
    if (target) { const name = this.client.room.players.find(player => player.id === target.id)?.name || 'Opponent'; this.targetLabel.textContent = `${name} · ${number(target.hp)} / 20 ♥`; }
    const location = this.document.querySelector('#location');
    if (location) {
      location.querySelector('.eyebrow').textContent = this.mode === 'bedwars' ? 'BED WARS' : 'MANHUNT';
      location.querySelector('strong').textContent = this.mode === 'bedwars' ? `${teamName(self.team)} team` : self.role === 'runner' ? 'You are the runner' : 'You are a hunter';
      location.querySelector('small').textContent = this.mode === 'bedwars' ? 'Protect your bed. Take their island.' : self.role === 'runner' ? 'Three beacons. One escape.' : 'Follow the runner. Stop the escape.';
    }
    if (this.footer) this.footer.innerHTML = `<kbd>1</kbd> Sword &nbsp; <kbd>2</kbd> Pickaxe &nbsp; <kbd>Shift</kbd> Sprint &nbsp; ${this.mode === 'bedwars' ? '<kbd>B</kbd> Bridge &nbsp; <kbd>K</kbd> Shop' : '<kbd>P</kbd> Ping location'}`;
  }

  renderMarkers() {
    if (!this.markers) return;
    this.markers.hidden = !this.active || !!this.game.screen;
    if (this.markers.hidden) return;
    const marks = this.mode === 'bedwars' ? [{ x: -48, y: 25, z: -4, name: 'EMBER BED', color: 'ember' }, { x: 48, y: 25, z: -4, name: 'TIDE BED', color: 'tide' }] : [...(this.match.beacons || []).filter(beacon => !beacon.collected).map((beacon, i) => ({ ...beacon, name: `BEACON ${beacon.id.split('-').at(-1) || i + 1}`, color: 'beacon' })), ...(this.match.beacons?.every(beacon => beacon.collected) && this.match.origin ? [{ ...this.match.origin, name: 'ESCAPE', color: 'beacon' }] : [])];
    this.markers.innerHTML = marks.map(mark => {
      const screen = this.game.renderer.screenPoint?.(mark.x, mark.y + 3.5, mark.z);
      if (!screen || screen.x < .02 || screen.x > .98 || screen.y < .05 || screen.y > .85) return '';
      return `<span class="mode-world-marker team-${mark.color}" style="left:${screen.x * 100}%;top:${screen.y * 100}%">${escape(mark.name)}<small>${Math.round(distance(mark, this.game.pos))}m</small></span>`;
    }).join('');
  }

  renderScreen() {
    if (!this.document || !this.active || !modeScreens.has(this.game.screen) || !this.self) return;
    const self = this.self, screen = this.game.screen;
    this.document.body.dataset.screen = screen;
    this.document.querySelector('#hud').hidden = true;
    this.document.querySelector('#touch-controls').hidden = true;
    const overlay = this.ui.overlay; overlay.hidden = false; overlay.className = 'match-overlay';
    let kicker = this.mode === 'bedwars' ? 'BED WARS' : 'MANHUNT', title, body;
    if (screen === 'match-shop') {
      title = 'Gear up. Get back out there.';
      body = `<p>Stand near your home generator to earn coins. Upgrades last for this round.</p><div class="match-shop-wallet">◈ ${number(self.currency)} coins <span>▦ ${number(self.blocks)} blocks</span></div><div class="match-shop-grid">${offers.map(offer => {
        const owned = offer.id === 'sword' && self.weapon === 'iron_sword' || offer.id === 'armor' && self.armor;
        return `<article><span>${offer.symbol}</span><h3>${offer.title}</h3><p>${offer.detail}</p><button data-mode-action="buy" data-item="${offer.id}" ${owned || number(self.currency) < offer.price || this.pending.has('buy') ? 'disabled' : ''}>${owned ? 'Equipped' : `${offer.price} coins · Buy`}</button></article>`;
      }).join('')}</div><p class="match-feedback" role="status">${escape(this.message)}</p><button class="match-primary" data-mode-action="close">Back to the battle <kbd>K / Esc</kbd></button>`;
    } else if (screen === 'match-headstart') {
      title = `The hunt begins in ${Math.max(0, Math.ceil((this.match.headStartUntil - this.now()) / 1000))}`;
      body = '<p>The runner has a head start. When the countdown ends, follow your compass and work together to catch them.</p><div class="match-wait-symbol">⌖</div><small>Your sword is in slot 1. Shift to sprint. Stay on the runner’s trail.</small>';
    } else if (screen === 'match-respawn') {
      title = `Back in ${Math.max(1, Math.ceil((self.respawnAt - this.now()) / 1000))}…`;
      body = `<p>${this.mode === 'bedwars' ? 'Your bed is still standing. You’ll respawn at your team’s base.' : 'Catch your breath. You’ll rejoin the hunt in a moment.'}</p><div class="match-wait-symbol">↻</div>`;
    } else if (screen === 'match-spectate') {
      title = 'Your round is over.';
      body = `<p>${this.mode === 'bedwars' ? 'Your bed was destroyed. Your surviving teammates can still bring home the win.' : 'Stay to see how the chase ends.'}</p><div class="match-results">${this.rosterMarkup()}</div><button data-mode-action="crew">View your lobby</button>`;
    } else {
      title = this.match.title || `${teamName(this.match.winner)} win!`;
      body = `<p>${this.mode === 'bedwars' ? 'The last team standing takes the islands.' : this.match.winner === 'runner' ? 'Three beacons. One escape. The runner made it home.' : 'The hunters stopped the escape.'}</p><div class="match-results">${this.rosterMarkup()}</div>${this.client.isHost ? `<button class="match-primary" data-mode-action="rematch" ${this.pending.has('rematch') ? 'disabled' : ''}>${this.pending.has('rematch') ? 'Setting up…' : 'Play another round'}</button>` : '<small>Your host can start the next round.</small>'}<button data-mode-action="crew">Back to your lobby</button><p class="match-feedback" role="status">${escape(this.message)}</p>`;
    }
    const markup = `<section class="match-card ${screen === 'match-shop' ? 'match-shop' : ''}" role="dialog" aria-modal="true" aria-labelledby="match-title"><span class="match-kicker">${kicker}</span><h1 id="match-title">${escape(title)}</h1>${body}<button class="match-exit" data-mode-action="leave">Leave lobby</button></section>`;
    if (overlay.innerHTML !== markup) {
      const focused = this.document.activeElement;
      const action = focused?.dataset?.modeAction, item = focused?.dataset?.item;
      overlay.innerHTML = markup;
      if (this.renderedScreen !== screen) {
        const heading = overlay.querySelector('#match-title'); heading.tabIndex = -1; heading.focus({ preventScroll: true });
      } else if (action) {
        [...overlay.querySelectorAll('[data-mode-action]')].find(button => button.dataset.modeAction === action && button.dataset.item === item)?.focus({ preventScroll: true });
      }
      this.renderedScreen = screen;
    }
  }

  rosterMarkup() {
    return (this.match.players || []).map(player => `<div><span>${escape(this.client.room.players.find(member => member.id === player.id)?.name || 'Player')}</span><small>${teamName(player.team || player.role)}</small><b>${player.eliminated ? 'Out' : player.alive ? `${number(player.hp)} ♥` : 'Respawning'}</b></div>`).join('');
  }
}
