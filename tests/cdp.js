import { writeFile } from 'node:fs/promises';
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function connect(){
  const list=await(await fetch('http://127.0.0.1:9224/json')).json();
  const target=list.find(t=>t.type==='page'&&t.url.includes('3001'))||list.find(t=>t.type==='page');
  if(!target)throw Error('Start the isolated Chrome profile on port 9224 first.');
  const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let serial=0;const pending=new Map(),errors=[],failed=[];
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));if(m.method==='Network.responseReceived'&&m.params.response.status>=400)failed.push(m.params.response.url);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(m.error):p.resolve(m.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>reject(Error('Timeout: '+method)),30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const screenshot=async name=>writeFile(`/private/tmp/voxel-vault-${name}.png`,Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
  const click=async selector=>{for(let i=0;i<30;i++){if(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))break;await sleep(100);}await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await sleep(200);};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');return {socket,send,evaluate,screenshot,click,errors,failed};
}
