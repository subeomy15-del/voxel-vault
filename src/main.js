import {potionFor} from './potions.js?v=38';
import {installWorldDebug} from './world-debug.js?v=38';
import {openDurableStorage} from './durable-storage.js?v=38';
import {showStartupFailure} from './startup-errors.js?v=38';
import { MultiplayerModes } from './multiplayer-modes.js?v=38';
import { Parkour } from './parkour.js?v=38';
import { ParkourUI } from './parkour-ui.js?v=38';
import { ParkourView } from './parkour-view.js?v=38';
import { movementInput,releaseJump } from './movement.js?v=38';
import { applyLook, clearControls, hotbarIndex } from './controls.js?v=38';
import { installControlPanels } from './control-panels.js?v=38';
import { Multiplayer } from './multiplayer.js?v=38';
import { MultiplayerUI } from './multiplayer-ui.js?v=38';
import { MultiplayerPlayers } from './multiplayer-players.js?v=38';
import { FieldGoals } from './field-goals.js?v=38';
import { ITEMS,BLOCKS } from './data.js?v=38';
import { Renderer } from './render.js?v=38';
import { Game } from './game.js?v=38';
import { Audio } from './audio.js?v=38';
import { UI } from './ui.js?v=38';
import { loadSettings,saveSettings } from './save.js?v=38';
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
export const settings=loadSettings(storage);
if(matchMedia('(prefers-reduced-motion: reduce)').matches){settings.bobbing=false;settings.cameraEffects=false;}
let startupStage='renderer';
let renderer,game,ui,multiplayer,multiplayerUI,multiplayerPlayers,fieldGoals,parkour,parkourUI,parkourView;
try{
  renderer=new Renderer(document.querySelector('#world'),settings);
  startupStage='save';
  storage=await openDurableStorage(storage);
  game=new Game(renderer,new Audio(settings),storage);startupStage='interface';ui=new UI(game,settings);installWorldDebug(game,renderer);
  multiplayer=new Multiplayer(game);multiplayerUI=new MultiplayerUI(game,ui,multiplayer);multiplayerPlayers=new MultiplayerPlayers(renderer,multiplayer);fieldGoals=new FieldGoals(game);game.fieldGoals=fieldGoals;new MultiplayerModes(game,ui,multiplayer);multiplayer.restore();
  parkour=new Parkour(game);parkourUI=new ParkourUI(game,ui,parkour);parkourView=new ParkourView(renderer,parkour);
  installControlPanels(game,ui,multiplayer);
  const canvas=renderer.renderer.domElement;const use=()=>{if(game.interact()===true){game.placeHeld=true;game.placeTimer=.3;}};let dragging=false,lastTouch=null,lastSpace=0,expectedUnlock=false;
  const open=screen=>{if(game.screen===screen){ui.resume();return;}game.pause(screen);ui.render();};
  addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;if(game.screen==='multiplayer'||game.screen?.startsWith('match-'))return;
    if(e.code==='Tab'&&game.screen){if(['inventory','craft','enchant'].includes(game.screen)&&!e.shiftKey){e.preventDefault();ui.resume();}return;}
    if(['F2','F3','F4','F5','Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(['F2','F3'].includes(e.code)&&!e.repeat){settings.debugFPS=!settings.debugFPS;saveSettings(storage,settings);renderer.applySettings?.(settings);return;}
    if(e.code==='F4'&&!game.screen){document.body.classList.add('hide-game-ui');return;}
    if(game.screen==='parkour-results'){if(e.code==='Escape')ui.action('menu');return;}
    if(e.code==='Escape'){if(game.screen==='menu')return;if(game.screen==='death'||game.screen==='victory')return;if(game.screen){if(['settings','help','controls','credits'].includes(game.screen))ui.action('back');else ui.resume();}else{game.pause();ui.render();}return;}
    if(!game.screen&&e.ctrlKey&&['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    const screens=parkour.active?{}:{Tab:'inventory',KeyM:'journal',KeyJ:'map',KeyN:'character'};if(screens[e.code]&&game.screen!=='menu'&&!['death','victory','confirm'].includes(game.screen)){open(screens[e.code]);return;}
    if(e.code==='KeyO'&&!['death','victory','confirm'].includes(game.screen)){if(game.screen==='settings')ui.action('back');else{if(!game.screen)game.pause();ui.action('settings');}return;}
    const panels={KeyG:'players',KeyZ:'emotes',KeyI:'invite',KeyU:'explorer'};
    if(panels[e.code]&&(!game.screen||game.screen===panels[e.code])){open(panels[e.code]);return;}
    if(e.code==='KeyH'&&(!game.screen||game.screen==='inventory')){game.useFirecracker();ui.refreshItems();return;}
    if(game.screen)return;if(e.code==='KeyP'||e.code==='F5'){ui.action('camera');return;}movementInput(game,e.code,true);
    if(parkour.active&&e.code==='KeyR'){parkour.resetToCheckpoint();return;}
    const slot=hotbarIndex(e.code);if(slot>=0&&slot<game.state.bar.length)game.select(slot);
    if(e.code==='Space'){if(game.creative&&performance.now()-lastSpace<300){game.flying=!game.flying;game.toast(game.flying?'Taking the scenic route':'Back on solid ground',game.flying?'Space to rise · X to descend':'');}lastSpace=performance.now();game.jump();}
    if(parkour.active)return;
    if(e.code==='KeyY'&&multiplayer.active)multiplayer.ping().catch(error=>game.toast('Could not send ping',error.message));if(e.code==='KeyL')game.toggleGlide();if(e.code==='KeyR')game.dash();if(e.code==='KeyT')game.rotateBuilding();if(e.code==='KeyE')use();if(e.code==='KeyB'){ui.catalogue=true;open('inventory');}if(e.code==='KeyF'){if(potionFor(game.held))game.drink(game.held);else game.eatAvailable();}if(e.code==='KeyQ')game.dropHeld(e.shiftKey);
  });
  addEventListener('keyup',e=>{movementInput(game,e.code,false);if(e.code==='Space')releaseJump(game);if(e.code==='KeyE')game.placeHeld=false;if(e.code==='F4')document.body.classList.remove('hide-game-ui');});
  addEventListener('blur',()=>{clearControls(game);dragging=false;lastTouch=null;document.body.classList.remove('hide-game-ui');if(!game.screen){game.pause();ui.render();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){game.save();storage.flush?.();if(!game.screen){game.pause();ui.render();}}});
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&!game.screen&&!expectedUnlock){game.pause();ui.render();}expectedUnlock=false;});
  addEventListener('mousemove',e=>{if(game.screen)return;if(document.pointerLockElement===canvas||dragging)applyLook(game,e.movementX,e.movementY,settings.sensitivity);});
  const pickBlock=()=>{if(!game.creative||!game.target)return;const name=BLOCKS[game.target.type].drop||game.target.type;if(!game.state.inv[name])game.add(name,999);game.equip(name);};
  canvas.addEventListener('pointerdown',e=>{
    if(game.screen)return;game.audio.start();if(e.pointerType==='touch'){lastTouch={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if(e.button===0&&e.altKey&&game.creative){e.preventDefault();pickBlock();return;}
    if(document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}dragging=true;if(e.button===0){game.attackHeld=true;game.attack();}if(e.button===2)use();return;}
    if(e.button===0){game.attackHeld=true;game.attack();}if(e.button===2)use();
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!lastTouch||lastTouch.id!==e.pointerId||game.screen)return;applyLook(game,e.clientX-lastTouch.x,e.clientY-lastTouch.y,settings.sensitivity,true);lastTouch.x=e.clientX;lastTouch.y=e.clientY;});
  addEventListener('pointerup',e=>{if(e.pointerType==='touch'){if(lastTouch?.id===e.pointerId)lastTouch=null;return;}if(e.button===0){if(!game.screen)game.releaseAttack();else game.attackHeld=false;}if(e.button===2)game.placeHeld=false;dragging=false;});
  addEventListener('pointercancel',e=>{if(e.pointerType==='touch'){if(lastTouch?.id===e.pointerId)lastTouch=null;return;}game.drawState=null;game.attackHeld=false;game.placeHeld=false;dragging=false;});
  canvas.addEventListener('auxclick',e=>{if(e.button===1&&!game.screen){e.preventDefault();if(game.creative)pickBlock();else open('emotes');}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{if(game.screen)return;e.preventDefault();game.select(game.state.selected+Math.sign(e.deltaY));},{passive:false});
  const stick=document.querySelector('#stick');let stickId=null;
  const moveStick=e=>{const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dz)/36);game.touch.x=dx/len/36;game.touch.z=dz/len/36;stick.firstElementChild.style.transform=`translate(${dx/len}px,${dz/len}px)`;};
  stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});for(const name of ['pointerup','pointercancel'])stick.addEventListener(name,()=>{stickId=null;game.touch={x:0,z:0};stick.firstElementChild.style.transform='';});
  for(const button of document.querySelectorAll('[data-touch]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(game.screen)return;game.audio.start();button.setPointerCapture(e.pointerId);if(button.dataset.touch==='attack'){game.attackHeld=true;game.attack();}if(button.dataset.touch==='jump'){if(game.creative&&performance.now()-lastSpace<300){game.flying=!game.flying;game.toast(game.flying?'Flight enabled':'Flight disabled','Hold jump to rise.');}lastSpace=performance.now();game.jump();game.keys.add('Space');}if(button.dataset.touch==='glide')game.toggleGlide();if(button.dataset.touch==='firecracker')game.useFirecracker();if(button.dataset.touch==='dash'){if(parkour.active)game.touchSprint=!game.touchSprint;else game.dash();}if(button.dataset.touch==='heal')game.eatAvailable();if(button.dataset.touch==='interact')use();});for(const name of ['pointerup','pointercancel'])button.addEventListener(name,e=>{e.stopPropagation();if(button.dataset.touch==='attack'){if(name==='pointerup')game.releaseAttack();else game.drawState=null;game.attackHeld=false;}if(button.dataset.touch==='interact')game.placeHeld=false;if(button.dataset.touch==='jump'){game.keys.delete('Space');releaseJump(game);}});}
  addEventListener('pagehide',()=>{game.save();storage.flush?.();game.audio.quiet();});
  let last=performance.now(),hudTimer=0,loaded=false,loadedEpoch=0;
  function frame(now){if(loadedEpoch!==renderer.epoch){loadedEpoch=renderer.epoch;loaded=false;document.querySelector('#loading').hidden=false;}const dt=Math.min(.05,(now-last)/1000);game.frameElapsed=Math.min(.25,Math.max(0,(now-last)/1000));last=now;multiplayer.modes?.update(dt);game.update(dt);multiplayer.update(dt);fieldGoals.update(dt);game.audio.update(game,dt);multiplayerPlayers.update(game,dt);parkourView.update(dt);parkourUI.updateFade();renderer.update(game,dt);hudTimer+=dt;if(hudTimer>.09){hudTimer=0;ui.update();multiplayerUI.update();multiplayer.modes?.renderHud();parkourUI.update();}if(!loaded&&renderer.landingReady(game.pos)){loaded=true;document.querySelector('#loading').hidden=true;}requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}catch(error){console.error(error);const el=document.querySelector('#loading');showStartupFailure(el,error,startupStage);}
export { game, renderer, ui, multiplayer, multiplayerUI, multiplayerPlayers, fieldGoals, parkour, parkourUI };
