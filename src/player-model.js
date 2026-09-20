import * as THREE from '../vendor/three.module.js';
import { itemModel } from './item-model.js?v=34';
import { ITEMS } from './data.js?v=34';
import { toolModel,bowModel } from './models.js?v=34';
export class PlayerModel {
  constructor(r){
    this.r=r;this.group=new THREE.Group();this.limbs=[];this.held='';
    const part=(parent,c,w,h,d,x,y,z)=>{const p=r.part(c,w,h,d,x,y,z);parent.add(p);return p;};
    this.shirt=part(this.group,'#397dba',.57,.62,.3,0,1.03,0);
    part(this.group,'#275b91',.14,.57,.012,0,1.03,-.157);
    part(this.group,'#263444',.58,.09,.32,0,.73,0);
    part(this.group,'#d7b467',.09,.055,.015,0,.73,-.17);
    this.head=new THREE.Group();this.head.position.y=1.56;this.group.add(this.head);
    part(this.head,'#d9ae8c',.43,.43,.41,0,0,0);
    part(this.head,'#47352f',.45,.13,.43,0,.19,0);
    part(this.head,'#47352f',.45,.34,.09,0,.02,.17);
    part(this.head,'#654939',.12,.13,.025,-.16,.09,-.215);
    for(const x of [-.095,.095]){part(this.head,'#faf5ed',.085,.055,.015,x,.012,-.212);part(this.head,'#304f66',.036,.055,.018,x,.012,-.222);}
    part(this.head,'#a96e5c',.09,.025,.02,0,-.12,-.215);
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.15,.71,0);this.group.add(leg);
      part(leg,'#34475f',.245,.57,.28,0,-.28,0);part(leg,'#252e3d',.25,.13,.35,0,-.635,-.025);this.limbs.push(leg);
      const arm=new THREE.Group();arm.position.set(side*.4,1.3,0);this.group.add(arm);
      part(arm,'#397dba',.22,.24,.29,0,-.1,0);part(arm,'#d9ae8c',.21,.36,.25,0,-.39,0);this.limbs.push(arm);
      if(side===1){this.grip=new THREE.Group();this.grip.position.set(0,-.56,-.09);this.grip.scale.setScalar(.5);arm.add(this.grip);this.arm=arm;}
    }
    this.armorVisuals={helm:[],chestplate:[],gauntlets:[],leggings:[],boots:[]};
    const armor=(slot,parent,w,h,d,x,y,z)=>this.armorVisuals[slot].push(part(parent,'#a7b3aa',w,h,d,x,y,z));
    armor('helm',this.head,.49,.14,.46,0,.24,0);for(const x of [-.225,.225])armor('helm',this.head,.06,.3,.45,x,.035,0);
    armor('chestplate',this.group,.6,.55,.35,0,1.04,0);
    this.limbs.forEach((limb,i)=>{if(i%2===0){armor('leggings',limb,.26,.53,.3,0,-.26,0);armor('boots',limb,.275,.2,.38,0,-.59,-.025);}else armor('gauntlets',limb,.235,.2,.28,0,-.49,0);});
    r.scene.add(this.group);
  }
  update(g,visible){
    this.group.visible=visible;if(!visible)return;
    this.group.position.set(g.pos.x,g.pos.y,g.pos.z);this.group.rotation.y=g.yaw;
    this.head.rotation.x=g.pitch;this.group.scale.y=g.crouching?.8:1;
    const swing=g.moving&&g.grounded?Math.sin(g.walk*10)*.55:0;
    this.limbs.forEach((limb,i)=>limb.rotation.x=swing*(i<2?1:-1)*(i%2?-1:1));
    this.arm.rotation.x-=this.r.swing*.9;
    this.shirt.material.color.set(ITEMS[g.state.armor]?.color||'#397dba');
    for(const [slot,meshes]of Object.entries(this.armorVisuals)){const item=ITEMS[g.state.armorParts?.[slot]];for(const mesh of meshes){mesh.visible=!!item;mesh.material.color.set(item?.color||'#a7b3aa');}}
    if(this.held!==g.held){
      for(const child of [...this.grip.children])this.r.disposeGroup(child);this.grip.clear();this.held=g.held;
      const item=ITEMS[g.held];
      if(['sword','pickaxe','axe','shovel','hoe'].includes(item?.kind)){const tool=toolModel(this.r,item,g.held);tool.rotation.x=-.5;this.grip.add(tool);}
      else if(item?.kind==='grapple'||item?.kind==='food')this.grip.add(itemModel(this.r,g.held));
      else if(item?.kind==='bow')this.grip.add(bowModel(this.r,g.held,item));
      else if(item?.kind==='orb')this.grip.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.27,1),new THREE.MeshStandardMaterial({color:item.color,emissive:item.color,emissiveIntensity:.5})));
      else if(item?.place){const block=this.r.blockModel(g.held);block.scale.setScalar(.55);this.grip.add(block);}
    }
  }
}
