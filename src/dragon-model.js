import * as THREE from '../vendor/three.module.js';
export function dragonModel(r){
 const g=new THREE.Group(),wings=[],tail=[];
 const part=(color,w,h,d,x,y,z,parent=g)=>{const mesh=r.part(color,w,h,d,x,y,z);mesh.material.emissive.set(color);mesh.material.emissiveIntensity=.28;parent.add(mesh);return mesh;};
 const body=part('#4d495c',1.8,1.45,3.5,0,1.3,0);part('#7c758d',1.25,.45,2.8,0,.65,.3);
 part('#393745',.95,.95,1.35,0,1.6,2);part('#33313f',1.2,.85,1.4,0,1.65,2.9);part('#777282',.9,.2,1.15,0,1.2,3.05);
 for(const s of [-1,1]){const eye=part('#c6a5ff',.06,.16,.35,s*.62,1.82,3.1);eye.material.emissive.set('#9362d6');eye.material.emissiveIntensity=1.5;const horn=part('#b0a9bd',.17,.8,.17,s*.43,2.35,2.5);horn.rotation.x=-.35;
  for(const z of [-1.2,1.1]){part('#302f3b',.42,.95,.55,s*.83,.48,z);part('#a7a1b0',.48,.17,.8,s*.83,.08,z+.2);}
  const wing=new THREE.Group();wing.position.set(s*.75,1.85,-.4);g.add(wing);wings.push(wing);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.9,s*2,.25,1.3,s*5,.1,-.8,0,0,.9,s*5,.1,-.8,s*2,-.1,-2,0,0,.9,s*2,-.1,-2,0,0,-1.2],3));geo.computeVertexNormals();wing.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#696079',side:THREE.DoubleSide,roughness:.95})));
  const rib=part('#302d3b',4.8,.17,.17,s*2.35,.18,.17,wing);rib.rotation.y=s*.34;part('#403a4c',.16,.16,3.2,s*2,.05,-.3,wing);
 }
 for(let i=0;i<5;i++){const p=new THREE.Group();p.position.set(0,1.2-i*.13,-1.6-i*.85);g.add(p);part('#383442',.75-i*.11,.7-i*.1,1.05,0,0,0,p);part('#aaa0b6',.16,.32,.25,0,.4-i*.05,0,p);tail.push(p);}
 g.userData={dragon:true,body,wings,tail};return g;
}
export function animateDragon(g,m,t){
 g.userData.wings.forEach((wing,i)=>wing.rotation.z=(i?1:-1)*(m.stage==='perch'?.3:Math.sin(t*4.5)*.45));
 g.userData.tail.forEach((p,i)=>p.rotation.y=Math.sin(t*2-i*.55)*.16);
 g.userData.body.material.emissive.set(m.flash>0?'#b27192':'#4d495c');
}
