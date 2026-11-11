/* Reusable stylised-realistic prefabs built procedurally */
import { THREE, M, PAL, box, cyl, frustum, glowMat, signMesh, pbr, photoMat } from './engine.js';

/* Bageshwori-style three-tier pagoda (from Commons photos: white roofs, red trim, cream walls, red pillars) */
export function pagoda(parent, s = 1) {
  const g = new THREE.Group(); parent.add(g); g.scale.setScalar(s);
  const plaster = pbr('plastered_wall_04', 2, { color: 0xf6ecd8 });
  const roofM = M(0xe9e9ea, { roughness: 0.45, metalness: 0.2 }), red = M(PAL.red, { roughness: 0.6 }), gold = M(PAL.gold, { metalness: 0.8, roughness: 0.3 });
  box(17, 1.0, 14, pbr('marble_01', 3), 0, 0, 0, g);
  box(11, 4.2, 8.5, plaster, 0, 1.0, 0, g);
  box(2.2, 3, 0.3, red, 0, 1.0, 4.3, g);
  for (let i = 0; i < 6; i++) cyl(0.26, 0.3, 4.2, 10, red, -6 + i * 2.4, 1.0, 5.6, g);
  box(15.2, 0.6, 12.2, red, 0, 5.2, 0, g);
  frustum(5.6, 11.2, 2.2, roofM, 0, 5.8, 0, g).scale.set(1, 1, 0.82);
  box(7.4, 1.8, 6, plaster, 0, 8, 0, g); box(11, 0.5, 9, red, 0, 9.8, 0, g);
  frustum(3.8, 7.8, 1.8, roofM, 0, 10.3, 0, g).scale.set(1, 1, 0.84);
  box(4.6, 1.5, 3.8, plaster, 0, 12.1, 0, g); box(7, 0.45, 6, red, 0, 13.6, 0, g);
  frustum(0.4, 5, 2.4, roofM, 0, 14, 0, g).scale.set(1, 1, 0.86);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 12), gold); fin.position.y = 17.2; g.add(fin);
  cyl(0.05, 0.05, 4, 6, gold, 0, 17, 0, g);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -1.4, 0, 2.2, -0.7, 0], 3)); fg.computeVertexNormals();
  const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0xd8261c, side: THREE.DoubleSide })); flag.position.y = 20.9; g.add(flag);
  g.userData.flag = flag;
  return g;
}

/* Junge Mahadev pavilion (round, red/orange pillars, gold dome) */
export function pavilion(parent) {
  const g = new THREE.Group(); parent.add(g);
  cyl(4.2, 4.6, 1.4, 24, M(PAL.cream), 0, -0.6, 0, g);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(0.22, 0.22, 3.6, 8, M(PAL.orange), Math.cos(a) * 3.2, 0.8, Math.sin(a) * 3.2, g); }
  cyl(4, 4, 0.9, 24, M(PAL.red), 0, 4.4, 0, g);
  const d = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 24), M(PAL.gold, { metalness: 0.8, roughness: 0.3 })); d.position.y = 6.6; d.castShadow = true; g.add(d);
  cyl(0.5, 0.7, 1.4, 12, M(0x3a3a3a, { roughness: 0.4 }), 0, 0.8, 0, g);
  return g;
}

