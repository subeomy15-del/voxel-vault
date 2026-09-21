import { BLOCKS, hash } from './data.js?v=36';
export const TILE=32,ATLAS_COLS=16;
export const ATLAS_ROWS=2**Math.ceil(Math.log2(Math.ceil(Object.keys(BLOCKS).length*3/ATLAS_COLS)));
export const ATLAS_WIDTH=TILE*ATLAS_COLS,ATLAS_HEIGHT=TILE*ATLAS_ROWS;
export function textureCanvas(){
  const canvas=document.createElement('canvas');canvas.width=ATLAS_WIDTH;canvas.height=ATLAS_HEIGHT;
  const ctx=canvas.getContext('2d');let index=0;
  const ores={ruby:'#df6b8b',sapphire:'#71bcea',emerald:'#76d8a3',moonstone:'#d7c5ff',iron:'#cab6a0',copper:'#c18f71',gold:'#dfbf6c',coal:'#394344',diamond:'#9ed8d8',crystal:'#9ed8d8'};
  for(const[type,b]of Object.entries(BLOCKS))for(let side=0;side<3;side++,index++){
    ctx.save();ctx.translate(index%ATLAS_COLS*TILE,Math.floor(index/ATLAS_COLS)*TILE);
    const fill=(c,x=0,y=0,w=32,h=32)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    const stroke=(color,points,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
    if(b.plant){
      const sprout=type.includes('sprout'),wheat=type.startsWith('wheat'),carrot=type.startsWith('carrot');
      if(type==='cane'){for(let x=5;x<32;x+=10){fill('#748d4f',x,1,4,31);fill('#b3bf7e',x,1,1,31);for(let y=6;y<32;y+=8)fill('#c1cd8e',x-1,y,6,2);}stroke('#7e9d57',[[8,13],[2,5]],2);stroke('#96af66',[[18,11],[26,4]],2);
      }else if(type==='mushroom'){
        fill('#b5a183',13,18,6,14);fill('#ead9b8',14,19,2,12);
        fill('#9b8167',5,11,23,10);fill('#b49c7a',8,7,17,12);fill('#c7b18e',12,5,9,4);
        fill('#e4d5b6',10,10,4,3);fill('#e4d5b6',20,14,3,3);
      }else if(type.startsWith('flower')||type==='daisy'||type==='lavender'){
        stroke('#638548',[[16,31],[17,10]],2);stroke('#7b9b54',[[16,25],[9,20],[7,16]],3);stroke('#829e5a',[[17,22],[24,17]],3);
        fill(b.color,11,4,11,10);fill(b.color,8,7,18,5);fill('#e7cf83',14,7,5,5);fill('#ffffff33',11,5,4,3);
      }else if(wheat){
        for(let i=0;i<5;i++){const x=5+i*5,y=sprout?20+i%2*3:3+i%3*3;stroke(sprout?'#7d9b54':'#bba368',[[x,31],[x+2,y]],1.5);for(let a=y+2;a<(sprout?28:23);a+=5){stroke(sprout?'#97b371':'#d4bf81',[[x-2,a-3],[x+2,a],[x+5,a-5]],2);}}
      }else{
        const height=sprout?11:type==='fern'?25:21;
        for(let i=0;i<5;i++){
          const tip=6+i*5,top=31-height+Math.abs(i-2)*3;
          stroke('#648746',[[16,31],[tip,top]],1.5);
          for(let j=0;j<3;j++){const f=.3+j*.22,x=16+(tip-16)*f,y=31+(top-31)*f;stroke(j%2?'#8eab68':'#789c56',[[x-5,y-5],[x,y],[x+4,y-6]],2);}
        }
        if(!sprout&&type==='cotton_crop'){for(const[x,y]of[[8,14],[22,12],[15,6],[18,23]]){fill('#d2d6bf',x-3,y-2,7,6);fill('#ecebda',x-2,y-3,5,5);fill('#fff7e5',x-1,y-3,3,2);}}
        if(!sprout&&type==='corn_crop'){stroke('#829557',[[16,32],[16,2]],3);for(const[x,y]of[[10,10],[18,16]]){fill('#b9984e',x,y,5,10);fill('#dec471',x+1,y,3,9);}}
        if(!sprout&&['tomato_crop','berries_crop'].includes(type)){for(const[x,y]of[[7,12],[21,15],[13,22]]){fill(type==='tomato_crop'?'#b56c58':'#7d7b9d',x,y,5,5);fill(type==='tomato_crop'?'#dc9579':'#a3a1c0',x,y,3,2);}}
        if(carrot&&!sprout){fill('#b87943',13,27,7,5);fill('#e1a268',15,26,3,6);}
      }
      ctx.restore();continue;
    }
    const bright={grass:BLOCKS.grass.color,leaf:BLOCKS.leaf.color,pine:BLOCKS.pine.color,autumnleaf:'#cc924e',dirt:'#92785b',sand:'#c7b889',stone:'#8a969e'};
    fill(ores[type]?'#89929a':type==='grass'&&side!==0?bright.dirt:bright[type]||b.color);
    for(let i=0;i<28;i++){const x=Math.floor(hash(i,index+71)*32),y=Math.floor(hash(index+23,i)*32);fill(hash(i,index)>.5?'#ffffff0c':'#15222110',x,y,1+Math.floor(hash(i,5)*4),1+Math.floor(hash(i,9)*3));}
    if(['lava','magma'].includes(type)){
      fill(type==='lava'?'#ce581b':'#493c32');
      for(let i=0;i<14;i++){const x=hash(i,index)*32,y=hash(index,i)*32;stroke(type==='lava'?'#f8aa36':'#cf7228',[[x-8,y],[x,y+3],[x+4,y-3],[x+11,y]],type==='lava'?3:2);}
    }
    if(['netherrack','soul_sand'].includes(type))for(let i=0;i<18;i++){const x=hash(i,index)*30,y=hash(index,i)*30;fill('#271c1940',x,y,4,3);fill('#e9b48b20',x,y-1,4,1);}
    if(['nether_bricks','quartz_bricks'].includes(type))for(let y=0;y<32;y+=8){fill('#302b2548',0,y,32,1);for(let x=y%16?8:0;x<32;x+=16)fill('#302b2548',x,y,1,8);}
    if(['end_stone','end_bricks'].includes(type)){
      for(let i=0;i<20;i++){const x=Math.floor(hash(i,index)*28),y=Math.floor(hash(index,i)*28);fill('#82785b30',x,y,3,2);fill('#fff8dc40',x,y-1,3,1);}
      if(type==='end_bricks')for(let y=0;y<32;y+=8){fill('#73665060',0,y,32,1);fill('#73665060',(y*2)%24,y,1,8);}
    }
    if(type==='obsidian')for(let i=0;i<12;i++){const x=hash(i,index)*32,y=hash(index,i)*32;stroke('#79619566',[[x,y],[x+4,y+3],[x+7,y+2]],1);}
    if(['moonstone_block','violet_crystal','ender_gate'].includes(type)){
      for(let i=0;i<6;i++){const x=hash(i,index)*27,y=hash(index,i)*27;stroke('#ebd6ff99',[[x,y],[x+4,y+4],[x+1,y+7]],1);}
      if(type==='ender_gate'){fill('#30203e',4,4,24,24);ctx.strokeStyle='#d5b0ff';ctx.lineWidth=2;ctx.strokeRect(7,7,18,18);ctx.strokeRect(12,12,8,8);}
    }
    if(type==='dragon_altar'){fill('#454153');ctx.strokeStyle='#a795c1';ctx.lineWidth=2;ctx.strokeRect(4,4,24,24);stroke('#c6b6df',[[8,11],[13,16],[16,12],[19,16],[24,11],[22,24],[10,24],[8,11]],2);}
    if(type==='dragon_crystal'){fill('#6c5a84');stroke('#d2c2e8',[[16,2],[28,16],[16,30],[4,16],[16,2]],3);stroke('#af96d1',[[16,3],[16,29]],2);}
    if(type==='launch_pad'){fill('#23434b');ctx.strokeStyle='#8bf5ff';ctx.lineWidth=2;ctx.strokeRect(2,2,28,28);stroke('#b5ffff',[[7,23],[16,13],[25,23]],3);stroke('#64d7e3',[[7,15],[16,5],[25,15]],3);}
    if(type==='treasure_chest'||type==='relic_forge'){fill(type==='treasure_chest'?'#997c52':'#576477');fill('#293748',0,12,32,3);fill('#dec48b',0,0,3,32);fill('#dec48b',29,0,3,32);fill('#f3dba6',13,11,6,10);fill('#634e43',15,15,2,3);if(type==='relic_forge'){fill('#243e49',5,18,22,10);stroke('#8bdddf',[[9,25],[16,20],[23,25]],2);}}
    if(type==='moonstone_chest'){fill('#433450',0,13,32,3);fill('#dbc5ff',13,11,6,9);fill('#624486',15,14,2,3);stroke('#d7c8ef88',[[1,1],[30,1],[30,30]],2);}
    if(type.startsWith('watermelon')){for(let x=1;x<32;x+=7)stroke('#42633f',[[x,0],[x+2,8],[x,18],[x+1,32]],3);if(side===0){fill('#638249',13,11,6,8);fill('#a8ae72',15,9,3,9);}}
    if(type==='melon'||type==='melon_crop'){for(let i=0;i<11;i++){const x=hash(i,41)*32,y=hash(i,74)*32;stroke('#ebd8a77a',[[x-7,y],[x,y+4],[x+6,y-1],[x+12,y+4]]);}if(side===0)fill('#7b8753',14,11,4,7);}
    if(type==='grass'){
      if(side===0){for(let i=0;i<45;i++){const x=hash(i,index)*30,y=hash(i,index+2)*31;fill(i%3?'#b2c38b33':'#3d632c30',x,y,2,1);}}
      else if(side===1){fill(bright.grass,0,0,32,6);for(let x=0;x<32;x+=2)fill(bright.grass,x,6,2,2+hash(x,index)*4);stroke('#adc2b366',[[0,1],[32,1]]);}
    }
    const log=['wood','birch','pinewood'].includes(type),plank=type.includes('plank')||type==='bench'||type==='bookshelf'||type==='chest';
    if(log){
      if(side===1){for(let x=1;x<32;x+=4){stroke(type==='birch'?'#74796966':'#392c2766',[[x,0],[x+1,9],[x-1,18],[x,32]]);stroke('#ddd0a12a',[[x+2,0],[x+3,32]]);}if(type==='birch')for(let i=0;i<8;i++)fill('#505750',hash(i,2)*27,i*4,3+hash(i,8)*6,1.5);}
      else{fill(type==='birch'?'#ccbb91':'#b79768',2,2,28,28);for(let a=5;a<16;a+=4){ctx.strokeStyle='#66513366';ctx.strokeRect(a,a,32-a*2,32-a*2);}stroke('#decaa177',[[4,3],[28,3],[28,28]]);}
    }
    if(plank){for(let y=0;y<32;y+=8){fill('#392e274d',0,y,32,1);fill('#f3dab02a',0,y+1,32,1);fill('#4b3b302e',(y*7+5)%30,y,1,8);stroke('#6248302c',[[1,y+4],[10,y+3],[20,y+5],[30,y+4]]);}}
    if(['leaf','pine','autumnleaf','cherry_leaf','hedge'].includes(type))for(let i=0;i<28;i++){const x=Math.floor(hash(i,index+2)*29),y=Math.floor(hash(i,index+6)*29);fill(type==='cherry_leaf'?'#b96d8720':'#263f2920',x,y,5,4);fill(type==='cherry_leaf'?'#ffe2ed55':'#b6c98526',x,y,4,2);}
    if(ores[type])for(let i=0;i<7;i++){
      const x=3+Math.floor(hash(i,index+4)*23),y=3+Math.floor(hash(i,index+9)*23);fill('#253c3e66',x-1,y,6,5);fill(ores[type],x,y,4,4);fill('#ffffff55',x,y,3,1);fill('#00000028',x+3,y+2,1,2);
    }
    if(['stone','slate','basalt','granite','limestone','marble','polished_granite','polished_slate','polished_marble'].includes(type)){
      const marble=type.includes('marble');
      if(!marble&&!type.startsWith('polished'))for(let i=0;i<18;i++){
        const x=hash(i,index+211)*32,y=hash(i,index+313)*32,w=2+hash(i,index+411)*7,h=2+hash(i,index+513)*5;
        fill(i%3?'#101b2620':'#f4ead623',x,y,w,h);stroke('#101b2635',[[x,y+h],[x+w,y+h],[x+w+1,y+h-2]],.7);
      }
      for(let i=0;i<(marble?3:5);i++){const y=hash(i,index+17)*32;stroke(marble?'#7a979342':'#26343423',[[0,y],[9,y+3],[17,y+1],[25,y+7],[32,y+5]],marble?1.5:1);}
      if(type.startsWith('polished')){fill('#ffffff24',0,0,32,1);fill('#1c35332b',0,31,32,1);}
    }
    if(['dark_bricks','ivory_bricks','stonebrick','brick','sandstone','tile','ruin','cobblestone'].includes(type)){
      for(let y=0;y<32;y+=8){fill('#3b454342',0,y,32,1);fill('#ffffff20',0,y+1,32,1);for(let x=y%16?8:0;x<32;x+=16)fill('#3b454342',x,y,1,8);}
    }
    if(type.endsWith('_block')){fill('#263e3b55',0,0,32,1);fill('#263e3b55',0,0,1,32);fill('#ffffff50',1,1,30,1);for(const x of[3,27])for(const y of[3,27]){fill('#48545077',x,y,2,2);fill('#ffffff77',x,y,1,1);}}
    if(type.endsWith('_wool'))for(let y=0;y<32;y+=2)for(let x=y%4;x<32;x+=4){fill('#ffffff13',x,y,2,1);fill('#0000000e',x+2,y+1,2,1);}
    if(type==='farmland'){fill('#493c30',0,0,32,32);for(let x=2;x<32;x+=6){fill('#846347',x,0,3,32);fill('#a0794c55',x,0,1,32);}}
    if(type==='furnace'){
      fill('#3f4c4b',0,0,32,2);fill('#a0aaa166',2,2,28,1);
      if(side===1){fill('#303b3a',5,6,22,7);fill('#9ba89b',7,7,18,2);fill('#1c2929',5,18,22,12);fill('#b87c44',8,25,16,4);fill('#f2bd67',10,24,3,4);fill('#e6a755',19,22,3,6);}
    }
    if(type.endsWith('_altar')&&type!=='dragon_altar'){fill('#39474e',0,24,32,8);fill('#cabc8d',0,4,32,2);if(side===0){fill('#d4c9a5',7,7,18,18);fill(b.color,10,10,12,12);fill('#ededd8',14,11,4,10);fill('#ededd8',11,14,10,4);}else{fill('#dacb99',13,9,6,11);fill('#394b52',15,11,2,7);}}
    if(type==='waystone'){fill('#43585f',3,2,26,28);fill('#b6d5cf',13,5,6,22);fill('#b6d5cf',7,12,18,5);fill('#e5d4a4',11,10,10,9);fill('#6aa8a6',14,12,4,5);}
    if(type==='brewing_station'){fill('#354d48',0,0,32,4);fill('#d5b678',0,25,32,3);if(side===0){fill('#a9c6bd',7,7,18,18);fill('#4f796e',10,10,12,12);}else{for(const x of [5,19]){fill('#accac4',x,9,8,13);fill(x===5?'#9fb979':'#ab91bf',x+1,14,6,7);fill('#d0ac73',x+2,6,4,4);}}}
    if(type==='bench'&&side===0){for(let x=8;x<32;x+=8)fill('#49392566',x,0,1,32);fill('#526467',5,6,12,3);fill('#d4bb88',14,7,3,17);}
    if(type==='bookshelf'&&side===1){fill('#3d4534',2,2,28,27);for(let row=0;row<2;row++)for(let i=0;i<7;i++){const x=3+i*4,y=3+row*14;fill(['#a9755e','#8f9e7a','#708c95','#c2ad79'][i%4],x,y,3,11);fill('#dfd6ad88',x,y+2,3,1);}fill('#ba9667',0,14,32,2);}
    if(type==='chest'){for(const x of[3,26])fill('#4d5346',x,0,3,32);if(side===1){fill('#3b392e',0,10,32,2);fill('#dac28a',13,8,6,9);fill('#64543a',15,11,2,4);}}
    if(type==='bed'){if(side===0){fill('#ebe3cb',1,0,30,10);fill('#c49483',1,11,30,20);fill('#e1b8a233',2,12,2,19);}else{fill('#8b6947',0,24,32,8);fill('#d5aa91',0,0,32,4);}}
    if(type==='ladder'){ctx.clearRect(0,0,32,32);fill('#9b7d51',4,0,4,32);fill('#9b7d51',24,0,4,32);for(let y=3;y<32;y+=9){fill('#c1a173',4,y,24,3);fill('#ecd1a44d',4,y,24,1);}}
    if(type==='torch'||type==='lantern'){fill('#605343',0,0,32,32);fill('#edc479',5,5,22,20);fill('#ffedb8',10,7,12,16);fill('#7a7460',0,0,32,4);fill('#7a7460',0,28,32,4);}
    if(type==='campfire'){ctx.clearRect(0,0,32,32);stroke('#97704b',[[4,29],[28,25]],5);stroke('#775c40',[[5,24],[28,30]],5);ctx.fillStyle='#e7a459';ctx.beginPath();ctx.moveTo(7,25);ctx.lineTo(9,13);ctx.lineTo(18,2);ctx.lineTo(18,14);ctx.lineTo(24,8);ctx.lineTo(28,20);ctx.lineTo(22,27);ctx.fill();fill('#ffdf99',14,17,7,10);}
    ctx.restore();
  }
  return canvas;
}
