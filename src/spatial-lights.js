const emissive=new Set(['torch','lantern','campfire']);
export class SpatialLights {
  constructor(){this.cells=new Map();this.visited=0;}
  update(key,type,previous){
    if(!emissive.has(type)&&!emissive.has(previous))return;
    const[x,y,z]=key.split(',').map(Number),cell=`${Math.floor(x/16)},${Math.floor(z/16)}`;
    if(emissive.has(type)){let points=this.cells.get(cell);if(!points){points=new Map();this.cells.set(cell,points);}points.set(key,{x,y,z,type});}
    else{const points=this.cells.get(cell);points?.delete(key);if(!points?.size)this.cells.delete(cell);}
  }
  nearest(position,radius=16,count=4,accept=null){
    const nearest=[];this.visited=0;
    for(let x=Math.floor((position.x-radius)/16);x<=Math.floor((position.x+radius)/16);x++)for(let z=Math.floor((position.z-radius)/16);z<=Math.floor((position.z+radius)/16);z++){
      for(const point of this.cells.get(`${x},${z}`)?.values()||[]){
        this.visited++;if(accept&&!accept(point))continue;const distance=(point.x-position.x)**2+(point.y-position.y)**2+(point.z-position.z)**2;if(distance>=radius*radius)continue;
        let i=0;while(i<nearest.length&&nearest[i].distance<=distance)i++;if(i<count){nearest.splice(i,0,{point,distance});if(nearest.length>count)nearest.pop();}
      }
    }return nearest;
  }
}
