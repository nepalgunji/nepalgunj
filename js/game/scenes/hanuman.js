/* Hanumangadhi: 108-ft (≈33 m) Hanuman statue on a plinth with moat; khanepani tank in the background (as in the drone clip) */
import { THREE, M, PAL, box, cyl, pbr, glowMat, signMesh, tree } from '../engine.js';
import { hanumanStatue } from '../prefabs.js';
import { baseScene } from './base.js';

export async function create(ctx) {
  const S = baseScene(ctx, { name: 'Hanumangadhi', half: 60, floor: pbr('aerial_grass_rock', 24, { color: 0xa9a77e }), fogFar: 400 });
  const { scene, colliders } = S;
  const conc = pbr('concrete_floor_02', 4, { color: 0xd2ccc0 });
  const moat = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshStandardMaterial({ color: 0x24434c, roughness: 0.06, metalness: 0.35 })); moat.rotation.x = -Math.PI / 2; moat.position.y = 0.2; scene.add(moat);
  box(46, 0.8, 1, conc, 0, 0, -22.5, scene); box(46, 0.8, 1, conc, 0, 0, 22.5, scene); box(1, 0.8, 46, conc, -22.5, 0, 0, scene); box(1, 0.8, 46, conc, 22.5, 0, 0, scene);
  // plinth (walkable top at y=2) + walkway bridge from south
  box(26, 2, 26, conc, 0, 0, 0, scene);
  const PL = 13;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 12), conc); ramp.position.set(0, 1, PL + 5.5); ramp.rotation.x = Math.atan2(2, 11); scene.add(ramp);
  const st = hanumanStatue(scene, 33); st.position.y = 2;
  colliders.add(0, 0, 4.8, 3.4, 0, 99);
  S.heightAt = (x, z) => {
    if (Math.abs(x) <= PL && Math.abs(z) <= PL) return 2;
    if (Math.abs(x) < 2.5 && z > PL && z < PL + 11) return 2 * (1 - (z - PL) / 11);
    return 0;
  };
  S.blocked = (x, z) => {
    const inMoat = Math.abs(x) < 22.5 && Math.abs(z) < 22.5;
    const onPl = Math.abs(x) <= PL + 0.2 && Math.abs(z) <= PL + 0.2;
    const onRamp = Math.abs(x) < 2.5 && z > PL && z < 23;
    return inMoat && !onPl && !onRamp;
  };
  // diyas & lights around statue base
  const dm = glowMat(0xffd27a, 0xff9a2a, 5);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), dm); d.position.set(Math.cos(a) * 8, 2.15, Math.sin(a) * 8); scene.add(d); }
  const spot = new THREE.SpotLight(0xffd9a0, 0, 80, 0.5, 0.5); spot.position.set(0, 2, 20); spot.target.position.set(0, 20, 0); scene.add(spot, spot.target);
  S.animated.push(() => spot.intensity = S.env.night * 400);
  // yellow khanepani (water) tank on a tower in the background
  const tw = new THREE.Group(); tw.position.set(-40, 0, -45); scene.add(tw);
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) cyl(0.5, 0.6, 18, 8, M(0xf2c230), x, 0, z, tw);
  cyl(6, 5, 7, 20, M(0xf2c230, { roughness: 0.6 }), 0, 18, 0, tw);
  const ks = signMesh('NEPALGUNJ KHANEPANI', 8, { bg: '#f2c230', fg: '#1d4f91', font: 'bold 52px Inter, sans-serif' }); ks.position.set(0, 21.5, 6.05); tw.add(ks);
  colliders.add(-40, -45, 4, 4);
  // city rooftops around
  const pal = [0xf6efe4, 0xf3d9c6, 0xe9e0b8, 0xd8e4ec, 0xf1c6b0];
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 48 + (i % 3) * 6; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x + 40) < 10 && Math.abs(z + 45) < 10) continue; const h = 6 + (i % 4) * 3; box(8, h, 8, pbr('plastered_wall_04', 1, { color: pal[i % 5] }), x, 0, z, scene); colliders.add(x, z, 4, 4); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2; tree(scene, Math.cos(a) * 32, Math.sin(a) * 32, 1.1); colliders.addCircle(Math.cos(a) * 32, Math.sin(a) * 32, 0.5); }
  const sg = signMesh('श्री हनुमानगढी · Hanumangadhi', 10, { bg: '#b3261e', fg: '#ffe6a8', font: 'bold 50px Inter, sans-serif' }); sg.position.set(0, 4.5, 24); sg.rotation.y = Math.PI; scene.add(sg);
  S.label('108-ft Hanuman · Hanumangadhi', 0, 37, 0, 'big');
  S.screen('assets/videos/hanuman.mp4', 'assets/videos/hanuman-poster.webp', 14, 30, -0.5, 4.5, 9 / 16);
  S.label('Real drone footage', 14, 10.5, 30);
  S.info('hanuman', 8, 28, 'About the 108-ft Hanuman', 4);
  S.exit(-8, 34, 'Back to Nepalgunj streets');
  return { ...S, spawn: { x: 0, z: 31, yaw: 0 }, update(dt, t, p) { S.baseUpdate(dt, t, p); } };
}
