/* Third/first-person player with simple physics + collisions */
import { THREE, M, box, cyl } from './engine.js';

export class Player {
  constructor() {
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0.25; this.vy = 0; this.onGround = true;
    this.dist = 6; this.firstPerson = false; this.radius = 0.4; this.walkT = 0; this.sitting = false;
    const g = new THREE.Group(); this.mesh = g;
    const skin = M(0xb07a52), shirt = M(0xe8641c, { roughness: 0.9 }), pants = M(0x2b2f3a), cap = M(0x7a2c3a);
    this.legL = new THREE.Group(); this.legR = new THREE.Group(); this.armL = new THREE.Group(); this.armR = new THREE.Group();
    box(0.2, 0.85, 0.24, pants, 0, -0.85, 0, this.legL); box(0.2, 0.85, 0.24, pants, 0, -0.85, 0, this.legR);
    box(0.22, 0.1, 0.32, M(0x2a1d14), 0, -0.9, 0.05, this.legL); box(0.22, 0.1, 0.32, M(0x2a1d14), 0, -0.9, 0.05, this.legR);
    this.legL.position.set(-0.13, 0.9, 0); this.legR.position.set(0.13, 0.9, 0);
    const torso = box(0.56, 0.7, 0.3, shirt, 0, 0.88, 0); torso.scale.set(1, 1, 1);
    box(0.15, 0.7, 0.16, shirt, 0, -0.68, 0, this.armL); box(0.15, 0.7, 0.16, shirt, 0, -0.68, 0, this.armR);
    box(0.12, 0.14, 0.13, skin, 0, -0.8, 0, this.armL); box(0.12, 0.14, 0.13, skin, 0, -0.8, 0, this.armR);
    this.armL.position.set(-0.36, 1.56, 0); this.armR.position.set(0.36, 1.56, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin); head.position.y = 1.78; head.castShadow = true;
    const topi = cyl(0.16, 0.17, 0.16, 12, cap, 0, 1.86, 0); topi.rotation.x = -0.12; // dhaka-style cap
    const neck = cyl(0.07, 0.07, 0.1, 8, skin, 0, 1.58, 0);
    g.add(this.legL, this.legR, torso, this.armL, this.armR, head, topi, neck);
    this.body = g;
  }
  setSpawn(s) { this.pos.set(s.x, s.y || 0, s.z); this.yaw = s.yaw ?? 0; this.vy = 0; this.sitting = false; }
  update(dt, input, world, camera) {
    const look = input.consumeLook();
    this.yaw -= look.dx * 0.0032; this.pitch = THREE.MathUtils.clamp(this.pitch + look.dy * 0.0026, -0.6, 1.2);
    const z = input.consumeZoom(); if (z) { this.dist = THREE.MathUtils.clamp(this.dist + z * 0.8, 2.5, 14); }
    const a = input.axes();
    this.yaw -= a.turn * 2.2 * dt;
    let moving = false;
    if (!this.sitting) {
      const speed = (a.sprint ? 9.5 : 4.6);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let dx = (fx * a.y + rx * a.x) * speed * dt, dz = (fz * a.y + rz * a.x) * speed * dt;
      moving = Math.abs(a.x) + Math.abs(a.y) > 0.05;
      if (moving) {
        let nx = this.pos.x + dx, nz = this.pos.z + dz;
        // water / blocked areas: try full move, then axis-separated slide
        if (world.blocked?.(nx, nz, this.pos.y)) {
          if (!world.blocked(nx, this.pos.z, this.pos.y)) nz = this.pos.z;
          else if (!world.blocked(this.pos.x, nz, this.pos.y)) nx = this.pos.x;
          else { nx = this.pos.x; nz = this.pos.z; }
        }
        const r = world.colliders ? world.colliders.resolve(nx, nz, this.radius, this.pos.y) : { x: nx, z: nz };
        const b = world.bounds;
        this.pos.x = b ? THREE.MathUtils.clamp(r.x, b[0], b[2]) : r.x; this.pos.z = b ? THREE.MathUtils.clamp(r.z, b[1], b[3]) : r.z;
        const targetYaw = Math.atan2(-(fx * a.y + rx * a.x), -(fz * a.y + rz * a.x));
        let d = targetYaw - this.body.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        this.body.rotation.y += d * Math.min(1, dt * 12);
      }
      // gravity / ground
      const gy = world.heightAt ? world.heightAt(this.pos.x, this.pos.z) : 0;
      if (input.consumeJump() && this.onGround) { this.vy = 5.2; this.onGround = false; }
      this.vy -= 16 * dt; this.pos.y += this.vy * dt;
      if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; this.onGround = true; }
      else if (this.onGround && this.pos.y - gy < 0.6 && this.vy <= 0) { this.pos.y = gy; } // stick to ramps
    } else { input.consumeJump(); }
    // walk animation
    this.walkT += dt * (moving ? (a.sprint ? 13 : 8) : 0);
    const sw = moving ? Math.sin(this.walkT) * (a.sprint ? 0.9 : 0.6) : 0;
    const k = Math.min(1, dt * 10);
    this.legL.rotation.x += ((this.sitting ? -1.4 : sw) - this.legL.rotation.x) * k;
    this.legR.rotation.x += ((this.sitting ? -1.4 : -sw) - this.legR.rotation.x) * k;
    if (!this.eating) { this.armL.rotation.x += (-sw - this.armL.rotation.x) * k; this.armR.rotation.x += (sw - this.armR.rotation.x) * k; }
    else { this.eatT = (this.eatT || 0) + dt; this.armR.rotation.x = -1.9 - Math.sin(this.eatT * 9) * 0.35; }
    this.mesh.position.copy(this.pos); if (this.sitting) this.mesh.position.y -= 0.45;
    this.mesh.position.y += moving ? Math.abs(Math.sin(this.walkT)) * 0.05 : 0;
    // camera
    this.mesh.visible = !this.firstPerson;
    const head = new THREE.Vector3(this.pos.x, this.pos.y + (this.sitting ? 1.15 : 1.6), this.pos.z);
    if (this.firstPerson) {
      camera.position.copy(head);
      camera.rotation.set(-this.pitch * 0.8, this.yaw, 0, 'YXZ');
    } else {
      let d = this.dist; const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      // camera collision: march outward from the head, stop before walls / colliders
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const k = d * i / steps, x = head.x + Math.sin(this.yaw) * cp * k, z = head.z + Math.cos(this.yaw) * cp * k, y = head.y + sp * k + 0.4;
        let hit = world.blocked?.(x, z, y) && !(world.heightAt && world.heightAt(x, z) > 0) && !world.isWater?.(x, z);
        if (!hit && world.colliders) { const r = world.colliders.resolve(x, z, 0.25, y); hit = Math.abs(r.x - x) + Math.abs(r.z - z) > 0.01; }
        if (hit) { d = Math.max(1.2, d * (i - 1) / steps); break; }
      }
      this.camDist = this.camDist === undefined ? d : (d < this.camDist ? d : this.camDist + (d - this.camDist) * Math.min(1, dt * 4));
      d = this.camDist;
      camera.position.set(head.x + Math.sin(this.yaw) * cp * d, head.y + sp * d + 0.4, head.z + Math.cos(this.yaw) * cp * d);
      const minY = (world.heightAt ? world.heightAt(camera.position.x, camera.position.z) : 0) + 0.4;
      if (camera.position.y < minY) camera.position.y = minY;
      camera.lookAt(head.x, head.y + 0.2, head.z);
    }
  }
}
