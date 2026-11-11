/* Hand-built landmarks placed at their real OSM positions: Bageshwori Mandir, Junge Mahadev pavilion,
   the 108-ft Hanuman, Jama Masjid, chowk islands (Tribhuvan plinth, Dhamboji pillar + arch), Rani Talau
   details, Ramlila ground effigy, festival diyas. Real-material look (PBR textures, gold metal, stone). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hazy } from './atmos.js';
import { pbrSet, worldMapped, T } from './mats.js';
import { pip } from './city.js';

const S = (m, k) => hazy(m, { key: k });
export function makeMaterials() {
  const red = pbrSet('red_plaster_weathered', { color: 0xd06a4a }); S(red, 'red');
  const white = pbrSet('worn_plaster_wall', { color: 0xf2ece2 }); S(white, 'white');
  const marble = worldMapped(pbrSet('marble_tiles', { color: 0xf0ece6 }), 0.35, { breakup: 0.15 });
  const stone = pbrSet('painted_concrete', { color: 0xa8a49c }); S(stone, 'stone');
  const gold = S(new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 1, roughness: 0.28 }), 'gold');
  const bronze = S(new THREE.MeshStandardMaterial({ color: 0x6b4a2a, metalness: 0.85, roughness: 0.42 }), 'bronze');
  const sindoor = pbrSet('painted_concrete', { color: 0xd2552a, roughness: 0.7 }); S(sindoor, 'sindoor');
  const yellow = pbrSet('painted_concrete', { color: 0xe2b23a }); S(yellow, 'yellow');
  const wood = S(new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.8 }), 'wood');
  const roofRed = pbrSet('red_plaster_weathered', { color: 0xb8402a }); S(roofRed, 'roofred');
  return { red, white, marble, stone, gold, bronze, sindoor, yellow, wood, roofRed };
}
const box = (w, h, d, m, x = 0, y = 0, z = 0, g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; g?.add(o); return o; };
const cyl = (rt, rb, h, seg, m, x = 0, y = 0, z = 0, g) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; g?.add(o); return o; };
const lathe = (pts, seg, m, y = 0, g) => { const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), m); o.position.y = y; o.castShadow = o.receiveShadow = true; g?.add(o); return o; };
function gajur(g, y, s, M) { // gilded finial
  return lathe([[0, 0], [0.5, 0], [0.55, 0.2], [0.35, 0.5], [0.45, 0.9], [0.2, 1.3], [0.28, 1.6], [0.1, 2.0], [0.15, 2.3], [0, 2.9]].map(([r, h]) => [r * s, h * s]), 16, M.gold, y, g);
}
/* tiered roof: square frustum with flared eaves + red fascia */
function tier(g, w, y, h, M) {
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.72, h, 4, 1), M.white); roof.rotation.y = Math.PI / 4; roof.position.y = y + h / 2; roof.castShadow = roof.receiveShadow = true; g.add(roof);
  const fas = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.74, w * 0.74, 0.35, 4, 1, true), M.roofRed); fas.rotation.y = Math.PI / 4; fas.position.y = y + 0.1; g.add(fas);
}

