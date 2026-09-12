// Keep the camera's near plane clear of nearby blocks, including diagonal corners.
export function cameraPosition(world,eye,direction,distance=4.2){
  let safe=0;
  for(let d=.12;d<=distance;d+=.12){
    const p={x:eye.x+direction.x*d,y:eye.y+direction.y*d,z:eye.z+direction.z*d};
    if(world.intersects(p.x,p.y-.16,p.z,.32,.18))break;
    safe=d;
  }
  return{x:eye.x+direction.x*safe,y:eye.y+direction.y*safe,z:eye.z+direction.z*safe,distance:safe};
}
