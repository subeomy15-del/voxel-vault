import * as THREE from '../vendor/three.module.js';

export class ParkourView {
  constructor(renderer,parkour){this.r=renderer;this.parkour=parkour;this.root=new THREE.Group();renderer.scene.add(this.root);this.epoch=-1;this.rings=[];}
  reset(){
    this.root.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});this.root.clear();this.rings=[];
    const p=this.parkour;if(!p.active)return;
    for(const [i,cp]of p.course.checkpoints.entries()){
      const ring=new THREE.Mesh(new THREE.RingGeometry(1.38,1.55,32),new THREE.MeshBasicMaterial({color:'#a4ddcf',transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.set(cp.x,cp.y+.025,cp.z);this.root.add(ring);this.rings.push(ring);
      if(i>0)this.sign(`${String(i).padStart(2,'0')}  ${cp.name.toUpperCase()}`,cp.x,cp.y+2.7,cp.z-1.9,3.4);
    }
    this.sign('CLOUDSTEP CIRCUIT',.5,16,9.8,5);
    this.sign('SHIFT + SPACE  •  RUN & JUMP',.5,14.6,1,3.8);
    this.sign('JUMP PAD  •  KEEP FORWARD',31.5,20.8,-55.5,3.8);
    this.sign('FINISH',6.5,27,-81.8,3.2);
  }
  sign(text,x,y,z,width){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#182d39e8';ctx.beginPath();ctx.roundRect(0,0,768,96,18);ctx.fill();ctx.fillStyle='#e7f1e6';ctx.font='600 29px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,48);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(width,width/8,1);this.root.add(sprite);
  }
  update(dt){
    const p=this.parkour;if(this.epoch!==this.r.epoch){this.epoch=this.r.epoch;this.reset();}
    this.root.visible=p.active;if(!p.active)return;
    for(const [i,ring]of this.rings.entries()){
      ring.material.color.set(i<=p.checkpoint?'#9af0c2':'#c4dce5');
      ring.material.opacity=i===p.checkpoint&&p.pulse>.01?.65+Math.sin(p.pulse*15)*.2:i===p.checkpoint+1?.55:.25;
      ring.rotation.z+=dt*.15;
    }
  }
}
