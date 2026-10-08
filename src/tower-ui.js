import { TOWER_WORLDS } from './tower-course.js?v=43';
import { readTowerProfile, TOWER_TROPHIES } from './tower-rewards.js?v=43';
import { formatRunTime } from './game-timer.js?v=43';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const towerArt=world=>`<div class="tower-art" aria-hidden="true"><div class="tower-halo"></div><div class="tower-stack">${world.stages.map((s,i)=>`<i style="--floor:${s.color};--step:${i}"><b></b></i>`).reverse().join('')}<span>♛</span></div><div class="tower-cloud cloud-one"></div><div class="tower-cloud cloud-two"></div></div>`;

export class TowerUI {
  constructor(game,ui,parkour,multiplayerUI){
    this.game=game;this.ui=ui;this.p=parkour;
    const openLobby=multiplayerUI.open.bind(multiplayerUI);
    multiplayerUI.open=()=>{if(this.active)parkour.leave();openLobby();};
    this.hud=document.createElement('aside');this.hud.id='tower-hud';this.hud.hidden=true;document.querySelector('#hud').append(this.hud);
    const action=ui.action.bind(ui),render=ui.render.bind(ui);
    ui.action=(name,button)=>{
      if(name==='multiplayer'&&this.active){multiplayerUI.open();return;}
      if(name==='tower-select'){
        if(game.multiplayer?.room){game.screen='multiplayer';ui.render();return;}
        if(game.arcade?.active)game.arcade.leave();
        if(parkour.active)parkour.leave();
        if(game.screen==='menu')game.screen='towers';else game.pause('towers');ui.render();return;
      }
      if(name==='tower-play'||name==='tower-next'){
        if(game.multiplayer?.room){game.screen='multiplayer';ui.render();return;}
        const id=name==='tower-next'?TOWER_WORLDS[(TOWER_WORLDS.indexOf(parkour.course)+1)%TOWER_WORLDS.length].id:button?.dataset.world||parkour.course.id;
        if(!TOWER_WORLDS.some(w=>w.id===id))return;
        if(game.arcade?.active)game.arcade.leave();
        game.audio.start();if(parkour.start(id))ui.resume();return;
      }
      action(name,button);
    };
    ui.render=()=>{render();this.render();};ui.render();
  }
  get active(){return this.p.active&&this.p.course.tower;}
  profile(){return readTowerProfile(this.game.storage);}
  render(){
    const g=this.game,p=this.p,profile=this.profile();
    document.body.classList.toggle('tower-active',!!this.active);
    this.hud.hidden=!this.active||!!g.screen;
    if(g.screen==='menu'){
      const lobby=this.ui.overlay.querySelector('.block-lobby');
      if(lobby&&!lobby.querySelector('.tower-feature')){
        const section=document.createElement('section');section.className='tower-feature';
        section.innerHTML=`<div class="tower-feature-copy"><span class="tower-kicker">NEW MODE · TOWER PARKOUR</span><h2>Every color.<br>A new challenge.</h2><p>Climb eight colored floors. Ride lifts, dodge rotating sweepers, race crumbling steps, and launch toward the crown.</p><button class="tower-button" data-action="tower-select">Choose your tower <span>↑</span></button><div class="tower-feature-meta"><span>3 WORLDS</span><span>8 OBSTACLE TYPES</span><span>SUMMIT REWARDS</span></div></div>${towerArt(TOWER_WORLDS[0])}<div class="tower-mini-profile"><span>◆ ${profile.crystals} crystals</span><span>♛ ${profile.trophies.length}/3 trophies</span></div>`;
        lobby.querySelector('.parkour-feature')?.after(section);
      }
    }
    if(g.screen==='towers'){
      this.ui.overlay.innerHTML=this.ui.frame('The only way is up.','TOWER PARKOUR',`<p class="tower-intro">Three worlds. Eight colored floors in each tower. A different skill on every floor, a checkpoint before every challenge, and a trophy at the summit.</p><div class="tower-profile"><b>◆ ${profile.crystals}<small>CRYSTALS</small></b><b>♛ ${profile.trophies.length}/3<small>SUMMIT TROPHIES</small></b><span>${escape(profile.titles.at(-1)||'Your first summit awaits')}</span></div><div class="tower-world-grid">${TOWER_WORLDS.map(world=>this.worldCard(world,profile)).join('')}</div><div class="tower-obstacle-guide"><h3>Eight ways to climb</h3><p>Precision jumps · zigzag balance beams · crouch tunnels · launch pads · moving lifts · crumbling steps · timed gates · rotating sweepers</p><small>WASD move · Space jump · Shift sprint · Ctrl / C crouch · R retry. Touch controls include crouch.</small></div><button class="full" data-action="menu">Main menu</button>`,true);
      this.ui.overlay.querySelector('.close')?.setAttribute('data-action','menu');
    }
    if(!this.active){this.update();return;}
    if(g.screen==='pause'){
      this.ui.overlay.innerHTML=this.ui.frame('A moment above the clouds.',p.course.name.toUpperCase(),`<p class="tower-intro">Floor ${Math.min(p.checkpoint+1,p.course.stages.length)} of ${p.course.stages.length}. Your timer and every moving obstacle are paused.</p><div class="parkour-pause-time">${formatRunTime(p.timer.elapsed)}</div><button class="primary full" data-action="resume">Keep climbing ↑</button><div class="button-grid"><button data-action="parkour-checkpoint">Retry this floor · R</button><button data-action="parkour-restart">Restart tower</button><button data-action="settings">Settings</button><button data-action="tower-select">Other worlds</button></div><button class="full" data-action="menu">Main menu</button>`);
    }
    if(g.screen==='parkour-results'){
      const award=p.summitReward,trophy=TOWER_TROPHIES[p.course.id],medal=award?.medal||'bronze';
      this.ui.overlay.innerHTML=this.ui.frame('You reached the summit.',p.course.name.toUpperCase(),`<div class="tower-summit" style="--accent:${p.course.color}"><span class="tower-summit-crown">♛</span><span class="tower-kicker">${award?.first?'NEW SUMMIT TROPHY':'SUMMIT COMPLETE'}</span><h3>${escape(trophy?.name||p.course.name+' Trophy')}</h3><div class="tower-medal medal-${medal}">${medal.toUpperCase()} MEDAL</div><div class="parkour-result-time">${formatRunTime(p.timer.elapsed)}</div><p>${p.falls} retries · ${p.newBest?'New personal best':'Another climb conquered'}</p><div class="tower-earned">+${award?.reward||0} ◆ crystals</div><small>${award?.storageFailed?'Storage unavailable: this reward could not be saved.':`Saved to your tower collection · ${award?.profile.crystals??profile.crystals} crystals total`}</small></div><button class="primary full" data-action="tower-next">Explore the next world →</button><div class="button-grid"><button data-action="parkour-restart">Climb again</button><button data-action="tower-select">Worlds & trophies</button></div><button class="full" data-action="menu">Main menu</button>`);
      this.ui.overlay.querySelector('.close')?.setAttribute('data-action','menu');
    }
    this.update();
  }
  worldCard(world,profile){
    const record=profile.worlds[world.id],trophy=profile.trophies.includes(world.id);
    return `<article class="tower-world-card" style="--accent:${world.color}">${towerArt(world)}<div class="tower-world-copy"><span class="tower-kicker">${escape(world.difficulty)} · ${world.stages.length} FLOORS</span><h3>${escape(world.name)}</h3><p>${escape(world.subtitle)}</p><div class="tower-world-record">${trophy?'♛ TROPHY COLLECTED':`♛ FIRST SUMMIT · +${world.crystalReward||120} ◆`}${record?`<small>${record.medal.toUpperCase()} · BEST ${formatRunTime(record.bestTime)} · ${record.completions} finishes</small>`:'<small>Every world is ready to explore</small>'}</div><button class="tower-button" data-action="tower-play" data-world="${world.id}">${trophy?'Climb again':'Enter world'} <span>↑</span></button></div></article>`;
  }
  update(){
    const g=this.game,p=this.p;this.hud.hidden=!this.active||!!g.screen;
    const crouch=document.querySelector('[data-touch="crouch"]');if(crouch)crouch.hidden=!this.active;
    if(!this.active||g.screen)return;
    const course=p.course,stage=course.stages[Math.min(p.checkpoint,course.stages.length-1)],height=Math.max(0,Math.min(1,(g.pos.y-course.spawn.y)/(course.finish.y-course.spawn.y))),status=p.towerRuntime.status;
    this.hud.innerHTML=`<div class="tower-floor-info" style="--floor:${stage.color}"><span>${escape(course.name).toUpperCase()} · FLOOR ${Math.min(p.checkpoint+1,course.stages.length)}/${course.stages.length}</span><b>${escape(stage.name)}</b><p>${escape(status?.message||stage.hint)}</p></div><div class="tower-altimeter"><span>♛</span><div><i style="height:${height*100}%"></i>${course.stages.map((s,i)=>`<em style="bottom:${i/course.stages.length*100}%;--floor:${s.color}"></em>`).join('')}</div><b>${Math.round(height*100)}%</b></div>`;
    const original=document.querySelector('#parkour-hud .parkour-controls');
    if(original?.firstElementChild?.textContent.includes('AI'))original.firstElementChild.remove();
    if(crouch){crouch.setAttribute('aria-pressed',String(!!g.crouching));crouch.textContent=g.crouching?'↓ ON':'↓';}
  }
}
