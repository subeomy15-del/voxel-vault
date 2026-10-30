import { ITEMS } from './data.js?v=43';

export const DEVELOPER_CODE = '73918402658391047265';
export const developerAllowed = game => !!game.state;
export const developerSpeed = game => developerAllowed(game) ? Math.max(1, Math.min(10, Number(game.developer?.speed) || 1)) : 1;
export function developerMovementSpeed(game, dt) {
  const target=developerSpeed(game), current=Number.isFinite(game.developerMotionSpeed)?game.developerMotionSpeed:1;
  game.developerMotionSpeed=current+(target-current)*(-Math.expm1(-6*Math.max(0,dt)));
  if(Math.abs(game.developerMotionSpeed-target)<.001)game.developerMotionSpeed=target;
  return game.developerMotionSpeed;
}
export const developerFlag = (game, flag) => developerAllowed(game) && !!game.developer?.[flag];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function installDeveloperTools(game, ui, multiplayer) {
  game.developer = { speed: 1, god: false, flight: false, mining: false };
  let unlocked = false, message = '', returnScreen = null;
  const launcher = document.createElement('button');
  launcher.textContent = 'Developer Tools'; launcher.id = 'developer-launcher';
  launcher.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:35;padding:9px 14px;border:1px solid #a8b982;border-radius:6px;background:#182d22;color:#f4f0d5;cursor:pointer';
  document.body.append(launcher);
  const resume = ui.resume.bind(ui);
  ui.resume = (...args) => {
    if (game.screen === 'developer' && returnScreen === 'menu') { game.screen = 'menu'; ui.render(); return; }
    return resume(...args);
  };
  const open = () => {
    if (game.screen === 'developer') return ui.resume();
    returnScreen = game.screen;
    if (game.screen === 'menu') game.screen = 'developer'; else game.pause('developer');
    ui.render();
  };
  launcher.addEventListener('click', open);
  window.addEventListener('keydown', event => {
    if (event.code !== 'F8' || event.repeat || event.target.closest?.('input,textarea,select')) return;
    event.preventDefault(); event.stopImmediatePropagation(); open();
  }, true);
  const original = ui.render.bind(ui);
  ui.render = (...args) => {
    launcher.hidden = ['menu','developer'].includes(game.screen);
    if (game.screen !== 'developer') {
      const result = original(...args);
      if (game.screen === 'menu') {
        const top = ui.overlay.querySelector('.lobby-top');
        if (top && !ui.overlay.querySelector('[data-dev-open]')) top.insertAdjacentHTML('afterend', `<button type="button" data-dev-open style="display:block;width:min(92%,1100px);margin:20px auto;padding:20px 24px;border:2px solid #b8d28a;border-radius:10px;background:#20382b;color:#f4f0d5;font-family:inherit;font-size:20px;font-weight:700;cursor:pointer;text-align:left">Developer Tools <span style="float:right">Unlock with code →</span></button>`);
      }
      return result;
    }
    const solo = developerAllowed(game);
    ui.overlay.hidden = false; ui.overlay.className = 'modal-overlay';
    document.querySelector('#hud').hidden = true;
    document.querySelector('#touch-controls').hidden = true;
    document.body.dataset.screen = 'developer';
    const button = (action, label) => `<button type="button" data-dev="${action}">${label}</button>`;
    const toggle = (key, label) => button(key, `${game.developer[key] ? '✓ ' : ''}${label}`);
    const body = !unlocked ? `<p>Enter your 20-digit developer code.</p><form data-dev-unlock><input name="code" aria-label="Developer code" inputmode="numeric" autocomplete="off" maxlength="20" required pattern="[0-9]{20}" style="width:100%;padding:12px;box-sizing:border-box"><button class="primary full">Unlock tools</button></form>` : `<p>${solo ? 'Tools apply across all modes and stay on when you switch games. Flight: Space rises, X descends.' : 'Start a game to use developer tools.'}</p><fieldset ${solo ? '' : 'disabled'} style="display:grid;gap:12px;border:0;padding:0"><label>Movement speed <output data-dev-speed-value>${game.developer.speed}×</output><input type="range" data-dev-speed aria-label="Movement speed" min="1" max="10" step="0.25" value="${game.developer.speed}" style="width:100%"></label><small>Fine adjustments · smooth acceleration and braking · normal jump height</small><div style="display:flex;flex-wrap:wrap;gap:8px">${toggle('god','God mode')}${toggle('flight','Flight')}${toggle('mining','Instant mining')}${button('heal','Full health')}${button('home','Teleport home')}${button('day','Daytime')}${button('night','Nighttime')}${button('clear','Clear enemies')}</div><label>Give item <select data-dev-item aria-label="Item">${Object.entries(ITEMS).filter(([,item])=>!item.hidden).map(([id,item])=>`<option value="${escape(id)}">${escape(item.name)}</option>`).join('')}</select></label>${button('give','Give 999 of selected item')}</fieldset>${button('reset','Reset all cheats')}${multiplayer.room ? `<hr><h3>Lobby administration</h3>${multiplayer.isHost ? `${button('start','Start game')}${button('invite','Copy invite link')}<p>Start requires everyone to be ready.</p>` : '<p>Only the lobby host can administer this room.</p>'}` : ''}`;
    ui.overlay.innerHTML = ui.frame('Developer tools', 'F8 · DEVELOPER / ADMIN', `${body}<p role="status">${escape(message)}</p>${button('close',returnScreen === 'menu' ? 'Back to main menu' : 'Back to game')}`, true);
    ui.overlay.querySelector('[name=code]')?.focus();
  };
  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-dev-unlock]')) return;
    event.preventDefault(); unlocked = new FormData(event.target).get('code') === DEVELOPER_CODE;
    if(unlocked)game.developer.unlocked=true;
    message = unlocked ? 'Developer tools unlocked.' : 'Incorrect code.'; ui.render();
  });
  document.addEventListener('input', event => {
    if (!unlocked || !developerAllowed(game) || !event.target.matches('[data-dev-speed]')) return;
    game.developer.speed = Math.max(1, Math.min(10, Number(event.target.value) || 1));
    const output=ui.overlay.querySelector('[data-dev-speed-value]');if(output)output.value=`${game.developer.speed}×`;
  });
  document.addEventListener('click', async event => {
    if (event.target.closest('[data-dev-open]')) { open(); return; }
    const action = event.target.closest('[data-dev]')?.dataset.dev;
    if (!action) return;
    if (action === 'close') return ui.resume();
    if (!unlocked) return;
    message = '';
    try {
      if (action === 'reset') { Object.assign(game.developer, {speed:1,god:false,flight:false,mining:false}); game.developerMotionSpeed=1;game.flying=false; game.vx=game.vz=game.velocity=0; }
      else if (['start','invite'].includes(action)) {
        if (!multiplayer.isHost) throw Error('Only the lobby host can use this control.');
        if (action === 'start') await multiplayer.start(); else { await multiplayer.copyInvite(); message='Invite copied.'; }
      } else {
        if (!developerAllowed(game)) throw Error('Start a game to use developer tools.');
        if (['god','flight','mining'].includes(action)) { game.developer[action]=!game.developer[action]; if(action==='flight'){game.flying=game.developer.flight;game.gliding=false;} }
        if (action === 'heal') { game.state.hp=20;game.state.breath=20;game.stamina=100; const player=game.arcade?.active&&game.arcade.round.players[0];if(player){player.hp=20;player.lives=3;} if(multiplayer.competitive)await multiplayer.action('developer',{code:DEVELOPER_CODE,settings:game.developer,command:'heal'}); }
        if (action === 'home') { if(game.parkour?.active){game.parkour.respawn();}else game.returnHome(); }
        if (action === 'day') game.state.time=70;
        if (action === 'night') game.state.time=500;
        if (action === 'clear') { game.mobs=[];game.projectiles=[];game.boss=null;game.slam=null;if(game.arcade?.active)for(const player of game.arcade.round.players)if(player.bot)game.arcade.round.eliminate(player); }
        if (action === 'give') { const item=ui.overlay.querySelector('[data-dev-item]').value;game.add(item,999);message=`Added ${ITEMS[item].name}.`; }
      }
    } catch(error) { message=error.message; }
    ui.render();
  });
  ui.render();
}
