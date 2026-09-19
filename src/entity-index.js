export class EntityIndex {
 constructor(size=8){this.size=size;this.cells=new Map();this.spare=[];}
 rebuild(entities){for(const bucket of this.cells.values()){bucket.length=0;if(this.spare.length<256)this.spare.push(bucket);}this.cells.clear();for(const entity of entities){const key=`${Math.floor(entity.x/this.size)},${Math.floor(entity.z/this.size)}`;let bucket=this.cells.get(key);if(!bucket)this.cells.set(key,bucket=this.spare.pop()||[]);bucket.push(entity);}return this;}
 *near(x,z,radius){const s=this.size;for(let a=Math.floor((x-radius)/s);a<=Math.floor((x+radius)/s);a++)for(let b=Math.floor((z-radius)/s);b<=Math.floor((z+radius)/s);b++){const bucket=this.cells.get(`${a},${b}`);if(bucket)yield*bucket;}}
}
