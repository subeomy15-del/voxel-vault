import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('aborted IndexedDB transactions cannot contaminate the next incremental save',async()=>{
 const messages=[],context=vm.createContext({performance,Blob,postMessage:m=>messages.push(m)});
 vm.runInContext(readFileSync(new URL('../src/save-worker.js',import.meta.url),'utf8'),context);
 vm.runInContext(`worlds.set('slot',{state:{version:2},maps:new Map([['overworld',new Map([['0,5,0','stone']])]])});db={transaction(){throw Object.assign(Error('Disk full'),{name:'QuotaExceededError'});}};`,context);
 await context.onmessage({data:{type:'begin',id:1,key:'slot',meta:{dimension:'overworld',realms:{}}}});
 await context.onmessage({data:{type:'patch',id:1,dimension:'overworld',entries:[['0,5,0',null],['1,5,0','diamond']]}});
 await context.onmessage({data:{type:'commit',id:1}});
 assert.equal(messages.at(-1).ok,false);assert.equal(messages.at(-1).name,'QuotaExceededError');
 assert.equal(vm.runInContext(`worlds.get('slot').maps.get('overworld').get('0,5,0')`,context),'stone');
 assert.equal(vm.runInContext(`worlds.get('slot').maps.get('overworld').has('1,5,0')`,context),false);
 await context.onmessage({data:{type:'begin',id:2,key:'slot',meta:{dimension:'overworld',realms:{}}}});
 assert.equal(vm.runInContext(`jobs.get(2).maps.get('overworld').get('0,5,0')`,context),'stone');
});
