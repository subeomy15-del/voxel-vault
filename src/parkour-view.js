import { PlayerModel } from './player-model.js?v=42';
import * as THREE from '../vendor/three.module.js';

export class ParkourView {
  constructor(renderer,parkour){this.r=renderer;this.parkour=parkour;this.root=new THREE.Group();renderer.scene.add(this.root);this.epoch=-1;this.rings=[];this.racers=[];}
  reset(){
    for(const racer of this.racers)this.r.disposeGroup(racer.model.group);this.racers=[];
    this.root.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});this.root.clear();this.rings=[];
    const p=this.parkour;if(!p.active||p.course.arena)return;
    for(const [i,cp]of p.course.checkpoints.entries()){
      const ring=new THREE.Mesh(new THREE.RingGeometry(1.38,1.55,32),new THREE.MeshBasicMaterial({color:'#a4ddcf',transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.set(cp.x,cp.y+.025,cp.z);this.root.add(ring);this.rings.push(ring);
      if(i>0)this.sign(`${String(i).padStart(2,'0')}  ${cp.name.toUpperCase()}`,cp.x,cp.y+2.7,cp.z-1.9,3.4);
    }
    this.sign(p.course.name.toUpperCase(),p.course.spawn.x,p.course.spawn.y+3,p.course.spawn.z+4,5);
    this.sign('SHIFT + SPACE  •  RUN & JUMP',.5,14.6,1,3.8);
    for(const pad of p.course.pads)this.sign('JUMP PAD  •  KEEP FORWARD',pad.x,pad.y+2.8,pad.z,3.8);
    this.sign('FINISH',p.course.finish.x,p.course.finish.y+3,p.course.finish.z-1,3.2);
    const points=p.course.platforms.map(([a,b,c,d,y])=>({x:(a+b)/2+.5,y,z:(c+d)/2+.5}));
    for(let i=0;i<3;i++)this.racers.push({model:new PlayerModel(this.r),points,pace:1.55+i*.3,lane:(i-1)*.6,color:['#a899f0','#ffaf78','#7de1c7'][i]});

  }
  sign(text,x,y,z,width){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#182d39e8';ctx.beginPath();ctx.roundRect(0,0,768,96,18);ctx.fill();ctx.fillStyle='#e7f1e6';ctx.font='600 29px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,48);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(width,width/8,1);this.root.add(sprite);
  }
  update(dt){
    const p=this.parkour;if(this.epoch!==this.r.epoch){this.epoch=this.r.epoch;this.reset();}
    this.root.visible=p.active;if(!p.active||p.course.arena)return;
    for(const racer of this.racers){
      const t=Math.max(0,p.timer.elapsed/racer.pace),index=Math.min(racer.points.length-2,Math.floor(t)),f=Math.min(1,t-index),a=racer.points[index],b=racer.points[index+1];
      const pos={x:a.x+(b.x-a.x)*f+racer.lane,y:a.y+(b.y-a.y)*f+Math.sin(f*Math.PI)*1.8,z:a.z+(b.z-a.z)*f};
      racer.model.update({pos,yaw:Math.atan2(-(b.x-a.x),-(b.z-a.z)),pitch:0,moving:true,grounded:f<.12||f>.88,walk:p.timer.elapsed*4,state:{armorParts:{}},held:''},p.active);
      racer.model.shirt.material.color.set(racer.color);
    }
    for(const [i,ring]of this.rings.entries()){
      ring.material.color.set(i<=p.checkpoint?'#9af0c2':'#c4dce5');
      ring.material.opacity=i===p.checkpoint&&p.pulse>.01?.65+Math.sin(p.pulse*15)*.2:i===p.checkpoint+1?.55:.25;
      ring.rotation.z+=dt*.15;
    }
  }
}
