// Original integer-grid materials: broad forms first, restrained fine detail second.
export function paintNaturalMaterial(ctx,type,side){
 const fill=(c,x=0,y=0,w=32,h=32)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 const leaves={leaf:['#527844','#769252','#3b5c34'],jungle_leaf:['#396b43','#64894e','#294e36'],pine:['#41675a','#668877','#304c43'],autumnleaf:['#a47a3e','#c99d54','#765c34'],cherry_leaf:['#bb8f9f','#e0b9c6','#956f83'],mangrove_leaf:['#60794a','#879754','#435d3b'],pear_leaf:['#788d49','#a0ab60','#556a38'],plum_leaf:['#746a73','#9b8490','#535452'],spectral_leaf:['#58757c','#829998','#415d67'],hedge:['#527844','#769252','#3b5c34']};
 if(leaves[type]){
  const p=leaves[type];fill(p[2]);
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
   const x=col*7+(row%2?3:0)-3,y=row*7-2;
   fill(p[0],x+1,y+1,5,5);fill(p[0],x,y+2,7,3);fill(p[1],x+1,y+1,4,2);fill(p[2],x+4,y+4,2,2);fill('#c0c88a33',x+2,y+2,1,3);
  }return;
 }
 if(['grass','dry_grass'].includes(type)){
  const green=type==='grass'?['#768d4e','#91a35d','#5e773e']:['#a49758','#b9ac70','#847d4c'];
  fill(side===0?green[0]:'#8a6f50');
  for(let i=0;i<45;i++){const x=(i*13+side*5)%32,y=(i*19+Math.floor(i/5)*3)%32;if(side===0){fill(green[i%2+1],x,y,1+i%3,1);if(i%3===0)fill(green[2],x+1,y+1,1,2);}else fill(i%2?'#a38a64':'#705b44',x,y,2+i%4,1+i%2);}
  if(side===1){fill(green[0],0,0,32,5);for(let x=0;x<32;x+=3){fill(green[2],x,4,3,1+(x*7)%5);fill(green[1],x,0,2,1);}}return;
 }
 const rock={stone:['#8b9494','#a3aaa4','#717c7e'],andesite:['#818b8d','#a0a5a1','#68747a'],diorite:['#bfc4bb','#d7d8cb','#929f9e'],granite:['#9b877c','#b5a091','#7b716c'],limestone:['#b2ac95','#cec5a8','#928d7e'],slate:['#596873','#77848a','#435560'],basalt:['#4d5b60','#657275','#35464e'],sandstone:['#c0a87a','#d8c296','#a18c69'],gravel:['#8b8c81','#b0afa0','#656f6a']};
 if(rock[type]){
  const p=rock[type];fill(p[0]);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
   const x=col*12-(row%2)*5,y=row*8;fill(p[2],x,y,11,1);fill(p[2],x+10,y,1,6);fill(p[1],x+1,y+1,8,1);
   for(let i=0;i<3;i++)fill(i%2?p[1]:p[2],x+2+i*3,y+3+(col+i)%3,2,1);
  }
  if(type==='gravel')for(let i=0;i<24;i++){const x=(i*11)%31,y=(i*17)%31;fill(p[2],x,y,4,3);fill(p[1],x,y,3,1);}return;
 }
 if(['sand','red_sand','snow','mud','dirt'].includes(type)){
  const p=type==='sand'?['#d3bf91','#e3d1a4','#bdab83']:type==='red_sand'?['#b98256','#ce9d6d','#9f704e']:type==='snow'?['#dbe5e6','#f0f3ed','#c3d2d7']:type==='mud'?['#625d49','#79715a','#4f4e42']:['#8b7152','#a18a62','#735c46'];fill(p[0]);
  for(let i=0;i<32;i++){const x=(i*13+side*3)%32,y=(i*19)%32;fill(p[1+i%2],x,y,1+i%3,1);}
  if(type==='sand'||type==='red_sand')for(let row=0;row<4;row++)for(let x=0;x<32;x++)if((x+row*3)%5!==0)fill(p[1],x,row*8+Math.round(Math.sin(x*.2+row)*1.5),1,1);
 }
}
