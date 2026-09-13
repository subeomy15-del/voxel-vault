import * as THREE from '../vendor/three.module.js';
import { ANIMALS } from './wildlife.js?v=27';
const sailTextures=new Map();
function sailTexture(color){
  if(sailTextures.has(color))return sailTextures.get(color);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
  c.fillStyle=color;c.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=4){c.fillStyle='#fff7df0d';c.fillRect(i,0,1,128);c.fillStyle='#273c3510';c.fillRect(0,i,128,1);}
  c.fillStyle='#f3ebcc9e';c.fillRect(0,22,128,15);c.fillStyle='#314c3c50';c.fillRect(0,20,128,2);c.fillRect(0,37,128,2);
  for(let x=1;x<128;x+=4){c.fillStyle='#fbf1dca0';c.fillRect(x,18,2,1);c.fillRect(x,40,2,1);}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;sailTextures.set(color,tex);return tex;
}

// Small articulated voxel models, with shared animation anchors across species.
export function animalModel(r,mob){
  const g=new THREE.Group(),info=ANIMALS[mob.kind],c=info.color,dark='#665b4b',cream=info.glow;
  const add=(color,w,h,d,x,y,z,parent=g)=>{const p=r.part(color,w,h,d,x,y,z);parent.add(p);return p;};
  const head=new THREE.Group();g.add(head);g.userData.head=head;g.userData.legs=[];
  const leg=(x,y,z,length,width=.14)=>{const pivot=new THREE.Group();pivot.position.set(x,y,z);add(dark,width,length,width,0,-length/2,0,pivot);add('#48483d',width+.015,.1,width+.02,0,-length+.05,.01,pivot);g.add(pivot);g.userData.legs.push(pivot);};
  const eyes=(x,y,z)=>{for(const side of [-1,1]){add('#f2e5c9',.055,.09,.075,x*side,y,z,head);add('#29372f',.061,.057,.038,x*side,y,z+.031,head);}};
  if(mob.kind==='chicken'){
    add(c,.38,.34,.46,0,.31,0);head.position.set(0,.48,.18);add(c,.25,.25,.24,0,0,0,head);add('#cbb05e',.16,.08,.17,0,-.02,.17,head);add('#bc7460',.07,.1,.13,0,.17,0,head);add('#bc7460',.075,.1,.05,0,-.15,.13,head);eyes(.125,.035,.09);
    for(const x of [-.24,.24])add(cream,.1,.27,.34,x,.33,-.035);add(cream,.21,.23,.1,0,.48,-.26);for(const x of [-.1,.1])leg(x,.18,0,.17,.045);
  }else if(mob.kind==='rabbit'){
    add(c,.4,.31,.48,0,.26,-.06);head.position.set(0,.38,.21);add(c,.28,.25,.26,0,0,0,head);add(cream,.2,.1,.06,0,-.07,.15,head);add('#a87c70',.05,.04,.03,0,-.04,.19,head);eyes(.14,.03,.09);
    for(const x of [-.09,.09]){add(c,.085,.34,.1,x,.27,-.025,head);add('#cfb29b',.043,.24,.015,x,.29,.034,head);}add(cream,.16,.16,.14,0,.32,-.34);for(const x of [-.13,.13]){leg(x,.17,.13,.13,.075);leg(x,.17,-.21,.14,.12);}
  }else{
    const deer=mob.kind==='deer',pig=mob.kind==='pig',cow=mob.kind==='cow',sheep=mob.kind==='sheep';
    const bodyY=deer?.88:pig?.54:cow?.87:.7,bodyH=pig?.5:cow?.66:.59,bodyD=cow?1.16:deer?1.03:.94,bodyW=cow?.82:pig?.72:.68,legH=bodyY-bodyH/2+.05;
    add(c,bodyW,bodyH,bodyD,0,bodyY,0);
    for(const[x,z]of [[-.25,.33],[.25,-.33],[.25,.33],[-.25,-.33]])leg(x,legH,z,legH,cow?.17:.13);
    head.position.set(0,deer?1.24:pig?.67:cow?1.02:.91,bodyD/2+.08);add(sheep?dark:c,deer?.32:.42,deer?.4:.36,.39,0,0,0,head);
    add(pig?'#ba887f':cream,pig?.32:.29,pig?.19:.16,.12,0,-.08,.25,head);eyes(deer?.165:.215,.04,.14);
    for(const side of [-1,1]){const ear=add(c,.16,deer?.25:.12,.11,side*.25,.2,0,head);ear.rotation.z=side*(deer?-.35:.35);if(deer&&mob.id%3!==0){add('#c6b18a',.065,.37,.06,side*.13,.43,-.09,head);add('#c6b18a',.21,.06,.06,side*.18,.48,-.09,head);add('#c6b18a',.06,.17,.06,side*.27,.55,-.09,head);}if(cow)add('#dcd3b7',.1,.2,.1,side*.2,.27,-.06,head);}
    if(pig){for(const x of [-.08,.08])add('#815e58',.055,.055,.012,x,-.07,.318,head);add('#c89c8d',.08,.12,.14,0,.65,-.52);}
    if(cow){for(const[x,y,z,w,h,d]of [[-.42,.91,-.22,.015,.32,.36],[.42,.8,.27,.015,.37,.29],[.13,1.207,-.2,.31,.015,.39]])add('#665e4e',w,h,d,x,y,z);add('#ceb1a0',.27,.19,.29,0,.48,-.2);add(dark,.06,.48,.07,.25,.66,-.61);}
    if(sheep){for(const x of [-.36,.36])add(cream,.12,.45,.77,x,.72,-.03);add(cream,.55,.09,.84,0,1.03,0);add(cream,.24,.25,.1,0,.74,-.51);}
    if(deer){add(cream,.43,.15,.74,0,.6,-.03);add(cream,.21,.2,.09,0,.88,-.55);}
  }
  g.userData.animal=true;g.userData.body=g.children.find(c=>c.isMesh);return g;
}
export function rod(r,color,a,b,width=.025){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from),mesh=r.part(color,width,v.length(),width);mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return mesh;
}
export function arrowModel(r,color='#c6c7b2'){
  const g=new THREE.Group();g.add(r.part('#a88b5d',.025,.025,.54),r.part(color,.065,.055,.12,0,0,.3));
  for(const angle of [0,Math.PI/2]){const feather=r.part('#e5ddc0',.13,.012,.13,0,0,-.2);feather.rotation.z=angle;g.add(feather);}return g;
}
export function bowModel(r,name,item){
  const g=new THREE.Group(),cross=name.includes('crossbow'),string=new THREE.Group(),arrow=arrowModel(r,item.color);
  g.userData.string=string;g.userData.arrow=arrow;g.userData.crossbow=cross;
  if(cross){g.add(r.part('#725e43',.14,.14,.67,0,0,0),r.part(item.color,.12,.09,.44,0,.105,-.09),r.part('#725e43',.1,.27,.13,0,-.17,.18));
    for(const side of [-1,1]){g.add(rod(r,item.color,[0,0,-.3],[side*.39,.02,-.2],.065),rod(r,item.color,[side*.39,.02,-.2],[side*.46,0,-.05],.05));string.add(rod(r,'#e5dfc2',[side*.46,0,-.05],[0,.035,.14],.012));}arrow.position.set(0,.12,-.13);arrow.rotation.y=Math.PI;
  }else{
    g.add(r.part('#70583c',.1,.23,.1,.06,0,0));for(const side of [-1,1]){g.add(rod(r,item.color,[.06,side*.1,0],[.14,side*.34,0],.065),rod(r,item.color,[.14,side*.34,0],[0,side*.49,0],.055));string.add(rod(r,'#e5dfc2',[0,side*.49,0],[-.09,0,0],.012));}arrow.rotation.y=-Math.PI/2;arrow.position.set(-.03,0,0);arrow.scale.setScalar(.7);
  }
  g.add(string,arrow);g.rotation.set(.1,cross?-.12:.25,cross?0:-.2);return g;
}
export function gliderModel(r,item){
  const g=new THREE.Group(),points=[0,.7,-2.2,-2.8,.55,-.05,0,.42,-.6, 0,.7,-2.2,0,.42,-.6,2.8,.55,-.05];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([.5,1,0,0,.5,.25,.5,1,.5,.25,1,0],2));geo.computeVertexNormals();
  const sail=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:sailTexture(item.color),emissive:item.color,emissiveIntensity:.12,side:THREE.DoubleSide}));g.add(sail);
  for(const a of [[-2.8,.55,-.05],[2.8,.55,-.05],[0,.42,-.6]])g.add(rod(r,item.ore?item.color:'#8e7857',[0,.7,-2.2],a,.035));
  for(const side of [-1,1]){g.add(rod(r,'#59615a',[side*.7,.58,-1.4],[side*.42,-.36,-.95],.027),rod(r,'#eee6c8',[side*1.6,.63,-.98],[side*.42,-.36,-.95],.008));}
  g.add(rod(r,'#796447',[-.42,-.36,-.95],[.42,-.36,-.95],.05));return g;
}

