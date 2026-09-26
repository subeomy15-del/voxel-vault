// Logical coordinates remain doubles. Only the render pass uses nearby coordinates.
export class FloatingOrigin {
  constructor(){this.x=0;this.z=0;this.rebases=0;}
  update(position){
    const x=Math.floor(position.x/256)*256,z=Math.floor(position.z/256)*256;
    if(x===this.x&&z===this.z)return false;
    this.x=x;this.z=z;this.rebases++;return true;
  }
  render(scene,draw){
    const saved=[];
    // Group descendants inherit the translation once; camera attachments follow it.
    for(const object of scene.children){saved.push([object,object.position.x,object.position.z]);object.position.x-=this.x;object.position.z-=this.z;}
    try{return draw();}finally{
      for(const[object,x,z]of saved){object.position.x=x;object.position.z=z;}
      // Gameplay ray projections after this pass still use logical coordinates.
      scene.updateMatrixWorld(true);
    }
  }
}
