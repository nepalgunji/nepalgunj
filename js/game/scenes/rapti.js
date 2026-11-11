/* Rapti River (outside the city): sandy banks, walkable steel truss bridge, new bridge under construction, real drone clips */
import { THREE, M, box, cyl, pbr, tex, palm, tree } from '../engine.js';
import { baseScene } from './base.js';

export async function create(ctx) {
  const S = baseScene(ctx, { name: 'Rapti River', half: 140, floor: pbr('aerial_grass_rock', 60, { color: 0xb5ad85 }), fogFar: 520 });
  const { scene, colliders } = S;
  const RW = 90;  // river width (x from -45 to 45), flows along z
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(RW + 60, 400), pbr('aerial_grass_rock', 20, { color: 0xe6d3a6 })); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.02; scene.add(sand);
  const waterN = tex('assets/tex/waternormals.jpg', 10, false);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RW, 400), new THREE.MeshStandardMaterial({ color: 0x4d7a78, roughness: 0.06, metalness: 0.25, normalMap: waterN, normalScale: new THREE.Vector2(0.7, 0.7), transparent: true, opacity: 0.95 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.1; scene.add(water);
  // steel truss bridge along x at z = 0 (walkable), deck height 5
  const DECK = 5, BW = 9, L = RW + 30, half = L / 2;
  const conc = pbr('concrete_floor_02', 4, { color: 0xbdb6aa }), steel = M(0x7d868f, { metalness: 0.75, roughness: 0.35 });
  box(L, 0.6, BW, conc, 0, DECK - 0.6, 0, scene);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, BW), conc); r.position.set(s * (half + 6.6), DECK / 2 - 0.3, 0); r.rotation.z = -s * Math.atan2(DECK, 13); scene.add(r); }
  for (let i = -3; i <= 3; i++) { box(2.6, DECK - 0.6, 2.6, conc, i * 18, 0, 0, scene); }
  const H = 7;
  for (const sz of [-BW / 2, BW / 2]) {
    box(L, 0.35, 0.35, steel, 0, DECK + H, sz, scene); box(L, 0.35, 0.35, steel, 0, DECK, sz, scene);
    for (let x = -half; x <= half + 0.01; x += 6) {
      box(0.25, H, 0.25, steel, x, DECK, sz, scene);
      if (x < half) { const d = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(H, 6), 0.2, 0.2), steel); d.position.set(x + 3, DECK + H / 2, sz); d.rotation.z = (Math.round(x / 6) % 2 ? 1 : -1) * Math.atan2(H, 6); scene.add(d); }
    }
    box(L, 1.1, 0.12, steel, 0, DECK, sz * 0.92, scene);
  }
  for (let x = -half; x <= half + 0.01; x += 6) box(0.25, 0.25, BW, steel, x, DECK + H, 0, scene);
  // new wider bridge under construction (z = -40): piers + partial deck + crane
  for (let i = -3; i <= 3; i++) box(3.2, DECK + 2, 3.2, conc, i * 18, 0, -40, scene);
  box(L * 0.45, 1.2, 12, conc, -L * 0.27, DECK + 2, -40, scene);
  const yl = M(0xf2c230, { metalness: 0.4, roughness: 0.5 }); box(0.8, 26, 0.8, yl, 10, 0, -48, scene); box(22, 0.6, 0.6, yl, 4, 26, -48, scene);
  // walkability
  const onBridge = (x, z) => Math.abs(z) < BW / 2 - 0.6 && Math.abs(x) < half + 13;
  S.heightAt = (x, z) => { if (!onBridge(x, z)) return 0; const ax = Math.abs(x); return ax <= half ? DECK : Math.max(0, DECK * (1 - (ax - half) / 13)); };
  S.blocked = (x, z) => !onBridge(x, z) && Math.abs(x) < RW / 2;
  for (let i = -3; i <= 3; i++) colliders.add(i * 18, -40, 1.7, 1.7);
  // traffic on the bridge
  const veh = [];
  for (let i = 0; i < 5; i++) { const g = new THREE.Group(); const c = [0xd23b2a, 0x2a6dd2, 0xffffff, 0x2fa36b, 0xf2c230][i]; box(1.8, 1.2, 4.2, M(c, { metalness: 0.4, roughness: 0.4 }), 0, 0.3, 0, g); box(1.6, 0.6, 2, M(0x1b2630, { metalness: 0.6, roughness: 0.1 }), 0, 1.5, -0.2, g); g.rotation.y = Math.PI / 2; scene.add(g); veh.push({ g, s: i / 5, dir: i % 2 ? 1 : -1 }); }
  // banks: trees & palms
  for (let i = 0; i < 30; i++) { const side = i % 2 ? 1 : -1, x = side * (RW / 2 + 34 + (i * 7) % 40), z = -130 + i * 9; tree(scene, x, z, 1.2); colliders.addCircle(x, z, 0.6); }
  // real drone clips on screens by the east bank
  S.screen('assets/videos/rapti-hero.mp4', 'assets/videos/rapti-hero-poster.webp', 66, 24, Math.PI / 2 - 0.45, 14, 16 / 9, 1.5);
  S.screen('assets/videos/rapti-bridges.mp4', 'assets/videos/rapti-bridges-poster.webp', 70, -20, Math.PI / 2 + 0.4, 6, 4 / 5, 1.5);
  S.label('Real drone footage · Rapti River', 66, 12, 24);
  S.label('Rapti River<small>राप्ती नदी · outside Nepalgunj city</small>', 0, 18, 0, 'big');
  S.label('New bridge (under construction)', -20, 14, -40);
  S.info('rapti', 70, 8, 'About the Rapti River & bridges', 5);
  S.exit(100, 6, 'Back to Nepalgunj');
  return {
    ...S, spawn: { x: 96, z: 2, yaw: Math.PI / 2 },
    update(dt, t, p) {
      S.baseUpdate(dt, t, p); waterN.offset.y += dt * 0.05;
      veh.forEach(v => { v.s = (v.s + dt * 0.03 * v.dir + 1) % 1; const x = -half - 10 + v.s * (L + 20); v.g.position.set(x, S.heightAt(x, v.dir > 0 ? 1.8 : -1.8) + 0.3, v.dir > 0 ? 1.8 : -1.8); v.g.rotation.y = v.dir > 0 ? Math.PI / 2 : -Math.PI / 2; });
    }
  };
}