export function toolModel(r,item,name,includeHand=true){
  const g=new THREE.Group(),metal=!name.startsWith('wood_'),material=new THREE.MeshStandardMaterial({color:item.color,roughness:metal?.38:.8,metalness:metal?.45:0});
  const flat=(points,depth=.07)=>{const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.009,bevelThickness:.008}),material);mesh.position.z=-depth/2;g.add(mesh);return mesh;};
  const add=(color,w,h,d,x,y,z)=>g.add(r.part(color,w,h,d,x,y,z));
  if(item.model==='hammer'){add('#786048',.085,.88,.085,0,-.03,0);add(item.color,.56,.3,.25,0,.38,0);add('#d9e3e6',.065,.33,.28,-.27,.38,0);add('#d9e3e6',.065,.33,.28,.27,.38,0);}
  else if(item.kind==='sword'){
    flat([[-.075,.04],[.075,.04],[.06,.69],[0,.82],[-.06,.69]],.055);
    flat([[-.2,.01],[-.18,.065],[.18,.065],[.2,.01],[.13,-.015],[-.13,-.015]],.11);
    add('#7e6344',.095,.28,.095,0,-.16,0);add(item.color,.13,.065,.12,0,-.32,0);
    add('#e7e5cc',.018,.57,.006,-.035,.34,.033);
  }else{
    add('#957348',.075,.67,.085,0,-.02,0);add('#c8a67a',.025,.52,.009,-.018,.01,.048);
    const points={
      pickaxe:[[-.4,.28],[-.34,.42],[-.17,.5],[.09,.49],[.29,.4],[.35,.21],[.25,.32],[.06,.38],[-.15,.39],[-.31,.34]],
      axe:[[-.06,.27],[-.02,.51],[.15,.55],[.3,.48],[.35,.3],[.28,.15],[.09,.14],[.1,.26]],
      shovel:[[-.06,.23],[-.16,.35],[-.15,.54],[.15,.54],[.16,.35],[.06,.23],[0,.2]],
      hoe:[[-.29,.26],[-.3,.45],[.21,.45],[.24,.36],[-.2,.36],[-.21,.2]],
    };flat(points[item.kind]);add('#7d7356',.11,.11,.1,0,.4,0);add('#e2d39f',.045,.04,.009,0,.4,.056);
  }
  for(let i=0;i<4;i++)add('#5f5540',.102,.018,.107,0,-.12-i*.045,0);
  // A blocky grip and sleeve anchor the tool in the player's hand.
  if(includeHand){add('#c6a581',.15,.17,.15,.02,-.24,.005);add('#426b88',.17,.2,.18,.03,-.42,.02);}
  return g;
}
