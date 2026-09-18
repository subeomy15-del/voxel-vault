export class Diagnostics {
  constructor(capacity=600){
    this.frames=new Float32Array(capacity);this.cursor=0;this.count=0;this.longTasks=[];this.lastChunkInstallMs=0;
    this.development=typeof location!=='undefined'&&(['localhost','127.0.0.1','[::1]'].includes(location.hostname)||new URLSearchParams(location.search).has('debug'));
    if(this.development&&globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')){
      this.observer=new PerformanceObserver(list=>{for(const e of list.getEntries())this.longTasks.push({start:e.startTime,duration:e.duration});if(this.longTasks.length>120)this.longTasks.splice(0,this.longTasks.length-120);});
      this.observer.observe({type:'longtask',buffered:false});
    }
  }
  record(seconds){if(!Number.isFinite(seconds)||seconds<=0||seconds>.5)return;this.frames[this.cursor]=seconds*1000;this.cursor=(this.cursor+1)%this.frames.length;this.count=Math.min(this.count+1,this.frames.length);}
  percentile(p=.95){if(!this.count)return 0;const sorted=Array.from(this.frames.subarray(0,this.count)).sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))];}
  snapshot(renderer,game){
    let meshes=0;const materials=new Set();renderer.scene?.traverse(o=>{if(o.isMesh)meshes++;for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
    return {p95Ms:this.percentile(),heapBytes:globalThis.performance?.memory?.usedJSHeapSize??null,meshes,materials:materials.size,geometries:renderer.renderer?.info.memory.geometries??0,textures:renderer.renderer?.info.memory.textures??0,entities:game.mobs?.length??0,longTasks:this.longTasks.length,chunkInstallMs:this.lastChunkInstallMs,save:game.saveStatus||{status:'unknown',durationMs:0,bytes:0},...renderer.telemetry};
  }
  dispose(){this.observer?.disconnect();this.longTasks.length=0;}
}
