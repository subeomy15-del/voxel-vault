// Original pixel patterns: broad, readable clusters instead of per-pixel static.
export function paintBlockStyle(ctx,type,side){
 const palette={spectral_leaf:['#54788c','#7297a9','#3d5e78'],pear_leaf:['#88b249','#a8c65c','#64963b'],plum_leaf:['#825f92','#a47ab0','#694d80'],grass:['#71b449','#86c858','#61a03c'],dirt:['#987048','#a67d51','#805d3f'],stone:['#909ba5','#a1acb5','#7e8993'],sand:['#e5cd8c','#efdb9f','#d5bc7c'],red_sand:['#c7804e','#d8935b','#b26a40'],snow:['#e8f2f5','#ffffff','#d2e3ea'],leaf:['#59a24a','#73b859','#498b3b'],pine:['#42845b','#55986b','#38714f'],cherry_leaf:['#e4a5c4','#f2c1d7','#cf90b3'],autumnleaf:['#d69540','#eab657','#b77731']};
 const p=palette[type];if(!p)return;
 const fill=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const base=type==='grass'&&side!==0?palette.dirt:p;
 fill(base[0],0,0,32,32);
 for(let i=0;i<13;i++){const x=(i*11+side*7)%30,y=(i*17+side*3)%30;fill(base[1+i%2],x,y,2+i%3,2+(i*3)%4);}
 if(type==='grass'&&side===1){fill(p[0],0,0,32,6);for(let i=0;i<8;i++)fill(p[i%3],i*4,4,4,2+(i*7)%5);}
}
