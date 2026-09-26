import * as THREE from '../vendor/three.module.js';

/** One draw call, one geometry and reusable typed storage for every block spark. */
export class ParticlePool {
  constructor(scene, capacity = 384) {
    this.capacity = capacity; this.count = 0; this.limit = 320;
    this.position = new Float64Array(capacity * 3); this.velocity = new Float32Array(capacity * 3);
    this.rotation = new Float32Array(capacity * 3); this.spin = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity); this.age = new Float32Array(capacity); this.size = new Float32Array(capacity);
    this.glow = new Float32Array(capacity); this.alpha = new Float32Array(capacity); this.colors = new Float32Array(capacity * 3);
    this.vectorBuffers = [this.position, this.velocity, this.rotation, this.spin, this.colors]; this.scalarBuffers = [this.life, this.age, this.size, this.glow];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.setAttribute('particleGlow', new THREE.InstancedBufferAttribute(this.glow, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('particleAlpha', new THREE.InstancedBufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.MeshLambertMaterial({ transparent: true, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float particleAlpha; attribute float particleGlow; varying float vParticleAlpha; varying float vParticleGlow;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvParticleAlpha=particleAlpha;vParticleGlow=particleGlow;');
      shader.fragmentShader = 'varying float vParticleAlpha; varying float vParticleGlow;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a*=vParticleAlpha;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vParticleGlow;');
    };
    material.customProgramCacheKey = () => 'pooled-voxel-particles-v2';
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2; scene.add(this.mesh);
    this.dummy = new THREE.Object3D(); this.color = new THREE.Color(); this.colorDirty = false;
  }
  setOrigin(x,z){this.mesh.position.set(x,0,z);}
  get length() { return this.count; }
  configure(level, scale = 1) {
    this.limit = level === 'off' ? 0 : Math.min(this.capacity, Math.max(0, Math.round((level === 'low' ? 112 : 320) * scale)));
    this.count = Math.min(this.count, this.limit); this.mesh.count = this.count;
  }
  clear() { this.count = 0; this.mesh.count = 0; }
  add(x, y, z, vx, vy, vz, life, size, glow = 0) {
    if (this.count >= this.limit) return;
    const i = this.count++, j = i * 3;
    this.position[j] = x; this.position[j + 1] = y; this.position[j + 2] = z;
    this.velocity[j] = vx; this.velocity[j + 1] = vy; this.velocity[j + 2] = vz;
    for (let axis = 0; axis < 3; axis++) { this.rotation[j + axis] = Math.random() * 6; this.spin[j + axis] = (Math.random() - .5) * 9; }
    this.glow[i] = glow; this.life[i] = life; this.age[i] = 0; this.size[i] = size;
    const shade = .8 + Math.random() * .2;
    this.colors[j] = this.color.r * shade; this.colors[j + 1] = this.color.g * shade; this.colors[j + 2] = this.color.b * shade;
    this.colorDirty = true;
  }
  burst(x, y, z, color, count = 12) {
    if (!this.limit) return;
    this.color.set(color);
    const amount = Math.min(count, this.limit < 150 ? Math.ceil(count * .65) : count);
    for (let i = 0; i < amount; i++) this.add(x, y, z, (Math.random() - .5) * 5, Math.random() * 4, (Math.random() - .5) * 5, .45 + Math.random() * .45, .065 + Math.random() * .07);
  }
  firework(x, y, z, color) {
    if (!this.limit) return;
    this.color.set(color);
    const amount = this.limit < 150 ? 28 : 64;
    for (let i = 0; i < amount; i++) { const a = i * 2.399, t = 1 - 2 * (i + .5) / amount, radius = Math.sqrt(1 - t * t); this.add(x, y, z, Math.cos(a) * radius * 10, t * 10 + 4, Math.sin(a) * radius * 10, 1.6 + Math.random() * .7, .10 + Math.random() * .035, 1); }
  }
  fireworkRing(x,y,z,color) {
    if(!this.limit)return;
    this.color.set(color);const amount=this.limit<150?12:32;
    for(let i=0;i<amount;i++){const a=i/amount*Math.PI*2;this.add(x,y,z,Math.cos(a)*13,2+Math.sin(a)*2,Math.sin(a)*13,1.1+Math.random()*.3,.12,1);}
  }
  dust(x, y, z, color, count = 5) {
    if (!this.limit) return;
    this.color.set(color);
    for (let i = 0; i < count; i++) this.add(x + (Math.random() - .5) * .3, y, z + (Math.random() - .5) * .3, (Math.random() - .5) * 1.5, .5 + Math.random() * .6, (Math.random() - .5) * 1.5, .22 + Math.random() * .22, .035 + Math.random() * .025);
  }
  remove(index) {
    const last = --this.count;
    for (const buffer of this.vectorBuffers) for (let axis = 0; axis < 3; axis++) buffer[index * 3 + axis] = buffer[last * 3 + axis];
    for (const buffer of this.scalarBuffers) buffer[index] = buffer[last];
    this.colorDirty = true;
  }
  update(dt) {
    dt = Math.min(.05, Math.max(0, dt));
    for (let i = 0; i < this.count;) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.remove(i); continue; }
      const j = i * 3, remaining = 1 - this.age[i] / this.life[i];
      this.velocity[j + 1] -= dt * 9;
      for (let axis = 0; axis < 3; axis++) { this.position[j + axis] += this.velocity[j + axis] * dt; this.rotation[j + axis] += this.spin[j + axis] * dt; }
      this.dummy.position.set(this.position[j]-this.mesh.position.x, this.position[j + 1], this.position[j + 2]-this.mesh.position.z);
      this.dummy.rotation.set(this.rotation[j], this.rotation[j + 1], this.rotation[j + 2]);
      this.dummy.scale.setScalar(this.size[i] * (.45 + remaining * .55)); this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix); this.alpha[i] = Math.min(1, remaining * 2) * remaining * (this.glow[i] ? .75+.25*Math.sin(this.age[i]*35+i) : 1);
      i++;
    }
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count) { this.mesh.instanceMatrix.needsUpdate = true; this.mesh.geometry.attributes.particleAlpha.needsUpdate = true; this.mesh.geometry.attributes.particleGlow.needsUpdate = true; }
    if (this.colorDirty) { this.mesh.instanceColor.needsUpdate = true; this.colorDirty = false; }
  }
  dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
