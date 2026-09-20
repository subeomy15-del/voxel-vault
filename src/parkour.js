import { CLOUDSTEP,COURSES } from './parkour-course.js?v=34';
import { GameTimer } from './game-timer.js?v=34';
import { freshState } from './save.js?v=34';

export class Parkour {
  constructor(game){this.game=game;game.parkour=this;this.timer=new GameTimer();this.course=CLOUDSTEP;this.checkpoint=0;this.respawnTime=0;this.pulse=0;}
  get active(){return this.game.state.mode==='parkour';}
  readBest(){
    try{const best=JSON.parse(this.game.storage.getItem('voxel-vault-parkour-'+this.course.id));
      if(best&&Number.isFinite(best.time)&&best.time>0&&Array.isArray(best.splits)&&best.splits.length===this.course.checkpoints.length-1&&best.splits.every((t,i,a)=>Number.isFinite(t)&&t>=0&&t<=best.time&&(i===0||t>=a[i-1])))return best;
    }catch{}return null;
  }
  start(id=CLOUDSTEP.id){
    const g=this.game;if(g.multiplayer?.room||!COURSES[id])return false;
    if(!this.active){g.save(true);this.soloState=structuredClone(g.state);}
    this.course=COURSES[id];this.best=this.readBest();this.previousBest=this.best;
    const state=freshState(91347,'parkour');state.dimension='parkour';state.pos={...this.course.spawn};state.origin={...state.pos};state.spawn={...state.pos};state.yaw=this.course.spawn.yaw;state.pitch=0;state.time=95;state.inv={};state.glider=null;
    g.state=state;g.events.length=0;g.loadWorld();g.screen=null;g.grounded=true;
    this.timer.reset();this.checkpoint=0;this.falls=0;this.respawnTime=0;this.padCooldown=0;this.pulse=0;this.newBest=false;this.storageFailed=false;
    g.toast(this.course.name,'Follow the ivory platforms. Shift to sprint · Space to jump · R to retry a checkpoint.');
    return true;
  }
  leave(){
    if(!this.active)return;
    const g=this.game;this.timer.running=false;this.respawnTime=0;g.audio.quiet?.();
    g.state=this.soloState||freshState();this.soloState=null;g.loadWorld();g.screen='menu';
  }
  resetToCheckpoint(){
    if(!this.active||this.respawnTime||this.timer.finished)return false;
    this.falls++;this.respawnTime=.28;this.didRespawn=false;
    const g=this.game;g.vx=g.vz=g.velocity=0;g.mantle=null;g.jumpBuffer=0;g.coyote=0;g.jumpImpulse=g.landingImpulse=0;g.keys.clear();g.movementInputHeld?.clear();g.jumpActive=false;g.jumpIntent=0;g.padFlight=0;g.touchSprint=false;g.touch={x:0,z:0};g.sprintToggle=false;g.crouchToggle=false;
    return true;
  }
  respawn(){
    const g=this.game,cp=this.course.checkpoints[this.checkpoint];
    g.pos={x:cp.x,y:cp.y,z:cp.z};g.yaw=cp.yaw;g.pitch=0;g.velocity=g.vx=g.vz=0;g.cameraOffset=0;g.grounded=true;g.crouching=false;g.mantle=null;g.jumpBuffer=0;g.coyote=0;g.jumpReleased=false;g.jumpActive=false;g.jumpIntent=0;g.padFlight=0;g.gliding=false;g.flying=false;
  }
  update(dt){
    if(!this.active||this.game.screen||this.timer.finished)return;
    const g=this.game;
    if(!this.timer.running&&(Math.hypot(g.pos.x-this.course.spawn.x,g.pos.z-this.course.spawn.z)>.15||!g.grounded))this.timer.start();
    this.timer.update(g.frameElapsed??dt);this.pulse=Math.max(0,this.pulse-dt);this.padCooldown=Math.max(0,this.padCooldown-dt);
    if(this.respawnTime){
      this.respawnTime=Math.max(0,this.respawnTime-dt);
      if(this.respawnTime<=.14&&!this.didRespawn){this.respawn();this.didRespawn=true;}
      return;
    }
    if(g.pos.y<this.course.fallY){this.resetToCheckpoint();return;}
    const next=this.course.checkpoints[this.checkpoint+1];
    if(next&&g.grounded&&Math.abs(g.pos.y-next.y)<.2&&Math.hypot(g.pos.x-next.x,g.pos.z-next.z)<1.8){
      this.checkpoint++;this.timer.split();this.pulse=1.1;
      g.state.spawn={x:next.x,y:next.y,z:next.z};g.audio.play('checkpoint');g.renderer.burst(next.x,next.y+.2,next.z,'#97e6c5',28);
      g.toast('Checkpoint '+this.checkpoint+' · '+next.name,'Progress saved for this run.','reward');
    }
    for(const pad of this.course.pads)if(g.grounded&&this.padCooldown<=0&&Math.abs(g.pos.y-pad.y)<.2&&Math.hypot(g.pos.x-pad.x,g.pos.z-pad.z)<pad.radius){
      g.velocity=pad.velocity;g.vx=pad.vx;g.vz=pad.vz;g.grounded=false;g.coyote=0;g.jumpBuffer=0;g.jumpReleased=false;g.padFlight=.65;this.padCooldown=1.3;
      g.audio.play('launch');g.renderer.burst(pad.x,pad.y+.1,pad.z,'#a1e6f5',28);g.jumpImpulse=.8;
    }
    const finish=this.course.finish;
    if(this.checkpoint===this.course.checkpoints.length-1&&g.grounded&&Math.abs(g.pos.y-finish.y)<.2&&Math.hypot(g.pos.x-finish.x,g.pos.z-finish.z)<finish.radius)this.finish();
  }
  finish(){
    if(this.timer.finished)return;
    const g=this.game,time=this.timer.finish();this.previousBest=this.best;this.newBest=!this.best||time<this.best.time;
    if(this.newBest){this.best={time,splits:[...this.timer.splits]};try{g.storage.setItem('voxel-vault-parkour-'+this.course.id,JSON.stringify(this.best));}catch{this.storageFailed=true;}}
    g.audio.play('finish');for(const color of['#d9b85e','#97e6c5','#f3edce'])g.renderer.burst(g.pos.x,g.pos.y+1.5,g.pos.z,color,24);
    g.pause('parkour-results');g.emit('screen');
  }
}
