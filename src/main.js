import {potionFor} from './potions.js?v=35';
import {installWorldDebug} from './world-debug.js?v=35';
import {openDurableStorage} from './durable-storage.js?v=35';
import {showStartupFailure} from './startup-errors.js?v=35';
import { MultiplayerModes } from './multiplayer-modes.js?v=35';
import { Parkour } from './parkour.js?v=35';
import { ParkourUI } from './parkour-ui.js?v=35';
import { ParkourView } from './parkour-view.js?v=35';
import { movementInput,releaseJump } from './movement.js?v=35';
import { Multiplayer } from './multiplayer.js?v=35';
import { MultiplayerUI } from './multiplayer-ui.js?v=35';
import { MultiplayerPlayers } from './multiplayer-players.js?v=35';
import { FieldGoals } from './field-goals.js?v=35';
import { ITEMS,BLOCKS } from './data.js?v=35';
import { Renderer } from './render.js?v=35';
import { Game } from './game.js?v=35';
import { Audio } from './audio.js?v=35';
import { UI } from './ui.js?v=35';
import { loadSettings,saveSettings } from './save.js?v=35';
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
export const settings=loadSettings(storage);
if(matchMedia('(prefers-reduced-motion: reduce)').matches){settings.bobbing=false;settings.cameraEffects=false;}
let startupStage='renderer';
let renderer,game,ui,multiplayer,multiplayerUI,multiplayerPlayers,fieldGoals,parkour,parkourUI,parkourView;
try{
  renderer=new Renderer(document.querySelector('#world'),settings);
  startupStage='save';
  try{storage=await openDurableStorage(storage);}catch(error){document.querySelector('#save-state').textContent='Recovery storage unavailable · using local saves';}
  game=new Game(renderer,new Audio(settings),storage);startupStage='interface';ui=new UI(game,settings);installWorldDebug(game,renderer);
  multiplayer=new Multiplayer(game);multiplayerUI=new MultiplayerUI(game,ui,multiplayer);multiplayerPlayers=new MultiplayerPlayers(renderer,multiplayer);fieldGoals=new FieldGoals(game);game.fieldGoals=fieldGoals;new MultiplayerModes(game,ui,multiplayer);multiplayer.restore();
  parkour=new Parkour(game);parkourUI=new ParkourUI(game,ui,parkour);parkourView=new ParkourView(renderer,parkour);
  const canvas=renderer.renderer.domElement;const use=()=>{if(game.interact()===true){game.placeHeld=true;game.placeTimer=.3;}};let dragging=false,lastTouch=null,lastSpace=0,expectedUnlock=false;
  const open=screen=>{if(game.screen===screen){ui.resume();return;}game.pause(screen);ui.render();};
  addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(game.screen==='multiplayer'||game.screen?.startsWith('match-'))return;if(e.code==='Tab'&&game.screen)return;
    if(['F3','F5','Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.code==='F3'&&!e.repeat){settings.debugFPS=!settings.debugFPS;saveSettings(storage,settings);renderer.applySettings?.(settings);return;}
    if(game.screen==='parkour-results'){if(e.code==='Escape')ui.action('menu');return;}
    if(e.code==='Escape'){if(game.screen==='menu')return;if(game.screen==='death'||game.screen==='victory')return;if(game.screen){if(['settings','help','controls','credits'].includes(game.screen))ui.action('back');else ui.resume();}else{game.pause();ui.render();}return;}
    if(!game.screen&&e.ctrlKey&&['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    const screens=parkour.active?{}:{Tab:'inventory',KeyC:'craft',KeyM:'map',KeyJ:'journal'};if(screens[e.code]&&game.screen!=='menu'&&!['death','victory','confirm'].includes(game.screen)){open(screens[e.code]);return;}
    if(e.code==='KeyH'&&(!game.screen||game.screen==='inventory')){game.useFirecracker();ui.refreshItems();return;}
    if(game.screen)return;if(e.code==='KeyV'||e.code==='F5'){ui.action('camera');return;}movementInput(game,e.code,true);
    if(parkour.active&&e.code==='KeyR'){parkour.resetToCheckpoint();return;}
    if(/^Digit[1-9]$/.test(e.code)){const index=Number(e.code.at(-1))-1;if(game.state.bar[index]==='firecracker')game.useFirecracker();else if(potionFor(game.state.bar[index]))game.drink(game.state.bar[index]);else game.select(index);}
    if(e.code==='Space'){if(game.creative&&performance.now()-lastSpace<300){game.flying=!game.flying;game.toast(game.flying?'Taking the scenic route':'Back on solid ground',game.flying?'Space to rise · X to descend':'');}lastSpace=performance.now();game.jump();}
    if(parkour.active)return;
    if(e.code==='KeyP'&&multiplayer.active)multiplayer.ping().catch(error=>game.toast('Could not send ping',error.message));if(e.code==='KeyG')game.toggleGlide();if(e.code==='KeyR')game.dash();if(e.code==='KeyT')game.rotateBuilding();if(e.code==='KeyE')use();if(e.code==='KeyB')game.place(true);if(e.code==='KeyF')game.eatAvailable();if(e.code==='KeyQ')game.drink(potionFor(game.held)?game.held:'potion');
  });
  addEventListener('keyup',e=>{movementInput(game,e.code,false);if(e.code==='Space')releaseJump(game);if(e.code==='KeyE')game.placeHeld=false;});
  addEventListener('blur',()=>{game.keys.clear();game.attackHeld=false;game.placeHeld=false;if(!game.screen){game.pause();ui.render();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){game.save();storage.flush?.();if(!game.screen){game.pause();ui.render();}}});
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&!game.screen&&!expectedUnlock){game.pause();ui.render();}expectedUnlock=false;});
  addEventListener('mousemove',e=>{if(game.screen)return;if(document.pointerLockElement===canvas||dragging){game.yaw-=e.movementX*.0022*settings.sensitivity;game.pitch=Math.max(-1.52,Math.min(1.52,game.pitch-e.movementY*.0022*settings.sensitivity));}});
  canvas.addEventListener('pointerdown',e=>{
    if(game.screen)return;game.audio.start();if(e.pointerType==='touch'){lastTouch={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if(document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}dragging=true;if(e.button===0){game.attackHeld=true;game.attack();}if(e.button===2)use();return;}
    if(e.button===0){game.attackHeld=true;game.attack();}if(e.button===2)use();
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!lastTouch||lastTouch.id!==e.pointerId||game.screen)return;game.yaw-=(e.clientX-lastTouch.x)*.005*settings.sensitivity;game.pitch=Math.max(-1.52,Math.min(1.52,game.pitch-(e.clientY-lastTouch.y)*.005*settings.sensitivity));lastTouch.x=e.clientX;lastTouch.y=e.clientY;});
  addEventListener('pointerup',e=>{if(e.pointerType==='touch'){if(lastTouch?.id===e.pointerId)lastTouch=null;return;}if(e.button===0){if(!game.screen)game.releaseAttack();else game.attackHeld=false;}if(e.button===2)game.placeHeld=false;dragging=false;});
  addEventListener('pointercancel',e=>{if(e.pointerType==='touch'){if(lastTouch?.id===e.pointerId)lastTouch=null;return;}game.drawState=null;game.attackHeld=false;game.placeHeld=false;dragging=false;});
  canvas.addEventListener('auxclick',e=>{if(e.button===1&&!game.screen&&game.target){e.preventDefault();const name=BLOCKS[game.target.type].drop||game.target.type;if(game.creative&&!game.state.inv[name])game.add(name,999);game.equip(name);}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{if(game.screen)return;e.preventDefault();game.select(game.state.selected+Math.sign(e.deltaY));},{passive:false});
  const stick=document.querySelector('#stick');let stickId=null;
  const moveStick=e=>{const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dz)/36);game.touch.x=dx/len/36;game.touch.z=dz/len/36;stick.firstElementChild.style.transform=`translate(${dx/len}px,${dz/len}px)`;};
  stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});for(const name of ['pointerup','pointercancel'])stick.addEventListener(name,()=>{stickId=null;game.touch={x:0,z:0};stick.firstElementChild.style.transform='';});
  for(const button of document.querySelectorAll('[data-touch]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(game.screen)return;game.audio.start();button.setPointerCapture(e.pointerId);if(button.dataset.touch==='attack'){game.attackHeld=true;game.attack();}if(button.dataset.touch==='jump'){if(game.creative&&performance.now()-lastSpace<300){game.flying=!game.flying;game.toast(game.flying?'Flight enabled':'Flight disabled','Hold jump to rise.');}lastSpace=performance.now();game.jump();game.keys.add('Space');}if(button.dataset.touch==='glide')game.toggleGlide();if(button.dataset.touch==='firecracker')game.useFirecracker();if(button.dataset.touch==='dash'){if(parkour.active)game.touchSprint=!game.touchSprint;else game.dash();}if(button.dataset.touch==='heal')game.eatAvailable();if(button.dataset.touch==='interact')use();});for(const name of ['pointerup','pointercancel'])button.addEventListener(name,e=>{e.stopPropagation();if(button.dataset.touch==='attack'){if(name==='pointerup')game.releaseAttack();else game.drawState=null;game.attackHeld=false;}if(button.dataset.touch==='interact')game.placeHeld=false;if(button.dataset.touch==='jump'){game.keys.delete('Space');releaseJump(game);}});}
  addEventListener('pagehide',()=>{game.save();storage.flush?.();game.audio.quiet();});
  let last=performance.now(),hudTimer=0,loaded=false,loadedEpoch=0;
  function frame(now){if(loadedEpoch!==renderer.epoch){loadedEpoch=renderer.epoch;loaded=false;document.querySelector('#loading').hidden=false;}const dt=Math.min(.05,(now-last)/1000);game.frameElapsed=Math.min(.25,Math.max(0,(now-last)/1000));last=now;multiplayer.modes?.update(dt);game.update(dt);multiplayer.update(dt);fieldGoals.update(dt);game.audio.update(game,dt);multiplayerPlayers.update(game,dt);parkourView.update(dt);parkourUI.updateFade();renderer.update(game,dt);hudTimer+=dt;if(hudTimer>.09){hudTimer=0;ui.update();multiplayerUI.update();multiplayer.modes?.renderHud();parkourUI.update();}if(!loaded&&renderer.chunks.size>=9){loaded=true;document.querySelector('#loading').hidden=true;}requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}catch(error){console.error(error);const el=document.querySelector('#loading');showStartupFailure(el,error,startupStage);}
export { game, renderer, ui, multiplayer, multiplayerUI, multiplayerPlayers, fieldGoals, parkour, parkourUI };
