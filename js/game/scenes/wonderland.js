/* Wonder Land water park: pools, slides, elephant tipping bucket, peacock pool, sculptures */
import { THREE, M, PAL, box, cyl, pbr, palm, signMesh } from '../engine.js';
import { waterSlide } from '../prefabs.js';
import { baseScene } from './base.js';

export async function create(ctx) {
  const S = baseScene(ctx, { name: 'Wonder Land', half: 50, floor: pbr('concrete_floor_02', 30, { color: 0xd9d4c8 }) });
  const { scene, colliders } = S;
  const waterM = new THREE.MeshStandardMaterial({ color: 0x3fc6d8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
  const tile = M(0x9fe3ee, { roughness: 0.3 });
  const pools = [];
  const pool = (x, z, w, d) => {
    box(w + 1.2, 0.5, d + 1.2, M(0xf4f4f4), x, 0, z, scene);
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterM); wm.rotation.x = -Math.PI / 2; wm.position.set(x, 0.52, z); scene.add(wm);
    pools.push([x, z, w / 2, d / 2]);
  };
  pool(-14, -10, 30, 20); pool(22, -18, 18, 14); pool(18, 14, 16, 12);
  S.blocked = (x, z) => pools.some(([px, pz, hx, hz]) => Math.abs(x - px) < hx + 0.4 && Math.abs(z - pz) < hz + 0.4);
  // slides
  waterSlide(scene, -30, -28, 14, 0xd23b2a, 0xffffff, 2.4, 4.5); colliders.add(-30, -28, 2.2, 2.2);
  waterSlide(scene, -20, -28, 10, 0x2fa36b, 0xffffff, 1.8, 3.5); colliders.add(-20, -28, 2.2, 2.2);
  // racing slides
  for (let i = 0; i < 3; i++) { const s = box(1.6, 0.4, 22, M([0xf2c230, 0x2a6dd2, 0xd23b2a][i], { roughness: 0.3 }), 26 + i * 2, 0, -34, scene); s.rotation.x = -0.35; s.position.y = 4; }
  box(8, 9, 4, M(0x2fa36b, { metalness: 0.3 }), 28, 0, -46, scene); colliders.add(28, -46, 4, 2);
  // elephant-head tipping bucket
  const el = new THREE.Group(); el.position.set(18, 0, 14); scene.add(el);
  cyl(0.3, 0.3, 7, 8, M(0x2fa36b), -2, 0, 0, el); cyl(0.3, 0.3, 7, 8, M(0x2fa36b), 2, 0, 0, el);
  const bucket = new THREE.Group(); bucket.position.set(0, 7, 0); el.add(bucket);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), M(0x8a8f96)); bucket.add(head);
  const trunk = cyl(0.35, 0.2, 2.4, 8, M(0x8a8f96), 0, -2.6, 1.3, bucket); trunk.rotation.x = 0.4;
  for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), M(0x9aa0a8, { side: THREE.DoubleSide })); ear.position.set(sx * 1.6, 0.2, -0.2); ear.rotation.y = sx * 1.2; bucket.add(ear); }
  S.label('Elephant splash bucket', 18, 11, 14);
  // peacock pool statue
  const pk = new THREE.Group(); pk.position.set(22, 0.5, -18); scene.add(pk);
  const pb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), M(0x1f5fa8, { roughness: 0.3, metalness: 0.3 })); pb.position.y = 1.5; pb.scale.set(1, 1.3, 1); pk.add(pb);
  cyl(0.2, 0.3, 1.6, 8, M(0x1f5fa8), 0, 2, 0.3, pk);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(3, 24, 0, Math.PI), M(0x2a9a6a, { side: THREE.DoubleSide, roughness: 0.3 })); fan.position.set(0, 1.5, -0.6); pk.add(fan);
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; const e = new THREE.Mesh(new THREE.CircleGeometry(0.25, 10), M(0x1f3fa8, { side: THREE.DoubleSide })); e.position.set(Math.cos(a) * 2.5, 1.5 + Math.sin(a) * 2.5, -0.55); pk.add(e); }
  S.label('Peacock pool', 22, 7, -18);
  // sculptures: golden head, tiger, heart chair, fountain
  const gh = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 16), M(PAL.gold, { metalness: 0.9, roughness: 0.35 })); gh.position.set(-36, 3.2, 20); gh.scale.y = 1.25; scene.add(gh); cyl(1.8, 2, 1, 16, M(0xeeeeee), -36, 0, 20, scene); colliders.addCircle(-36, 20, 2);
  const tg = new THREE.Group(); tg.position.set(-24, 0, 26); scene.add(tg);
  const tb = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2.2, 4, 10), M(0xe8901a)); tb.rotation.z = Math.PI / 2; tb.position.y = 1.4; tg.add(tb);
  const th = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), M(0xe8901a)); th.position.set(1.9, 1.8, 0); tg.add(th);
  for (const [x, z] of [[-1, -0.4], [-1, 0.4], [1, -0.4], [1, 0.4]]) cyl(0.18, 0.2, 1, 6, M(0xe8901a), x, 0, z, tg);
  colliders.add(-24, 26, 2, 0.8);
  const heart = new THREE.Shape(); heart.moveTo(0, 0.5); heart.bezierCurveTo(0, 0.9, -0.9, 1.2, -1.2, 0.6); heart.bezierCurveTo(-1.5, 0, -0.5, -0.6, 0, -1); heart.bezierCurveTo(0.5, -0.6, 1.5, 0, 1.2, 0.6); heart.bezierCurveTo(0.9, 1.2, 0, 0.9, 0, 0.5);
  const hc = new THREE.Mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.3, bevelEnabled: false }), M(0xd23b2a)); hc.position.set(-12, 1.6, 26); scene.add(hc); colliders.add(-12, 26, 1.3, 0.4);
  cyl(2, 2.4, 0.8, 20, M(0xf4f4f4), 0, 0, 30, scene); colliders.addCircle(0, 30, 2.3);
  // lawn + palms + umbrellas
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), pbr('aerial_grass_rock', 4, { color: 0x88b060 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(-20, 0.04, 38); scene.add(lawn);
  for (let i = 0; i < 10; i++) { palm(scene, -46 + i * 10, 46, 7 + i % 3); }
  for (let i = 0; i < 5; i++) { const x = 34 + (i % 2) * 6, z = -2 + i * 5; cyl(0.06, 0.06, 2.6, 6, M(0xdddddd), x, 0, z, scene); const u = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.6, 10), M([0xd23b2a, 0xf2c230, 0x2a6dd2][i % 3])); u.position.set(x, 2.8, z); scene.add(u); }
  const sg = signMesh('Wonder Land · Nepalgunj', 12, { bg: '#2a6dd2', fg: '#fff', font: 'bold 60px Inter, sans-serif' }); sg.position.set(0, 7, 46.5); sg.rotation.y = Math.PI; scene.add(sg);
  // swimmers bobbing
  const sw = []; for (let i = 0; i < 14; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), M(0x5a3a22)); h.position.set(-26 + Math.random() * 24, 0.65, -18 + Math.random() * 16); scene.add(h); sw.push(h); }
  // real clip
  S.screen('assets/videos/wonderland.mp4', 'assets/videos/wonderland-poster.webp', 40, 24, -Math.PI / 2, 7, 1);
  S.label('Real footage · @BeautyofNepalgunj', 40, 9.6, 24);
  S.info('wonderland', 36, 24, 'About Wonder Land', 4);
  S.exit(0, 42, 'Exit Wonder Land');
  let tip = 0;
  return {
    ...S, spawn: { x: 0, z: 33, yaw: 0 },
    update(dt, t, player) {
      S.baseUpdate(dt, t, player);
      tip += dt; const c = tip % 9;
      bucket.rotation.x = c > 7 ? Math.sin((c - 7) / 2 * Math.PI) * 1.9 : 0;
      if (c > 7.8 && c < 7.8 + dt * 1.5) for (let k = 0; k < 4; k++) S.particles.burst(18, 6, 15.5, 60, 0xbfefff, 4, 1.4);
      sw.forEach((h, i) => h.position.y = 0.6 + Math.sin(t * 2 + i) * 0.08);
    }
  };
}
