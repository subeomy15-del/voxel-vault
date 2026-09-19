export function initialQuality(device={}){
  const memory=device.memory??8,cores=device.cores??4,pixels=(device.width??1280)*(device.height??720)*(device.dpr??1)**2;
  if(device.touch||memory<=4||cores<=2||pixels>7000000)return 'low';
  return 'medium';
}
export function deviceProfile(){return {memory:globalThis.navigator?.deviceMemory,cores:globalThis.navigator?.hardwareConcurrency,width:globalThis.innerWidth,height:globalThis.innerHeight,dpr:globalThis.devicePixelRatio,touch:globalThis.matchMedia?.('(pointer: coarse)').matches||false};}
export class AutoQuality {
 constructor(device=deviceProfile()){this.level=initialQuality(device);this.mobile=!!device.touch;this.frames=new Float32Array(240);this.count=0;this.cursor=0;this.elapsed=0;this.stable=0;this.cooldown=0;}
 record(seconds,active=true){
  if(!active||!Number.isFinite(seconds)||seconds<=0||seconds>.25)return false;
  this.cooldown=Math.max(0,this.cooldown-seconds);this.frames[this.cursor++%240]=seconds*1000;this.count=Math.min(240,this.count+1);this.elapsed+=seconds;
  if(this.elapsed<3||this.count<45)return false;
  const elapsed=this.elapsed;this.elapsed=0;const sorted=Array.from(this.frames.subarray(0,this.count)).sort((a,b)=>a-b),p95=sorted[Math.floor((sorted.length-1)*.95)];
  const budget=this.mobile?34:20;this.stable=p95<budget*.87?this.stable+elapsed:0;
  if(this.cooldown)return false;
  const levels=['low','medium','high'],index=levels.indexOf(this.level);let next=index;
  if(p95>budget*1.15&&index>0)next=index-1;
  // Phones retain Low's memory/shadow budget; resolution can still recover.
  else if(!this.mobile&&this.stable>30&&index<2)next=index+1;
  if(next===index)return false;
  this.level=levels[next];this.stable=0;this.cooldown=15;this.count=0;this.cursor=0;return true;
 }
}
