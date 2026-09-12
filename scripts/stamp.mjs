import { readFile,writeFile,readdir } from 'node:fs/promises';
const release=process.argv[2];if(!/^[a-z0-9.-]+$/.test(release||''))throw Error('Usage: node scripts/stamp.mjs RELEASE');
const root=new URL('../',import.meta.url);
for(const directory of ['src','tests'])for(const name of await readdir(new URL(directory+'/',root))){
  if(!name.endsWith('.js'))continue;const url=new URL(directory+'/'+name,root),source=await readFile(url,'utf8');
  const next=source.replace(/(['"])((?:\.\.?\/|\/src\/)[^'"\s?]+\.js)(?:\?v=[a-z0-9.-]+)?\1/g,(all,quote,path)=>path.includes('/vendor/')||directory==='tests'&&!path.includes('/src/')?all:quote+path+'?v='+release+quote);
  if(next!==source)await writeFile(url,next);
}
const index=new URL('index.html',root),html=await readFile(index,'utf8');await writeFile(index,html.replace(/(\.\/(?:src\/main\.js|style\.css|favicon\.svg))(?:\?v=[a-z0-9.-]+)?/g,'$1?v='+release));
console.log('Stamped browser modules, worker imports and entry assets: '+release);
