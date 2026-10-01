import {PARTY_MODES,initParty,updateParty,partyTarget,partyAttack,partyWinners} from './party-rules.js?v=42';
// Deterministic rules and active opponents; no DOM or renderer dependencies.
export const ARCADE_MODES=Object.freeze([
  ...PARTY_MODES,
  {id:'gem-rush',name:'Gem Rush',icon:'◆',color:'#64e4ce',tag:'COLLECT',description:'Race the crew for gems. The highest score wins.',duration:90},
  {id:'spleef',name:'Spleef',icon:'▦',color:'#8bd2ff',tag:'SURVIVE',description:'Break the floor under your rivals. Last one standing wins.',duration:90},
  {id:'color-drop',name:'Color Drop',icon:'▧',color:'#c3a0ff',tag:'REACT',description:'Find the announced color before the other tiles disappear.',duration:80},
  {id:'infection',name:'Infection',icon:'✣',color:'#a7ec77',tag:'ESCAPE',description:'Evade infected runners. If tagged, chase the survivors!',duration:75},
  {id:'crown-control',name:'Crown Control',icon:'♛',color:'#ffd378',tag:'CONTROL',description:'Hold the glowing center and knock rivals out of the ring.',duration:90},
  {id:'sky-battle',name:'Sky Battle',icon:'⚔',color:'#ff929b',tag:'BATTLE',description:'Face five active opponents. Most knockouts wins.',duration:90},
]);
export const TILE_COLORS=['Coral','Azure','Jade','Gold'];
export const TILE_BLOCKS=['red_wool','blue_wool','green_wool','gold_block'];
export const tileColor=(x,z)=>((Math.floor((x+15)/3)+Math.floor((z+15)/3))%4+4)%4;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=(x,z)=>`${Math.floor(x)},${Math.floor(z)}`;
export class ArcadeRound {
  constructor(id,{random=Math.random,bots=5}={}){
    this.mode=ARCADE_MODES.find(m=>m.id===id);if(!this.mode)throw Error('Unknown arcade game');
    this.random=random;this.elapsed=0;this.countdown=3;this.ended=false;this.removed=new Set();this.tileChanges=[];this.events=[];this.color=0;this.colorPhase=-1;this.gems=[];
    this.players=Array.from({length:bots+1},(_,i)=>({id:i,name:i?['Moss','Nova','Pixel','Ember','Skye','Echo','Comet'][i-1]+' · AI':'You',bot:i>0,x:i?Math.sin(i*Math.PI*2/(bots+1))*10:.5,z:i?Math.cos(i*Math.PI*2/(bots+1))*10:9.5,y:13,yaw:0,score:0,hp:20,alive:true,infected:id==='infection'&&i===bots,cooldown:0,respawn:0,vx:0,vz:0,vy:0,walk:0,target:null,think:0,speed:3.7+i*.18}));
    if(this.mode.party)initParty(this);
    if(id==='gem-rush')for(let i=0;i<15;i++)this.gems.push(this.newGem(i));
  }
  newGem(id){return {id,x:Math.floor(this.random()*24)-12+.5,z:Math.floor(this.random()*24)-12+.5,value:id%5===0?3:1,ready:0};}
  solid(x,z){return x>=-14&&x<15&&z>=-14&&z<15&&!this.removed.has(key(x,z));}
  tile(x,z,remove){const k=key(x,z);if(remove===this.removed.has(k))return;if(remove)this.removed.add(k);else this.removed.delete(k);this.tileChanges.push({x:Math.floor(x),z:Math.floor(z),remove});}
  breakTile(x,z,actor){if(this.mode.id!=='spleef'||this.countdown>0||this.ended||!actor.alive||actor.cooldown>0||distance(actor,{x,z})>4.5||!this.solid(x,z))return false;this.tile(x,z,true);actor.cooldown=.38;return true;}
  attack(actor,target,aim){
    if(this.mode.party)return partyAttack(this,actor,target,aim);
    if(this.countdown>0||this.ended||!actor.alive||!target?.alive||actor.cooldown>0||distance(actor,target)>2.8||Math.abs(actor.y-target.y)>2)return false;
    if(!['infection','crown-control','sky-battle'].includes(this.mode.id))return false;
    actor.cooldown=.65;
    if(this.mode.id==='infection'){if(!actor.infected||target.infected)return false;target.infected=true;actor.score+=3;this.events.push({type:'tag',player:target.id});return true;}
    const d=Math.max(.1,distance(actor,target));target.vx=(target.x-actor.x)/d*11;target.vz=(target.z-actor.z)/d*11;target.lastHit=actor.id;target.lastHitAt=this.elapsed;
    if(this.mode.id==='sky-battle'){target.hp-=5;if(target.hp<=0)this.eliminate(target);}
    this.events.push({type:'hit',player:target.id});return true;
  }
  eliminate(p){
    if(!p.alive)return;p.alive=false;p.respawn=2;
    if(this.mode.party&&!this.mode.survival){p.carry=0;}
    else if(['sky-battle','crown-control','gem-rush','infection'].includes(this.mode.id)){
      if(p.lastHit!==undefined&&this.elapsed-p.lastHitAt<5)this.players[p.lastHit].score+=this.mode.id==='sky-battle'?1:2;
      if(this.mode.id==='gem-rush')p.score=Math.max(0,p.score-2);
    }else p.score=this.elapsed;
    this.events.push({type:'fall',player:p.id});
  }
  chooseTarget(p){
    if(this.mode.party)return partyTarget(this,p);
    const rivals=this.players.filter(q=>q!==p&&q.alive);
    switch(this.mode.id){
      case 'gem-rush':return this.gems.filter(g=>g.ready<=this.elapsed).sort((a,b)=>distance(p,a)/a.value-distance(p,b)/b.value)[0];
      case 'color-drop':{
        let best=null,dist=Infinity;for(let x=-13;x<14;x++)for(let z=-13;z<14;z++)if(tileColor(x,z)===this.color&&this.solid(x,z)){const t={x:x+.5,z:z+.5},d=distance(p,t);if(d<dist){dist=d;best=t;}}return best;
      }
      case 'infection':{
        const targets=rivals.filter(q=>q.infected!==p.infected).sort((a,b)=>distance(p,a)-distance(p,b));
        if(p.infected)return targets[0];const threat=targets[0];if(!threat)return p.target;
        let best=null,score=-Infinity;for(let i=0;i<12;i++){const t={x:Math.cos(i*Math.PI/6)*11,z:Math.sin(i*Math.PI/6)*11},s=distance(t,threat)-distance(t,p)*.3;if(s>score){score=s;best=t;}}return best;
      }
      case 'crown-control':return {x:Math.sin(p.id*2+this.elapsed*.1)*1.6,z:Math.cos(p.id*2+this.elapsed*.1)*1.6};
      case 'sky-battle':return rivals.sort((a,b)=>distance(p,a)-distance(p,b))[0];
      default:if(!p.target||distance(p,p.target)<1||!this.solid(p.target.x,p.target.z))return {x:this.random()*24-12,z:this.random()*24-12};return p.target;
    }
  }
  steer(p,dt){
    p.think-=dt;if(p.think<=0){p.think=.2+this.random()*.35;p.target=this.chooseTarget(p);}
    if(!p.target)return;
    const dx=p.target.x-p.x,dz=p.target.z-p.z,d=Math.hypot(dx,dz);if(d<.25)return;
    // Probe alternate headings to skirt holes instead of walking into them.
    const angle=Math.atan2(dx,dz),step=Math.min(d,p.speed*dt);
    for(const turn of [0,.6,-.6,1.2,-1.2,2,-2]){
      const sx=Math.sin(angle+turn),sz=Math.cos(angle+turn);
      if(!this.solid(p.x+sx*.8,p.z+sz*.8))continue;
      p.x+=sx*step;p.z+=sz*step;p.yaw=Math.atan2(-sx,-sz);p.walk+=dt*4;break;
    }
  }
  update(dt){
    if(this.ended)return;dt=Math.min(.1,Math.max(0,dt));
    if(this.countdown>0){this.countdown=Math.max(0,this.countdown-dt);return;}
    this.elapsed+=dt;
    if(this.mode.party){updateParty(this,dt);return;}
    if(this.mode.id==='color-drop'){
      const round=Math.floor(this.elapsed/8),phase=this.elapsed%8,code=round*2+(phase>=5?1:0);this.color=(round*3+1)%4;
      if(code!==this.colorPhase){this.colorPhase=code;for(let x=-14;x<=14;x++)for(let z=-14;z<=14;z++)this.tile(x,z,phase>=5&&tileColor(x,z)!==this.color);}
    }
    for(const p of this.players){
      p.cooldown=Math.max(0,p.cooldown-dt);
      if(!p.alive){
        if(['spleef','color-drop'].includes(this.mode.id))continue;
        p.respawn-=dt;if(p.respawn<=0){p.alive=true;p.hp=20;p.x=Math.sin(p.id*Math.PI*2/this.players.length)*10;p.z=Math.cos(p.id*Math.PI*2/this.players.length)*10;p.y=13;p.vx=p.vz=p.vy=0;p.lastHit=undefined;this.events.push({type:'respawn',player:p.id});}continue;
      }
      if(p.bot){
        if(this.solid(p.x,p.z)&&p.y>=12.9){p.y=13;p.vy=0;this.steer(p,dt);}else{p.vy-=24*dt;p.y+=p.vy*dt;}
        if(this.mode.id==='spleef'&&p.cooldown<=0){const q=this.players.filter(q=>q!==p&&q.alive&&distance(p,q)<4).sort((a,b)=>distance(p,a)-distance(p,b))[0];if(q)this.breakTile(q.x,q.z,p);}
        if(['sky-battle','crown-control','infection'].includes(this.mode.id))for(const q of this.players)if(q!==p&&(!p.infected||!q.infected))this.attack(p,q);
      }
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=Math.exp(-7*dt);p.vz*=Math.exp(-7*dt);
      if(p.y<5){this.eliminate(p);continue;}
      if(this.mode.id==='gem-rush')for(const gem of this.gems)if(gem.ready<=this.elapsed&&Math.abs(p.y-13)<1.8&&distance(p,gem)<1.1){p.score+=gem.value;gem.ready=this.elapsed+5;this.events.push({type:'gem',player:p.id,x:gem.x,z:gem.z});}
      if(this.mode.id==='crown-control'&&distance(p,{x:0,z:0})<3.3&&p.y>=12.9)p.score+=dt;
      if(this.mode.id==='infection'&&!p.infected)p.score+=dt;
    }
    const alive=this.players.filter(p=>p.alive);
    if(['spleef','color-drop'].includes(this.mode.id)&&(alive.length<=1||!this.players[0].alive))this.end();
    if(this.mode.id==='infection'&&this.players.every(p=>p.infected))this.end();
    if(this.elapsed>=this.mode.duration)this.end();
  }
  standings(){return [...this.players].sort((a,b)=>(this.mode.survival||['spleef','color-drop'].includes(this.mode.id))?Number(b.alive)-Number(a.alive)||b.score-a.score:b.score-a.score);}
  end(){this.ended=true;const teamWinners=this.mode.party?partyWinners(this):null;if(teamWinners){this.winners=teamWinners;return;}this.winners=['infection'].includes(this.mode.id)?this.players.filter(p=>!p.infected).map(p=>p.id):this.standings().filter(p=>p.score===this.standings()[0].score&&(!(this.mode.survival||['spleef','color-drop'].includes(this.mode.id))||p.alive===this.standings()[0].alive)).map(p=>p.id);}
}