/* Hanuman statue (saffron, gold ornaments, right hand raised, left hand on gada). height in metres */
export function hanumanStatue(parent, height = 33) {
  const g = new THREE.Group(); parent.add(g); const s = height / 21;
  g.scale.setScalar(s);
  const saf = M(0xe8641c, { roughness: 0.45, metalness: 0.05 }), gold = M(PAL.gold, { metalness: 0.85, roughness: 0.28 }), red = M(0xb3261e, { roughness: 0.5 });
  const leg = (x) => { cyl(0.55, 0.7, 7, 10, saf, x, 0.5, 0, g); };
  leg(-1.1); leg(1.1);
  box(1.6, 0.5, 2.2, saf, -1.1, 0, 0.4, g); box(1.6, 0.5, 2.2, saf, 1.1, 0, 0.4, g);
  cyl(2.1, 2.8, 4, 16, red, 0, 7.5, 0, g);
  cyl(2.6, 2.0, 6, 16, saf, 0, 11.2, 0, g);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.28, 8, 24), gold); neck.rotation.x = Math.PI / 2; neck.position.y = 16.6; g.add(neck);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.15, 6, 24, Math.PI), gold); chain.position.set(0, 14.6, 1.3); chain.rotation.z = Math.PI; g.add(chain);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 16), saf); head.position.y = 18.6; head.castShadow = true; g.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), saf); muzzle.position.set(0, 18.1, 1.3); muzzle.scale.set(1.2, 0.8, 0.8); g.add(muzzle);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.6, 16), gold); crown.position.y = 21; crown.castShadow = true; g.add(crown);
  // right arm raised (blessing)
  const ar = new THREE.Group(); ar.position.set(2.6, 15.6, 0); g.add(ar); ar.rotation.z = 0.25;
  cyl(0.5, 0.55, 3.6, 10, saf, 0, -3.4, 0, ar); const fore = cyl(0.45, 0.5, 3.4, 10, saf, 0.4, -3.8, 0.6, ar); fore.rotation.set(-2.6, 0, -0.3);
  const palmR = box(0.9, 1.1, 0.35, saf, 0.9, -0.2, 2.6, ar);
  // left arm down onto gada
  const al = new THREE.Group(); al.position.set(-2.6, 15.6, 0); g.add(al); al.rotation.z = -0.15;
  cyl(0.5, 0.55, 6.5, 10, saf, 0, -6.6, 0, al);
  cyl(0.25, 0.25, 9, 8, gold, -3.5, 1, 0.9, g);
  const head2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), gold); head2.position.set(-3.5, 2, 0.9); head2.scale.y = 1.25; head2.castShadow = true; g.add(head2);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* Ravan effigy with ten heads */
export function ravanEffigy(parent, h = 22) {
  const g = new THREE.Group(); parent.add(g); const s = h / 22; g.scale.setScalar(s);
  const body = M(0x2a6b3a, { roughness: 0.8 }), skin = M(0x3b5fa8), gold = M(PAL.gold, { metalness: 0.6, roughness: 0.4 }), red = M(0xc22a1a);
  cyl(0.6, 0.8, 8, 8, body, -1.4, 0, 0, g); cyl(0.6, 0.8, 8, 8, body, 1.4, 0, 0, g);
  cyl(3.6, 2.6, 4, 10, red, 0, 6.5, 0, g);
  cyl(3, 3.8, 6, 10, body, 0, 10.5, 0, g);
  cyl(0.6, 0.6, 7, 8, body, -4.3, 10, 0, g).rotation.z = -0.4; cyl(0.6, 0.6, 7, 8, body, 4.3, 10, 0, g).rotation.z = 0.4;
  for (let i = 0; i < 10; i++) {
    const x = (i - 4.5) * 1.4, hd = new THREE.Mesh(new THREE.SphereGeometry(i === 4 || i === 5 ? 1.15 : 0.85, 12, 10), skin);
    hd.position.set(x, 17.6 + (i === 4 || i === 5 ? 0.4 : 0), 0); g.add(hd);
    const cr = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 8), gold); cr.position.set(x, 19.2, 0); g.add(cr);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* Spiral water slide tube around a tower */
export function waterSlide(parent, x, z, height, color1, color2, turns = 2.2, radius = 5) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const pts = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, height * (1 - t) + 0.8, Math.sin(a) * radius)); }
  pts.push(new THREE.Vector3(radius + 6, 0.6, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.9, 12, false), M(color1, { roughness: 0.25, metalness: 0.05 }));
  tube.castShadow = true; g.add(tube);
  const stripe = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.93, 12, false), M(color2, { roughness: 0.3, transparent: true, opacity: 0.6, wireframe: true }));
  g.add(stripe);
  // tower
  const towerM = M(0x2fa36b, { roughness: 0.5, metalness: 0.3 });
  for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) cyl(0.18, 0.18, height + 1.5, 8, towerM, dx, 0, dz, g);
  box(4, 0.3, 4, M(0xf2c230), 0, height + 0.5, 0, g);
  frustum(0.3, 3.4, 1.6, M(0xd23b2a), 0, height + 2.2, 0, g);
  return g;
}

