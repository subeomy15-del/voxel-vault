// Native antialiasing, shadows and color management without bloom.
export class PostProcess {
  constructor(r){this.r=r;}
  render(scene,camera){
    this.r.renderer.setRenderTarget(null);
    this.r.renderer.render(scene,camera);
  }
}
