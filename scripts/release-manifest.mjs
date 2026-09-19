import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),digest=data=>createHash('sha256').update(data).digest('hex');
const files=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>['index.html','style.css','favicon.svg'].includes(f)||/^(src|assets|vendor)\//.test(f));
const html=await readFile(new URL('index.html',root),'utf8'),stamp=html.match(/main\.js\?v=([\w.-]+)/)?.[1];
if(!stamp)throw Error('No release stamp');
const manifest={stamp,files:Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await readFile(new URL(f,root)))])))};
if(process.argv[2]==='--write'){await writeFile(new URL('release.json',root),JSON.stringify(manifest,null,2)+'\n');console.log(`Manifest: ${files.length} files, release ${stamp}`);}
else if(process.argv[2]){
 const base=process.argv[2].replace(/\/?$/,'/'),published=await fetch(base+'release.json?verify='+Date.now());if(!published.ok)throw Error('Manifest HTTP '+published.status);
 const remote=await published.json();if(JSON.stringify(remote)!==JSON.stringify(manifest))throw Error('Published manifest does not match the local release');
 let cursor=0;await Promise.all(Array.from({length:8},async()=>{while(cursor<files.length){const file=files[cursor++],response=await fetch(base+file+'?v='+stamp);if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);if(digest(Buffer.from(await response.arrayBuffer()))!==manifest.files[file])throw Error('Deployed file differs: '+file);}}));
 console.log(`PASS: all ${files.length} deployed files match local SHA-256 hashes (release ${stamp}).`);
}else throw Error('Usage: node scripts/release-manifest.mjs --write | https://site/path/');
