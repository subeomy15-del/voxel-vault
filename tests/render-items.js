import {mkdir,writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect();
try{
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(900);
 await c.evaluate(`(async()=>{
  const main=await import('/src/main.js?v=10'),THREE=await import('/vendor/three.module.js'),{ITEMS}=await import('/src/data.js?v=10'),{itemModel}=await import('/src/item-model.js?v=10');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(160,160);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#f5faff','#59636b',1.6));const key=new THREE.DirectionalLight('#fff0d4',2.4);key.position.set(-3,5,5);scene.add(key);const rim=new THREE.DirectionalLight('#9bbff4',1.2);rim.position.set(4,2,-3);scene.add(rim);
  const camera=new THREE.OrthographicCamera(-.78,.78,.78,-.78,.1,30);camera.position.set(3,2.1,5);camera.lookAt(0,0,0);
  window.renderItem=name=>{const group=itemModel(main.renderer,name);if(['sword','pickaxe','axe','shovel','hoe','grapple'].includes(ITEMS[name].kind))group.rotation.z=-.55;group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const holder=new THREE.Group();group.position.sub(center);holder.add(group);holder.scale.setScalar(1.14/Math.max(size.x,size.y,size.z,.1));scene.add(holder);renderer.render(scene,camera);const data=renderer.domElement.toDataURL('image/png').split(',')[1];main.renderer.disposeGroup(holder);return data;};
  window.finishItems=()=>renderer.dispose();window.itemNames=Object.keys(ITEMS);
 })()`);
 await mkdir(new URL('../assets/items/',import.meta.url),{recursive:true});const names=await c.evaluate('itemNames');
 for(const name of names){const data=await c.evaluate(`renderItem(${JSON.stringify(name)})`);await writeFile(new URL('../assets/items/'+name+'.png',import.meta.url),Buffer.from(data,'base64'));}
 await c.evaluate('finishItems()');if(c.errors.length)throw Error(JSON.stringify(c.errors));console.log('Rendered '+names.length+' consistent 3D item icons.');
}finally{c.socket.close();}