export function bageshwori(p, M, people) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.rot || 0;
  // marble courtyard and plinth
  const yard = new THREE.Mesh(new THREE.BoxGeometry(42, 0.25, 42), M.marble); yard.position.y = 0.125; yard.receiveShadow = true; g.add(yard);
  box(17, 1.1, 17, M.stone, 0, 0.25, 0, g); box(15, 0.4, 15, M.marble, 0, 1.35, 0, g);
  // sanctum body: red plaster with white pilasters and arched doorways
  const body = new THREE.Group(); body.position.y = 1.75; g.add(body);
  box(11, 6.2, 11, M.red, 0, 0, 0, body);
  for (let s = 0; s < 4; s++) { const side = new THREE.Group(); side.rotation.y = s * Math.PI / 2; body.add(side);
    for (let i = -2; i <= 2; i++) { box(0.55, 6.2, 0.3, M.white, i * 2.6, 0, 5.6, side); }
    for (let i = -1; i <= 1; i += 2) { const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 16, 1, false, 0, Math.PI), M.wood); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(i * 1.3, 3.5, 5.62); side.add(arch); box(1.8, 3.5, 0.3, M.wood, i * 1.3, 0, 5.6, side); }
    box(11.6, 0.6, 0.6, M.white, 0, 6.2, 5.4, side); box(11.6, 0.25, 0.8, M.roofRed, 0, 4.4, 5.5, side);
  }
  // three tiers
  tier(body, 15, 6.6, 2.4, M); box(7.4, 2.4, 7.4, M.red, 0, 9.0, 0, body); tier(body, 10.5, 11.4, 2.0, M); box(4.6, 1.8, 4.6, M.red, 0, 13.4, 0, body); tier(body, 7, 15.2, 1.8, M);
  gajur(body, 17.0, 1.0, M);
  // flags on poles and a row of brass bells
  for (const [x, z] of [[-18, -18], [18, -18], [18, 18], [-18, 18]]) { cyl(0.08, 0.08, 9, 6, M.wood, x, 0, z, g); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), S(new THREE.MeshStandardMaterial({ color: 0xc22a1a, side: THREE.DoubleSide, roughness: 0.9 }), 'flag')); f.position.set(x + 0.8, 8.3, z); g.add(f); }
  for (let i = -6; i <= 6; i++) { cyl(0.05, 0.05, 2.4, 4, M.wood, i * 1.4, 0, 12, g); lathe([[0, 0], [0.25, 0], [0.22, 0.15], [0.12, 0.4], [0, 0.45]], 10, M.gold, 2.0, g).position.set(i * 1.4, 1.95, 12); }
  box(19, 0.15, 0.15, M.wood, 0, 2.4, 12, g);
  // smaller shrines (Ganesh, Bajrangbali): little shikhara towers
  for (const [x, z, c] of [[-14, 8, M.sindoor], [14, 8, M.white], [-14, -10, M.white]]) {
    box(3, 3, 3, c, x, 0.25, z, g); lathe([[1.9, 0], [1.6, 1.5], [1.1, 3.2], [0.4, 4.6], [0, 5]], 8, M.white, 3.25, g).position.set(x, 3.25, z); gajur(g, 8.2, 0.4, M).position.set(x, 8.2, z);
  }
  return g;
}
export function jungePavilion(pond, M, at) {
  const g = new THREE.Group(); g.position.set(at.x, 0, at.z);
  cyl(4.2, 4.6, 1.2, 8, M.stone, 0, -0.6, 0, g);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(0.18, 0.2, 3.2, 8, M.roofRed, Math.cos(a) * 3.3, 0.6, Math.sin(a) * 3.3, g); }
  const r1 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 4.6, 1.6, 8), M.white); r1.position.y = 4.6; r1.castShadow = true; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.4, 1.4, 8), M.roofRed); r2.position.y = 6.0; g.add(r2);
  gajur(g, 6.7, 0.55, M);
  // yellow-railed walkway to the nearest shore point
  let best = null; pond.pts.forEach(([x, z]) => { const d = Math.hypot(x - at.x, z - at.z); if (!best || d < best.d) best = { x, z, d }; });
  const L = best.d, a = Math.atan2(best.x - at.x, best.z - at.z);
  const w = new THREE.Group(); w.position.set(at.x, 0, at.z); w.rotation.y = a;
  box(2.6, 0.3, L, M.stone, 0, 0.0, L / 2, w);
  for (const sx of [-1.3, 1.3]) { box(0.12, 0.12, L, M.yellow, sx, 1.0, L / 2, w); for (let z = 0; z < L; z += 1.6) box(0.12, 1.0, 0.12, M.yellow, sx, 0.3, z, w); }
  const grp = new THREE.Group(); grp.add(g, w); return grp;
}
export function hanumanStatue(p, M, human, pond) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = (p.rot || 0);
  // stepped plinth (stone + marble), about 6 m
  box(26, 1.2, 26, M.stone, 0, 0, 0, g); box(20, 1.6, 20, M.marble, 0, 1.2, 0, g); box(13, 3.2, 13, M.sindoor, 0, 2.8, 0, g); box(14, 0.4, 14, M.white, 0, 6.0, 0, g);
  const TOP = 6.4, H = 33 - TOP;   // 108 ft ≈ 33 m overall
  const pose = human.hanuman;
  const s = H / pose.h; const geo = pose.g.clone();
  geo.translate(0, -pose.minY, 0); geo.scale(s * 1.12, s, s * 1.12);
  const body = new THREE.Mesh(geo, M.sindoor); body.position.y = TOP; body.castShadow = body.receiveShadow = true; g.add(body);
  const J = k => pose.joints[k] ? pose.joints[k].clone().sub(new THREE.Vector3(0, pose.minY, 0)).multiply(new THREE.Vector3(s * 1.12, s, s * 1.12)).add(new THREE.Vector3(0, TOP, 0)) : null;
  const head = J('Head') || new THREE.Vector3(0, TOP + H * 0.9, 0);
  // crown (mukut)
  lathe([[0, 0], [1.25, 0], [1.35, 0.6], [1.0, 1.6], [1.15, 2.0], [0.5, 3.2], [0.25, 3.6], [0, 4.2]], 20, M.gold, 0, g).position.set(head.x, head.y + 1.6, head.z);
  // necklace + armlets + waistband
  const neck = J('neck_01') || head; const tor = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 8, 24), M.gold); tor.rotation.x = Math.PI / 2 + 0.25; tor.position.copy(neck).add(new THREE.Vector3(0, -1.2, 0.35)); g.add(tor);
  const pel = J('pelvis'); if (pel) { const wb = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.3, 8, 28), M.gold); wb.rotation.x = Math.PI / 2; wb.position.copy(pel).add(new THREE.Vector3(0, 0.9, 0)); wb.scale.set(1, 0.75, 1); g.add(wb); }
  // gada (mace) in the left hand, resting on the shoulder line
  const hl = J('hand_l'); if (hl) { const mace = new THREE.Group(); mace.position.copy(hl); mace.rotation.z = -0.25;
    cyl(0.32, 0.32, 9, 10, M.gold, 0, -2, 0, mace); const headG = new THREE.Mesh(new THREE.SphereGeometry(2.0, 24, 16), M.gold); headG.position.y = 8; headG.castShadow = true; mace.add(headG);
    for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.12, 6, 24), M.gold); r.rotation.y = i * Math.PI / 8; r.position.y = 8; mace.add(r); } g.add(mace); }
  // tail rising behind
  const base = pel ? pel.clone().add(new THREE.Vector3(0, 0, -1.2)) : new THREE.Vector3(0, TOP + 12, -1.5);
  const curve = new THREE.CatmullRomCurve3([base, base.clone().add(new THREE.Vector3(1.5, -3, -3)), base.clone().add(new THREE.Vector3(3.5, 2, -5)), base.clone().add(new THREE.Vector3(3, 10, -4.5)), base.clone().add(new THREE.Vector3(1, 15, -3))]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.55, 10), M.sindoor); tail.castShadow = true; g.add(tail);
  return g;
}
export function masjid(p, M) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = (p.rot || 0);
  const wht = M.white, green = S(new THREE.MeshStandardMaterial({ color: 0x3f6b4a, roughness: 0.6 }), 'mgreen');
  box(22, 0.6, 16, M.marble, 0, 0, 0, g); box(18, 7.5, 12, wht, 0, 0.6, -1, g);
  for (let i = -3; i <= 3; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.4, 16, 1, false, 0, Math.PI), green); a.rotation.set(Math.PI / 2, 0, Math.PI / 2); a.position.set(i * 2.5, 4.4, 5.05); g.add(a); box(2.0, 3.8, 0.4, S(new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), 'dark'), i * 2.5, 0.6, 5.0, g); }
  const dome = (r, x, z, y) => { lathe([[0, 0], ...Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [r * Math.sin(t * Math.PI * 0.62 + 0.4) * (1 - t * 0.2), r * 1.35 * t]; }), [0, r * 1.45]], 24, wht, y, g).position.set(x, y, z); gajur(g, y + r * 1.4, r * 0.18, M).position.set(x, y + r * 1.4, z); };
  cyl(3.3, 3.3, 1.2, 24, wht, 0, 8.1, -1, g); dome(3.4, 0, -1, 9.3); dome(2.0, -6, -1, 8.1); dome(2.0, 6, -1, 8.1);
  for (const sx of [-10, 10]) { cyl(0.9, 1.1, 18, 12, wht, sx, 0.6, 4.5, g); cyl(1.4, 1.4, 0.5, 12, green, sx, 13, 4.5, g); cyl(0.7, 0.9, 3, 12, wht, sx, 18.6, 4.5, g); lathe([[0, 0], [1.0, 0], [0.9, 0.8], [0.4, 1.8], [0, 2.4]], 12, green, 21.6, g).position.set(sx, 21.6, 4.5); }
  return g;
}
/* roundabout island: stone kerb ring, planted, with a centrepiece */
export function chowkIsland(p, M, kind) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
  const R = kind === 'dhamboji' ? 7.5 : 6.5;
  const kerb = new THREE.Mesh(new THREE.TorusGeometry(R, 0.35, 6, 40), M.stone); kerb.rotation.x = Math.PI / 2; kerb.position.y = 0.3; kerb.receiveShadow = true; g.add(kerb);
  cyl(R, R, 0.35, 40, S(new THREE.MeshStandardMaterial({ color: 0x5f6b3e, roughness: 1 }), 'turf'), 0, 0.05, 0, g);
  if (kind === 'tribhuvan') {
    // stepped stone plinth — the King Tribhuvan statue that stood here was damaged
    box(5.5, 0.8, 5.5, M.stone, 0, 0.3, 0, g); box(4.2, 0.8, 4.2, M.stone, 0, 1.1, 0, g); box(2.6, 3.6, 2.6, M.marble, 0, 1.9, 0, g); box(3.0, 0.4, 3.0, M.stone, 0, 5.5, 0, g);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), M.bronze); plaque.position.set(0, 3.6, 1.31); g.add(plaque);
  } else if (kind === 'dhamboji') {
    // tall pillar with a bronze figure on top (as seen in drone footage of the chowk)
    box(4.4, 1.0, 4.4, M.stone, 0, 0.3, 0, g); cyl(1.0, 1.25, 9, 16, M.marble, 0, 1.3, 0, g); cyl(1.5, 1.2, 0.6, 16, M.stone, 0, 10.3, 0, g);
  } else {
    cyl(0.18, 0.25, 12, 8, S(new THREE.MeshStandardMaterial({ color: 0x8c8c88, metalness: 0.6, roughness: 0.4 }), 'mast'), 0, 0.3, 0, g);
    for (let i = 0; i < 4; i++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), M.stone); arm.position.set(Math.cos(i * Math.PI / 2) * 1.1, 12, Math.sin(i * Math.PI / 2) * 1.1); arm.rotation.y = -i * Math.PI / 2; g.add(arm); }
  }
  return g;
}
export function statueOnPillar(g, human, M, y) {
  const pose = human.poses.idle; const s = 3.4 / pose.h; const geo = pose.g.clone(); geo.translate(0, -pose.minY, 0); geo.scale(s, s, s);
  const m = new THREE.Mesh(geo, M.bronze); m.position.y = y; m.castShadow = true; g.add(m);
}
export function archway(x, z, a, M) { // yellow gateway near Dhamboji (from footage)
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = a;
  box(2.2, 9, 2.2, M.yellow, -8, 0, 0, g); box(2.2, 9, 2.2, M.yellow, 8, 0, 0, g); box(19, 2.4, 2.6, M.yellow, 0, 9, 0, g);
  for (const sx of [-8, 8]) lathe([[1.4, 0], [1.2, 1.2], [0.5, 2.2], [0, 2.6]], 8, M.yellow, 11.4, g).position.set(sx, 11.4, 0);
  lathe([[2.2, 0], [1.8, 1.6], [0.8, 2.8], [0, 3.4]], 8, M.yellow, 11.4, g);
  return g;
}
export function ravanEffigy(p, human, M) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
  const pose = human.poses.idle; const s = 16 / pose.h; const geo = pose.g.clone(); geo.translate(0, -pose.minY, 0); geo.scale(s * 1.25, s, s * 1.25);
  const cloth = S(new THREE.MeshStandardMaterial({ color: 0x5a1414, roughness: 0.8, emissive: 0xff5a10, emissiveIntensity: 0 }), 'effigy');
  const fig = new THREE.Mesh(geo, cloth); fig.position.y = 2; fig.castShadow = true; g.add(fig);
  cyl(0.25, 0.25, 4, 6, M.wood, 0, 0, 0, g);
  const hy = 2 + 15.2;
  for (let i = -4; i <= 4; i++) { if (!i) continue; const h = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), cloth); h.position.set(i * 1.5, hy - Math.abs(i) * 0.15, 0); g.add(h); }
  const crown = lathe([[0, 0], [1.1, 0], [0.9, 1.4], [0.3, 2.4], [0, 2.8]], 12, M.gold, hy + 0.7, g);
  return { g, cloth };
}
/* Diyas: instanced little flames along given polylines (pond edges, courtyards, parapets) */
export function diyas(pointsList, count) {
  const pts = []; pointsList.forEach(({ pts: P, y = 0.4, step = 1.2 }) => { for (let i = 0; i < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length]; const L = Math.hypot(bx - ax, bz - az); for (let s = 0; s < L; s += step) pts.push([ax + (bx - ax) * s / L, y, az + (bz - az) * s / L]); } });
  const list = pts.slice(0, count);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false, transparent: true, opacity: 0 });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), mat, list.length); const o = new THREE.Object3D();
  list.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.scale.set(1, 1.6, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.frustumCulled = false;
  return { mesh: im, set(v) { mat.opacity = v; im.visible = v > 0.01; mat.color.setRGB(1.0 * (2 + v * 6), 0.55 * (2 + v * 6), 0.2 * (2 + v * 6)); } };
}
