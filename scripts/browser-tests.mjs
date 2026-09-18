import {spawn} from 'node:child_process';
import {readdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const names=(await readdir(new URL('tests/',root))).filter(n=>n.endsWith('-browser.js')||['browser-check.js','touch-check.js'].includes(n)).sort();
const results=[];
for(const name of names){
  const start=performance.now();
  const result=await new Promise(resolve=>{
    let log='';const child=spawn(process.execPath,['tests/'+name],{cwd:root,env:{...process.env,VOXEL_CDP_PORT:process.env.VOXEL_CDP_PORT||'9224'}});
    child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
    const timeout=setTimeout(()=>child.kill('SIGTERM'),180000);
    child.on('close',(code,signal)=>{clearTimeout(timeout);resolve({name,code,signal,ms:performance.now()-start,log});});
  });
  results.push(result);console.log(`${result.code===0?'PASS':'FAIL'} ${name} (${Math.round(result.ms)} ms)`);if(result.code!==0)console.error(result.log);
}
await writeFile(process.argv[2]||'/private/tmp/voxel-vault-browser-results.json',JSON.stringify(results,null,2));
process.exitCode=results.some(r=>r.code!==0)?1:0;
