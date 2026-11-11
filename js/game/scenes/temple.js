/* Inside Bageshwori Temple complex: courtyard, pagoda, pond with Junge Mahadev, bells, diyas, photo backdrops */
import { THREE, M, PAL, box, cyl, pbr, glowMat, palm, signMesh } from '../engine.js';
import { pagoda, pavilion, shikhara } from '../prefabs.js';
import { baseScene } from './base.js';

export async function create(ctx) {
  const S = baseScene(ctx, { name: 'Bageshwori Mandir', half: 46, floor: pbr('marble_01', 30, { color: 0xe9e1d2, roughness: 0.6 }) });
  const { scene, colliders } = S;
  const wallM = pbr('plastered_wall_04', 6, { color: 0xf0e3c8 });
  // perimeter walls with real-photo panels (backdrops)
  [[0, -46, 92, 1], [0, 46, 92, 1], [-46, 0, 1, 92], [46, 0, 1, 92]].forEach(([x, z, w, d]) => box(w, 5, d, wallM, x, 0, z, scene));
  const photos = [
    ['assets/img/bageshwori-temple-brmagar.webp', -24, -45.4, 0, 1.5], ['assets/img/bageshwari-temple-partel-2019.webp', 0, -45.4, 0, 1.5], ['assets/img/bageshwori-temple-dhungana-8.webp', 24, -45.4, 0, 1.42],
    ['assets/img/bageshwori-temple-basnet-01.webp', -45.4, -20, Math.PI / 2, 1.5], ['assets/img/bageshwori-temple-aryal-2016.webp', -45.4, 10, Math.PI / 2, 1.5],
    ['assets/img/junge-mahadev-temple-23.webp', 45.4, -20, -Math.PI / 2, 1.5], ['assets/img/bageshwori-temple-dhungana-1.webp', 45.4, 10, -Math.PI / 2, 1.5]
  ];
  photos.forEach(([img, x, z, r, a]) => S.photo(img, x, 6.5, z, 9, a, r));
  // main pagoda
  const pg = pagoda(scene, 1); pg.position.set(0, 0, -22); colliders.add(0, -22, 8.6, 7.2);
  S.animated.push(t => pg.userData.flag.rotation.y = Math.sin(t * 3) * 0.35);
  S.info('bageshwori', 0, -12, 'About Bageshwori Mandir', 5);
  S.label('Bageshwori Mandir<small>बागेश्वरी मन्दिर</small>', 0, 24, -22, 'big');
  // bells rows
  const bellM = M(0xc9a13a, { metalness: 0.9, roughness: 0.25 });
  const bells = [];
  for (const side of [-1, 1]) {
    box(0.3, 3.2, 0.3, M(PAL.red), side * 12, 0, -10, scene); box(0.3, 3.2, 0.3, M(PAL.red), side * 12, 0, -2, scene);
    box(0.25, 0.25, 8.3, M(PAL.red), side * 12, 3.1, -6, scene);
    for (let i = 0; i < 7; i++) { const b = new THREE.Group(); b.position.set(side * 12, 3.0, -9.5 + i * 1.2); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.5, 12, 1, true), bellM); m.position.y = -0.35; b.add(m); scene.add(b); bells.push(b); }
    colliders.add(side * 12, -6, 0.3, 4.2);
    S.interactables.push({ x: side * 10.5, z: -6, r: 2.6, label: 'Ring the temple bells', type: 'action', run() { bells.forEach((b, k) => b.userData.swing = 1 + k * 0.05); S.particles.burst(side * 12, 3, -6, 40, 0xffd27a, 2, 1); ctx.toast('🔔 टन्… टन्… The bells ring out'); } });
  }
  S.animated.push((t, dt) => bells.forEach((b, k) => { const s = b.userData.swing || 0; b.rotation.x = Math.sin(t * 8 + k) * 0.5 * s; b.userData.swing = Math.max(0, s - (dt || 0.016) * 0.6); }));
  // smaller shrines: Bajrangbali & Buddhist gumba with photo boards
  const sh = shikhara(scene, 0.8); sh.position.set(-30, 0, -26); colliders.add(-30, -26, 3.4, 3.4);
  S.photo('assets/img/bajrangbali-temple-sm.webp', -30, 2.6, -21.5, 3.6, 1.33);
  S.label('Bajrangbali shrine', -30, 12, -26);
  S.info('bajrangbali', -30, -19, 'About the Bajrangbali shrine', 3);
  const gb = new THREE.Group(); gb.position.set(30, 0, -26); scene.add(gb);
  box(7, 4, 7, pbr('plastered_wall_04', 1, { color: 0xf6f0e2 }), 0, 0, 0, gb);
  const st = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf8f8f4)); st.position.y = 4; gb.add(st);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 12), M(PAL.gold, { metalness: 0.8, roughness: 0.3 })); sp.position.y = 7.6; gb.add(sp);
  colliders.add(30, -26, 3.5, 3.5);
  S.photo('assets/img/three-gumba-sm.webp', 30, 2.6, -22.3, 3.6, 1.33);
  S.label('Buddhist gumba', 30, 11, -26);
  S.info('gumba', 30, -19, 'About the gumba', 3);
  // pond with Junge Mahadev pavilion + yellow walkway
  const PZ = 22, PW = 50, PD = 30;
  const rim = M(0xe0702a, { roughness: 0.6 });
  [[0, PZ - PD / 2 - 0.5, PW + 2, 1], [0, PZ + PD / 2 + 0.5, PW + 2, 1], [-PW / 2 - 0.5, PZ, 1, PD + 2], [PW / 2 + 0.5, PZ, 1, PD + 2]].forEach(([x, z, w, d]) => box(w, 0.9, d, rim, x, 0, z, scene));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshStandardMaterial({ color: 0x4a7a5a, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.4, PZ); scene.add(water);
  const pv = pavilion(scene); pv.position.set(0, 0.8, PZ + 4);
  S.label('Junge Mahadev<small>जुंगे महादेव</small>', 0, 11, PZ + 4);
  const walkLen = (PZ + 4 - 4.2) - (PZ - PD / 2);
  const walk = box(3, 0.5, walkLen + 1, M(0xf2c230, { roughness: 0.6 }), 0, 0.5, PZ - PD / 2 + walkLen / 2, scene);
  [-1.6, 1.6].forEach(x => box(0.3, 1, walkLen, M(0xf2c230), x, 1, walk.position.z, scene));
  const onWalk = (x, z) => (Math.abs(x) < 1.35 && z > PZ - PD / 2 - 1 && z < PZ + 4) || Math.hypot(x, z - PZ - 4) < 4.0;
  S.blocked = (x, z) => !onWalk(x, z) && Math.abs(x) < PW / 2 + 0.5 && Math.abs(z - PZ) < PD / 2 + 0.5;
  S.heightAt = (x, z) => onWalk(x, z) ? (Math.hypot(x, z - PZ - 4) < 4 ? 0.8 : 1.0) : 0;
  colliders.addCircle(0, PZ + 4, 0.9);
  S.info('junge', 0, PZ - 1, 'About Junge Mahadev', 3);
  // geese on the pond
  const geese = [];
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), M(0xf6f6f2)); b.scale.set(1, 0.7, 1.5); g.add(b); const n = cyl(0.07, 0.09, 0.6, 6, M(0xf6f6f2), 0, 0.1, 0.4, g); n.rotation.x = -0.3; const bk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), M(0xe8901a)); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.7, 0.62); g.add(bk); scene.add(g); geese.push(g); }
  S.animated.push(t => geese.forEach((g, i) => { const a = t * 0.15 + i * 0.5; g.position.set(-14 + Math.cos(a) * 6 + i * 0.4, 0.55, PZ + 6 + Math.sin(a) * 6); g.rotation.y = -a; }));
  // diyas around pond (glow at night) + palms
  const diyaM = glowMat(0xffd27a, 0xff9a2a, 4);
  const dg = new THREE.SphereGeometry(0.16, 6, 4); const n = 60; const dI = new THREE.InstancedMesh(dg, diyaM, n); const tmp = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const t = i / n, per = 2 * (PW + PD); let d = t * per, x, z; if (d < PW) { x = -PW / 2 + d; z = PZ - PD / 2 - 0.5; } else if (d < PW + PD) { x = PW / 2 + 0.5; z = PZ - PD / 2 + d - PW; } else if (d < 2 * PW + PD) { x = PW / 2 - (d - PW - PD); z = PZ + PD / 2 + 0.5; } else { x = -PW / 2 - 0.5; z = PZ + PD / 2 - (d - 2 * PW - PD); } tmp.position.set(x, 1.05, z); tmp.updateMatrix(); dI.setMatrixAt(i, tmp.matrix); }
  scene.add(dI);
  const pl = new THREE.PointLight(0xffa040, 0, 50, 1.5); pl.position.set(0, 5, PZ); scene.add(pl);
  S.animated.push(() => { pl.intensity = S.env.night * 80; });
  for (let i = 0; i < 6; i++) { palm(scene, -PW / 2 - 4, PZ - PD / 2 + i * 6, 8 + i % 3); palm(scene, PW / 2 + 4, PZ - PD / 2 + i * 6, 8 + (i + 1) % 3); colliders.addCircle(-PW / 2 - 4, PZ - PD / 2 + i * 6, 0.4); colliders.addCircle(PW / 2 + 4, PZ - PD / 2 + i * 6, 0.4); }
  // video screen of the real pond clip
  S.screen('assets/videos/bageshwori-day.mp4', 'assets/videos/bageshwori-day-poster.webp', -34, 0, Math.PI / 2, 7, 1);
  box(0.5, 1.2, 7.5, M(0x1b1410), -34.4, 0, 0, scene);
  S.label('Real footage · Bageshwori pond', -34, 9.5, 0);
  S.exit(36, 40);
  return {
    ...S, spawn: { x: 30, z: 32, yaw: Math.PI * 0.8 },
    update(dt, t, player) { S.baseUpdate(dt, t, player); }
  };
}
