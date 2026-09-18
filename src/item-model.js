import * as THREE from '../vendor/three.module.js';
import { ITEMS,BLOCKS,hash } from './data.js?v=31';
import { toolModel,bowModel,gliderModel } from './models.js?v=31';
// The same models supply catalogue renders and held equipment.
export function itemModel(r,name){
 const item=ITEMS[name]||{color:'#a6b4bc'},g=new THREE.Group(),color=item.color;
 const mat=(c,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:metal?.3:.68,metalness:metal});
 const add=(geometry,c,x=0,y=0,z=0,metal=0)=>{const mesh=new THREE.Mesh(geometry,mat(c,metal));mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const box=(c,w,h,d,x=0,y=0,z=0)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const sphere=(c,size,x=0,y=0,z=0)=>add(new THREE.SphereGeometry(size,14,10),c,x,y,z);
 const crystal=(c,size,x=0,y=0,z=0)=>add(new THREE.OctahedronGeometry(size),c,x,y,z,.25);
 if(name==='diamond'||name==='crystal'){const gem=add(new THREE.CylinderGeometry(.26,.46,.25,6),color,0,.2);add(new THREE.ConeGeometry(.46,.55,6),color,0,-.2).rotation.z=Math.PI;gem.material.metalness=.08;return g;}
 if(name==='coal'){const lump=add(new THREE.DodecahedronGeometry(.42,0),'#363e46');lump.scale.set(1.15,.8,.9);return g;}
 if(name==='firecracker'){box('#b64e4b',.22,.62,.22,0,-.04);box('#d5bc76',.27,.07,.27,0,.28);box('#d6b57b',.06,.32,.06,0,.62);const fuse=box('#d2c49d',.035,.24,.035,0,.48);fuse.rotation.z=.25;return g;}
 if(name==='moonstone'){const gem=crystal('#b4afd3',.43);gem.scale.set(.8,1.25,.8);return g;}
 if(name==='sacred_orb'){const orb=add(new THREE.IcosahedronGeometry(.39,1),color,0,0,0,.25);orb.material.emissive.set('#e4be70');orb.material.emissiveIntensity=.2;const halo=add(new THREE.TorusGeometry(.5,.025,6,24),'#fff0bb');halo.rotation.set(.7,.3,.2);return g;}
 if(name==='dragon_egg'){const egg=add(new THREE.SphereGeometry(.4,8,6),'#484052');egg.scale.y=1.2;box('#aa94c9',.1,.1,.025,.1,.16,.34);return g;}
 if(name==='torch'){box('#826d55',.13,.7,.13,0,-.14);box('#d9b77b',.23,.24,.23,0,.33);box('#f0dfb1',.12,.16,.12,0,.48);return g;}
 if(name==='wheat'){for(const x of [-.18,0,.18]){box('#a28e5c',.035,.85,.035,x,-.08);for(let i=0;i<4;i++)for(const side of [-1,1]){const grain=box('#c9b782',.1,.16,.08,x+side*.055,.05+i*.12);grain.rotation.z=side*.5;}}box('#8b795c',.55,.08,.1,0,-.18);return g;}
 if(['sword','pickaxe','axe','shovel','hoe'].includes(item.kind))return toolModel(r,item,name,false);
 if(item.kind==='bow')return bowModel(r,name,item);
 if(item.kind==='glider')return gliderModel(r,item);
 if(item.kind==='grapple'){
  box('#886749',.12,.72,.12,0,-.14);box('#384d5b',.18,.12,.18,0,.23);
  for(const side of [-1,1]){const hook=add(new THREE.TorusGeometry(.24,.035,6,16,Math.PI*1.4),'#d3dde4',side*.14,.36,0,.6);hook.rotation.z=side*Math.PI*.5;}
  add(new THREE.TorusGeometry(.15,.03,6,20),'#b8a484',0,-.42).rotation.x=Math.PI/2;return g;
 }
 if(item.kind==='armor'){
  if(item.slot==='helm'){box(color,.66,.25,.53,0,.19);for(const x of [-.28,.28])box(color,.12,.36,.5,x,-.03);box(color,.54,.35,.1,0,-.03,-.22);return g;}
  if(item.slot==='gauntlets'){for(const x of [-.24,.24]){box(color,.27,.38,.3,x,0);box('#49554d',.29,.12,.32,x,.23);}return g;}
  if(item.slot==='leggings'){box(color,.65,.16,.29,0,.3);for(const x of [-.18,.18])box(color,.27,.67,.28,x,-.08);return g;}
  if(item.slot==='boots'){for(const x of [-.24,.24]){box(color,.3,.4,.3,x,.1);box(color,.31,.17,.5,x,-.15,.1);}return g;}
  box(color,.63,.66,.29,0,.04);box(color,.26,.26,.35,-.43,.23);box(color,.26,.26,.35,.43,.23);
  box('#40546a',.44,.15,.33,0,.43);box('#c6a05c',.66,.09,.31,0,-.23);crystal('#e9d691',.1,0,.12,.18);
  for(const x of [-.19,.19])box('#ebf4f0',.025,.42,.015,x,.04,.155);return g;
 }
 if(item.kind==='orb'){const orb=add(new THREE.IcosahedronGeometry(.37,1),color,0,0,0,.1);orb.material.emissive.set(color);orb.material.emissiveIntensity=.08;return g;}
 if(name==='relic_shard'){const gem=crystal('#d8bb83',.4);gem.scale.set(.65,1.35,.65);return g;}
 if(name==='knight_heart'){for(const x of [-.13,.13]){const half=crystal('#9d5847',.28,x,.07);half.scale.set(1,1.3,.7);}add(new THREE.ConeGeometry(.3,.4,4),'#774538',0,-.25).rotation.z=Math.PI;box('#b7a17b',.07,.42,.04,0,0,.2);return g;}
 if(name.endsWith('_ingot')){const mesh=box(color,.77,.25,.4);mesh.rotation.y=.15;box('#eff4eb',.5,.025,.24,0,.14,0);return g;}
 if(item.kind==='ammo'){
  for(let i=0;i<3;i++){const shaft=box('#a38254',.026,.9,.026,(i-1)*.14,0,0);shaft.rotation.z=-.4;const tip=crystal(color,.12,(i-1)*.14+.17,.42);tip.scale.set(.6,1.5,.5);box('#e5dfc9',.1,.16,.02,(i-1)*.14-.15,-.35);}return g;
 }
 if(name==='potion'){const bottle=sphere('#c7dddf',.3,0,-.07);bottle.material.transparent=true;bottle.material.opacity=.55;sphere(color,.255,0,-.09);box('#bd9066',.17,.19,.17,0,.3);box('#efecdc',.14,.08,.015,0,-.1,.29);return g;}
 if(name==='apple'||name==='golden_apple'||name==='tomato'){
  for(const x of [-.11,.11]){const fruit=sphere(color,.29,x,-.04);fruit.scale.y=1.1;}box('#785839',.07,.27,.07,0,.32);const leaf=box('#4e9d62',.23,.035,.12,.13,.36);leaf.rotation.z=.35;return g;
 }
 if(name.includes('carrot')&&!BLOCKS[name]){const carrot=add(new THREE.ConeGeometry(.19,.85,9),color,0,-.02);carrot.rotation.z=Math.PI;for(const x of [-.13,0,.13]){const leaf=box('#62a674',.055,.34,.06,x,.51);leaf.rotation.z=-x*3;}return g;}
 if(item.kind==='seed'){box('#baa580',.54,.55,.24,0,-.08);box('#8f7854',.45,.09,.27,0,.23);box('#f1e8c9',.34,.3,.012,0,-.07,.13);for(let i=0;i<3;i++)sphere(color,.045,(i-1)*.09,-.07,.16);return g;}
 if(name==='cotton'||name==='cloth'||name==='cotton_cloth'){
  if(name==='cotton'){for(const[x,y]of[[-.2,0],[.18,.03],[0,.2]])sphere('#f2ecdb',.22,x,y);box('#729963',.05,.45,.05,0,-.24);}
  else{for(let i=0;i<3;i++)box(i%2?color:'#e3d5b1',.7,.085,.5,i*.025,i*.09-.1);for(let i=0;i<5;i++)box('#a9936e',.018,.02,.43,-.26+i*.13,.135);}return g;
 }
 if(name==='leather'||name==='rabbit_hide'){box(color,.65,.075,.55);for(const x of [-.32,.32])for(const z of [-.25,.25]){const corner=box(color,.17,.065,.18,x,0,z);corner.rotation.y=x*z*3;}return g;}
 if(name==='feather'){for(let i=0;i<8;i++){const vane=box(i%2?color:'#e9e4d2',.15,.09,.025,(i%2?1:-1)*.07,i*.07-.25);vane.rotation.z=i%2?-.5:.5;}box('#a08e6b',.028,.8,.028,0,-.03);return g;}
 if(item.kind==='food'){
  if(name.includes('berry')||name==='berries'){for(const[x,y,z]of [[-.18,0,0],[.15,.02,0],[0,.22,-.04],[0,-.14,.15]])sphere(color,.19,x,y,z);box('#6fa26b',.27,.04,.11,0,.4);}
  else if(name.includes('cookie')){add(new THREE.CylinderGeometry(.4,.4,.12,18),'#c69255');for(let i=0;i<8;i++){const a=i*2.4;box('#654536',.055,.025,.055,Math.sin(a)*(.1+i%3*.08),.075,Math.cos(a)*(.1+i%3*.08));}}
  else if(name.includes('bread')||name.includes('potato')){const loaf=sphere(color,.34);loaf.scale.set(1.5,.7,.8);for(let i=0;i<3;i++)box('#e9d39c',.04,.025,.3,(i-1)*.2,.22);}
  else if(name.startsWith('raw_')||name.startsWith('cooked_')){const steak=sphere(color,.37);steak.scale.set(1.25,.32,.85);const bone=sphere('#eadfc5',.13,0,.12,0);bone.scale.y=.25;}
  else{add(new THREE.CylinderGeometry(.44,.25,.25,14),'#8e6845',0,-.15);add(new THREE.CylinderGeometry(.395,.395,.04,14),color,0,.01);for(let i=0;i<7;i++){const a=i*2.4;box(i%3===0?'#e4ba69':i%3===1?'#73a467':color,.12,.07,.12,Math.cos(a)*.23,.07,Math.sin(a)*.23);}}
  return g;
 }
 if(BLOCKS[name]&&!BLOCKS[name].plant)return r.blockModel(name);
 if(BLOCKS[name]?.plant){
  box('#729757',.055,.8,.055,0,-.04);for(let i=0;i<6;i++){const leaf=box(i%2?'#8fb371':'#5b8b53',.28,.04,.12,(i%2?1:-1)*.13,i*.1-.3);leaf.rotation.z=i%2?.4:-.4;}for(let i=0;i<4;i++)sphere(color,.1,Math.cos(i*1.6)*.12,.4,Math.sin(i*1.6)*.12);return g;
 }
 if(name==='compass'){const face=add(new THREE.CylinderGeometry(.4,.4,.09,24),'#cdb47d',0,0,0,.35);face.rotation.x=Math.PI/2;const needle=add(new THREE.ConeGeometry(.055,.5,4),'#b75155',0,0,.08);needle.rotation.z=-.4;return g;}
 if(name==='fiber'){for(let i=0;i<7;i++){const strand=box(i%2?color:'#bbae80',.025,.65,.025,(i-3)*.055,0,0);strand.rotation.z=(hash(i,7)-.5)*.25;}return g;}
 // A calm, readable fallback for small materials and quest items. Keeping
 // this as one solid silhouette makes the catalogue feel like a game UI
 // instead of a pile of unrelated decorative shards.
 box(color,.62,.5,.42,0,-.03);
 box('#ffffff',.38,.045,.025,0,.12,.225);
 return g;
}
