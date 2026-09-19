import * as THREE from '../vendor/three.module.js';
import {POTIONS} from './potion-content.js?v=32';
/** Chunky silhouettes and large embossed emblems survive hotbar downsampling. */
export function potionModel(name){
 const p=POTIONS[name]||{shape:0,color:name==='empty_flask'?'#bed1cd':name==='water_flask'?'#68adc6':'#d98baa',symbol:name==='potion'?'cross':'bubbles'},g=new THREE.Group();
 const materials=new Map(),mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.36,metalness:.06}));return materials.get(color);};
 const add=(geo,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);g.add(m);return m;};
 const box=(color,w,h,d,x=0,y=0,z=0)=>add(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const width=p.variant==='strong'?.69:.62,height=p.variant==='extended'?.76:.64;
 if(p.shape===0)box(p.color,width,height,.46,0,-.08);
 else if(p.shape===1){const m=add(new THREE.CylinderGeometry(width*.42,width*.58,height,6),p.color,0,-.08);m.rotation.y=Math.PI/6;}
 else if(p.shape===2){const m=add(new THREE.SphereGeometry(.36,8,6),p.color,0,-.08);m.scale.set(1,height/.64,.76);}
 else {const m=add(new THREE.CylinderGeometry(.22,.39,height,4),p.color,0,-.08);m.rotation.y=Math.PI/4;}
 box('#b8d2cb',.24,.2,.24,0,height/2-.04);box('#98764e',.28,.12,.28,0,height/2+.1);
 const trim=p.variant==='strong'?'#dec078':p.variant==='extended'?'#bcc5e2':'#e1d6b5';
 box(trim,width*.94,.075,.49,0,-height/2-.045);box('#eff0db',.035,height*.55,.018,-width*.29,-.07,.262);
 const z=.29,c='#f9f1cf',ink='#4f5153';box(ink,.29,.3,.025,.035,-.06,z);
 const stroke=(x1,y1,x2,y2,w=.045)=>{const m=box(c,w,Math.hypot(x2-x1,y2-y1),.03,(x1+x2)/2+.035,(y1+y2)/2-.06,z+.026);m.rotation.z=-Math.atan2(x2-x1,y2-y1);};
 if(p.symbol==='cross'){stroke(-.09,0,.09,0);stroke(0,-.11,0,.11);}
 if(p.symbol==='chevron'){stroke(-.09,-.045,0,.075);stroke(0,.075,.09,-.045);}
 if(p.symbol==='blade'){stroke(0,-.11,0,.11);stroke(-.075,-.035,.075,-.035);}
 if(p.symbol==='pick'){stroke(0,-.12,0,.09);stroke(-.105,.08,.105,.08);}
 if(p.symbol==='shield'){stroke(-.08,.1,-.08,-.03);stroke(.08,.1,.08,-.03);stroke(-.08,.1,.08,.1);stroke(-.08,-.03,0,-.11);stroke(0,-.11,.08,-.03);}
 if(p.symbol==='eye'){const ring=add(new THREE.TorusGeometry(.09,.021,4,12),c,.035,-.06,z+.025);ring.scale.y=.6;box(c,.04,.04,.03,.035,-.06,z+.03);}
 if(p.symbol==='flame'||p.symbol==='star'){stroke(-.08,-.07,0,.1);stroke(0,.1,.08,-.07);stroke(-.08,-.07,.08,-.07);if(p.symbol==='star')stroke(-.1,.04,.1,.04);}
 if(p.symbol==='bubbles')for(const[x,y,r]of [[-.06,-.06,.04],[.05,.04,.055]])add(new THREE.TorusGeometry(r,.018,4,10),c,x+.035,y-.06,z+.025);
 if(p.variant!=='normal'&&p.variant)for(let i=0;i<(p.variant==='strong'?2:3);i++)box(trim,.065,.035,.03,(i-(p.variant==='strong'?.5:1))*.09,-height/2+.05,.28);
 return g;
}
