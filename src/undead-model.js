import * as THREE from '../vendor/three.module.js';
export function undeadModel(r,m){
 const g=new THREE.Group(),part=(c,w,h,d,x,y,z)=>{const p=r.part(c,w,h,d,x,y,z);g.add(p);return p;};
 if(m.kind==='spider'){
  part('#484d3c',.75,.4,1.1,0,.43,0);part('#646b50',.48,.32,.4,0,.48,.65);
  for(const side of [-1,1])for(let i=0;i<4;i++){const leg=part('#383d30',.85,.1,.12,side*.65,.28,(i-1.5)*.3);leg.rotation.z=side*.3;leg.rotation.y=(i-1.5)*.2;}
  for(const x of [-.12,.12])part('#a58251',.07,.07,.025,x,.53,.86);return g;
 }
 const knight=m.kind==='draugr_knight',skeleton=m.kind==='skeleton',skin=skeleton?'#d3ccb6':m.kind==='husk'?'#a69676':'#7a8866',cloth=knight?'#5d6865':m.kind==='husk'?'#77664e':'#596d6c';
 part(skeleton?'#bdb59f':cloth,skeleton?.32:.62,.65,.32,0,.94,0);
 for(const x of [-.18,.18]){part(skeleton?skin:'#404b45',skeleton?.11:.23,.65,.25,x,.32,0);part(skeleton?skin:'#383e38',.25,.12,.35,x,.08,.05);}
 for(const x of [-.43,.43]){const arm=part(skin,skeleton?.11:.21,.65,.22,x,1.03,.12);if(!knight&&!skeleton)arm.rotation.x=-.8;}
 part(skin,.46,.46,.43,0,1.52,0);
 for(const x of [-.11,.11])part('#303830',.09,.07,.025,x,1.55,.224);
 part('#535845',.14,.035,.025,0,1.38,.224);
 if(skeleton){for(let y=.77;y<1.24;y+=.12)part(skin,.5,.055,.05,0,y,.19);part('#947550',.06,.75,.06,.49,1,.25);part('#c8b99c',.025,.72,.025,.55,1,.25);}
 if(knight){
  part('#7d8580',.55,.18,.5,0,1.8,0);part('#727c76',.55,.27,.08,0,1.62,-.2);
  for(const x of [-.45,.45])part('#7d8580',.32,.24,.38,x,1.3,0);
  part('#afa17d',.65,.07,.35,0,.78,0);part('#929b96',.08,.9,.045,.47,.85,.43);part('#b9a475',.34,.055,.08,.47,.55,.43);
  part('#3e4a43',.5,.72,.14,-.49,.98,.32);part('#a59778',.065,.66,.025,-.49,.98,.4);part('#a59778',.44,.055,.025,-.49,1.13,.4);
 }
 return g;
}
