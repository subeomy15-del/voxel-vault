// Bounded A* on the local walking surface. No water shortcuts or corner cutting.
export function findMobPath(world,mob,target,body,budget=112){
  const sx=Math.floor(mob.x),sz=Math.floor(mob.z),tx=Math.floor(target.x),tz=Math.floor(target.z),key=(x,z)=>x+','+z;
  const start={x:sx,z:sz,y:mob.y,g:0,h:Math.hypot(tx-sx,tz-sz),parent:null},open=[start],seen=new Map([[key(sx,sz),start]]),closed=new Set();let best=start;
  const walk=(x,z,y)=>{const top=world.ground(x+.5,z+.5,y+1.1);if(Math.abs(top-y)>1.05||world.waterAt(x+.5,top+.15,z+.5)||world.intersects(x+.5,top,z+.5,body.height||1.7,body.radius||.28))return null;return top;};
  while(open.length&&budget-->0){
    let index=0;for(let i=1;i<open.length;i++)if(open[i].g+open[i].h<open[index].g+open[index].h)index=i;
    const n=open.splice(index,1)[0];closed.add(key(n.x,n.z));if(n.h<best.h)best=n;if(n.x===tx&&n.z===tz){best=n;break;}
    for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=n.x+dx,z=n.z+dz,k=key(x,z);if(closed.has(k)||Math.abs(x-sx)>14||Math.abs(z-sz)>14)continue;
      const y=walk(x,z,n.y);if(y===null)continue;
      if(dx&&dz&&(walk(n.x+dx,n.z,n.y)===null||walk(n.x,n.z+dz,n.y)===null))continue;
      const cost=n.g+(dx&&dz?1.414:1)+Math.abs(y-n.y)*.6,old=seen.get(k);if(old&&old.g<=cost)continue;
      const next={x,z,y,g:cost,h:Math.hypot(tx-x,tz-z),parent:n};if(old){const i=open.indexOf(old);if(i>=0)open.splice(i,1);}seen.set(k,next);open.push(next);
    }
  }
  const path=[];for(let n=best;n.parent;n=n.parent)path.push({x:n.x+.5,y:n.y,z:n.z+.5});return path.reverse();
}
export function visibleBetween(world,from,to){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,d=Math.hypot(dx,dy,dz),steps=Math.ceil(d/.3);
  for(let i=1;i<steps;i++){const f=i/steps;if(world.solid(Math.floor(from.x+dx*f),Math.floor(from.y+dy*f),Math.floor(from.z+dz*f)))return false;}return true;
}
