/* "Biryani Corner" (generic, fictional name) — sit at a table and order from the menu */
import { THREE, M, PAL, box, cyl, pbr, glowMat, signMesh, textSign } from '../engine.js';
import { foodModel } from '../prefabs.js';
import { DISHES } from '../food.js';
import { baseScene } from './base.js';

export const MENU = ['biryani', 'korma', 'kebab', 'sekuwa', 'lassi'];

export async function create(ctx) {
  const S = baseScene(ctx, { name: 'Biryani Corner', half: 14, floor: pbr('marble_01', 8, { color: 0xd9cbb0 }), fogFar: 200 });
  const { scene, colliders } = S;
  S.bounds = [-11, -8, 11, 8];
  const wall = pbr('brick_wall_10', 3, { color: 0xd9a27a }), plaster = pbr('plastered_wall_04', 3, { color: 0xf3e3c3 });
  box(24, 5, 0.4, wall, 0, 0, -9, scene); box(0.4, 5, 18, plaster, -12, 0, 0, scene); box(0.4, 5, 18, plaster, 12, 0, 0, scene);
  box(9, 5, 0.4, plaster, -7.5, 0, 9, scene); box(9, 5, 0.4, plaster, 7.5, 0, 9, scene); box(6, 1.4, 0.4, plaster, 0, 3.6, 9, scene);
  box(24.4, 0.3, 18.4, M(0x3a2a20), 0, 5, 0, scene);
  colliders.add(0, -9, 12, 0.3); colliders.add(-12, 0, 0.3, 9); colliders.add(12, 0, 0.3, 9); colliders.add(-7.5, 9, 4.5, 0.3); colliders.add(7.5, 9, 4.5, 0.3);
  // ceiling lights & fans
  const fans = [];
  for (const [x, z] of [[-6, -3], [6, -3], [-6, 4], [6, 4]]) {
    const l = new THREE.PointLight(0xffd9a8, 18, 14, 1.6); l.position.set(x, 4.4, z); scene.add(l);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMat(0xffffff, 0xffe0b0, 3)); b.position.copy(l.position); scene.add(b);
    const f = new THREE.Group(); f.position.set(x, 4.6, z + 1.5); scene.add(f);
    for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.22), M(0x8a6a4a)); bl.position.x = 0.7; const p = new THREE.Group(); p.rotation.y = i * Math.PI * 2 / 3; p.add(bl); f.add(p); }
    fans.push(f);
  }
  // counter with big deg (biryani pot) + steam
  box(10, 1.1, 1.4, M(0x6a3a22, { roughness: 0.6 }), 0, 0, -7, scene); colliders.add(0, -7, 5, 0.8);
  box(10.2, 0.08, 1.6, pbr('marble_01', 1), 0, 1.1, -7, scene);
  const deg = cyl(0.9, 0.7, 0.9, 24, M(0x8a5a2a, { metalness: 0.8, roughness: 0.35 }), -2.5, 1.18, -7, scene);
  cyl(0.95, 0.95, 0.06, 24, M(0x9a6a3a, { metalness: 0.8 }), -2.5, 2.08, -7, scene);
  const dish2 = cyl(0.7, 0.6, 0.6, 24, M(0xb8bcc2, { metalness: 0.9, roughness: 0.2 }), 2.5, 1.18, -7, scene);
  // chef
  const chef = new THREE.Group(); chef.position.set(0, 0, -8.2); scene.add(chef);
  cyl(0.35, 0.4, 1.3, 10, M(0xffffff), 0, 0.2, 0, chef); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), M(0xb07a52)); hd.position.y = 1.8; chef.add(hd); cyl(0.26, 0.24, 0.35, 12, M(0xffffff), 0, 2.05, 0, chef);
  // menu board (no prices — none sourced)
  const c = document.createElement('canvas'); c.width = 640; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1d2a22'; g.fillRect(0, 0, 640, 512); g.strokeStyle = '#d9b46a'; g.lineWidth = 10; g.strokeRect(10, 10, 620, 492);
  g.fillStyle = '#ffe6a8'; g.font = 'bold 52px Georgia, serif'; g.textAlign = 'center'; g.fillText('MENU · मेनु', 320, 80);
  g.font = '34px Inter, sans-serif'; g.textAlign = 'left';
  MENU.forEach((k, i) => { const d = DISHES[k]; g.fillStyle = '#fff'; g.fillText(`${d.icon}  ${d.name}`, 60, 160 + i * 64); g.fillStyle = '#d9b46a'; g.font = '26px Inter, sans-serif'; g.fillText(d.dev || '', 400, 160 + i * 64); g.font = '34px Inter, sans-serif'; });
  g.fillStyle = '#9fb3a6'; g.font = 'italic 22px Inter, sans-serif'; g.fillText('Sit at any table and press E to order', 60, 480);
  const mt = new THREE.CanvasTexture(c); mt.colorSpace = THREE.SRGBColorSpace;
  const mb = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ map: mt, toneMapped: false })); mb.position.set(0, 3.3, -8.75); scene.add(mb);
  // photo of representative biryani on the wall
  if (DISHES.biryani.photo) S.photo(DISHES.biryani.photo, -11.7, 2.8, -2, 3.2, 1.33, Math.PI / 2);
  if (DISHES.kebab?.photo) S.photo(DISHES.kebab.photo, 11.7, 2.8, -2, 3.2, 1.33, -Math.PI / 2);
  // tables
  const tables = [];
  const wood = M(0x7a4a2a, { roughness: 0.5 }), cloth = M(0xb3261e, { roughness: 0.8 });
  [[-6, -2], [0, -2], [6, -2], [-6, 4], [0, 4], [6, 4]].forEach(([x, z], i) => {
    box(2.4, 0.08, 1.4, cloth, x, 0.85, z, scene); for (const [dx, dz] of [[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]]) box(0.08, 0.85, 0.08, wood, x + dx, 0, z + dz, scene);
    for (const s of [-1, 1]) { box(0.6, 0.06, 0.6, wood, x, 0.5, z + s * 1.1, scene); box(0.6, 0.6, 0.06, wood, x, 0.5, z + s * 1.4, scene); }
    colliders.add(x, z, 1.25, 0.75);
    const seat = { x, z: z + 1.1, faceYaw: Math.PI, table: { x, y: 0.93, z } };
    tables.push(seat);
    S.interactables.push({ x, z: z + 1.6, r: 1.6, label: 'Sit & order at the table', type: 'menu', menu: MENU, seat, stall: 'Biryani Corner' });
  });
  const sg = signMesh('BIRYANI CORNER', 6, { bg: '#0f5b3a', fg: '#ffe6a8', font: 'bold 58px Georgia, serif', sub: 'बिरयानी कर्नर' }); sg.position.set(0, 4.3, 8.75); sg.rotation.y = Math.PI; scene.add(sg);
  S.label('Biryani Corner<small>generic name · for the game</small>', 0, 6, -7);
  S.exit(0, 7.6, 'Leave Biryani Corner');
  return {
    ...S, spawn: { x: 0, z: 6.5, yaw: 0 }, tables,
    update(dt, t, p) { S.baseUpdate(dt, t, p); fans.forEach(f => f.rotation.y += dt * 6); if (Math.random() < dt * 6) S.particles.burst(-2.5 + (Math.random() - .5), 2.2, -7, 1, 0xdddddd, 0.4, 1.6, 1.2); }
  };
}
