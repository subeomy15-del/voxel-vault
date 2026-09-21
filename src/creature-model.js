import * as THREE from '../vendor/three.module.js';
import {CREATURES,NEW_ANIMALS} from './creature-registry.js?v=36';

// Original silhouettes share cached box geometry and per-model materials.
export function creatureModel(renderer,mob){
 const def=CREATURES[mob.kind]||NEW_ANIMALS[mob.kind],g=new THREE.Group(),limbs=[],base=def.color,trim=def.glow;
 const part=(color,w,h,d,x,y,z,parent=g)=>{const mesh=renderer.part(color,w,h,d,x,y,z);parent.add(mesh);return mesh;};
 const joint=(x,y,z,w,h,d,color=base)=>{const pivot=new THREE.Group();pivot.position.set(x,y,z);g.add(pivot);part(color,w,h,d,0,-h/2,0,pivot);limbs.push(pivot);return pivot;};
 let head,body;
 if(['wolf','cat','bear','horse','stag'].includes(def.model)){
  const large=def.model==='bear',tall=['horse','stag'].includes(def.model),h=large?1.05:tall?1.15:.58,len=large?1.05:tall?1.2:.92;
  body=part(base,large?.9:.55,large?.75:.48,len,0,h,0);
  for(const x of[-1,1])for(const z of[-1,1])joint(x*(large?.3:.2),h-.1,z*len*.34,large?.25:.14,h-.1,large?.27:.16);
  head=new THREE.Group();head.position.set(0,h+(tall?.35:.12),len*.43);g.add(head);
  part(base,large?.55:.37,tall?.45:.32,.42,0,0,.1,head);
  part(large?'#5a5046':trim,.27,.18,.28,0,-.08,.35,head);
  for(const x of[-.14,.14]){part(base,.12,tall?.22:.14,.12,x,.24,.04,head);part('#263636',.045,.055,.035,x,.035,.318,head);}
  part(base,.12,.13,def.model==='cat'?.7:.4,0,h,-len*.67).rotation.x=-.35;
  if(def.model==='horse')part('#51473e',.13,.4,.6,0,h+.31,.2);
  if(def.model==='stag')for(const side of[-1,1]){part(trim,.07,.5,.07,side*.2,.43,.04,head);part(trim,.32,.065,.065,side*.3,.48,.04,head);part(trim,.065,.22,.065,side*.43,.57,.04,head);}
  if(mob.kind==='gold_watermelon_stag')for(const x of[-.18,0,.18])part('#657b43',.065,.04,.85,x,h+.26,-.05);
 }else if(def.model==='slime'){
  body=part(base,.83,.58,.78,0,.34,0);part('#bcd39e',.55,.08,.52,0,.65,0);
  for(const x of[-.19,.19])part('#334b3d',.1,.1,.03,x,.42,.405);
 }else{
  const golem=def.model==='golem',ape=def.model==='ape',wraith=def.model==='wraith',heavy=golem||ape||def.model==='reaver',h=golem?1.25:1.02;
  body=part(base,heavy?.91:.55,heavy?.88:.69,.43,0,h,0);
  head=new THREE.Group();head.position.set(0,h+.55,.02);g.add(head);
  part(base,golem?.49:.37,.38,.38,0,0,0,head);
  for(const x of[-.1,.1])part(def.spirit?trim:'#293c39',.055,.06,.035,x,.025,.21,head);
  if(!wraith)for(const x of[-.2,.2])joint(x,h-.35,0,golem?.28:def.model==='archer'?.1:.18,h-.35,.26);
  for(const side of[-1,1]){joint(side*(heavy?.58:.39),h+.3,0,heavy?.29:.16,ape?1.05:.68,.28);if(golem)part(trim,.38,.23,.46,side*.57,h+.41,0);}
  if(golem){part(trim,.23,.3,.035,0,h,.24);part('#49504d',.48,.06,.035,0,h-.28,.24);}
  if(def.model==='archer')for(const y of[-.2,0,.2])part(trim,.47,.055,.04,0,h+y,.245);
  if(['archer','hunter'].includes(def.model)){
   for(const y of[-.3,0,.3])part('#a99263',.09,.28,.09,.49,h+y,.35).rotation.z=y*.8;
   part('#ded3b4',.025,.84,.025,.39,h,.35);part('#6b6052',.25,.6,.24,-.15,h,-.35);
  }
  if(def.model==='reaver'){part('#d1cbc0',.5,.35,.09,-.51,h+.08,.36);part('#7a6550',.07,.92,.07,-.51,h-.14,.36);}
  if(['warper','crone','wraith','hunter'].includes(def.model)){
   part(base,.51,.15,.46,0,h+.78,.015);part(base,.15,.62,.24,-.24,h+.32,0);part(base,.15,.62,.24,.24,h+.32,0);
   part(base,.7,.5,.41,0,.45,0);part(trim,.1,.16,.05,0,h+.26,.26);
  }
  if(def.model==='crone'){part('#8b7759',.075,1.55,.075,.61,.82,.25);part(trim,.18,.18,.18,.61,1.63,.25);}
 }
 if(def.spirit){for(const side of[-1,1]){const shard=part(trim,.09,.38,.09,side*.35,def.height-.24,-.1);shard.rotation.z=-side*.4;}part(trim,.14,.19,.05,0,def.height*.55,.3);}
 g.userData.creature={def,limbs,head,body};return g;
}
export function animateCreature(group,mob,time){
 const {def,limbs,head,body}=group.userData.creature,wind=mob.windup>0?mob.windup/Math.max(.01,mob.windupMax):0;
 for(let i=0;i<limbs.length;i++)limbs[i].rotation.x=Math.sin(mob.walk*7+i%2*Math.PI)*.35-(wind&&i>=2?wind*.7:0);
 if(head)head.rotation.x=mob.grazing?.2:wind*.16;
 if(def.model==='slime'){const hop=Math.abs(Math.sin(mob.walk*5));group.scale.set(1+(1-hop)*.12,.86+hop*.22,1+(1-hop)*.12);group.position.y+=hop*.2;}
 if(def.model==='wraith')group.position.y+=.13+Math.sin(time*2+mob.id)*.1;
 body.material.emissive.set(mob.flash>0?'#89463b':wind?'#492e1c':'#000000');
}
