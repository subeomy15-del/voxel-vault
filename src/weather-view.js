import * as THREE from '../vendor/three.module.js';
import {coordinateHash} from './coordinate-hash.js?v=39';
export class WeatherView{
 constructor(renderer){
  this.owner=renderer;this.positions=new Float32Array(256*6);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
  this.mesh=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#bed5df',transparent:true,opacity:.24,depthWrite:false}));this.mesh.frustumCulled=false;this.mesh.visible=false;renderer.scene.add(this.mesh);this.roofTimer=0;
 }
 update(game,dt,weather){
  this.roofTimer-=dt;if(this.roofTimer<=0){this.roofTimer=.4;this.covered=false;const x=Math.floor(game.pos.x),z=Math.floor(game.pos.z),y=Math.floor(game.pos.y+1.8);for(let h=y;h<=Math.min(95,y+24);h++)if(game.world.solid(x,h,z)){this.covered=true;break;}}
  const r=this.owner,enabled=game.state.dimension==='overworld'&&!game.screen&&!this.covered&&!game.world.waterAt(game.pos.x,game.pos.y+1.6,game.pos.z)&&game.pos.y>game.world.height(Math.floor(game.pos.x),Math.floor(game.pos.z))-2&&weather.intensity>.02&&r.options.particles!=='off';
  this.mesh.visible=enabled;if(!enabled)return;
  const snow=weather.kind==='snow',count=Math.floor((r.options.quality==='low'?64:256)*weather.intensity),t=game.state.time;
  this.mesh.position.set(game.pos.x,game.pos.y,game.pos.z);this.mesh.material.opacity=snow?.48:.25;this.mesh.material.color.set(snow?'#e8f0ef':'#b4ced8');
  for(let i=0;i<count;i++){
   const x=(coordinateHash(i,1,9)*24+t*(snow?.14:.5))%24-12,z=coordinateHash(i,2,9)*24-12,y=12-((coordinateHash(i,3,9)*16+t*(snow?1.2:13))%16),at=i*6;
   this.positions.set([x,y,z,x+(snow?.07:.04),y+(snow?.05:.65),z],at);
  }
  this.mesh.geometry.setDrawRange(0,count*2);this.mesh.geometry.attributes.position.needsUpdate=true;
 }
}