/* Street food stall types */
export function stall(parent, type, name, colorA = 0xd23b2a) {
  const g = new THREE.Group(); parent.add(g);
  const wood = M(0x7a5232, { roughness: 0.9 }), steel = M(0xb8bcc2, { metalness: 0.8, roughness: 0.3 });
  if (type === 'thela') { // pushcart
    box(2.4, 0.9, 1.3, wood, 0, 0.55, 0, g);
    for (const x of [-0.9, 0.9]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 16), M(0x222222)); w.position.set(x, 0.45, 0.7); g.add(w); }
    const pot = cyl(0.35, 0.3, 0.4, 14, steel, -0.5, 1.45, 0, g);
    box(0.9, 0.3, 0.9, M(0xf1e1c4), 0.5, 1.45, 0, g);
    cyl(0.04, 0.04, 1.4, 6, wood, 0, 1.45, 0, g);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8), M(colorA)); umb.position.y = 3.1; g.add(umb);
  } else if (type === 'grill') {
    box(2.6, 0.9, 1.0, M(0x3a3a3a, { metalness: 0.5, roughness: 0.5 }), 0, 0.2, 0, g);
    box(2.4, 0.08, 0.8, glowMat(0x441100, 0xff5a1a, 3), 0, 1.1, 0, g); // embers
    for (let i = 0; i < 7; i++) { const sk = cyl(0.03, 0.03, 1.1, 4, steel, -1 + i * 0.33, 1.2, 0, g); sk.rotation.x = Math.PI / 2; box(0.18, 0.14, 0.6, M(0x7a3410), -1 + i * 0.33, 1.15, 0, g); }
    for (const x of [-1.4, 1.4]) cyl(0.05, 0.05, 2.6, 6, wood, x, 0, -0.6, g);
    box(3.2, 0.1, 2, M(colorA), 0, 2.6, -0.2, g);
  } else { // cart / small shop
    box(2.6, 1.1, 1.2, wood, 0, 0, 0, g);
    box(2.4, 0.5, 1.0, M(0xffffff, { transparent: true, opacity: 0.35, roughness: 0.1 }), 0, 1.1, 0, g);
    for (const x of [-1.25, 1.25]) cyl(0.05, 0.05, 2.5, 6, wood, x, 0, -0.5, g);
    box(3, 0.12, 1.8, M(colorA), 0, 2.5, -0.1, g);
  }
  const s = signMesh(name, 2.6, { bg: '#1b1410', fg: '#f2a33a', font: 'bold 64px Inter, sans-serif' }); s.position.set(0, 2.95, 0.6); g.add(s);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glowMat(0xffe0a0, 0xffc060, 4)); bulb.position.set(0, 2.35, 0.3); g.add(bulb);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* 3D food models for eating */
export function foodModel(kind, color) {
  const g = new THREE.Group();
  const plate = cyl(0.42, 0.36, 0.05, 24, M(0xeeeeee, { metalness: 0.6, roughness: 0.25 }), 0, 0, 0, g);
  const c = M(color, { roughness: 0.7 });
  if (kind === 'rice') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c); m.position.y = 0.05; g.add(m); const meat = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09), M(0x5a2a10)); meat.position.set(0.1, 0.25, 0.08); g.add(meat); }
  else if (kind === 'bowl' || kind === 'cup') { cyl(0.22, 0.15, 0.18, 16, M(0xd8d8d8, { metalness: 0.7, roughness: 0.2 }), 0, 0.05, 0, g); cyl(0.2, 0.2, 0.02, 16, c, 0, 0.21, 0, g); }
  else if (kind === 'skewer') { for (let i = 0; i < 3; i++) { const s = cyl(0.015, 0.015, 0.7, 4, M(0x999999), 0, 0.1, -0.12 + i * 0.12, g); s.rotation.z = Math.PI / 2; s.position.y = 0.12; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), c); m.position.set(-0.2 + k * 0.13, 0.12, -0.12 + i * 0.12); g.add(m); } } }
  else if (kind === 'puri') { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), c); const a = i / 6 * Math.PI * 2; m.position.set(Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2); m.scale.y = 0.8; g.add(m); } }
  else if (kind === 'spiral') { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 20), c); m.rotation.x = Math.PI / 2; m.position.set(-0.15 + i * 0.15, 0.06, 0); g.add(m); } }
  else if (kind === 'flat') { cyl(0.3, 0.3, 0.04, 16, M(0xc99a4a), 0, 0.05, 0, g); const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c); h.position.set(0.12, 0.09, 0); g.add(h); }
  else if (kind === 'dumpling') { for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), c); m.rotation.z = Math.PI / 2; m.position.set(0, 0.08, -0.16 + i * 0.08); g.add(m); } }
  else if (kind === 'glass') { cyl(0.1, 0.08, 0.35, 16, M(0xffffff, { transparent: true, opacity: 0.4, roughness: 0.05 }), 0, 0.05, 0, g); cyl(0.09, 0.075, 0.3, 16, c, 0, 0.06, 0, g); }
  else { for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08), M([0xc9772a, 0x6aa84f, 0xe3b65a, 0xb5422f][i])); m.position.set(Math.cos(i * 1.6) * 0.18, 0.09, Math.sin(i * 1.6) * 0.18); g.add(m); } }
  return g;
}

