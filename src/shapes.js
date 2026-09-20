import { BLOCKS } from './data.js?v=35';
const full=[[0,0,0,1,1,1]];
export const boxesFor=type=>BLOCKS[type]?.boxes||full;
export function overlapsBlock(type,bx,by,bz,x,y,z,height=1.75,radius=.28){
  if(!BLOCKS[type]?.solid)return false;
  return boxesFor(type).some(b=>x+radius>bx+b[0]+.0001&&x-radius<bx+b[3]-.0001&&y+height>by+b[1]+.001&&y<by+b[4]-.001&&z+radius>bz+b[2]+.0001&&z-radius<bz+b[5]-.0001);
}
export function rayShape(origin,dir,bx,by,bz,type,max){
  let closest=null;
  for(const b of boxesFor(type)){
    let near=0,far=max,normal={x:0,y:0,z:0};
    for(const[i,axis]of ['x','y','z'].entries()){
      const offset=[bx,by,bz][i],low=offset+b[i],high=offset+b[i+3],d=dir[axis];
      if(Math.abs(d)<1e-10){if(origin[axis]<low||origin[axis]>high){far=-1;break;}continue;}
      let t1=(low-origin[axis])/d,t2=(high-origin[axis])/d;const sign=d>0?-1:1;if(t1>t2)[t1,t2]=[t2,t1];
      if(t1>near){near=t1;normal={x:0,y:0,z:0};normal[axis]=sign;}far=Math.min(far,t2);if(near>far)break;
    }
    if(near<=far&&far>=0&&(!closest||near<closest.distance))closest={distance:near,normal};
  }
  return closest;
}
