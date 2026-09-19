import { formatRunTime } from './game-timer.js?v=32';

export class ParkourUI {
  constructor(game,ui,parkour){
    this.game=game;this.ui=ui;this.parkour=parkour;
    this.hud=document.createElement('div');this.hud.id='parkour-hud';this.hud.hidden=true;document.querySelector('#hud').append(this.hud);
    this.fade=document.createElement('div');this.fade.id='respawn-fade';document.body.append(this.fade);
    const action=ui.action.bind(ui),render=ui.render.bind(ui);
    ui.action=(name,button)=>{
      if(name==='parkour'||name==='parkour-restart'){
        if(game.multiplayer?.room){game.screen='multiplayer';ui.render();return;}
        game.audio.start();game.audio.play('click');document.querySelector('#toasts').replaceChildren();if(parkour.start())ui.resume();return;
      }
      if(parkour.active){
        if(name==='menu'){parkour.leave();ui.render();return;}
        if(name==='parkour-checkpoint'){parkour.resetToCheckpoint();ui.resume();return;}
        if(['inventory','craft','map','journal','enchant','new','share','return-world','rift-again','respawn'].includes(name))return;
      }
      action(name,button);
    };
    ui.render=()=>{render();this.render();};
  }
  render(){
    const p=this.parkour,g=this.game;document.body.classList.toggle('parkour-active',p.active);
    if(!p.active){this.hud.hidden=true;this.fade.style.opacity='0';const dash=document.querySelector('[data-touch="dash"]');dash.setAttribute('aria-label','Dodge dash');dash.textContent='»';return;}
    if(g.screen==='pause')this.ui.overlay.innerHTML=this.ui.frame('Take a breath.','CLOUDSTEP CIRCUIT',`<p class="muted">Your timer is paused. Resume at the same position, or retry from your last checkpoint.</p><div class="parkour-pause-time">${formatRunTime(p.timer.elapsed)}</div><button class="primary full" data-action="resume">Resume run ▶</button><div class="button-grid"><button data-action="parkour-checkpoint">Retry checkpoint · R</button><button data-action="parkour-restart">Start a new run</button><button data-action="settings">Settings</button><button data-action="help">Controls</button></div><button class="full" data-action="menu">Main menu</button>`);
    if(g.screen==='parkour-results'){
      const delta=p.previousBest?p.timer.elapsed-p.previousBest.time:null;
      this.ui.overlay.innerHTML=this.ui.frame(p.newBest?'A new personal best.':'Course complete.','CLOUDSTEP CIRCUIT',`<div class="parkour-result-time">${formatRunTime(p.timer.elapsed)}</div><p class="parkour-result-comparison">${delta===null?'Your first finish. A time to beat.':`${delta<0?'−':'+'}${Math.abs(delta).toFixed(2)}s against your previous best`}</p><div class="parkour-result-stats"><span>${p.falls} retries</span><span>${p.checkpoint} checkpoints</span></div><ol class="parkour-splits">${p.timer.splits.map((split,i)=>`<li><span>${p.course.checkpoints[i+1].name}</span><b>${formatRunTime(split)}</b></li>`).join('')}</ol><button class="primary full" data-action="parkour-restart">Run it again ▶</button><button class="full" data-action="menu">Main menu</button>${p.storageFailed?'<p class="muted">Browser storage is unavailable. This best time lasts for this session.</p>':''}`);
      this.ui.overlay.querySelector('.close')?.setAttribute('data-action','menu');
    }
    this.update();
  }
  updateFade(){const t=this.parkour.respawnTime;this.fade.style.opacity=this.parkour.active&&t?String(Math.sin(t/.28*Math.PI)*.75):'0';}
  update(){
    const p=this.parkour,g=this.game;this.hud.hidden=!p.active||!!g.screen;
    if(!p.active)return;
    this.updateFade();
    const sprint=document.querySelector('[data-touch="dash"]');sprint.setAttribute('aria-label','Toggle sprint');sprint.textContent=g.touchSprint?'» ON':'»';
    if(g.screen)return;
    const next=p.course.checkpoints[p.checkpoint+1],split=p.timer.splits.at(-1),speed=Math.hypot(g.vx,g.vz);
    this.hud.classList.toggle('checkpoint-pulse',p.pulse>0);
    this.hud.innerHTML=`<div class="parkour-course-label"><span>CLOUDSTEP CIRCUIT</span><strong>${next?next.name:'The finish arch'}</strong></div><div class="parkour-clock"><small>${p.timer.running?'RUN TIME':'MOVE TO START'}</small><b>${formatRunTime(p.timer.elapsed)}</b><span>BEST ${formatRunTime(p.best?.time)}</span></div><div class="parkour-metrics"><div><small>CHECKPOINT</small><b>${p.checkpoint} <em>/ ${p.course.checkpoints.length-1}</em></b></div><div><small>SPEED</small><b>${speed.toFixed(1)} <em>m/s</em></b></div>${split!==undefined?`<div class="parkour-last-split"><small>LAST SPLIT</small><b>${formatRunTime(split)}</b></div>`:''}</div><div class="parkour-controls"><span><kbd>Shift</kbd> Sprint</span><span><kbd>Space</kbd> Jump · hold for height</span><span><kbd>Ctrl / C</kbd> Crouch</span><button data-action="parkour-checkpoint"><kbd>R</kbd> Retry checkpoint</button></div>`;
  }
}
