// Geometry is immutable; materials stay local to a model so flashes never bleed.
export class GeometryCache {
 constructor(limit=256){this.limit=limit;this.entries=new Map();this.owners=new WeakMap();}
 acquire(key,create){let entry=this.entries.get(key);if(!entry){entry={key,geometry:create(),users:0};this.entries.set(key,entry);this.owners.set(entry.geometry,entry);}entry.users++;return entry.geometry;}
 release(geometry){const entry=this.owners.get(geometry);if(!entry){geometry?.dispose();return;}entry.users=Math.max(0,entry.users-1);this.trim();}
 trim(){if(this.entries.size<=this.limit)return;for(const[key,entry]of this.entries){if(entry.users)continue;entry.geometry.dispose();this.owners.delete(entry.geometry);this.entries.delete(key);if(this.entries.size<=this.limit)break;}}
 dispose(){for(const entry of this.entries.values())entry.geometry.dispose();this.entries.clear();this.owners=new WeakMap();}
}
export class ModelPool {
 constructor(dispose,limit=32){this.dispose=dispose;this.limit=limit;this.buckets=new Map();this.count=0;}
 take(key){const bucket=this.buckets.get(key),model=bucket?.pop();if(model)this.count--;return model;}
 release(key,model){model.removeFromParent();if(this.count>=this.limit){this.dispose(model);return;}let bucket=this.buckets.get(key);if(!bucket)this.buckets.set(key,bucket=[]);bucket.push(model);this.count++;}
 clear(){for(const bucket of this.buckets.values())for(const model of bucket)this.dispose(model);this.buckets.clear();this.count=0;}
}
