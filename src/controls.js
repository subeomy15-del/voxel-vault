// Bindings verified against the live Bloxd.io Controls panel, 2026-09-23.
// Mode-specific features that Voxel Vault does not implement are not advertised.
export const CROUCH_KEYS = Object.freeze(['ControlLeft','ControlRight','KeyC','CapsLock','Backslash','IntlBackslash','KeyX']);
export const CONTROL_ROWS = Object.freeze([
 ['WASD / arrows','Move'],['Mouse','Look'],['Space','Jump · hold to repeat'],['Shift','Run'],
 ['Ctrl / C / Caps Lock / \\','Crouch · fly down'],['Double Space','Toggle Creative flight'],
 ['Left click','Mine / attack'],['Right click / E','Use / place'],['Middle click / Alt + left click','Pick block in Creative'],
 ['1–9 / 0 / wheel','Select one of 10 hotbar slots'],['Q / Shift + Q','Drop one / stack (solo)'],
 ['Tab','Inventory & crafting · Tab again to close'],['V (hold)','Zoom'],['P / F5','Camera view'],
 ['O','Settings'],['F2','Performance display'],['F4 (hold)','Hide interface'],
 ['Z','Emotes'],['G','Player list'],['B','Bed Wars shop / solo item catalogue'],
 ['N','Character colors & equipment'],['U','Creatures & biome explorer'],['I','Invite information'],['M','Tasks & journal'],['Esc','Pause / close'],
 ['J','World map'],['L','Glider'],['H','Firecracker boost'],['Y','Multiplayer ping'],
 ['R','Dash · retry checkpoint in Parkour'],['F','Eat / use held potion'],['T','Rotate building block']
]);
export function hotbarIndex(code) { return /^Digit[0-9]$/.test(code) ? (Number(code.at(-1))+9)%10 : -1; }
export function applyLook(game, dx, dy, sensitivity=1, touch=false) {
 if (!Number.isFinite(dx)||!Number.isFinite(dy)) return;
 const factor=(touch?.007:.0032)*sensitivity;
 game.yaw-=dx*factor;
 game.pitch=Math.max(-1.52,Math.min(1.52,game.pitch-dy*factor*(game.renderer?.settings?.invertY?-1:1)));
}
export function clearControls(game) {
 game.keys.clear();game.movementInputHeld?.clear();game.touch={x:0,z:0};
 game.attackHeld=false;game.placeHeld=false;game.touchSprint=false;
 game.sprintToggle=false;game.crouchToggle=false;
}
