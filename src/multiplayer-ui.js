const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color = value => /^#[\da-f]{6}$/i.test(value || '') ? value : '#a5b985';
const milestones = [[25, 'Camp'], [100, 'Village'], [300, 'Citadel']];
const modes = {creative:{name:'Build Together',tag:'SHARED CREATIVE',description:'Unlimited blocks. Shared builds. Create a world with your crew.'},bedwars:{name:'Bed Wars',tag:'TEAM BATTLE',description:'Protect your bed, gather resources, and break the other team’s bed.'},manhunt:{name:'Manhunt',tag:'HUNTERS VS RUNNER',description:'One runner. A crew of hunters. A chase across the wilds.'}};
const modeInfo = room => modes[room?.mode] || modes.creative;

export class MultiplayerUI {
  constructor(game, ui, client) {
    this.game = game; this.ui = ui; this.client = client; this.tab = 'browse'; this.pending = ''; this.message = ''; this.localError = ''; this.listed = false;
    let savedName = ''; try { savedName = localStorage.getItem('voxel-vault-builder-name') || ''; } catch {}
    const query = new URLSearchParams(location.search);
    this.fields = { mode: 'creative', playerName: savedName, code: query.get('room') || '', name: '', maxPlayers: '8', public: false, endpoint: query.get('server') || client.endpoint || '' };
    this.serverOpen = !!query.get('server'); this.unconfirmedServer = !!query.get('server');
    this.hud = document.createElement('aside'); this.hud.id = 'mp-party'; this.hud.hidden = true; document.querySelector('#hud').append(this.hud);
    const originalRender = ui.render.bind(ui);
    ui.render = (...args) => { if (game.screen === 'multiplayer') this.render(); else { originalRender(...args); this.decorateMenu(); this.decoratePause(); } this.update(); };
    client.addEventListener('change', () => { if (game.screen === 'multiplayer') this.render(); this.update(); });
    document.addEventListener('click', event => { if(event.target.matches('[data-mp-select]'))event.target.select(); const button = event.target.closest('[data-mp-action]'); if (button && !button.disabled) { event.preventDefault(); this.action(button.dataset.mpAction, button); } });
    document.addEventListener('input', event => { const key = event.target.dataset.mpField; if (key) { this.fields[key] = event.target.type === 'checkbox' ? event.target.checked : event.target.value; if (key === 'playerName') { try { localStorage.setItem('voxel-vault-builder-name', this.fields.playerName); } catch {} } } });
    document.addEventListener('change', event => { const key = event.target.dataset.mpField; if (key) { this.fields[key] = event.target.type === 'checkbox' ? event.target.checked : event.target.value; if (key === 'mode' || key === 'public') this.render(); } });
    document.addEventListener('submit', event => { if (event.target.matches('[data-mp-form]')) { event.preventDefault(); this.action(event.target.dataset.mpForm); } });
    window.addEventListener('keydown', event => { if (game.screen === 'multiplayer' && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.back(); } }, true);
    ui.render();
    if (query.get('room')) this.open();
  }

