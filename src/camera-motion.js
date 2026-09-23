const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export class CameraMotion {
  constructor() { this.reset(); }
  reset() { this.offset = 0; this.velocity = 0; this.roll = 0; this.fov = 74; this.kick = 0; this.eyeHeight = 1.58; }
  impulse(kind, strength = 1) {
    const amount = clamp(Number(strength) || 0, 0, 1);
    if (kind === 'land') this.velocity -= amount * 1.4;
    else if (kind === 'jump') { this.offset -= amount * .025; this.velocity += amount * .32; this.kick = Math.max(this.kick, amount * 1.1); }
    else if (kind === 'dash') this.kick = Math.max(this.kick, amount * 3);
  }
  update(game, dt, settings) {
    dt = clamp(dt || 0, 0, .05);
    if (settings.cameraEffects) {
      if (game.jumpImpulse > 0) this.impulse('jump', game.jumpImpulse);
      if (game.landingImpulse > 0) this.impulse('land', game.landingImpulse);
    }
    game.jumpImpulse = game.landingImpulse = 0;
    const active = settings.cameraEffects && !game.screen;
    const eyeTarget = game.crouching ? 1.15 : 1.58;
    this.eyeHeight = active ? this.eyeHeight + (eyeTarget - this.eyeHeight) * (1 - Math.exp(-dt * 18)) : eyeTarget;
    if (!active) { this.offset = 0; this.velocity = 0; this.kick = 0; }
    this.velocity += (-this.offset * 100 - this.velocity * 17) * dt;
    this.offset = clamp(this.offset + this.velocity * dt, -.11, .06);
    this.kick *= Math.exp(-dt * 7);
    const bob = active && settings.bobbing && game.moving && game.grounded ? Math.sin((game.walk || 0) * 10) * (game.sprinting ? .034 : .023) : 0;
    const strafe = (game.vx || 0) * Math.cos(game.yaw || 0) - (game.vz || 0) * Math.sin(game.yaw || 0);
    const targetRoll = active && settings.bobbing ? clamp(-strafe * (game.gliding ? .006 : .002), -.04, .04) : 0;
    this.roll += (targetRoll - this.roll) * (1 - Math.exp(-dt * 9));
    const speedFov = active ? game.gliding ? 7 : game.dashTime > 0 ? 6 : game.sprinting ? 3 : 0 : 0;
    const zoom = game.keys?.has('KeyV');
    const targetFov = zoom ? Math.min(38, settings.fov * .48) : settings.fov + speedFov + this.kick;
    this.fov += (targetFov - this.fov) * (1 - Math.exp(-dt * 10));
    return { y: bob + this.offset, eyeHeight: this.eyeHeight, pitch: active ? -this.offset * .11 : 0, roll: this.roll, fov: this.fov };
  }
}
