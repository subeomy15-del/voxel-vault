import * as THREE from '../vendor/three.module.js';
import { PlayerModel } from './player-model.js?v=33';

export class MultiplayerPlayers {
  constructor(renderer, client) {
    this.renderer = renderer;
    this.client = client;
    this.players = new Map();
    this.labels = document.createElement('div');
    this.labels.id = 'crew-nameplates';
    this.labels.className = 'crew-nameplates';
    this.labels.setAttribute('aria-hidden', 'true');
    document.body.append(this.labels);
    const geometry = new THREE.ConeGeometry(.25, .6, 4);
    const material = new THREE.MeshBasicMaterial({ color: '#f1ce82' });
    this.marker = new THREE.Mesh(geometry, material);
    this.marker.rotation.z = Math.PI;
    this.marker.visible = false;
    renderer.scene.add(this.marker);
  }

  update(game, dt) {
    const client = this.client;
    const roster = client.active ? client.room?.players || [] : [];
    const ids = new Set(roster.filter(p => p.id !== client.playerId).map(p => p.id));
    for (const [id, player] of this.players) if (!ids.has(id)) {
      this.renderer.disposeGroup(player.model.group);
      player.label.remove(); this.players.delete(id);
    }
    for (const member of roster) {
      if (member.id === client.playerId || !member.pose) continue;
      let remote = this.players.get(member.id);
      if (!remote) {
        const model = new PlayerModel(this.renderer);
        const label = document.createElement('span');
        label.className = 'crew-nameplate';
        label.textContent = member.name;
        label.style.borderColor = member.color;
        this.labels.append(label);
        remote = { model, label, pos: { x: member.pose.x, y: member.pose.y, z: member.pose.z }, yaw: member.pose.yaw, walk: 0 };
        this.players.set(member.id, remote);
      }
      const pose = member.pose;
      const contestant = client.room?.match?.players.find(player => player.id === member.id);
      const visible = pose.dimension === game.state.dimension && client.active && (!contestant || contestant.alive);
      const blend = 1 - Math.exp(-15 * dt);
      const distance = Math.hypot(pose.x - remote.pos.x, pose.y - remote.pos.y, pose.z - remote.pos.z);
      for (const axis of ['x', 'y', 'z']) remote.pos[axis] += (pose[axis] - remote.pos[axis]) * (distance > 12 ? 1 : blend);
      remote.yaw += Math.atan2(Math.sin(pose.yaw - remote.yaw), Math.cos(pose.yaw - remote.yaw)) * blend;
      if (pose.moving) remote.walk += dt * 4;
      remote.model.update({ pos: remote.pos, yaw: remote.yaw, pitch: pose.pitch, moving: pose.moving, grounded: true, walk: remote.walk, state: { armorParts: {} }, held: pose.held }, visible);
      const tint = contestant?.team === 'ember' ? '#de825c' : contestant?.team === 'tide' ? '#65bfc9' : member.color || '#78cbae';
      remote.model.shirt.material.color.set(tint);
      remote.label.style.borderColor = tint;
      const point = visible && !game.screen ? this.renderer.screenPoint(remote.pos.x, remote.pos.y + 2.15, remote.pos.z) : null;
      const nearby = Math.hypot(remote.pos.x - game.pos.x, remote.pos.z - game.pos.z) < 80;
      remote.label.hidden = !point || !nearby || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1;
      if (!remote.label.hidden) { remote.label.style.left = `${point.x * 100}%`; remote.label.style.top = `${point.y * 100}%`; }
    }
    const ping = client.pingMarker;
    this.marker.visible = !!(client.active && ping && ping.until > Date.now() && ping.dimension === game.state.dimension);
    if (this.marker.visible) { this.marker.position.set(ping.x, ping.y + 3 + Math.sin(Date.now() / 200) * .2, ping.z); this.marker.rotation.y += dt; }
  }
}
