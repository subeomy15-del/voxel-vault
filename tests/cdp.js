import { writeFile } from 'node:fs/promises';
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function connect(){
  const port=process.env.VOXEL_CDP_PORT||9224;
  const endpoint=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws=new WebSocket(endpoint.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let serial=0,sessionId;const pending=new Map(),errors=[],failed=[];
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.sessionId===sessionId){if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));if(m.method==='Network.responseReceived'&&m.params.response.status>=400)failed.push(m.params.response.url);}if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
  const raw=(method,params={},sid)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout: '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId:sid}));});
  const {browserContextId}=await raw('Target.createBrowserContext');const {targetId}=await raw('Target.createTarget',{url:'about:blank',browserContextId});sessionId=(await raw('Target.attachToTarget',{targetId,flatten:true})).sessionId;
  const send=(method,params={})=>raw(method,params,sessionId);
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const screenshot=async name=>writeFile(`/private/tmp/voxel-vault-${name}.png`,Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
  const click=async selector=>{for(let i=0;i<30;i++){if(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))break;await sleep(100);}await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button)throw Error('Missing control: '+${JSON.stringify(selector)});button.click();})()`);await sleep(200);};
  const close=async()=>{try{await raw('Target.disposeBrowserContext',{browserContextId});}finally{ws.close();}};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Page.navigate',{url:process.env.VOXEL_TEST_URL||'http://localhost:3001/'});
  for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('.block-lobby')`))break;await sleep(100);}
  return {socket:{close},close,send,evaluate,screenshot,click,errors,failed};
}
