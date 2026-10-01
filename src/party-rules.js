// Party games use the same physical arena and controls, with independent objectives.
export const PARTY_MODES=Object.freeze([
  {id:'block-soccer',name:'Block Soccer',icon:'◉',color:'#8feb9e',tag:'3v3 SPORTS',description:'Chase, pass, and smash the giant ball into the goal. First team to five!',duration:120,party:true},
  {id:'bomb-tag',name:'Bomb Tag',icon:'✹',color:'#ffab75',tag:'PASS THE PANIC',description:'Holding the ticking bomb? Tag someone and RUN before it explodes.',duration:90,party:true},
  {id:'rocket-rumble',name:'Rocket Rumble',icon:'➶',color:'#ff8cb8',tag:'ROCKET CHAOS',description:'Launch splash rockets and blast rivals off a shrinking sky island.',duration:90,party:true},
  {id:'coin-heist',name:'Coin Heist',icon:'◈',color:'#ffe08a',tag:'STEAL & ESCAPE',description:'Grab loot, steal from rivals, and bank it at your glowing vault.',duration:90,party:true},
  {id:'meteor-dodge',name:'Meteor Dodge',icon:'☄',color:'#ff9177',tag:'DODGE THE SKY',description:'Watch the warning circles. Dodge falling meteors and collect bonus stars.',duration:75,party:true},
  {id:'redlight-rush',name:'Red Light Rush',icon:'◷',color:'#91e2cd',tag:'STOP & GO',description:'Sprint on green. Freeze on red. Cross the finish for points—then race again.',duration:75,party:true},
  {id:'tnt-run',name:'TNT Run',icon:'▤',color:'#f3ba86',tag:'KEEP MOVING',description:'Every step cracks the floor behind you. Jump the gaps and outlast the crew.',duration:75,party:true,survival:true},
  {id:'laser-jump',name:'Laser Jump',icon:'ϟ',color:'#b5a2ff',tag:'JUMP THE BEAM',description:'Jump over a spinning laser. It gets faster—and a second beam joins in.',duration:75,party:true},
]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const living=r=>r.players.filter(p=>p.alive);
const norm=(x,z)=>{const d=Math.hypot(x,z)||1;return {x:x/d,z:z/d};};
const nearest=(p,list)=>[...list].sort((a,b)=>dist(p,a)-dist(p,b))[0];
const safe=(x,z)=>({x:Math.max(-12.5,Math.min(13.5,x)),z:Math.max(-12.5,Math.min(13.5,z))});
export function initParty(r){
  r.projectiles=[];r.blasts=[];r.warnings=[];r.cracks=new Map();r.banks=[];r.loot=[];r.serial=0;r.nextHazard=1.3;r.notice='';r.noticeUntil=0;r.teamScores=[0,0];r.ball={x:0,z:0,vx:0,vz:0};r.fuse=10;r.holder=r.players.length-1;r.passLock=0;r.laser=0;r.light='GREEN';r.roundPhase=0;r.radius=14;
  for(const p of r.players){p.lives=3;p.carry=0;p.team=p.id%2;p.invulnerable=0;p.dashReady=0;p.home={x:p.x,z:p.z};p.lastSafe={x:p.x,z:p.z};}
  if(r.mode.id==='block-soccer'){resetSoccer(r);for(const p of r.players)p.home={x:p.x,z:p.z};}
  if(r.mode.id==='coin-heist'){
    r.banks=r.players.map(p=>({...p.home,id:p.id}));
    for(let i=0;i<24;i++)r.loot.push({id:i,x:Math.sin(i*2.4)*(2+i%4),z:Math.cos(i*2.4)*(2+i%4),ready:0});
  }
  if(r.mode.id==='redlight-rush')for(const p of r.players){p.x=-11+p.id*4.4;p.z=11;p.home={x:p.x,z:11};r.events.push({type:'respawn',player:p.id});}
  if(r.mode.id==='meteor-dodge')for(let i=0;i<8;i++)r.loot.push({id:i,x:Math.sin(i*.8)*9,z:Math.cos(i*.8)*9,ready:0});
}
function notice(r,text){r.notice=text;r.noticeUntil=r.elapsed+2.5;r.events.push({type:'notice',text});}
function resetSoccer(r){
  Object.assign(r.ball,{x:0,z:0,vx:0,vz:0,lastHit:undefined});
  for(const p of r.players){p.x=(Math.floor(p.id/2)-1)*5;p.z=p.team===0?9:-9;p.y=13;p.vx=p.vz=p.vy=0;p.alive=true;r.events.push({type:'respawn',player:p.id});}
}
export function partyDash(r,p,aim){
  if(!p?.alive||r.ended||r.countdown>0||r.elapsed<p.dashReady||r.mode.id==='redlight-rush'&&r.light==='RED')return false;
  const d=norm(aim.x,aim.z);p.vx+=d.x*17;p.vz+=d.z*17;p.dashReady=r.elapsed+3.5;r.events.push({type:'dash',player:p.id});return true;
}
export function partyAttack(r,p,target,aim){
  if(!p?.alive||r.ended||r.countdown>0||p.cooldown>0)return false;
  const d=norm(aim?.x??(target?.x??p.x)-p.x,aim?.z??(target?.z??p.z-1)-p.z);
  switch(r.mode.id){
    case 'block-soccer':
      if(dist(p,r.ball)>3.2)return false;
      r.ball.vx=d.x*22;r.ball.vz=d.z*22;r.ball.lastHit=p.id;p.cooldown=.45;r.events.push({type:'kick',player:p.id,x:r.ball.x,z:r.ball.z});return true;
    case 'rocket-rumble':
      r.projectiles.push({id:++r.serial,x:p.x+d.x*.8,z:p.z+d.z*.8,y:14,dx:d.x,dz:d.z,owner:p.id,life:1.5});p.cooldown=.85;r.events.push({type:'shoot',player:p.id});return true;
    case 'bomb-tag':
      if(r.holder!==p.id||!target?.alive||target===p||dist(p,target)>3||r.elapsed<r.passLock)return false;
      r.holder=target.id;r.passLock=r.elapsed+.85;p.cooldown=.6;notice(r,`${target.name} has the bomb!`);r.events.push({type:'pass',player:target.id});return true;
    case 'coin-heist':{
      if(!target?.alive||target===p||dist(p,target)>2.9)return false;p.cooldown=.85;
      const stolen=Math.min(target.carry,3,8-p.carry);target.carry-=stolen;p.carry+=stolen;
      target.vx=d.x*10;target.vz=d.z*10;r.events.push({type:'steal',player:p.id,value:stolen});return true;
    }
  }
  return false;
}
function hurt(r,p,source){
  if(!p.alive||p.invulnerable>0)return false;
  p.lives--;p.invulnerable=1.5;r.events.push({type:'hit',player:p.id});
  if(p.lives<=0){p.lives=3;p.score=Math.max(0,p.score-3);r.eliminate(p);}
  return true;
}
function blast(r,x,z,owner,radius=3.6){
  r.blasts.push({id:++r.serial,x,z,radius,until:r.elapsed+.55});r.events.push({type:'blast',x,z});
  for(const p of living(r))if(dist(p,{x,z})<radius){
    const d=norm(p.x-x,p.z-z),force=(1-dist(p,{x,z})/radius)*24+7;
    p.vx+=d.x*force;p.vz+=d.z*force;
    if(owner!==undefined&&owner!==p.id){p.lastHit=owner;p.lastHitAt=r.elapsed;}
    if(r.mode.id==='meteor-dodge')hurt(r,p,'meteor');
  }
}
export function partyTarget(r,p){
  const opponents=living(r).filter(q=>q!==p);
  switch(r.mode.id){
    case 'block-soccer':{
      const team=living(r).filter(q=>q.team===p.team).sort((a,b)=>dist(a,r.ball)-dist(b,r.ball));
      if(team[0]===p)return {x:r.ball.x,z:r.ball.z+(p.team===0?1:-1)};
      return {x:(p.id%3-1)*6,z:p.team===0?Math.max(2,r.ball.z+4):Math.min(-2,r.ball.z-4)};
    }
    case 'bomb-tag':{
      if(r.holder===p.id)return nearest(p,opponents);
      const holder=r.players[r.holder];if(!holder)return p.home;
      let best=p.home,score=-Infinity;for(let i=0;i<16;i++){const t={x:Math.sin(i*Math.PI/8)*11,z:Math.cos(i*Math.PI/8)*11},s=dist(t,holder)-dist(t,p)*.4;if(s>score){score=s;best=t;}}return best;
    }
    case 'coin-heist':
      if(p.carry>=4||p.carry>0&&r.elapsed>r.mode.duration-12)return p.home;
      return nearest(p,r.loot.filter(c=>c.ready<=r.elapsed))||p.home;
    case 'meteor-dodge':{
      const danger=r.warnings.filter(w=>dist(p,w)<w.radius+2);
      if(danger.length){let best=p.home,score=-Infinity;for(let i=0;i<16;i++){const t=safe(p.x+Math.sin(i*Math.PI/8)*5,p.z+Math.cos(i*Math.PI/8)*5),s=Math.min(...r.warnings.map(w=>dist(t,w)-w.radius));if(s>score){score=s;best=t;}}return best;}
      return nearest(p,r.loot.filter(c=>c.ready<=r.elapsed))||p.home;
    }
    case 'rocket-rumble':{
      const enemy=nearest(p,opponents);if(!enemy)return {x:0,z:0};
      if(Math.hypot(p.x,p.z)>r.radius-3)return {x:0,z:0};
      const d=norm(enemy.x-p.x,enemy.z-p.z);
      return safe(p.x+(dist(p,enemy)<6?-d.x:d.z)*5,p.z+(dist(p,enemy)<6?-d.z:-d.x)*5);
    }
    case 'redlight-rush':return {x:p.home.x,z:-13};
    case 'laser-jump':return {x:Math.sin(p.id+Math.floor(r.elapsed/6))*(5+p.id*.65),z:Math.cos(p.id+Math.floor(r.elapsed/6))*(5+p.id*.65)};
    case 'tnt-run':{
      let best=null,score=-Infinity;
      for(let i=0;i<16;i++){const t=safe(p.x+Math.sin(i*Math.PI/8)*3,p.z+Math.cos(i*Math.PI/8)*3);if(!r.solid(t.x,t.z))continue;
        let space=0;for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)if(r.solid(t.x+x,t.z+z)&&!r.cracks.has(`${Math.floor(t.x+x)},${Math.floor(t.z+z)}`))space++;
        if(space>score){score=space;best=t;}}
      return best;
    }
  }
  return p.home;
}
function botMove(r,p,dt){
  if(p.y<12.9&&!r.solid(p.x,p.z)){p.vy-=24*dt;p.y+=p.vy*dt;return;}
  if(p.vy>0||p.y>13){p.vy-=24*dt;p.y+=p.vy*dt;if(p.y<13&&r.solid(p.x,p.z)){p.y=13;p.vy=0;}}
  else if(!r.solid(p.x,p.z)){p.vy-=24*dt;p.y+=p.vy*dt;return;}
  if(r.mode.id==='redlight-rush'&&r.light!=='GREEN')return;
  if(r.mode.id==='laser-jump'&&p.y===13){
    const ahead=r.laser+.35*(.7+r.elapsed*.018),offset=Math.abs(Math.sin(Math.atan2(p.z,p.x)-ahead))*Math.hypot(p.x,p.z);
    if(offset<1.4&&r.elapsed>(p.jumpReady||0)){p.vy=8.8;p.jumpReady=r.elapsed+.9;}
  }
  const original=p.speed;p.speed=r.mode.id==='bomb-tag'&&r.holder===p.id?5.4:r.mode.id==='coin-heist'?original*(1-p.carry*.035):original;
  r.steer(p,dt);p.speed=original;
  const rival=nearest(p,living(r).filter(q=>q!==p));
  if(r.mode.id==='block-soccer'&&dist(p,r.ball)<2.8)partyAttack(r,p,null,{x:-r.ball.x*.3+(r.random()-.5)*2,z:p.team===0?-15:15});
  if(r.mode.id==='bomb-tag'&&r.holder===p.id)partyAttack(r,p,rival);
  if(r.mode.id==='coin-heist'&&rival?.carry>0)partyAttack(r,p,rival);
  if(r.mode.id==='rocket-rumble'&&rival&&dist(p,rival)<24)partyAttack(r,p,rival,{x:rival.x-p.x+(r.random()-.5)*2,z:rival.z-p.z+(r.random()-.5)*2});
  if(r.mode.id==='bomb-tag'&&r.holder!==p.id&&rival&&dist(p,r.players[r.holder])<4)partyDash(r,p,{x:p.x-r.players[r.holder].x,z:p.z-r.players[r.holder].z});
}
export function updateParty(r,dt){
  r.blasts=r.blasts.filter(b=>b.until>r.elapsed);
  if(r.mode.id==='redlight-rush'){
    const phase=r.elapsed%7;r.light=phase<4?'GREEN':phase<4.8?'AMBER':'RED';
    if(r.light!=='GREEN')for(const p of r.players){p.vx=p.vz=0;}
  }
  if(r.mode.id==='laser-jump')r.laser+=dt*(.7+r.elapsed*.018);
  for(const p of r.players){
    p.cooldown=Math.max(0,p.cooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
    if(!p.alive){
      if(r.mode.survival)continue;p.respawn-=dt;
      if(p.respawn<=0){p.alive=true;p.y=13;p.x=Math.max(-r.radius+1,Math.min(r.radius-1,p.home.x));p.z=Math.max(-r.radius+1,Math.min(r.radius-1,p.home.z));p.vx=p.vz=p.vy=0;p.invulnerable=2;p.carry=0;p.lastHit=undefined;r.events.push({type:'respawn',player:p.id});}continue;
    }
    if(p.bot)botMove(r,p,dt);
    p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=Math.exp(-5*dt);p.vz*=Math.exp(-5*dt);
    if(p.y<5){if(r.mode.id==='rocket-rumble'&&p.lastHit!==undefined&&r.elapsed-p.lastHitAt<5)r.players[p.lastHit].score+=3;r.eliminate(p);continue;}
    if(r.mode.id==='tnt-run'&&p.y<13.25){
      const x=Math.floor(p.x),z=Math.floor(p.z),k=`${x},${z}`;
      if(r.solid(x,z)&&!r.cracks.has(k))r.cracks.set(k,{x,z,at:r.elapsed+.65});p.score=r.elapsed;
    }
    if(r.mode.id==='coin-heist'){
      if(p.carry<8)for(const c of r.loot)if(c.ready<=r.elapsed&&dist(p,c)<1.15&&p.y<14.5){p.carry++;c.ready=r.elapsed+6;r.events.push({type:'pickup',player:p.id});if(p.carry===8)break;}
      if(p.carry&&dist(p,p.home)<2){const value=p.carry;p.score+=value;p.carry=0;r.events.push({type:'bank',player:p.id,value});}
    }
    if(r.mode.id==='meteor-dodge'){
      p.score+=dt*.2;for(const c of r.loot)if(c.ready<=r.elapsed&&dist(p,c)<1.1){p.score+=2;c.ready=r.elapsed+7;r.events.push({type:'pickup',player:p.id});}
    }
    if(r.mode.id==='redlight-rush'){
      if(r.light==='RED'&&dist(p,p.lastSafe)>.025&&p.invulnerable<=0){p.x=p.home.x;p.z=p.home.z;p.vx=p.vz=0;p.invulnerable=.5;r.events.push({type:'respawn',player:p.id});if(!p.bot)notice(r,'Caught moving! Back to the start.');}
      if(p.z<-11.5){p.score++;p.x=p.home.x;p.z=11;r.events.push({type:'respawn',player:p.id});if(!p.bot)notice(r,'Finish! +1 lap. Go again!');}
      p.lastSafe={x:p.x,z:p.z};
    }
    if(r.mode.id==='laser-jump'){
      const a=Math.atan2(p.z,p.x),radius=Math.hypot(p.x,p.z),beam=Math.abs(Math.sin(a-r.laser))*radius,second=r.elapsed>30?Math.abs(Math.sin(a-r.laser-Math.PI/2))*radius:Infinity;
      if(Math.min(beam,second)<.6&&p.y<13.9&&p.invulnerable<=0)hurt(r,p,'laser');
      p.score+=dt;
    }
  }
  for(const[k,t]of r.cracks)if(t.at<=r.elapsed){r.tile(t.x,t.z,true);r.cracks.delete(k);}
  if(r.mode.id==='bomb-tag'){
    r.fuse-=dt;
    if(r.fuse<=0){const p=r.players[r.holder];blast(r,p.x,p.z);r.eliminate(p);for(const q of living(r))q.score+=2;notice(r,`${p.name} exploded! New bomb incoming.`);r.holder=nearest({x:0,z:0},living(r))?.id??0;r.fuse=10;r.passLock=r.elapsed+1;}
  }
  if(r.mode.id==='block-soccer'){
    const b=r.ball;b.x+=b.vx*dt;b.z+=b.vz*dt;b.vx*=Math.exp(-.65*dt);b.vz*=Math.exp(-.65*dt);
    if(Math.abs(b.x)>13.5){b.x=Math.sign(b.x)*13.5;b.vx*=-.8;}
    if(Math.abs(b.z)>13.5){
      if(Math.abs(b.x)<4.2){const team=b.z<0?0:1;r.teamScores[team]++;if(b.lastHit!==undefined)r.players[b.lastHit].score++;notice(r,`${team===0?'Mint':'Violet'} team scores!`);r.events.push({type:'goal',team});resetSoccer(r);r.countdown=2;if(r.teamScores[team]>=5)r.end();}
      else{b.z=Math.sign(b.z)*13.5;b.vz*=-.8;}
    }
  }
  if(r.mode.id==='rocket-rumble'){
    const radius=14-Math.floor(r.elapsed/20)*2;
    if(radius!==r.radius){r.radius=radius;notice(r,'The island is shrinking!');for(let x=-14;x<=14;x++)for(let z=-14;z<=14;z++)if(Math.abs(x)>radius||Math.abs(z)>radius)r.tile(x,z,true);}
    for(const shot of r.projectiles){shot.x+=shot.dx*19*dt;shot.z+=shot.dz*19*dt;shot.life-=dt;
      if(shot.life<=0||living(r).some(p=>p.id!==shot.owner&&dist(p,shot)<1)){blast(r,shot.x,shot.z,shot.owner);shot.done=true;}}
    r.projectiles=r.projectiles.filter(p=>!p.done);
  }
  if(r.mode.id==='meteor-dodge'){
    if(r.elapsed>=r.nextHazard){const target=living(r)[Math.floor(r.random()*living(r).length)]||{x:0,z:0};r.warnings.push({id:++r.serial,...safe(target.x+(r.random()-.5)*5,target.z+(r.random()-.5)*5),at:r.elapsed+1.6,radius:2.6+r.elapsed*.012});r.nextHazard=r.elapsed+Math.max(.32,1.25-r.elapsed*.014);}
    for(const w of r.warnings)if(w.at<=r.elapsed){blast(r,w.x,w.z,undefined,w.radius);w.done=true;}r.warnings=r.warnings.filter(w=>!w.done);
  }
  if(r.mode.survival&&(living(r).length<=1||!r.players[0].alive))r.end();
  if(r.elapsed>=r.mode.duration)r.end();
}
export function partyWinners(r){
  if(r.mode.id==='block-soccer'){if(r.teamScores[0]===r.teamScores[1])return r.players.map(p=>p.id);return r.players.filter(p=>p.team===(r.teamScores[0]>r.teamScores[1]?0:1)).map(p=>p.id);}
  return null;
}
export function partyObjective(r){
  const p=r.players[0];
  switch(r.mode.id){
    case 'block-soccer':return `MINT ${r.teamScores[0]} : ${r.teamScores[1]} VIOLET · You are MINT · Click near the ball to kick`;
    case 'bomb-tag':return `${r.holder===0?'YOU HAVE THE BOMB — TAG SOMEONE!':r.players[r.holder].name+' has the bomb'} · ${r.fuse.toFixed(1)}s`;
    case 'rocket-rumble':return `Click to launch a rocket · R to dash · Island shrinks in ${20-Math.floor(r.elapsed)%20}s`;
    case 'coin-heist':return `Carrying ${p.carry}/8 · Bank at your MINT vault · Click a rival to steal`;
    case 'meteor-dodge':return `♥ ${p.lives}/3 · Get out of the orange circles · R to dash · Stars +2`;
    case 'redlight-rush':return `${r.light==='GREEN'?'GREEN — RUN!':r.light==='AMBER'?'STOPPING — RELEASE MOVEMENT':'RED — FREEZE!'} · ${Math.ceil(7-r.elapsed%7)}s to next green`;
    case 'tnt-run':return 'The floor breaks 0.65s after each step · Keep moving · Jump the gaps';
    case 'laser-jump':return `♥ ${p.lives}/3 · SPACE to jump the laser${r.elapsed>30?' · DOUBLE BEAMS!':''}`;
  }
}
