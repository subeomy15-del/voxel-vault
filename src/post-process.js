import * as THREE from '../vendor/three.module.js';
// A switchable, single-pass FXAA filter. The scene retains its normal lighting and tone map.
export class PostProcess {
  constructor(r){
    this.r=r;this.size=new THREE.Vector2();this.enabled=false;this.target=null;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:null},texel:{value:new THREE.Vector2(1,1)}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D source;uniform vec2 texel;varying vec2 vUv;
      void main(){vec3 m=texture2D(source,vUv).rgb;
      vec3 nw=texture2D(source,vUv+vec2(-1.,-1.)*texel).rgb,ne=texture2D(source,vUv+vec2(1.,-1.)*texel).rgb;
      vec3 sw=texture2D(source,vUv+vec2(-1.,1.)*texel).rgb,se=texture2D(source,vUv+vec2(1.,1.)*texel).rgb;
      vec3 luma=vec3(.299,.587,.114);float lm=dot(m,luma),lnw=dot(nw,luma),lne=dot(ne,luma),lsw=dot(sw,luma),lse=dot(se,luma);
      vec2 direction=vec2(-((lnw+lne)-(lsw+lse)),(lnw+lsw)-(lne+lse));
      float reduce=max((lnw+lne+lsw+lse)*.03125,.0078125);
      direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduce),vec2(-6.),vec2(6.))*texel;
      vec3 a=.5*(texture2D(source,vUv+direction*(-1./6.)).rgb+texture2D(source,vUv+direction*(1./6.)).rgb);
      vec3 b=a*.5+.25*(texture2D(source,vUv-direction*.5).rgb+texture2D(source,vUv+direction*.5).rgb);
      float lb=dot(b,luma),lo=min(lm,min(min(lnw,lne),min(lsw,lse))),hi=max(lm,max(max(lnw,lne),max(lsw,lse)));
      gl_FragColor=vec4(lb<lo||lb>hi?a:b,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  }
  setEnabled(enabled){this.enabled=!!enabled;if(!this.enabled&&this.target){this.target.dispose();this.target=null;}}
  render(scene,camera){
    const renderer=this.r.renderer;
    if(!this.enabled){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
    renderer.getDrawingBufferSize(this.size);
    if(!this.target)this.target=new THREE.WebGLRenderTarget(this.size.x,this.size.y,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});
    if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);
    this.material.uniforms.source.value=this.target.texture;this.material.uniforms.texel.value.set(1/this.size.x,1/this.size.y);
    renderer.setRenderTarget(this.target);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(this.scene,this.camera);
  }
}