/* Generic institutional building (school/hospital/college) with sign */
export function institution(parent, name, { w = 30, d = 12, floors = 3, color = 0xf3ead8, accent = 0x2a6dd2, sign = '#1d4f91', cross = false } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const wall = pbr('plastered_wall_04', 3, { color }), h = floors * 3.4;
  box(w, h, d, wall, 0, 0, 0, g);
  box(w + 0.6, 0.5, d + 0.6, M(accent), 0, h, 0, g);
  // windows rows
  const win = M(0x2b3a48, { roughness: 0.15, metalness: 0.5 });
  for (let f = 0; f < floors; f++) for (let i = 0; i < Math.floor(w / 3.2); i++) {
    box(1.6, 1.4, 0.1, win, -w / 2 + 1.8 + i * 3.2, 1.1 + f * 3.4, d / 2 + 0.02, g).castShadow = false;
  }
  box(3, 2.8, 0.3, M(0x5b3a22), 0, 0, d / 2 + 0.1, g);
  const s = signMesh(name, Math.min(w * 0.7, 16), { bg: sign, fg: '#ffffff', font: 'bold 50px Inter, sans-serif' });
  s.position.set(0, h + 1.6, d / 2 + 0.2); g.add(s);
  cyl(0.6, 0.6, 1, 4, M(accent), 0, h + 0.5, d / 2 + 0.1, g).visible = false;
  if (cross) { const c1 = box(2.4, 0.7, 0.2, glowMat(0xd01010, 0xff2020, 2), w / 2 - 3, h - 2.5, d / 2 + 0.2, g); box(0.7, 2.4, 0.2, glowMat(0xd01010, 0xff2020, 2), w / 2 - 3, h - 3.35, d / 2 + 0.2, g); }
  return g;
}

export function mosque(parent) {
  const g = new THREE.Group(); parent.add(g);
  const wall = pbr('plastered_wall_04', 2, { color: 0xf4f4ef }), green = M(0x1f7a4a, { roughness: 0.4, metalness: 0.2 });
  box(16, 7, 12, wall, 0, 0, 0, g);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), green); dome.position.y = 7; dome.castShadow = true; g.add(dome);
  for (const x of [-9, 9]) { cyl(0.8, 1, 16, 12, wall, x, 0, 5, g); const t = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 12), green); t.position.set(x, 17.2, 5); g.add(t); }
  for (let i = -2; i <= 2; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16, 1, false, 0, Math.PI), M(0x1f5a3a)); a.rotation.set(Math.PI / 2, 0, 0); a.position.set(i * 3, 3.5, 6.05); g.add(a); }
  return g;
}

export function shikhara(parent, s = 1) {
  const g = new THREE.Group(); parent.add(g); g.scale.setScalar(s);
  box(8, 1, 8, pbr('marble_01', 2), 0, 0, 0, g);
  box(5, 4, 5, pbr('plastered_wall_04', 1, { color: 0xf3d9b0 }), 0, 1, 0, g);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(3.2, 8, 8), M(0xe9b04a, { roughness: 0.5 })); sp.position.y = 9; sp.castShadow = true; g.add(sp);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), M(PAL.gold, { metalness: 0.8, roughness: 0.3 })); k.position.y = 13.3; g.add(k);
  return g;
}

export function bus(parent, color = 0xd23b2a) {
  const g = new THREE.Group(); parent.add(g);
  box(2.5, 2.6, 10, M(color, { roughness: 0.4, metalness: 0.3 }), 0, 0.5, 0, g);
  box(2.55, 0.9, 9, M(0x1b2630, { roughness: 0.1, metalness: 0.6 }), 0, 1.9, -0.2, g);
  for (const z of [-3.5, 3.5]) for (const x of [-1.25, 1.25]) { const w = cyl(0.5, 0.5, 0.35, 12, M(0x111111), x, 0, z, g); w.rotation.z = Math.PI / 2; w.position.y = 0.5; }
  return g;
}

export function photoBoard(parent, img, w = 4, aspect = 1.5, title = '') {
  const g = new THREE.Group(); parent.add(g);
  const h = w / aspect;
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) cyl(0.08, 0.08, 1.6 + h, 6, M(0x333333), x, 0, -0.1, g);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat(img)); p.position.y = 1.6 + h / 2; g.add(p);
  if (title) { const s = signMesh(title, w, { bg: '#1b1410', fg: '#f2a33a', h: 96, font: 'bold 48px Inter, sans-serif' }); s.position.y = 1.6 + h + 0.5; g.add(s); }
  return g;
}
