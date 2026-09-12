import { ITEMS,EFFECTS } from './data.js';
export function activeEffect(game,name){return (game.state.effects?.[name]||0)>0;}
export function canEat(game,name){
  const item=ITEMS[name],s=game.state;if(!item||item.kind!=='food'||!(s.inv[name]>0))return false;
  if(item.effect&&(s.effects[item.effect]||0)<item.duration*.8)return true;
  if(item.heal>0&&s.hp<20)return true;
  return !!item.nutrition&&(s.food<20||s.saturation<Math.min(20,item.saturation+3));
}
export function consumeFood(game,name){
  if(!canEat(game,name))return false;const item=ITEMS[name],s=game.state;
  if(!game.creative)s.inv[name]--;
  if(item.heal)s.hp=Math.min(20,s.hp+item.heal);
  s.food=Math.min(20,s.food+(item.nutrition||0));s.saturation=Math.min(20,s.saturation+(item.saturation||0));
  if(item.effect){s.effects[item.effect]=Math.max(s.effects[item.effect]||0,item.duration);game.toast(EFFECTS[item.effect].name,`${item.duration} seconds · ${item.name}`);}
  game.audio.play('heal');game.emit('hud');return true;
}
export function tickSurvival(game,dt){
  const s=game.state;
  for(const[name,t]of Object.entries(s.effects)){if(t<=dt)delete s.effects[name];else s.effects[name]=t-dt;}
  game.revealTime=Math.max(0,(game.revealTime||0)-dt);
  if(game.eating){
    game.eating.time-=dt;
    if(!s.inv[game.eating.item])game.eating=null;
    else if(game.eating.time<=0){consumeFood(game,game.eating.item);game.eating=null;game.save();}
  }
  if(game.creative)return;
  s.exhaustion+=dt*(game.sprinting?.24:game.moving?.04:.006);
  while(s.exhaustion>=4){s.exhaustion-=4;if(s.saturation>0)s.saturation=Math.max(0,s.saturation-1);else s.food=Math.max(0,s.food-1);}
  if(s.hp<20&&s.food>=16){
    game.regenTimer=(game.regenTimer||0)+dt;const interval=s.saturation>0?2.5:5;
    if(game.regenTimer>=interval){game.regenTimer=0;s.hp=Math.min(20,s.hp+1);s.exhaustion+=1.2;}
  }else game.regenTimer=0;
  if(s.food===0){game.hungerTimer=(game.hungerTimer||0)+dt;if(game.hungerTimer>=7){game.hungerTimer=0;s.hp=Math.max(1,s.hp-1);}}else game.hungerTimer=0;
}
