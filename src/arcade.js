import {PartyView} from './party-view.js?v=42';
import {partyDash,partyObjective} from './party-rules.js?v=42';
import * as THREE from '../vendor/three.module.js';
import { PlayerModel } from './player-model.js?v=42';
import { ArcadeRound, ARCADE_MODES, TILE_COLORS, TILE_BLOCKS, tileColor } from './arcade-round.js?v=42';
import { CAMPAIGN, ARENAS } from './parkour-course.js?v=42';
const colors=['#b5a1ff','#ffbc73','#ff87ac','#81d7ff','#e9ec88'];
export class Arcade {
  constructor(game,ui,parkour){
    this.game=game;this.ui=ui;this.parkour=parkour;game.arcade=this;this.active=false;this.models=[];this.r=game.renderer;
    this.root=new THREE.Group();this.r.scene.add(this.root);
    this.hud=document.createElement('aside');this.hud.id='arcade-hud';this.hud.hidden=true;document.querySelector('#hud').append(this.hud);
    this.labels=document.createElement('div');this.labels.className='crew-nameplates';document.body.append(this.labels);
    const action=ui.action.bind(ui),render=ui.render.bind(ui);
    ui.action=(name,button)=>{
      if(name==='arcade-dash'){this.dash();return;}
      if(name==='arcade-random'){const choices=ARCADE_MODES.filter(m=>m.id!==this.round?.mode.id);this.start(choices[Math.floor(Math.random()*choices.length)].id);return;}
      if(name==='arcade-play'){this.start(button?.dataset.mode||this.round?.mode.id);return;}
      if(name==='course-select'){if(this.active)this.leave();if(game.screen==='menu')game.screen='courses';else game.pause('courses');ui.render();return;}
      if(name==='course-play'){if(this.active)this.leave();if(parkour.start(button.dataset.course))ui.resume();return;}
      if(name==='course-next'){const next=CAMPAIGN[CAMPAIGN.indexOf(parkour.course)+1];if(next&&parkour.start(next.id))ui.resume();return;}
      if(this.active){if(name==='menu'){this.leave();ui.render();return;}if(name==='parkour-checkpoint'||name==='parkour-restart')return;if(['inventory','craft','new','creative','daily','play','ender','map','journal','enchant'].includes(name))return;}
      action(name,button);
    };
    ui.render=()=>{render();this.render();};ui.render();
  }
  start(id){
    if(this.game.multiplayer?.room){this.game.screen='multiplayer';this.ui.render();return false;}
    if(!ARCADE_MODES.some(m=>m.id===id))return false;
    this.clear();this.active=false;
    if(!this.parkour.start(ARENAS[id].id))return false;
    this.round=new ArcadeRound(id);this.active=true;this.reported=false;this.game.pos={x:this.round.players[0].x,y:13,z:this.round.players[0].z};this.game.yaw=id==='block-soccer'?0:this.game.yaw;this.partyView=this.round.mode.party?new PartyView(this):null;
    for(const p of this.round.players.slice(1)){
      const model=new PlayerModel(this.r),label=document.createElement('span');label.className='crew-nameplate';label.textContent=p.name;this.labels.append(label);this.models.push({model,label});
    }
    this.gemMeshes=this.round.gems.map(g=>{const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(g.value===3?.46:.3),new THREE.MeshStandardMaterial({color:g.value===3?'#ffce68':'#6df4e0',emissive:g.value===3?'#c5801e':'#269a8c',emissiveIntensity:.6,roughness:.22,metalness:.35}));mesh.position.set(g.x,14,g.z);this.root.add(mesh);return mesh;});
    if(id==='crown-control'){
      const ring=new THREE.Mesh(new THREE.RingGeometry(3.1,3.35,64),new THREE.MeshBasicMaterial({color:'#ffe194',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=13.04;this.root.add(ring);
      for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.12,3,.12),new THREE.MeshBasicMaterial({color:'#ffe194',transparent:true,opacity:.35}));m.position.set(Math.sin(i*Math.PI/4)*3.25,14.5,Math.cos(i*Math.PI/4)*3.25);this.root.add(m);}
    }
    this.game.events=this.game.events.filter(e=>e.type!=='toast');this.game.audio.start();document.querySelector('#toasts').replaceChildren();this.ui.resume();return true;
  }
  clear(){for(const {model,label} of this.models){this.r.disposeGroup(model.group);label.remove();}this.models=[];for(const child of [...this.root.children])this.r.disposeGroup(child);this.root.clear();}
  leave(){this.active=false;this.clear();this.hud.hidden=true;this.parkour.leave();document.body.classList.remove('arcade-active');}
  dash(){if(!this.active||this.game.screen||!this.round.mode.party)return false;return partyDash(this.round,this.round.players[0],this.game.direction());}
  attack(){
    if(!this.active||this.game.screen)return false;
    const g=this.game,p=this.round.players[0];
    if(this.round.mode.id==='spleef'){
      const hit=g.world.raycast({x:g.pos.x,y:g.pos.y+1.4,z:g.pos.z},g.direction(),4.5);
      if(hit&&hit.y===12&&this.round.breakTile(hit.x,hit.z,p))g.audio.play('hit');
    }else{
      const dir=g.direction(),target=this.round.players.slice(1).filter(q=>q.alive).map(q=>({q,along:(q.x-p.x)*dir.x+(q.z-p.z)*dir.z,off:Math.abs((q.x-p.x)*dir.z-(q.z-p.z)*dir.x)})).filter(t=>t.along>0&&t.off<.9).sort((a,b)=>a.along-b.along)[0]?.q;
      if(this.round.attack(p,target,dir))g.audio.play('hit');
    }
    return true;
  }
  update(dt){
    if(!this.active||this.game.screen)return;
    const g=this.game,p=this.round.players[0];if(p.alive){p.x=g.pos.x;p.y=g.pos.y;p.z=g.pos.z;}
    this.round.update(dt);
    if(p.alive){g.pos.x=p.x;g.pos.z=p.z;}
    if(g.attackHeld)this.attack();
    for(const change of this.round.tileChanges.splice(0)){
      const {x,z,remove}=change,k=`${x},12,${z}`,type=remove?null:TILE_BLOCKS[tileColor(x,z)];
      g.world.edits.set(k,type);g.world.changes.push([k,type]);
      for(const [a,b]of [[x,z],[x-1,z],[x+1,z],[x,z-1],[x,z+1]])g.world.dirty.add(`${Math.floor(a/16)},${Math.floor(b/16)}`);
    }
    for(const e of this.round.events.splice(0)){
      if(e.type==='respawn'&&e.player===0){g.pos={x:p.x,y:13,z:p.z};g.velocity=g.vx=g.vz=0;g.grounded=true;}
      if(e.type==='gem'&&e.player===0){g.audio.play('checkpoint');this.r.burst(e.x,14,e.z,'#79ffe0',10);}
      if(e.type==='tag'&&e.player===0)g.toast('You are infected!','Catch the remaining survivors. Click to tag.');
      if(e.type==='hit'&&e.player===0){g.audio.play('hurt');g.emit('hurt');}
      if(e.type==='blast')this.r.burst(e.x,14,e.z,'#ffb268',18);
      if(e.type==='goal'){g.audio.play('finish');for(const color of ['#83efbf','#cfb7ff','#ffdb79'])this.r.burst(0,16,0,color,18);}
      if(['bank','pickup','steal','pass'].includes(e.type)&&e.player===0)g.audio.play('checkpoint');
      if(e.type==='kick')this.r.burst(e.x,13.7,e.z,'#ecfff5',6);
      if(e.type==='shoot'&&e.player===0)g.audio.play('launch');
    }
    if(this.round.ended&&!this.reported){this.reported=true;g.pause('arcade-results');this.ui.render();}
  }
  frame(dt){
    this.hud.hidden=!this.active||!!this.game.screen;if(!this.active)return;
    const round=this.round,g=this.game;this.partyView?.update(g.screen?0:dt);
    for(const [i,{model,label}]of this.models.entries()){
      const p=round.players[i+1];model.update({pos:p,yaw:p.yaw,pitch:0,moving:!!p.target,grounded:p.y>=13,walk:p.walk,state:{armorParts:{}},held:round.mode.id==='sky-battle'?'wood_sword':''},p.alive);
      model.shirt.material.color.set(round.mode.id==='block-soccer'?(p.team===0?'#79f5cb':'#b5a1ff'):p.infected?'#9deb72':colors[i]);
      const point=!g.screen&&p.alive?this.r.screenPoint(p.x,p.y+2.2,p.z):null;label.hidden=!point||point.x<0||point.x>1||point.y<0||point.y>1;
      if(!label.hidden){label.style.left=point.x*100+'%';label.style.top=point.y*100+'%';label.textContent=p.name+(round.mode.id==='bomb-tag'&&round.holder===p.id?' · BOMB!':p.infected?' · INFECTED':'');}
    }
    this.gemMeshes?.forEach((mesh,i)=>{mesh.visible=round.gems[i].ready<=round.elapsed;mesh.rotation.y+=dt;mesh.position.y=14+Math.sin(round.elapsed*2+i)*.2;});
    this.hudTimer=(this.hudTimer||0)+dt;if(this.hudTimer>.1){this.hudTimer=0;this.renderHud();}
  }
  renderHud(){
    if(!this.active)return;const r=this.round,p=r.players[0],left=Math.ceil(r.mode.duration-r.elapsed);
    const objective=r.mode.party?partyObjective(r):r.mode.id==='color-drop'?`${TILE_COLORS[r.color]} · ${r.elapsed%8<5?'tiles drop in '+Math.ceil(5-r.elapsed%8)+'s':'STAY ON THIS COLOR'}`:r.mode.id==='infection'?(p.infected?'INFECTED · Click to tag survivors':'SURVIVOR · Keep away from the infected'):r.mode.id==='sky-battle'?`Health ${p.hp}/20 · Click to strike`:r.mode.id==='spleef'?'Aim down + click to break a tile':r.mode.description;
    this.hud.innerHTML=`<div class="arcade-clock"><small>${r.mode.name.toUpperCase()}</small><b>${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</b><span>${r.players.filter(p=>p.alive).length} active · 5 AI</span></div><div class="arcade-objective ${r.mode.id==='redlight-rush'?'light-'+r.light.toLowerCase():''}">${objective}</div>${r.noticeUntil>r.elapsed?`<div class="party-announcement">${r.notice}</div>`:''}<div class="arcade-scores"><small>LEADERBOARD</small>${r.standings().map((p,i)=>`<div class="${p.bot?'':'is-you'}"><span>${i+1}. ${p.name}${p.alive?'':' · OUT'}</span><b>${Math.floor(p.score)}</b></div>`).join('')}</div>${r.countdown>0?`<div class="arcade-countdown"><b>${Math.ceil(r.countdown)}</b><span>Get ready · ${r.mode.name}</span></div>`:!p.alive&&!r.ended?`<div class="arcade-countdown"><b>${Math.ceil(p.respawn)}</b><span>Respawning</span></div>`:''}${r.mode.party?`<button class="party-dash" data-action="arcade-dash" ${r.elapsed<p.dashReady||r.countdown>0?'disabled':''}><b>ϟ DASH</b><small>${r.elapsed<p.dashReady?(p.dashReady-r.elapsed).toFixed(1)+'s':'R · TAP'}</small></button>`:''}<div class="arcade-controls">WASD move · Space jump · Shift sprint · Click action${r.mode.party?' · R dash':''} · Esc pause</div>`;
  }
  render(){
    const g=this.game;document.body.classList.toggle('arcade-active',this.active);
    if(g.screen==='menu'){
      const lobby=this.ui.overlay.querySelector('.block-lobby');if(!lobby||lobby.querySelector('.arcade-section'))return;
      const feature=lobby.querySelector('.parkour-feature-copy');if(feature){feature.querySelector('.parkour-kicker').innerHTML='<i></i> PARTY LAB · 8 NEW GAMES';feature.querySelector('h2').innerHTML='More chaos.<br><em>More one-more-go.</em>';feature.querySelector('p').textContent='14 arcade games. Kick goals, pass ticking bombs, launch rockets, dodge meteors—and chase your next win.';feature.querySelector('button').dataset.action='course-select';feature.querySelector('button').innerHTML='Explore 12 levels <span>↗</span>';feature.querySelector('small').textContent='PICK A GAME · FIND YOUR CREW · PLAY AGAIN';}
      const title=lobby.querySelector('.lobby-heading h1');if(title)title.textContent='Your worlds, your rules.';
      const section=document.createElement('section');section.className='arcade-section';section.innerHTML=`<div class="arcade-heading"><div><span class="arcade-eyebrow">INSTANT PLAY</span><h2>Pick your kind of chaos.</h2><button class="party-shuffle" data-action="arcade-random">⤨ Surprise me</button></div><span class="ai-badge"><i></i> Always ready · active AI</span></div><div class="arcade-grid">${ARCADE_MODES.map((m,i)=>`<button class="arcade-card" style="--accent:${m.color};--card-index:${i}" data-action="arcade-play" data-mode="${m.id}"><div class="arcade-art"><span class="arcade-tag">${m.party?'NEW · ':''}${m.tag}</span><i class="art-cube cube-one"></i><i class="art-cube cube-two"></i><i class="art-cube cube-three"></i><b>${m.icon}</b><span class="arcade-duration">${m.duration}s ROUNDS</span></div><div class="arcade-card-copy"><h3>${m.name}<span>↗</span></h3><p>${m.description}</p><small>YOU + 5 AI OPPONENTS</small></div></button>`).join('')}</div>`;lobby.querySelector('.parkour-feature').after(section);
    }
    if(g.screen==='courses'){
      this.ui.overlay.innerHTML=this.ui.frame('Find your next summit.','12-LEVEL SKY CAMPAIGN',`<p class="muted">Every course is open. Checkpoints save your run; personal bests save on this device.</p><div class="course-grid">${CAMPAIGN.map(c=>{let best;try{best=JSON.parse(g.storage.getItem('voxel-vault-parkour-'+c.id));}catch{}return `<button class="course-card" data-action="course-play" data-course="${c.id}" style="--accent:${c.color}"><span class="course-number">${String(c.level).padStart(2,'0')}</span><span><small>${c.difficulty}</small><b>${c.name}</b><em>${c.subtitle}</em><strong>${best?.time>0?'BEST '+best.time.toFixed(2)+'s':'Set your first time'} →</strong></span></button>`;}).join('')}</div><button class="full" data-action="menu">Main menu</button>`);this.ui.overlay.querySelector('.close')?.setAttribute('data-action','menu');
    }
    if(!this.active){this.hud.hidden=true;return;}
    if(g.screen==='pause')this.ui.overlay.innerHTML=this.ui.frame('Take a breather.',this.round.mode.name.toUpperCase(),`<p class="muted">The entire round, including AI players, is paused.</p><button class="primary full" data-action="resume">Resume round ▶</button><button class="full" data-action="arcade-play">Restart round</button><button class="full" data-action="settings">Settings</button><button class="full" data-action="menu">Main menu</button>`);
    if(g.screen==='arcade-results'){
      const r=this.round,win=r.winners.includes(0),survival=r.mode.survival||['spleef','color-drop'].includes(r.mode.id);this.ui.overlay.innerHTML=this.ui.frame(win?'You did it!':'One more round?',r.mode.name.toUpperCase(),`<div class="arcade-result-icon">${win?'♛':r.mode.icon}</div><p class="arcade-result-caption">${win?'Victory':r.mode.id==='infection'?r.winners.length?'Survivors escaped':'The infection spread':survival&&!r.players[0].alive?'You were eliminated':'Round complete'}</p><ol class="arcade-results-list">${r.standings().map(p=>`<li><span>${p.name}</span><b>${Math.floor(survival&&p.alive?r.elapsed:p.score)}${survival?'s survived':''}</b></li>`).join('')}</ol><button class="primary full" data-action="arcade-play">Play again ▶</button><button class="full" data-action="arcade-random">Surprise me with another game ⤨</button><button class="full" data-action="menu">Choose another game</button>`);this.ui.overlay.querySelector('.close')?.setAttribute('data-action','menu');
    }
  }
}
