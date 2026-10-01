import * as THREE from '../vendor/three.module.js';
import {coordinateHash} from './coordinate-hash.js?v=42';
// A small, fixed buffer of distant birds. World-anchored flight paths stay put
// when the camera turns or moves; these silhouettes have no collision or loot.
export class SkyLife {
 constructor(renderer){
  this.owner=renderer;this.positions=new Float32Array(18*18);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
  this.mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#343e40',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));
  this.mesh.frustumCulled=false;this.mesh.visible=false;renderer.scene.add(this.mesh);
 }
 update(game,conditions,weather,inCave){
  const {pos,state,world}=game,r=this.owner;
  this.mesh.visible=state.dimension==='overworld'&&!inCave&&conditions.daylight>.25&&weather.intensity<.15&&r.options.particles!=='off'&&!world.waterAt(pos.x,pos.y+1.6,pos.z);
  if(!this.mesh.visible)return;
  const cellX=Math.floor(pos.x/64),cellZ=Math.floor(pos.z/64),t=state.time;
  const reach=Math.max(32,r.options.renderDistance*16),count=r.options.quality==='low'?6:18;
  this.mesh.position.set(cellX*64,0,cellZ*64);let cursor=0;
  for(let i=0;i<count;i++){
   const cx=cellX+i%3-1,cz=cellZ+Math.floor(i/6)-1,seed=state.seed+i%6;
   const phase=coordinateHash(cx,cz,seed)*Math.PI*2+t*.045;
   const x=cx*64+32+Math.cos(phase)*(15+i%4*3),z=cz*64+32+Math.sin(phase)*18;
   const y=world.height(cx*64+32,cz*64+32)+22+i%3*2+Math.sin(phase*.7)*2;
   const distance=Math.hypot(x-pos.x,z-pos.z),size=Math.max(0,Math.min(1,(reach-distance)/18));
   const flap=Math.sin(t*5+i*1.7)*.24,dx=-Math.sin(phase),dz=Math.cos(phase),sx=dz,sz=-dx;
   const point=(forward,side,up)=>[x-cellX*64+(dx*forward+sx*side)*size,y+up*size,z-cellZ*64+(dz*forward+sz*side)*size];
   for(const side of [-1,1]){this.positions.set([...point(.32,0,0),...point(-.25,0,0),...point(-.08,side*.8,flap)],cursor);cursor+=9;}
  }
  this.mesh.geometry.setDrawRange(0,count*6);this.mesh.geometry.attributes.position.needsUpdate=true;
  this.mesh.material.opacity=.8*Math.min(1,(conditions.daylight-.25)*3)*(1-weather.intensity*3);
 }
}
