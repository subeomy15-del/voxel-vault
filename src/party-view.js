import * as THREE from '../vendor/three.module.js';
const palette=['#79f5cb','#b5a1ff','#ffbc73','#ff87ac','#81d7ff','#e9ec88'];
export class PartyView {
  constructor(arcade){
    this.a=arcade;this.r=arcade.round;this.root=new THREE.Group();arcade.root.add(this.root);this.dynamic=new Map();
    const id=this.r.mode.id;
    if(id==='block-soccer'){
      this.ball=this.mesh(new THREE.IcosahedronGeometry(.72,1),'#ffffff',false);this.ball.material.roughness=.5;
      const detail=new THREE.LineSegments(new THREE.EdgesGeometry(this.ball.geometry,12),new THREE.LineBasicMaterial({color:'#314664'}));this.ball.add(detail);
      for(const z of [-14,14]){const color=z<0?'#b5a1ff':'#79f5cb';for(const x of [-4.5,4.5])this.box(.2,3,.25,x,14.5,z,color);this.box(9.2,.2,.25,0,16,z,color);this.box(8.8,2.8,.06,0,14.4,z+(z<0?-.3:.3),color,.16);this.sign(z<0?'SCORE HERE':'YOUR GOAL',0,17,z,color);}
      const line=this.box(28,.035,.09,0,13.035,0,'#ffffff');line.material.opacity=.8;
      this.ring(3,0,0,'#ffffff');
    }
    if(id==='coin-heist')for(const bank of this.r.banks){this.ring(1.8,bank.x,bank.z,palette[bank.id]);const chest=this.box(1,.65,.8,bank.x,13.33,bank.z,palette[bank.id]);chest.material.metalness=.45;this.sign(bank.id===0?'YOUR VAULT':this.r.players[bank.id].name,bank.x,15.7,bank.z,palette[bank.id]);}
    if(id==='bomb-tag'){this.bomb=this.mesh(new THREE.SphereGeometry(.42,12,8),'#ff603e',true);this.fuse=this.box(.07,.4,.07,0,.55,0,'#ffe68a');this.bomb.add(this.fuse);this.fuse.position.set(0,.5,0);}
    if(id==='laser-jump'){this.beams=[this.box(28,.2,.22,0,13.5,0,'#ff547f'),this.box(28,.2,.22,0,13.5,0,'#a68bff')];this.box(.6,1.3,.6,0,13.65,0,'#ffe899');for(let i=0;i<3;i++)this.ring(4+i*4,0,0,'#ac9fe8',.12);}
    if(id==='redlight-rush'){
      this.signal=this.box(2,2,.5,0,17,-14,'#6dff9f');this.box(.3,4,.3,0,14.7,-14,'#27465c');this.sign('FINISH · CROSS TO SCORE',0,19,-13,'#a0ffdb');
      this.box(28,.04,1,0,13.04,-11.5,'#8ef2c1');this.box(28,.04,.3,0,13.04,11,'#ffffff');
      for(let x=-13;x<14;x+=4.4)this.box(.06,.025,25,x,13.025,0,'#ffffff',.4);
    }
  }
  mesh(geometry,color,glow=false){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,emissive:glow?color:'#000000',emissiveIntensity:glow?.65:0,roughness:.6}));m.castShadow=true;this.root.add(m);return m;}
  box(w,h,d,x,y,z,color,opacity=1){const m=this.mesh(new THREE.BoxGeometry(w,h,d),color,true);m.position.set(x,y,z);if(opacity<1){m.material.transparent=true;m.material.opacity=opacity;m.material.depthWrite=false;}return m;}
  ring(radius,x,z,color,opacity=.8){const m=new THREE.Mesh(new THREE.RingGeometry(radius-.08,radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,13.04,z);this.root.add(m);return m;}
  sign(text,x,y,z,color){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const c=canvas.getContext('2d');c.fillStyle='#142a42ee';c.fillRect(0,0,512,80);c.fillStyle=color;c.font='bold 27px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,40);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false}));s.position.set(x,y,z);s.scale.set(4.8,.75,1);this.root.add(s);}
  sync(items,prefix,create,update){
    const ids=new Set(items.map(item=>prefix+item.id));
    for(const[k,m]of this.dynamic)if(k.startsWith(prefix)&&!ids.has(k)){this.a.r.disposeGroup(m);this.dynamic.delete(k);}
    for(const item of items){const key=prefix+item.id;let m=this.dynamic.get(key);if(!m){m=create(item);this.dynamic.set(key,m);}update(m,item);}
  }
  update(dt){
    const r=this.r,t=r.elapsed;
    if(this.ball){this.ball.position.set(r.ball.x,13.73,r.ball.z);this.ball.rotation.x+=r.ball.vz*dt;this.ball.rotation.z-=r.ball.vx*dt;}
    if(this.bomb){const p=r.players[r.holder];this.bomb.visible=p.alive;this.bomb.position.set(p.x,p.y+2.35,p.z);this.bomb.scale.setScalar(1+Math.sin(t*(r.fuse<3?22:8))*.12);this.bomb.material.emissiveIntensity=r.fuse<3?1.5:.5;}
    if(this.signal)this.signal.material.color.set(r.light==='GREEN'?'#5bff9c':r.light==='AMBER'?'#ffc966':'#ff4b61');
    if(this.beams){this.beams[0].rotation.y=-r.laser;this.beams[1].rotation.y=-r.laser-Math.PI/2;this.beams[1].visible=t>30;}
    this.sync(r.projectiles,'rocket-',()=>this.mesh(new THREE.ConeGeometry(.2,.9,6),'#ffb29b',true),(m,s)=>{m.position.set(s.x,14,s.z);m.rotation.set(Math.PI/2,0,-Math.atan2(s.dx,s.dz));});
    this.sync(r.warnings,'warning-',w=>{const group=new THREE.Group();this.root.add(group);const ring=this.ring(w.radius,w.x,w.z,'#ff753e',.8);group.add(ring);const meteor=this.mesh(new THREE.IcosahedronGeometry(.8,0),'#ff9d51',true);group.add(meteor);return group;},(g,w)=>{g.children[0].material.opacity=.45+Math.sin(t*15)*.35;g.children[1].position.set(w.x,14+Math.max(0,w.at-t)*12,w.z);g.children[1].rotation.x=t*2;});
    this.sync(r.blasts,'blast-',()=>this.mesh(new THREE.IcosahedronGeometry(1,1),'#ffb163',true),(m,b)=>{const f=Math.max(0,(b.until-t)/.55);m.position.set(b.x,13.8,b.z);m.scale.setScalar(b.radius*(1-f*.5));m.material.transparent=true;m.material.opacity=f*.6;m.material.depthWrite=false;});
    this.sync(r.loot.filter(c=>c.ready<=t),'loot-',()=>this.mesh(new THREE.OctahedronGeometry(.3,0),r.mode.id==='coin-heist'?'#ffdc75':'#fff1ab',true),(m,c)=>{m.position.set(c.x,13.8+Math.sin(t*3+c.id)*.15,c.z);m.rotation.y=t;});
    this.sync([...r.cracks.entries()].map(([id,v])=>({id,...v})),'crack-',()=>this.box(.94,.035,.94,0,13.04,0,'#ff633e',.8),(m,c)=>{m.position.set(c.x+.5,13.04,c.z+.5);m.material.opacity=.35+Math.sin((c.at-t)*30)*.3;});
  }
}
