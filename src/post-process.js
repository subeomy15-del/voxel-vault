import * as THREE from '../vendor/three.module.js';
// Two low-resolution glow passes. Performance mode renders directly.
export class PostProcess {
  constructor(r){
    this.r=r;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.hdr=r.renderer.extensions.has('EXT_color_buffer_float');const type=this.hdr?THREE.HalfFloatType:THREE.UnsignedByteType;this.sceneTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,type});
    this.sceneTarget.samples=r.renderer.capabilities.isWebGL2?2:0;
    this.glowTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,type});
    const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    this.glow=new THREE.ShaderMaterial({uniforms:{source:{value:this.sceneTarget.texture},texel:{value:new THREE.Vector2()},threshold:{value:this.hdr?1.15:.7}},vertexShader,depthTest:false,depthWrite:false,fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 texel;uniform float threshold;
    void main(){vec3 sum=vec3(0.);for(int i=-4;i<=4;i++){vec3 c=texture2D(source,vUv+vec2(float(i)*texel.x*2.,0.)).rgb;float brightness=max(c.r,max(c.g,c.b));sum+=c*smoothstep(threshold,threshold+.55,brightness)*exp(-float(i*i)/8.); }gl_FragColor=vec4(sum/4.9,1.);}`});
    this.combine=new THREE.ShaderMaterial({uniforms:{source:{value:this.sceneTarget.texture},glow:{value:this.glowTarget.texture},texel:{value:new THREE.Vector2()},strength:{value:.24}},vertexShader,depthTest:false,depthWrite:false,fragmentShader:`varying vec2 vUv;uniform sampler2D source,glow;uniform vec2 texel;uniform float strength;
    void main(){vec3 base=texture2D(source,vUv).rgb,bloom=vec3(0.);for(int i=-4;i<=4;i++)bloom+=texture2D(glow,vUv+vec2(0.,float(i)*texel.y*2.)).rgb*exp(-float(i*i)/8.);
    vec3 color=base+bloom/4.9*strength;float edge=smoothstep(.25,.85,length(vUv-.5));color*=1.-edge*.09;gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.glow);this.scene.add(this.quad);this.size='';
  }
  render(scene,camera,ender){
    const r=this.r.renderer;if(this.r.settings.quality!=='high'){r.setRenderTarget(null);r.render(scene,camera);return;}
    const size=r.getDrawingBufferSize(new THREE.Vector2()),key=size.x+','+size.y;
    if(this.size!==key){this.size=key;this.sceneTarget.setSize(size.x,size.y);this.glowTarget.setSize(Math.ceil(size.x/2),Math.ceil(size.y/2));this.glow.uniforms.texel.value.set(1/size.x,1/size.y);this.combine.uniforms.texel.value.set(2/size.x,2/size.y);}
    this.combine.uniforms.strength.value=ender?.22:.1;
    r.setRenderTarget(this.sceneTarget);r.render(scene,camera);
    this.quad.material=this.glow;r.setRenderTarget(this.glowTarget);r.render(this.scene,this.camera);
    this.quad.material=this.combine;r.setRenderTarget(null);r.render(this.scene,this.camera);
  }
}
