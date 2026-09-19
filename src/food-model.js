import * as THREE from '../vendor/three.module.js';
// Large forms carry the identity; small details are reserved for material cues.
export function foodModel(name,item){
 const g=new THREE.Group(),materials=new Map(),mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.72}));return materials.get(color);};
 const mesh=(geometry,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);g.add(m);return m;};
 const box=(c,w,h,d,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const oval=(c,w,h,d,x=0,y=0,z=0)=>{const m=mesh(new THREE.SphereGeometry(1,10,8),c,x,y,z);m.scale.set(w,h,d);return m;};
 const cooked=name.startsWith('cooked_'),kind=name.split('_')[1],c=cooked?'#ab7548':item.color,bone='#eed9b5';
 if(name.startsWith('raw_')||cooked){
  if(kind==='venison'){const m=box(c,.85,.2,.36);m.rotation.y=-.2;for(const x of [-.25,0,.25])box(cooked?'#63432f':'#e3b6a0',.045,.025,.3,x,.115);}
  if(kind==='pork'){oval(c,.4,.12,.36);oval(bone,.14,.025,.16,.13,.125,-.05);oval(c,.075,.03,.07,.13,.15,-.05);}
  if(kind==='beef'){box(c,.68,.19,.48);box(cooked?'#d5a16e':'#e9c5a7',.7,.06,.08,0,.08,-.21);for(const x of [-.18,0,.18])box(cooked?'#65452f':'#d9ad99',.025,.015,.35,x,.105);}
  if(kind==='mutton'){oval(c,.27,.17,.31,-.08,.015,-.09);box(bone,.15,.12,.48,.09,0,.26);oval(bone,.13,.09,.07,.04,0,.5);oval(bone,.1,.09,.07,.19,0,.5);}
  if(kind==='chicken'){oval(c,.29,.21,.37,0,.02,-.06);for(const x of [-.25,.25]){oval(c,.1,.1,.23,x,-.04,.25);box(bone,.085,.07,.14,x,-.035,.46);}}
  if(kind==='rabbit'){oval(c,.2,.14,.36);for(const x of [-.17,.17]){const leg=oval(c,.1,.11,.24,x,-.01,.24);leg.rotation.y=x>0?-.35:.35;}box(bone,.055,.055,.25,0,0,-.36);}
  if(cooked)for(const x of [-.1,.1]){const top={venison:.11,pork:.13,beef:.105,mutton:.17,chicken:.23,rabbit:.145}[kind];const mark=box('#654630',.025,.012,.16,x,top,-.07);mark.rotation.y=.4;}
  return g;
 }
 const crop=name.replace(/_(sprout|crop|seeds)$/,'');
 const sprout=name.endsWith('_sprout'),seed=item.kind==='seed';
 const hues={wheat:'#d6ba70',carrot:'#d99553',cotton:'#eee9cc',watermelon:'#719b58',melon:'#dfc577',potato:'#b49663',tomato:'#c77361',corn:'#dec367',berries:'#8c7dab',berry:'#8c7dab'};
 const type=name==='seeds'?'wheat':crop,color=hues[type]||item.color;
 if(seed){
  box('#b6a078',.56,.58,.28,0,-.04);box(color,.59,.09,.3,0,.1);box('#e6dcb8',.37,.37,.025,0,-.06,.158);box('#836b4a',.47,.075,.3,0,.27);
  if(type==='wheat'||type==='corn'){box(color,.055,.26,.03,0,-.07,.19);for(const y of [-.14,-.05,.04])for(const x of [-.05,.05])oval(color,.045,.035,.025,x,y,.195);}
  else if(type==='carrot'){const m=mesh(new THREE.ConeGeometry(.1,.28,5),color,0,-.06,.2);m.rotation.z=Math.PI;}
  else if(type==='cotton'){for(const[x,y]of [[-.07,-.05],[.06,-.04],[0,.04]])oval(color,.065,.065,.035,x,y,.2);}
  else if(type==='berry'||type==='berries'){for(const[x,y]of [[-.065,-.04],[.065,-.04],[0,.055]])oval(color,.055,.055,.035,x,y,.2);}
  else {oval(color,type==='watermelon'?.13:.105,.115,.035,0,-.04,.2);if(type==='watermelon')box('#df9d88',.18,.07,.025,0,-.03,.245);}
  box('#648451',.12,.035,.02,.035,.11,.21);return g;
 }
 if(/_(sprout|crop)$/.test(name)){
  box('#6d9258',.055,sprout?.32:.65,.055,0,sprout?-.03:.05);box('#826849',sprout?.24:.3,.09,.24,0,sprout?-.23:-.31);
  const leafWidth={wheat:.15,carrot:.2,cotton:.27,watermelon:.32,melon:.3,potato:.25,tomato:.23,corn:.34,berries:.19}[type]||.24;
  const leaves=sprout?2:6;for(let i=0;i<leaves;i++){const side=i%2?1:-1,y=sprout?.06:i*.07-.17,m=box(i%2?'#86a96a':'#547f4c',sprout?leafWidth:.3,.035,type==='corn'?.075:.12,side*.11,y,0);m.rotation.z=side*(type==='wheat'?.9:.5);}
  if(sprout){const seed=oval(color,.07,.06,.055,0,-.17,.11);seed.rotation.z=type.length*.13;}
  if(!sprout){
   if(type==='wheat'||type==='corn'){for(const x of [-.14,0,.14]){box('#85965a',.025,.55,.025,x,.03);for(let j=0;j<3;j++)oval(color,.07,.07,.055,x,.2+j*.09,0);}}
   else if(type==='carrot')for(const x of [-.12,.12]){const m=mesh(new THREE.ConeGeometry(.095,.28,5),color,x,-.12,.14);m.rotation.z=Math.PI;}
   else for(const[x,y,z]of [[-.16,.12,.06],[.13,.2,.04],[0,.36,0]])oval(color,type==='watermelon'||type==='melon'?.2:.105,.11,.1,x,y,z);
  }
  return g;
 }
 return null;
}
