import { ITEMS, BLOCKS } from './data.js';
const cache=new Map();
const path=(d,fill,stroke='',width=1.3)=>`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`:''}/>`;
const rect=(x,y,w,h,c,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
const line=(d,c='#ffffff66',w=1.2)=>path(d,'none',c,w);
function art(name){
  const it=ITEMS[name]||{},c=it.color||'#acbaa0',edge='#283d3e',metal='#f1f0d9';
  if(it.kind==='glider')return path('m2 23 16-21 18 21-18-6Z',c,edge)+path('m18 2 0 15-16 6Z','#fff7de70')+line('m2 23 16-21 18 21M18 2v29M7 27l11-10 10 10Z','#697774',1.7)+(it.ore?path('m18 7 4 4-4 5-4-5Z',c,edge)+line('m18 8 2 3-2 3','#fffbe3',.8):'');
  if(name==='cotton')return line('m18 34-1-17m1 11-8-10m8 6 9-10','#829064',2)+[[9,13],[18,9],[26,14]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#e8e6d2" stroke="#869178" stroke-width="1"/>`).join('')+path('m5 13 4-5 5 1m0-1 3-5 6 1','none','#fffbee',2);
  if(name==='feather')return path('M5 34 10 13 22 3l10-1-2 12-12 14Z',c,edge)+line('M5 34 27 7','#929b7d',1.6)+line('m12 23 1-9m4 6 1-9m3 5 8-4','#b8bda2');
  if(name==='leather'||name==='rabbit_hide')return path('m9 3 8 4 9-4 8 7-5 6 3 12-10 6-6-2-10 2-3-9 5-8-5-7Z',c,edge)+line('m10 10 7 3 9-3m-15 9-1 8 9 2 5-4','#d6b183',1.5);
  if(name==='sugar')return path('m5 16 10-8 17 5-4 16-20 3Z','#e2dfc9',edge)+path('m5 16 10-8 17 5-13 9Z','#fff8e5')+line('m12 19 3-5m8 2 4-1','#c0bfa9');
  if(name.endsWith('_slice')){const water=name==='watermelon_slice';return path('m3 9 31 8q-7 21-24 10Z',water?'#719753':'#bbac65',edge)+path('m5 9 27 8q-9 15-21 8Z',water?'#e5b69a':'#eee0a8')+path('m7 10 24 8q-9 11-19 5Z',water?'#cc8572':'#dbb776')+(water?line('m14 17 1 2m8 0-1 2m-4 3-1 1','#574c42',1.6):'');}
  if(name.startsWith('raw_')||name.startsWith('cooked_')){
    const cooked=name.startsWith('cooked'),drum=/chicken|rabbit/.test(name),meat=cooked?'#a2764f':c;
    return drum?path('m5 30 6-8 6 4-7 9Z','#e2d7b9',edge)+path('M12 25Q4 15 15 6q12-8 18 4 5 12-10 20Z',meat,edge)+line('m17 10 7-2','#e1b28a',2):path('M4 22Q0 10 13 5q14-6 20 9 3 13-13 19Q7 34 4 22Z',meat,edge)+line('M8 22Q5 13 15 10q11-3 14 9','#e3b79b',2)+path('m17 17 6 1 1 6-6 3-4-5Z',cooked?'#d6bb8d':'#ebcfb0');
  }
  if(name==='potato'||name==='baked_potato')return path('M6 28Q-2 14 10 7q9-8 19 1 12 17-3 24-13 6-20-4Z',c,edge)+line('m9 16 2-1m10-4 2 1m1 12 2 0m-11 2 1-1','#7f6b49',1.8)+(name==='baked_potato'?path('m9 13 17 9-5 5-15-9Z','#e2c992',edge):'');
  if(name==='tomato')return path('M3 22Q1 8 18 10q17-3 17 13-2 12-17 12Q4 34 3 22Z',c,edge)+path('m18 15-7-8 6 2 2-6 2 7 9-2-6 7Z','#718c53')+line('m8 18-1 5','#e8b198',2);
  if(name==='corn'||name==='roasted_corn')return path('m12 31-6-9 8-17 7-3 8 9-8 18Z',c,edge)+line('m16 8 8 4m-11 2 8 4m-11 2 8 4m-11 2 8 4','#f2dba1',1.5)+path('m12 33-7-5-2-15 10 15 12-10-6 14Z','#8c9f62',edge);
  if(name==='berries')return [[10,17],[22,14],[17,26],[28,25]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="${edge}" stroke-width="1"/>`+line(`m${x-2} ${y-3} 3-1`,'#d2cfe4',1.5)).join('')+path('m15 11-3-8 9 4 6-5 0 9Z','#829563');
  if(name==='swift_smoothie')return path('m8 11 21 0-3 23H11Z','#b6c9ad',edge)+path('m10 18 17 0-2 14H12Z',c)+line('m21 22 4-20 8 0','#e8dab6',2)+line('M12 14v11','#edf0d5',2);
  if(it.effect||['garden_salad','venison_stew','berry_pie','trail_mix'].includes(name)){
    const pie=name.includes('pie')||name.includes('bread')||name==='miners_lunch';
    return path('M3 19h31l-6 13H9Z',pie?'#b18b5d':'#998165',edge)+path('M3 19q15-15 31 0-15 9-31 0Z',c,edge)+(pie?line('m9 17 17 5m-11-9 14 6m-8-6-9 10m15-7-8 7','#ecdbad',1.7):path('m9 17 6-5 4 7 6-6 5 6-10 4Z','#b6c68b'))+line('m10 27 16 0','#ddc798');
  }
  if(it.boxes){
    const project=(x,y,z)=>`${18+(x-z)*14},${17+(x+z)*7-y*14}`;
    const poly=(points,color)=>path('M'+points.map(p=>project(...p)).join('L')+'Z',color,edge,1);
    return it.boxes.map(b=>{const[x,y,z,X,Y,Z]=b;return poly([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],c)+poly([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],'#ffffff28')+poly([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],c)+poly([[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]],c)+poly([[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]],'#00000029');}).join('');
  }
  const handle=path('m9 33-4-3L24 7l4 3Z','#926d46',edge)+line('m9 28 14-18','#c7a377',1.6)+line('m8 29 3 2m-1-5 3 2','#594b38',1.4);
  if(it.kind==='sword')return path('m25 3 7-1-1 8-15 17-7-6Z',c,edge)+path('m25 3 2 5-14 16-4-3Z','#ffffff70')+line('m27 8-12 16','#233b3a55')+path('m6 19 15 12 3-4L9 16Z','#d2b473',edge)+path('m10 24 5 4-7 8-5-4Z','#826548',edge)+line('m7 29 4 3','#d9b988')+path('m4 31 4 3-3 3-4-3Z',c,edge);
  if(['pickaxe','axe','hoe','shovel'].includes(it.kind)){
    const heads={pickaxe:'m9 6 10-3 10 5 5 9-2 5-5-10-10-4-9 3Z',axe:'m19 3 10 4 5 11-6 6-10-5 1-6-4-3Z',hoe:'m12 5 15 2 5 5-3 3-9-5-5 8-5-2Z',shovel:'m19 4 10 1 5 8-4 10-6 3-9-8Z'};
    return handle+path(heads[it.kind],c,edge)+line(it.kind==='shovel'?'m23 8 6 7-6 7':it.kind==='axe'?'m27 8 4 9-4 4':'m12 7 7-1 9 5',metal,1.6)+rect(21,9,3,4,'#9a815d',.5);
  }
  if(name.includes('crossbow'))return handle+path('m5 6 7-3 9 7 11 10-1 10-4-2-1-7-8-9-8-2-5 1Z',c,edge)+line('M6 7 29 29','#ebe3c6')+path('m15 26-3-3L31 3l4-1-1 5Z','#bec8c1',edge)+line('m22 13 8-8',metal);
  if(it.kind==='bow')return path('M10 3Q36 18 10 34l-3-3Q28 18 7 6Z',c,edge)+line('M10 3v31','#e8dfbc')+line('M3 18h28','#8b7350',2)+path('m27 14 7 4-7 4Z','#c9d1cc',edge);
  if(it.kind==='ammo')return line('m6 30 21-21m-13 22 14-14','#a89168',2)+path('m24 8 9-6-3 11Zm1 8 9-5-3 10Z','#c4d1d0',edge)+path('m5 23 6 5-5 6-4-7Zm10 2 5 4-5 6-3-6Z','#ded4b3');
  if(it.kind==='armor')return path('m10 5 8 4 8-4 9 8-7 7-3-3v16H11V17l-4 3-6-7Z',c,edge)+path('m13 11 5 3 5-3v16l-5 4-5-4Z','#ffffff38')+line('M18 14v15m-5-10h10','#ecf6e2',1.2)+rect(13,27,10,3,'#6e735d')+rect(16,27,4,3,'#dbbc74');
  if(name.endsWith('_ingot'))return path('m5 15 8-8h16l5 11-8 9H3Z',c,edge)+path('m5 15 8-8h16l-8 8Z','#ffffff50')+path('m21 15 8-8 5 11-8 9-5-12Z','#00000027')+line('M6 16h14l4 9','#ffffff99')+line('m10 11 12 0','#ffffff80',1.6);
  if(name==='compass')return '<circle cx="18" cy="20" r="14" fill="#c6ad76" stroke="#374944" stroke-width="1.4"/><circle cx="18" cy="20" r="10.8" fill="#e9e5cc"/>'+rect(14,1,8,5,'#b69a65',2)+line('M18 10v3m0 14v3M8 20h3m14 0h3','#7c8773')+path('m22 11-1 12-8 6 2-12Z','#768d8a')+path('m22 11-7 6 6 6Z','#bd7061')+'<circle cx="18" cy="20" r="2" fill="#efe6cb"/>';
  if(name==='apple')return path('M18 11C1 3 0 25 11 32q7 3 11 0C37 31 35 3 18 11Z',c,edge)+path('M18 11V4q8-6 12 0-4 7-12 4','#789458',edge)+line('M10 14q-5 3-3 9','#f2c7a1',2)+line('m18 10 1-7','#65563e',2);
  if(name==='carrot')return path('m11 12 13 9-17 14-4-1Z',c,edge)+path('m19 15 6-13 4 2-5 14 9-9 3 3-10 10Z','#719059',edge)+line('m11 18 5 3m-9 4 4 3','#aa7047',1.5)+line('m10 14-5 16','#f8c17f');
  if(name==='potion')return path('M13 4h10v10l8 9v9q-13 6-26 0v-9l8-9Z','#a6bfc1',edge)+path('M8 24q10-4 20 0v7q-10 4-20 0Z','#b299c9')+rect(12,2,12,5,'#a2855e',1)+line('M10 19v7','#ffffffa0',2)+path('M18 21v9m-4-4h8','none','#e6deef',2);
  if(name==='bread'||name==='fruit_bowl')return name==='bread'?path('M4 24C-1 8 26 2 33 17v9q-14 10-28 5Z',c,edge)+path('M4 24q12 4 29-7v9q-15 10-28 5Z','#9a754c')+line('m10 12 2 6m6-9 2 6m6-6 2 6','#f1d6a6',2.4):path('M3 19h30l-6 13H9Z','#ab8057',edge)+path('M5 19 9 10l8-3 11 7 3 5Z','#d9b079',edge)+rect(9,13,5,4,'#b97555',1)+rect(21,14,5,4,'#b97555',1)+line('M8 24h19','#e6c499');
  if(name==='vegetable_stew'||name==='roasted_mushroom')return path('M3 18h30L28 30q-10 6-20 0Z','#917053',edge)+path('M3 18q15-11 30 0-15 10-30 0Z','#cba06c',edge)+rect(10,16,6,4,'#d89255',1)+rect(22,16,4,3,'#7c965e',1)+line('M12 9q-3-3 0-6m10 8q-3-3 0-6','#d8d3c0',1.8);
  if(name==='mushroom')return path('M15 17h7l3 16q-8 4-13-1Z','#d7c9ad',edge)+path('M3 20Q4 1 19 4q12 1 15 15-14 8-31 1Z',c,edge)+rect(9,13,4,3,'#f1dfbd',1)+rect(21,10,5,3,'#f1dfbd',1)+line('M15 25v5','#fff1d0');
  if(it.kind==='seed')return path('m10 10 16 1 5 21q-14 6-25-1Z','#a49367',edge)+path('m11 5 13-2-1 9-10-1Z','#bfae7d',edge)+line('M10 12h17','#675f42',2)+path('M17 29V17m0 7q-8-1-6-6 7 1 6 6m0-2q8-1 7-6-7 0-7 6','none','#e8db9c',1.8);
  if(name==='wheat'||name.startsWith('wheat_'))return line('m13 34 9-29M5 34l7-23m9 23 9-22','#a78e56',1.7)+[0,1,2,3].map(i=>path(`m${20-i} ${6+i*5}-6-3 1 6 4 1 7-4-1-5Z`,i%2?'#c4ad6c':'#ded096')).join('');
  if(name.startsWith('carrot_')||name==='fern'||name==='fiber')return [0,1,2].map(i=>line(`M18 34Q${5+i*12} 18 ${8+i*10} 4`,name==='fiber'?'#b5ad7c':'#7c995c',1.5)+[0,1,2].map(j=>path(`m${8+i*9} ${10+j*6} -6 -5 1 6 6 4 6-5 1-6Z`,name==='fiber'?'#c2b88d':j%2?'#69864c':'#94ad72')).join('')).join('');
  if(name.startsWith('flower_'))return line('M18 33V13','#69834e',2)+path('m17 27-8-5 1-5 8 6m1 0 8-7 2 4-10 8','#82975c')+[[-5,0],[5,0],[0,-5],[0,5]].map(([x,y])=>`<circle cx="${18+x}" cy="${12+y}" r="5" fill="${c}" stroke="#2c403b33"/>`).join('')+'<circle cx="18" cy="12" r="3" fill="#e5c77f"/>';
  if(name==='cloth'||name==='cotton_cloth')return path('M6 7h24l-3 22H5Z',c,edge)+path('m6 7 7 4-3 23 18-2 2-25Z','#ece1c0',edge)+line('m15 14 10-1m-10 5 9-1m-10 5 10-1','#aeaa8d');
  if(name==='torch'||name==='lantern')return name==='torch'?path('M15 17h7v18h-7Z','#997046',edge)+path('M11 20 8 13l9-11 3 8 5-5 4 10-4 6Z','#e9aa54',edge)+path('m16 18-2-4 4-6 5 7-3 4Z','#fff0b2'):path('M12 4h12v5h-3V6h-6v3h-3Z','#697477',edge)+path('M10 11h17v20H10Z','#f1cb79',edge)+path('M8 10 12 6h12l6 4v3H8Zm1 19h20v4H9Z','#687679',edge)+line('M13 14v13m12-13v13','#8a7651',1.4)+rect(16,17,5,9,'#fff3bd');
  if(name==='campfire')return path('m4 25 24 9 4-5-24-9Zm3 9 24-9-4-5-24 9Z','#8c6948',edge)+path('M9 24 8 16 18 2l1 11 7-7 5 13-7 9Z','#d9924b',edge)+path('m14 24 4-11 6 8-3 7Z','#ffe1a0');
  if(name==='ladder')return path('M7 3h5v32H7ZM26 3h5v32h-5Z',c,edge)+[7,16,25].map(y=>rect(11,y,15,4,'#ccb17b')+line(`M12 ${y}h14`,'#f1dab0')).join('');
  if(name==='bed')return path('m3 19 17-10 14 8v12l-4 2v-7L7 27v6l-4-1Z','#8f6a46',edge)+path('m4 17 16-9 14 8v7l-17 9-13-8Z','#aa786c',edge)+path('m5 16 7-4 13 8-7 4Z','#e4ddc6',edge)+line('m19 26 10-6','#d3a18d',2);
  if(name==='chest')return path('m3 10 16-7 14 8v18l-15 6-15-9Z',c,edge)+path('m3 10 15 8 15-7v7l-15 7-15-8Z','#c4a36c',edge)+line('M18 18v17M7 13v14m21-14v17','#594d3a',2)+rect(15,21,6,7,'#d9c18a',1)+rect(17,23,2,3,'#534e3b');
  // A consistent isometric block silhouette; faces carry the material's details.
  let face='';
  if(name.includes('plank')||['wood','birch','pinewood'].includes(name))face=line('M6 15 15 20m-9 0 9 5m-9 0 9 5m6-10 9-5m-9 10 9-5m-9 10 9-5','#392f234e')+line('m10 8 8 5 8-4','#fff4cb55');
  else if(name.includes('brick')||['cobblestone','sandstone','tile','polished_marble'].includes(name))face=line('m3 18 15 8 15-8m-23-5v8m16-7v8m-8 4v9','#26383655')+line('m5 20 11 6m4 0 11-6','#ffffff50');
  else if(name.endsWith('_block'))face=line('m5 13 11 6v12m5 0V19l10-5','#ffffff88')+rect(8,20,2,2,'#ffffff80')+rect(25,24,2,2,'#223d3b55');
  else if(name.endsWith('_wool'))face=line('m4 13 13 7m-13-3 13 7m-13-3 13 7m3-8 12-6m-12 10 12-6m-12 10 12-6','#ffffff40');
  else if(['grass','leaf','hedge','pine','autumnleaf','moss'].includes(name))face=path('m3 10 15 8v6l-4-4-2 1-4-4-5-1Z',name==='grass'?'#779854':'#ffffff24')+path('m18 18 15-8v6l-4 1-1 3-5 0-5 5Z','#527347')+line('m9 9 5 2m7-4 4 2','#c8d495',1.6);
  else if(['iron','gold','copper','coal','diamond','crystal'].includes(name))face=[rect(6,17,5,4,c),rect(10,25,4,5,c),path('m23 20 5-3v5l-5 3Z',c),path('m23 28 5-3v3l-5 3Z',c),path('m13 8 5-3 5 3-5 3Z',c)].join('')+line('m7 17 3 1m15 2 2-1','#ffffff99');
  else if(name==='furnace')face=path('m5 19 10 5v7L5 26Z','#2d3937')+path('m7 25 1-5 3 7 2-3 1 5Z','#e7a059')+line('m5 15 10 5','#d7d9c4',2);
  else if(name==='bookshelf')face=path('m4 13 13 7v12L4 25Z','#4f4d37')+['#b57765','#a8b18a','#819da6','#cab078'].map((col,i)=>path(`m${5+i*3} ${15+i*1.6} 2 1v8l-2-1Z`,col)).join('')+line('m4 25 13 7','#cfb580',2);
  else if(name==='watermelon'||name==='melon')face=line('m6 12 0 15m6-12 0 15m10-12 0 15m6-18 0 15',name==='watermelon'?'#315e3977':'#efe0b877',2);
  else if(name==='glass')face=line('m7 13 8 4v12m8-7 6-5m-6 12 6-5','#e6f6f4',1.7);
  else face=line('m6 18 4 2m2 6 3 1m9-5 4-2m-5 9 5-2','#203d3c38');
  const base=['iron','gold','copper','coal','diamond','crystal'].includes(name)?'#818c8c':name==='grass'?'#937354':c;
  return path('m3 10 15-8 15 8v17l-15 8-15-8Z',base,edge)+path('m3 10 15-8 15 8-15 8Z',name==='grass'?'#91ac6c':'#ffffff29')+path('m18 18 15-8v17l-15 8Z','#00000027')+line('M3 10 18 18 33 10M18 18v17','#253d3b66')+face;
}
export function icon(name,size=36){
  if(!cache.has(name))cache.set(name,art(name));
  return `<svg class="item-icon" width="${size}" height="${size}" viewBox="0 0 38 38" aria-hidden="true">${cache.get(name)}</svg>`;
}
