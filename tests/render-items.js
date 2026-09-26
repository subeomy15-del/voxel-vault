import {mkdir,writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect();
try{
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(900);
 await c.evaluate(`(async()=>{
  const main=await import('/src/main.js?v=38'),THREE=await import('/vendor/three.module.js'),{ITEMS}=await import('/src/data.js?v=38'),{itemModel}=await import('/src/item-model.js?v=38');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(320,320);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#f5faff','#59636b',1.6));const key=new THREE.DirectionalLight('#fff0d4',2.4);key.position.set(-3,5,5);scene.add(key);const rim=new THREE.DirectionalLight('#9bbff4',1.2);rim.position.set(4,2,-3);scene.add(rim);
  const camera=new THREE.OrthographicCamera(-.78,.78,.78,-.78,.1,30);camera.position.set(3,2.1,5);camera.lookAt(0,0,0);
  const output=document.createElement('canvas');output.width=output.height=160;const ctx=output.getContext('2d',{willReadFrequently:true});
  window.renderItem=name=>{
   const group=itemModel(main.renderer,name),kind=ITEMS[name].kind;
   if(['sword','pickaxe','axe','shovel','hoe','grapple'].includes(kind))group.rotation.z=-.55;
   camera.position.set(kind==='glider'?.4:3,kind==='glider'?10:kind==='potion'?1.2:2.1,kind==='glider'?2.4:5);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
   group.updateMatrixWorld(true);const bounds=new THREE.Box3();const point=new THREE.Vector3();
   group.traverse(mesh=>{if(!mesh.geometry)return;mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){point.set(x,y,z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);bounds.expandByPoint(point);}});
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),half=Math.max(size.x,size.y)*.5*160/140;
   camera.left=center.x-half;camera.right=center.x+half;camera.bottom=center.y-half;camera.top=center.y+half;camera.updateProjectionMatrix();
   scene.add(group);renderer.render(scene,camera);ctx.clearRect(0,0,160,160);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(renderer.domElement,0,0,160,160);
   const data=output.toDataURL('image/png').split(',')[1];main.renderer.disposeGroup(group);return data;
  };
  window.finishItems=()=>renderer.dispose();window.itemNames=Object.keys(ITEMS);
 })()`);
 await mkdir(new URL('../assets/items/',import.meta.url),{recursive:true});let names=await c.evaluate('itemNames');if(process.argv.includes('--potions'))names=names.filter(n=>n.includes('potion')||['brewing_station','empty_flask','water_flask'].includes(n));
 if(process.argv.includes('--regions'))names=names.filter(n=>['ice','cherry_leaf','autumnleaf'].includes(n));
 if(process.argv.includes('--altars'))names=names.filter(n=>n.endsWith('_altar'));
 for(const name of names){const data=await c.evaluate(`renderItem(${JSON.stringify(name)})`);await writeFile(new URL('../assets/items/'+name+'.png',import.meta.url),Buffer.from(data,'base64'));}
 await c.evaluate('finishItems()');if(c.errors.length)throw Error(JSON.stringify(c.errors));console.log('Rendered '+names.length+' consistent 3D item icons.');
}finally{c.socket.close();}
