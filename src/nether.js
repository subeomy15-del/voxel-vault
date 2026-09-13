export const NETHER_EXIT={x:0,y:25,z:0};
export const NETHER_END={x:72,y:25,z:-48};
export function netherHeight(w,x,z){
  if(Math.hypot(x,z)<12||Math.abs(x-72)<12&&Math.abs(z+48)<12)return 24;
  return 21+Math.floor(w.noise(x,z,38)*8);
}
export function netherBlock(w,x,y,z){
  if(y===-64)return 'bedrock';
  const h=netherHeight(w,x,z),dx=x-72,dz=z+48;
  for(const p of [NETHER_EXIT,NETHER_END]){
    if(x===p.x&&z===p.z&&y===p.y)return 'ender_gate';
    if(z===p.z&&y>=p.y&&y<=p.y+4&&(Math.abs(x-p.x)===2||y===p.y+4&&Math.abs(x-p.x)<2))return 'obsidian';
  }
  // A ruined fortress surrounds the forward portal, with doorways on both sides.
  if(Math.abs(dx)<=9&&Math.abs(dz)<=9){
    if(y===24)return 'dark_bricks';
    if((Math.abs(dx)===9||Math.abs(dz)===9)&&y>=25&&y<=30&&!(Math.abs(dx)<2&&Math.abs(dz)===9&&y<29))return y===30&&(x+z)%2===0?null:'dark_bricks';
    if(Math.abs(dx)===7&&Math.abs(dz)===7&&y>=25&&y<=35)return 'basalt';
    if(y>24)return null;
  }
  if(y>h){
    const pillar=Math.abs((x+1600)%19-9)<2&&Math.abs((z+1600)%23-11)<2;
    if(pillar&&Math.hypot(x,z)>14&&y<h+5+Math.floor(w.noise(x,z,8)*8))return 'basalt';
    return null;
  }
  if(y===h&&Math.hypot(x,z)>14&&w.noise(x+90,z,13)>.76)return 'amber_glass';
  if(y<h-5&&w.noise(x+y*3,z,9)>.78)return 'gold';
  return y>=h-3?'granite':'basalt';
}
export function realmDestination(g,portal=g.state.gate){
  if(g.state.dimension==='overworld')return 'nether';
  if(g.state.dimension==='ender')return 'nether';
  return portal&&Math.hypot(portal.x-NETHER_END.x,portal.z-NETHER_END.z)<3?'ender':'overworld';
}
