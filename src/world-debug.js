import * as THREE from '../vendor/three.module.js';
export function installWorldDebug(game,renderer){
 if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&!new URLSearchParams(location.search).has('debug'))return;
 let bounds=null;
 globalThis.voxelDebug=Object.freeze({
  ruins(type,radius=8){const sites=game.world.ruins?.find({...game.pos,type,radius})||[];console.table(sites.map(({type,x,y,z,id})=>({type,x,y,z,id})));return sites;},
  visit(type,index=0){const sites=this.ruins(type,18),site=sites[index];if(!site)throw Error('No matching ruin in the bounded search. Try another seed.');game.pos={x:site.x+.5,y:site.y+12,z:site.z+site.radius+9};game.vx=game.vz=game.velocity=0;game.flying=game.creative;game.yaw=0;game.pitch=-.35;game.resume();game.emit('screen');return site;},
  bounds(enabled=true){if(bounds){renderer.scene.remove(bounds);bounds.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});bounds=null;}if(!enabled)return;bounds=new THREE.Group();for(const site of this.ruins(undefined,2).slice(0,16)){const box=new THREE.Box3(new THREE.Vector3(site.x-site.radius,site.y-6,site.z-site.radius),new THREE.Vector3(site.x+site.radius,site.y+16,site.z+site.radius));bounds.add(new THREE.Box3Helper(box,0xe5bd77));}renderer.scene.add(bounds);},
  regenerate(cx=Math.floor(game.pos.x/16),cz=Math.floor(game.pos.z/16)){
   const w=game.world,tag=`${cx},${cz}`;for(const k of w.structures.keys()){const[x,,z]=k.split(',').map(Number);if(Math.floor(x/16)===cx&&Math.floor(z/16)===cz)w.structures.delete(k);}w.prepared.delete(tag);w.chunkTops.delete(tag);w.prepare(cx,cz);w.dirty.add(tag);return {chunk:tag,editsPreserved:w.edits.size};
  }
 });
}
