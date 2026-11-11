/* Ravan Dahan ground: crowd, stage, effigy — press E to light it (fire + fireworks) */
import { THREE, M, box, cyl, pbr, glowMat, signMesh } from '../engine.js';
import { ravanEffigy } from '../prefabs.js';
import { baseScene } from './base.js';

export async function create(ctx) {
  const S = baseScene(ctx, { name: 'Ravan Dahan ground', half: 60, floor: pbr('aerial_grass_rock', 20, { color: 0xcdb98a }), fogFar: 300 });
  const { scene, colliders } = S;
  const ef = ravanEffigy(scene, 24); ef.position.set(0, 0, -20); colliders.add(0, -20, 5, 2.5);
  const burnMats = []; ef.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); burnMats.push([o.material, o.material.color.clone()]); } });
  const black = new THREE.Color(0x141210); const s0 = ef.scale.y;
  const fence = M(0x8a6a3a); box(30, 1.2, 0.3, fence, 0, 0, -10, scene); colliders.add(0, -10, 15, 0.3);
  // stage with lights
  box(22, 1.6, 10, M(0x5b3a22), 0, 0, -38, scene); colliders.add(0, -38, 11, 5);
  box(22, 8, 0.4, M(0x2a1a1a), 0, 1.6, -43, scene);
  const scr = signMesh('रामलीला · Ramleela', 12, { bg: '#7a1a1a', fg: '#ffe6a8', font: 'bold 60px Inter, sans-serif', sub: 'Vijaya Dashami' }); scr.position.set(0, 7, -42.7); scene.add(scr);
  for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), glowMat(0xffffff, 0xfff0c0, 6)); b.position.set(-10 + i * 2.85, 9.8, -42.5); scene.add(b); }
  // crowd (instanced)
  const N = Math.round(500 * ctx.quality.density + 150);
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.25, 0.9, 3, 6), M(0xffffff, { roughness: 0.9 }), N);
  const tmp = new THREE.Object3D(); const cols = [0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b, 0xe58fa8, 0xffffff, 0x7a2c3a, 0xe0702a];
  const crowdPos = [];
  for (let i = 0; i < N; i++) {
    let x, z; do { x = (Math.random() - 0.5) * 100; z = -4 + Math.random() * 46; } while (Math.abs(x) < 4 && z > 20);
    tmp.position.set(x, 0.75, z); tmp.rotation.y = Math.random() * 6; tmp.updateMatrix(); body.setMatrixAt(i, tmp.matrix); body.setColorAt(i, new THREE.Color(cols[i % cols.length])); crowdPos.push([x, z]);
  }
  scene.add(body);
  // crowd is soft: only block a few clusters (keep a central aisle walkable)
  // floodlights
  for (const x of [-40, 40]) { cyl(0.3, 0.4, 16, 8, M(0x444444), x, 0, -6, scene); const l = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.5), glowMat(0xffffff, 0xfff6e0, 4)); l.position.set(x, 16, -6); l.lookAt(0, 0, -20); scene.add(l); colliders.addCircle(x, -6, 0.5); }
  let burning = 0, burnt = false;
  const fireLight = new THREE.PointLight(0xff7a20, 0, 120, 1.2); fireLight.position.set(0, 12, -18); scene.add(fireLight);
  S.interactables.push({ x: 0, z: -7, r: 4, label: 'Light the Ravan effigy 🔥', type: 'action', run() {
    if (burning > 0) return; burning = 12; burnt = false; ctx.toast('🎆 विजया दशमी! Good triumphs over evil'); } });
  S.screen('assets/videos/ravan-dahan.mp4', 'assets/videos/ravan-dahan-poster.webp', 34, 20, -0.7, 10, 16 / 9, 2);
  box(0.4, 2, 0.4, M(0x222222), 30.7, 0, 22.9, scene); box(0.4, 2, 0.4, M(0x222222), 37.3, 0, 17.1, scene);
  S.label('Real drone footage · Ravan Dahan', 34, 10.5, 20);
  S.info('ravan', 26, 26, 'About Ravan Dahan & Ramleela', 4);
  S.exit(0, 46, 'Back to Nepalgunj streets');
  const fireCols = [0xff5a1a, 0xffa020, 0xffd040, 0xff3010];
  const fwCols = [0xff3a5a, 0x5affc8, 0xffe14a, 0x7a8aff, 0xff9a2a, 0xffffff];
  return {
    ...S, spawn: { x: 0, z: 37, yaw: 0 },
    update(dt, t, p) {
      S.baseUpdate(dt, t, p);
      if (burning > 0) {
        burning -= dt;
        for (let k = 0; k < 3; k++) S.particles.burst((Math.random() - 0.5) * 6, 2 + Math.random() * 18 * Math.max(0.2, ef.scale.y), -20, 6, fireCols[k % 4], 3, 1.2, 4);
        if (Math.random() < dt * 3) S.particles.burst((Math.random() - 0.5) * 60, 35 + Math.random() * 20, -30 + Math.random() * 20, 120, fwCols[Math.floor(Math.random() * fwCols.length)], 14, 1.8);
        fireLight.intensity = 300 + Math.sin(t * 20) * 80;
        ef.scale.y = Math.max(0.15, ef.scale.y - dt * 0.07);
        burnMats.forEach(([m]) => m.color.lerp(black, dt * 0.25));
        if (burning <= 0) { fireLight.intensity = 0; burnt = true; setTimeout(() => { ef.scale.y = s0; burnMats.forEach(([m, c]) => m.color.copy(c)); }, 6000); }
      }
    }
  };
}