  open() {
    this.game.pause('multiplayer'); this.game.screen = 'multiplayer'; this.ui.render();
    if (!this.client.room && !this.listed && !this.unconfirmedServer) this.run('refresh', () => this.client.listRooms());
  }
  back() { if (this.client.active) this.ui.resume(); else { this.game.screen = 'menu'; this.ui.render(); } }
  async run(name, callback) {
    if (this.pending) return;
    this.pending = name; this.localError = ''; this.message = ''; this.render();
    try { await callback(); if (name === 'refresh') this.listed = true; }
    catch (error) { this.localError = error?.message || 'Something went wrong. Please try again.'; }
    finally { this.pending = ''; if (this.game.screen === 'multiplayer') this.render(); this.update(); }
  }
  action(action, button) {
    if (action.startsWith('mode-') && modes[action.slice(5)]) { this.fields.mode=action.slice(5);this.tab='create';this.open();return; }
    if (action === 'open') return this.open();
    if (action === 'back') return this.back();
    if (action === 'browse' || action === 'create-tab') { this.tab = action === 'browse' ? 'browse' : 'create'; this.render(); return; }
    if (action === 'server-toggle') { this.serverOpen = !this.serverOpen; this.render(); return; }
    if (action === 'refresh') return this.run('refresh', () => this.client.listRooms());
    if (action === 'server') return this.run('server', async () => { this.client.setEndpoint(this.fields.endpoint); this.unconfirmedServer = false; await this.client.listRooms(); this.listed = true; this.message = 'Server connected.'; });
    if (action === 'copy') return this.run('copy', async () => { await this.client.copyInvite(); this.message = 'Invite link copied. Send it to your friends.'; });
    if (action === 'ready') return this.run('ready', () => this.client.ready(!this.client.room?.players.find(p => p.id === this.client.playerId)?.ready));
    if (action === 'start') return this.run('start', () => this.client.start());
    if (action === 'leave') return this.run('leave', async () => { await this.client.leave(); this.game.screen = 'multiplayer'; this.listed = false; });
    if (action === 'ping') { this.client.ping().catch(error => this.game.toast('Ping unavailable', error.message)); return; }
    if (action === 'join' || action === 'join-room' || action === 'create') {
      if (!this.fields.playerName.trim()) { this.localError = 'Choose a builder name first.'; this.render(); document.querySelector('#mp-player-name')?.focus(); return; }
      if (this.unconfirmedServer) { this.localError = 'Connect to the server from this invite in Server settings first.'; this.serverOpen = true; this.render(); return; }
      if (action === 'create') return this.run('create', () => this.client.create({ mode: this.fields.mode, name: this.fields.name.trim() || `${this.fields.playerName.trim()}'s world`, playerName: this.fields.playerName.trim(), public: !!this.fields.public, maxPlayers: Number(this.fields.maxPlayers) }));
      return this.run('join', () => this.client.join(button?.dataset.code || this.fields.code, this.fields.playerName.trim()));
    }
  }
  button(action, text, className = '', disabled = false) { return `<button type="button" data-mp-action="${action}" class="mp-button ${className}" ${disabled || this.pending ? 'disabled' : ''}>${text}</button>`; }
  decorateMenu() {
    if (this.game.screen !== 'menu') return;
    const heading = this.ui.overlay.querySelector('.lobby-heading h1'); if (heading) heading.textContent = 'Make a world worth sharing.';
    const label = this.ui.overlay.querySelector('.lobby-top > span'); if (label) label.textContent = 'Solo adventures · Play with friends';
    const modes = this.ui.overlay.querySelector('.game-modes');
    if (modes && !this.ui.overlay.querySelector('.mp-menu-card')) modes.insertAdjacentHTML('beforebegin', `<button class="mp-menu-card" data-mp-action="open"><span class="mp-menu-art" aria-hidden="true"><i></i><i></i><i></i></span><span class="mp-menu-copy"><small>ONLINE MULTIPLAYER · UP TO 8 PLAYERS</small><strong>Play together.</strong><span>Build together. Battle in Bed Wars. Chase in Manhunt.</span></span><b>${this.client.room ? 'Return to lobby' : 'Find your crew'} <span>↗</span></b></button>`);
    if (modes && !this.ui.overlay.querySelector('.mp-playlists')) modes.insertAdjacentHTML('beforebegin', `<div class="mp-playlists" aria-label="Multiplayer game modes"><button data-mp-action="mode-creative"><i>▦</i><span><b>Build Together</b><small>Unlimited blocks. Shared worlds.</small></span><strong>↗</strong></button><button data-mp-action="mode-bedwars"><i>⚑</i><span><b>Bed Wars</b><small>Protect your bed. Take their island.</small></span><strong>↗</strong></button><button data-mp-action="mode-manhunt"><i>⌖</i><span><b>Manhunt</b><small>One runner. A whole crew on the chase.</small></span><strong>↗</strong></button></div>`);
  }
  decoratePause() {
    if (this.game.screen !== 'pause' || !this.client.room) return;
    const modal = this.ui.overlay.querySelector('.modal');
    if (modal && !modal.querySelector('[data-mp-action]')) modal.insertAdjacentHTML('beforeend', this.button('open', 'Your lobby · Invite friends', 'mp-pause-button'));
  }
  render() {
    if (this.game.screen !== 'multiplayer') return;
    const focused = document.activeElement; const focusId = focused?.id; const selection = typeof focused?.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
    const scroll = this.ui.overlay.scrollTop;
    document.body.dataset.screen = 'multiplayer'; document.querySelector('#hud').hidden = true; document.querySelector('#touch-controls').hidden = true;
    this.ui.overlay.hidden = false; this.ui.overlay.className = 'mp-overlay';
    const status = this.client.status; const error = this.localError || this.client.error;
    this.ui.overlay.innerHTML = `<section class="mp-shell" role="dialog" aria-modal="true" aria-label="Multiplayer lobby"><header class="mp-top"><button class="mp-back" data-mp-action="back">← ${this.client.active ? 'Back to world' : 'Main menu'}</button><span class="mp-brand">VOXEL VAULT <b>/ MULTIPLAYER</b></span><span class="mp-connection ${status === 'connected' ? 'connected' : ''}"><i></i>${escape(({connected:'Connected',connecting:'Connecting…',reconnecting:'Reconnecting…'})[status] || 'Play together')}</span></header><div class="mp-content">${this.client.room ? this.roomMarkup() : this.browserMarkup()}<div class="mp-feedback" role="${error ? 'alert' : 'status'}" aria-live="polite">${error ? `<span class="mp-error">${escape(error)}</span>` : this.pending ? escape(({refresh:'Finding public lobbies…',create:'Creating your world…',join:'Joining your crew…',start:'Opening the shared world…',server:'Connecting to server…'})[this.pending] || 'Working…') : escape(this.message)}</div>${!this.client.room ? this.serverMarkup() : ''}</div></section>`;
    this.ui.overlay.scrollTop = scroll;
    if (focusId) { const input = document.getElementById(focusId); input?.focus({ preventScroll: true }); if (selection) input?.setSelectionRange?.(...selection); }
  }
  browserMarkup() {
    const rooms = this.client.rooms || [];
    return `<div class="mp-intro"><span class="mp-eyebrow">GOOD WORLDS START WITH GOOD COMPANY</span><h1>Better with<br><em>your people.</em></h1><p>Build a world, defend your bed, or outrun the hunters. Find your crew and make your next great story.</p></div><div class="mp-browser-grid"><aside class="mp-panel mp-join-panel"><span class="mp-eyebrow">FIRST, INTRODUCE YOURSELF</span><label class="mp-label" for="mp-player-name">Your player name</label><input id="mp-player-name" data-mp-field="playerName" maxlength="20" autocomplete="nickname" placeholder="What should we call you?" value="${escape(this.fields.playerName)}"><div class="mp-divider"></div><h2>Got an invite?</h2><p>Enter your friend's six-character lobby code.</p><form data-mp-form="join"><label class="mp-label" for="mp-room-code">Lobby code</label><div class="mp-inline"><input id="mp-room-code" class="mp-code-input" data-mp-field="code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" value="${escape(this.fields.code)}"><button class="mp-button mp-primary" ${this.pending ? 'disabled' : ''}>Join →</button></div></form><div class="mp-shared-note"><span>◈</span><p>Build Together · Bed Wars · Manhunt<br>Your next world starts with your crew.</p></div></aside><section class="mp-panel mp-browser"><nav class="mp-tabs" aria-label="Lobby options">${this.button('browse','Public lobbies',this.tab === 'browse' ? 'active' : '')}${this.button('create-tab','Create a lobby',this.tab === 'create' ? 'active' : '')}</nav>${this.tab === 'create' ? `<form data-mp-form="create" class="mp-create"><h2>A fresh world for your crew.</h2><p>Pick your game and send your friends an invite.</p><label class="mp-label" for="mp-mode">Game mode</label><select id="mp-mode" data-mp-field="mode">${Object.entries(modes).map(([key,mode])=>`<option value="${key}" ${this.fields.mode===key?'selected':''}>${mode.name}</option>`).join('')}</select><p class="mp-mode-description">${modes[this.fields.mode]?.description||modes.creative.description}</p><label class="mp-label" for="mp-lobby-name">Lobby name</label><input id="mp-lobby-name" data-mp-field="name" maxlength="36" placeholder="The weekend build" value="${escape(this.fields.name)}"><div class="mp-create-options"><label class="mp-label" for="mp-max-players">Room for<select id="mp-max-players" data-mp-field="maxPlayers">${[2,4,6,8].map(n=>`<option value="${n}" ${Number(this.fields.maxPlayers)===n?'selected':''}>${n} players</option>`).join('')}</select></label><label class="mp-checkbox"><input type="checkbox" data-mp-field="public" ${this.fields.public?'checked':''}> List in public lobbies</label></div><small class="mp-note">${this.fields.public?'Anyone can find this lobby.':'Private by default. Friends join with your code or link.'} Shared worlds last for this server session.</small><button class="mp-button mp-primary mp-wide" ${this.pending?'disabled':''}>Create lobby <span>→</span></button></form>` : `<div class="mp-browser-title"><div><h2>Find your next crew.</h2><p>Open lobbies on this server.</p></div>${this.button('refresh','↻ Refresh','mp-small')}</div><div class="mp-room-list">${rooms.length ? rooms.map(room=>{const count=room.playerCount??(typeof room.players==='number'?room.players:room.players?.length)??0;const locked=room.mode&&room.mode!=='creative'&&room.status==='playing';return `<div class="mp-room-row"><span class="mp-room-icon" aria-hidden="true">◈</span><div><strong>${escape(room.name)}</strong><small>${escape(modeInfo(room).name)} · ${room.status==='playing'?'In game':'Waiting'} · ${count}/${Number(room.maxPlayers)||8} players</small></div><button class="mp-button mp-small" data-mp-action="join-room" data-code="${escape(room.code)}" ${this.pending||count>=room.maxPlayers||locked?'disabled':''}>${locked?'In game':count>=room.maxPlayers?'Full':'Join →'}</button></div>`;}).join('') : `<div class="mp-empty"><span aria-hidden="true">▧</span><h3>${this.pending==='refresh'?'Looking for a crew…':this.client.error?'Server unavailable':this.listed?'Be the first to build.':'Find a world to join.'}</h3><p>${this.client.error?'Check Server settings below to connect to a running Voxel Vault server.':this.listed?'No public lobbies here yet. Create one and invite your friends.':'Refresh to see public lobbies, or create your own.'}</p>${this.button('create-tab','Create a lobby','mp-outline')}</div>`}</div>`}</section></div>`;
  }
  roomMarkup() {
    const room=this.client.room, players=room.players||[], self=players.find(p=>p.id===this.client.playerId), waiting=room.status!=='playing';
    const creative=!room.mode||room.mode==='creative', enoughPlayers=players.length>=(creative?1:2), allReady=players.every(p=>p.id===room.hostId||p.ready), connected=this.client.status==='connected';
    const mode=modeInfo(room), count=Math.max(0,Number(room.buildCount)||0), invite=this.client.inviteURL?.() || '';
    return `<div class="mp-room-hero"><span class="mp-eyebrow">${room.public?'PUBLIC LOBBY':'INVITE-ONLY LOBBY'} · ${mode.tag}</span><h1>${escape(room.name)}</h1><p>${escape(mode.description)} ${waiting?'Gather your crew.':'Your game is live.'}</p><div class="mp-invite"><div><small>LOBBY CODE</small><strong>${escape(room.code)}</strong></div>${this.button('copy','Copy invite link ↗','mp-primary')}</div>${invite?`<label class="mp-invite-url"><span>Or copy this link</span><input readonly aria-label="Lobby invite link" value="${escape(invite)}" data-mp-select></label>`:''}</div><section class="mp-panel mp-crew"><div class="mp-browser-title"><div><h2>Your crew <span>${players.length}/${room.maxPlayers}</span></h2><p>${waiting?'Say you’re ready. The host opens the world.':'Your crew is in the game. Invite friends to join the fun.'}</p></div><span class="mp-pill">${waiting?'IN THE LOBBY':'WORLD IS LIVE'}</span></div><div class="mp-roster">${Array.from({length:Math.min(8,Math.max(players.length,Number(room.maxPlayers)||8))},(_,index)=>{const p=players[index];return p?`<div class="mp-player"><span class="mp-avatar" style="--avatar:${color(p.color)}" aria-hidden="true"><i></i></span><div><strong>${escape(p.name)}${p.id===this.client.playerId?' <small>(you)</small>':''}</strong><span>${p.id===room.hostId?'HOST':p.ready||!waiting?'READY':'GETTING READY'}</span></div><b class="${p.ready||p.id===room.hostId||!waiting?'is-ready':''}" aria-label="${p.ready||p.id===room.hostId||!waiting?'Ready':'Not ready'}">${p.ready||p.id===room.hostId||!waiting?'✓':'·'}</b></div>`:`<div class="mp-player mp-vacant"><span class="mp-empty-avatar">+</span><span>Room for a friend</span></div>`;}).join('')}</div></section>${creative?`<section class="mp-team-goals"><div><span class="mp-eyebrow">MAKE YOUR MARK TOGETHER</span><h2>From first block to citadel.</h2></div><div class="mp-milestones">${milestones.map(([goal,name])=>`<div class="${count>=goal?'complete':''}"><strong>${count>=goal?'✓ ':''}${name}</strong><span>${goal} blocks</span><i style="--progress:${Math.min(100,count/goal*100)}%"></i></div>`).join('')}</div></section>`:''}<footer class="mp-room-footer">${this.button('leave','Leave lobby','mp-leave')}<span>${!connected?'Connection interrupted. Waiting to reconnect…':waiting?(this.client.isHost?!enoughPlayers?'Invite at least one friend to start.':allReady?'Your crew is ready to play.':'Waiting for everyone to ready up.':'Your host will open the world when everyone is ready.'):creative?`${count} blocks placed together`:`${mode.name} · Match in progress`}</span>${!waiting?this.button('back','Return to world →','mp-primary'):this.client.isHost?this.button('start',room.mode==='creative'||!room.mode?'Start building →':'Start game →','mp-primary',!allReady||!connected||!enoughPlayers):this.button('ready',self?.ready?'✓ Ready — click to undo':'I’m ready →',self?.ready?'mp-ready':'mp-primary',!connected)}</footer>`;
  }
  serverMarkup() { return `<section class="mp-server">${this.button('server-toggle',`${this.serverOpen?'−':'+'} Server settings`,'mp-server-toggle')}<span>${this.client.endpoint ? escape(this.client.endpoint) : 'This website’s server'}</span>${this.serverOpen?`<form data-mp-form="server"><p>Playing from a static site? Connect to a running Voxel Vault server. Everyone in your crew needs the same address.</p>${this.unconfirmedServer?'<p class="mp-server-notice">This invite includes a server address. Review it before connecting.</p>':''}<label class="mp-label" for="mp-server-url">Server address</label><div class="mp-inline"><input id="mp-server-url" data-mp-field="endpoint" type="url" placeholder="https://your-voxel-server.example" value="${escape(this.fields.endpoint)}"><button class="mp-button" ${this.pending?'disabled':''}>Connect</button></div><small>Leave blank to use this website’s server.</small></form>`:''}</section>`; }
  update() {
    const room=this.client.room; this.hud.hidden=!room||!this.client.active||!!this.game.screen||!!(room.mode&&room.mode!=='creative');
    if (!room || !this.client.active) return;
    const objective=document.querySelector('#rift-objective'); if(objective)objective.hidden=true;
    const save=document.querySelector('#save-state'); if(save)save.textContent=this.client.status==='connected'?'Shared lobby · Server session':'Shared lobby · Reconnecting…';
    if(room.mode&&room.mode!=='creative')return;
    const count=Math.max(0,Number(room.buildCount)||0), target=milestones.find(([goal])=>count<goal)||milestones[2], signature=`${room.code}:${room.players?.length}:${count}:${this.client.status}`;
    if(signature===this.hudSignature)return;this.hudSignature=signature;
    this.hud.innerHTML=`<div class="mp-party-top"><span><i class="${this.client.status==='connected'?'connected':''}"></i> ${room.players?.length||1} builders</span><button data-mp-action="open">Lobby ↗</button></div><strong>${count>=300?'Citadel builders':`Build a ${target[1].toLowerCase()}`}</strong><div class="mp-party-progress"><i style="width:${Math.min(100,count/target[0]*100)}%"></i></div><small>${count} / ${target[0]} blocks together</small><button class="mp-ping" data-mp-action="ping" ${this.client.status!=='connected'?'disabled':''}>◎ Ping my location</button>`;
  }
}
