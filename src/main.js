import { Renderer } from './render.js';
import { Game } from './game.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { loadSettings } from './save.js';
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
export const settings=loadSettings(storage);
if(matchMedia('(prefers-reduced-motion: reduce)').matches)settings.bobbing=false;
let renderer,game,ui;
try{
  renderer=new Renderer(document.querySelector('#world'),settings);
  game=new Game(renderer,new Audio(settings),storage);ui=new UI(game,settings);
  const canvas=renderer.renderer.domElement;let dragging=false,lastTouch=null,lastSpace=0,expectedUnlock=false;
  const open=screen=>{if(game.screen===screen){ui.resume();return;}game.pause(screen);ui.render();};
  addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Tab'&&game.screen)return;
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'){if(game.screen==='menu')return;if(game.screen==='death'||game.screen==='victory')return;if(game.screen){if(['settings','help'].includes(game.screen))ui.action('back');else ui.resume();}else{game.pause();ui.render();}return;}
    if(e.repeat)return;
    const screens={Tab:'inventory',KeyC:'craft',KeyM:'map',KeyJ:'journal'};if(screens[e.code]&&game.screen!=='menu'&&!['death','victory','confirm'].includes(game.screen)){open(screens[e.code]);return;}
    if(game.screen)return;game.keys.add(e.code);
    if(/^Digit[1-9]$/.test(e.code))game.select(Number(e.code.at(-1))-1);
    if(e.code==='Space'){if(game.creative&&performance.now()-lastSpace<300){game.flying=!game.flying;game.toast(game.flying?'Taking the scenic route':'Back on solid ground',game.flying?'Space to rise · X to descend':'');}lastSpace=performance.now();game.jump();}
    if(e.code==='KeyR')game.dash();if(e.code==='KeyE')game.interact();if(e.code==='KeyB')game.place(true);if(e.code==='KeyF')game.heal('apple');if(e.code==='KeyQ')game.heal('potion');
  });
  addEventListener('keyup',e=>game.keys.delete(e.code));
  addEventListener('blur',()=>{game.keys.clear();game.attackHeld=false;if(!game.screen){game.pause();ui.render();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){game.save();if(!game.screen){game.pause();ui.render();}}});
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&!game.screen&&!expectedUnlock){game.pause();ui.render();}expectedUnlock=false;});
  addEventListener('mousemove',e=>{if(game.screen)return;if(document.pointerLockElement===canvas||dragging){game.yaw-=e.movementX*.0022*settings.sensitivity;game.pitch=Math.max(-1.52,Math.min(1.52,game.pitch-e.movementY*.0022*settings.sensitivity));}});
  canvas.addEventListener('pointerdown',e=>{
    if(game.screen)return;game.audio.start();if(e.pointerType==='touch'){lastTouch={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if(document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}dragging=true;if(e.button===0){game.attackHeld=true;game.attack();}if(e.button===2)game.interact();return;}
    if(e.button===0){game.attackHeld=true;game.attack();}if(e.button===2)game.interact();
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!lastTouch||lastTouch.id!==e.pointerId||game.screen)return;game.yaw-=(e.clientX-lastTouch.x)*.005*settings.sensitivity;game.pitch=Math.max(-1.52,Math.min(1.52,game.pitch-(e.clientY-lastTouch.y)*.005*settings.sensitivity));lastTouch.x=e.clientX;lastTouch.y=e.clientY;});
  addEventListener('pointerup',()=>{game.attackHeld=false;dragging=false;lastTouch=null;});
  addEventListener('pointercancel',()=>{game.attackHeld=false;dragging=false;lastTouch=null;});
  canvas.addEventListener('auxclick',e=>{if(e.button===1&&!game.screen&&game.target){e.preventDefault();const name=game.target.type;if(game.creative&&!game.state.inv[name])game.add(name,999);game.equip(name);}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{if(game.screen)return;e.preventDefault();game.select(game.state.selected+Math.sign(e.deltaY));},{passive:false});
  const stick=document.querySelector('#stick');let stickId=null;
  const moveStick=e=>{const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dz)/36);game.touch.x=dx/len/36;game.touch.z=dz/len/36;stick.firstElementChild.style.transform=`translate(${dx/len}px,${dz/len}px)`;};
  stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});for(const name of ['pointerup','pointercancel'])stick.addEventListener(name,()=>{stickId=null;game.touch={x:0,z:0};stick.firstElementChild.style.transform='';});
  for(const button of document.querySelectorAll('[data-touch]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(game.screen)return;game.audio.start();button.setPointerCapture(e.pointerId);if(button.dataset.touch==='attack'){game.attackHeld=true;game.attack();}if(button.dataset.touch==='jump'){if(game.creative&&performance.now()-lastSpace<300){game.flying=!game.flying;game.toast(game.flying?'Flight enabled':'Flight disabled','Hold jump to rise.');}lastSpace=performance.now();game.jump();game.keys.add('Space');}if(button.dataset.touch==='dash')game.dash();if(button.dataset.touch==='heal')game.heal(game.state.inv.potion?'potion':'apple');if(button.dataset.touch==='interact')game.interact();});for(const name of ['pointerup','pointercancel'])button.addEventListener(name,e=>{e.stopPropagation();game.attackHeld=false;game.keys.delete('Space');});}
  addEventListener('pagehide',()=>game.save());
  let last=performance.now(),hudTimer=0,loaded=false;
  function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;game.update(dt);renderer.update(game,dt);hudTimer+=dt;if(hudTimer>.09){hudTimer=0;ui.update();}if(!loaded&&renderer.chunks.size>=9){loaded=true;document.querySelector('#loading').hidden=true;}requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}catch(error){console.error(error);const el=document.querySelector('#loading');el.innerHTML='<strong>The wilds couldn’t load.</strong><small>Please use a browser with WebGL enabled, then reload.</small>';}
export { game, renderer, ui };
