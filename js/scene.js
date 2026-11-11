/* Nepalgunj — stylized low-poly 3D scene (three.js).
   Bageshwori-style pagoda temple, Junge Mahadev pavilion in a reflecting pond,
   Surkhet Road bazaar, Hanuman statue, Rapti-style truss bridge, Terai fields,
   real solar path for Nepalgunj (28.05°N, 81.617°E, UTC+5:45). */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const LAT = 28.05, LON = 81.617, TZ = 5.75;
const DEG = Math.PI / 180;

export function sunPosition(hour, date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const N = Math.floor((date - start) / 864e5);
  const decl = 23.44 * Math.sin(2 * Math.PI * (284 + N) / 365) * DEG;
  const B = 2 * Math.PI * (N - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const lst = hour + (4 * (LON - 15 * TZ) + eot) / 60;
  const H = 15 * (lst - 12) * DEG, phi = LAT * DEG;
  const el = Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H));
  let az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) + Math.PI;
  return { el, az };
}

export function createScene(container, opts = {}) {
  const isMobile = matchMedia('(max-width: 760px)').matches || navigator.maxTouchPoints > 1 && innerWidth < 1100;
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.className = 'labels-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfb79a, 160, 620);
  const camera = new THREE.PerspectiveCamera(isMobile ? 55 : 42, container.clientWidth / container.clientHeight, 0.5, 4000);
  camera.position.set(120, 95, 150);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(8, 4, -4);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 8;
  controls.maxDistance = 420;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // ---------- Sky + lights ----------
  const sky = new Sky();
  sky.scale.setScalar(3000);
  const su = sky.material.uniforms;
  su.turbidity.value = 9; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.82;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5d4a2e, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0); moon.position.set(-120, 160, 80); scene.add(moon);
  sun.target.position.set(10, 0, 0);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 1400; i++) {
    const u = Math.random(), v = Math.random() * 0.5 + 0.02;
    const th = 2 * Math.PI * u, ph = Math.acos(1 - v);
    sp.push(1500 * Math.sin(ph) * Math.cos(th), 1500 * Math.cos(ph), 1500 * Math.sin(ph) * Math.sin(th));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  // ---------- Materials ----------
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...o });
  const mat = {
    ground: M(0x8a9a52), field1: M(0x9fae55), field2: M(0xc2b46a), field3: M(0x6f8a3f),
    pave: M(0xd9cdb8), plinth: M(0xb8aa95), cream: M(0xf1e6cf), red: M(0xa8231d), roof: M(0xe9e9ea, { roughness: 0.55 }),
    gold: M(0xd9a935, { metalness: 0.6, roughness: 0.35 }), yellow: M(0xf2c230), orange: M(0xe0702a),
    road: M(0x3b3b40, { roughness: 0.95 }), mark: M(0xf5f1e4), trunk: M(0x6b4b2e), leaf: M(0x4f7d32), leaf2: M(0x6e9a3a), palm: M(0x3f7a3a),
    steel: M(0x8c949c, { metalness: 0.5, roughness: 0.45 }), concrete: M(0xbdb6aa), sand: M(0xd8c39a), hill: M(0x6c7f5c),
    saffron: M(0xe8641c, { roughness: 0.6 }),
    river: new THREE.MeshStandardMaterial({ color: 0x5f8f8a, roughness: 0.18, metalness: 0.1 }),
    windowLit: new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb860, emissiveIntensity: 0 }),
    diya: new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff9a2a, emissiveIntensity: 0 })
  };
  const shadow = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const box = (w, h, d, m) => shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
  // square frustum (pagoda roof) — CylinderGeometry with 4 sides rotated 45°
  const frustum = (top, bottom, h, m) => { const g = new THREE.CylinderGeometry(top, bottom, h, 4, 1); g.rotateY(Math.PI / 4); return shadow(new THREE.Mesh(g, m)); };

  const labels = [];
  const addLabel = (text, pos, cls = '') => {
    const el = document.createElement('div'); el.className = 'scene-label ' + cls; el.innerHTML = text;
    const o = new CSS2DObject(el); o.position.copy(pos); scene.add(o); labels.push(o); return o;
  };

  // ---------- Ground & Terai fields ----------
  const groundGeo = new THREE.PlaneGeometry(1600, 1600, 60, 60);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), d = Math.hypot(x, z);
    gp.setY(i, d > 140 ? (Math.sin(x * 0.02) + Math.cos(z * 0.017)) * 0.8 - 0.3 : -0.05);
  }
  groundGeo.computeVertexNormals();
  scene.add(shadow(new THREE.Mesh(groundGeo, mat.ground), false, true));

  const fieldMats = [mat.field1, mat.field2, mat.field3];
  const rand = mulberry32(7);
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, r = 150 + rand() * 300;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - 34) < 12 || Math.abs(z + 150) < 30) continue;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(20 + rand() * 40, 20 + rand() * 40), fieldMats[i % 3]);
    f.rotation.x = -Math.PI / 2; f.rotation.z = rand() * 0.3; f.position.set(x, 0.6, z); f.receiveShadow = true;
    scene.add(f);
  }

  // distant Chure / Siwalik hills to the north
  for (let i = 0; i < 26; i++) {
    const g = new THREE.ConeGeometry(60 + rand() * 80, 40 + rand() * 70, 6);
    const h = new THREE.Mesh(g, mat.hill);
    h.position.set(-700 + i * 56 + rand() * 30, 10, -720 - rand() * 120);
    scene.add(h);
  }

  // ---------- Temple courtyard ----------
  const court = box(54, 0.5, 52, mat.pave); court.position.set(0, 0.2, 2); court.castShadow = false; scene.add(court);

  // Bageshwori-style three-tier pagoda temple (stylized from Commons photos)
  const temple = new THREE.Group(); temple.position.set(0, 0.45, -12);
  const pl1 = box(17, 1.0, 14, mat.plinth); pl1.position.y = 0.5; temple.add(pl1);
  const pl2 = box(15, 0.6, 12, mat.cream); pl2.position.y = 1.3; temple.add(pl2);
  const wall1 = box(11, 4.2, 8.5, mat.cream); wall1.position.y = 3.7; temple.add(wall1);
  const door = box(2.2, 3, 0.3, mat.red); door.position.set(0, 3.1, 4.3); temple.add(door);
  for (let i = 0; i < 6; i++) { // red pillars on the porch
    const p = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.2, 8), mat.red));
    p.position.set(-6 + i * 2.4, 3.7, 5.6); temple.add(p);
  }
  const band1 = box(15.2, 0.6, 12.2, mat.red); band1.position.y = 6.1; temple.add(band1);
  const r1 = frustum(5.6, 11.2, 2.2, mat.roof); r1.scale.set(1, 1, 0.82); r1.position.y = 7.5; temple.add(r1);
  const wall2 = box(7.4, 1.8, 6, mat.cream); wall2.position.y = 9.3; temple.add(wall2);
  const band2 = box(11, 0.5, 9, mat.red); band2.position.y = 10.4; temple.add(band2);
  const r2 = frustum(3.8, 7.8, 1.8, mat.roof); r2.scale.set(1, 1, 0.84); r2.position.y = 11.5; temple.add(r2);
  const wall3 = box(4.6, 1.5, 3.8, mat.cream); wall3.position.y = 13.1; temple.add(wall3);
  const band3 = box(7, 0.45, 6, mat.red); band3.position.y = 14; temple.add(band3);
  const r3 = frustum(0.4, 5, 2.4, mat.roof); r3.scale.set(1, 1, 0.86); r3.position.y = 15.4; temple.add(r3);
  const finial = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 8), mat.gold)); finial.position.y = 17.4; temple.add(finial);
  const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), mat.gold)); pole.position.y = 19; temple.add(pole);
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -1.4, 0, 2.2, -0.7, 0], 3));
  flagGeo.computeVertexNormals();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xd8261c, side: THREE.DoubleSide }));
  flag.position.y = 20.9; temple.add(flag);
  scene.add(temple);
  addLabel('Bageshwori Mandir<small>बागेश्वरी मन्दिर</small>', new THREE.Vector3(0, 24, -12), 'big');

  // bells / small shrines around courtyard
  [[-20, -14], [20, -14], [-20, -2], [20, -2]].forEach(([x, z]) => {
    const s = box(2.4, 2.4, 2.4, mat.cream); s.position.set(x, 1.6, z); scene.add(s);
    const sr = frustum(0.2, 2.2, 1.6, mat.red); sr.position.set(x, 3.6, z); scene.add(sr);
  });

  // ---------- Pond with reflection + Junge Mahadev pavilion ----------
  const PZ = 20, PW = 34, PD = 22;
  const rimH = 1.2;
  const rimParts = [[PW + 2, 1, 0, -PD / 2 - 0.5], [PW + 2, 1, 0, PD / 2 + 0.5], [1, PD + 2, -PW / 2 - 0.5, 0], [1, PD + 2, PW / 2 + 0.5, 0]];
  rimParts.forEach(([w, d, x, z]) => { const r = box(w, rimH, d, mat.orange); r.position.set(x, 0.8, PZ + z); scene.add(r); });
  const pondFloor = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), M(0x2c3b2c)); pondFloor.rotation.x = -Math.PI / 2; pondFloor.position.set(0, -0.6, PZ); scene.add(pondFloor);
  const reflectRes = isMobile ? 384 : 768;
  const pond = new Reflector(new THREE.PlaneGeometry(PW, PD), { clipBias: 0.003, textureWidth: reflectRes, textureHeight: reflectRes * (PD / PW), color: 0x7f9a86 });
  pond.rotation.x = -Math.PI / 2; pond.position.set(0, 0.35, PZ);
  scene.add(pond);
  // pavilion on a round island
  const pav = new THREE.Group(); pav.position.set(0, 0, PZ + 2);
  const isl = shadow(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 1.4, 16), mat.cream)); isl.position.y = 0.6; pav.add(isl);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const p = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.6, 6), mat.orange)); p.position.set(Math.cos(a) * 3.2, 3.1, Math.sin(a) * 3.2); pav.add(p);
  }
  const ring = shadow(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.9, 16), mat.red)); ring.position.y = 5.3; pav.add(ring);
  const dome = shadow(new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 16), mat.gold)); dome.position.y = 7; pav.add(dome);
  const ling = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.4, 10), M(0x3a3a3a))); ling.position.y = 2; pav.add(ling);
  scene.add(pav);
  addLabel('Junge Mahadev<small>जुंगे महादेव</small>', new THREE.Vector3(0, 10.5, PZ + 2));
  // yellow walkway bridge from north rim to pavilion
  const walkLen = (PZ + 2 - 4.2) - (PZ - PD / 2);
  const walk = box(2.6, 0.5, walkLen, mat.yellow); walk.position.set(0, 1.25, PZ - PD / 2 + walkLen / 2); scene.add(walk);
  [-1.4, 1.4].forEach(x => { const r = box(0.3, 1, walkLen, mat.yellow); r.position.set(x, 1.9, walk.position.z); scene.add(r); });

  // diyas along the pond rim (light up at night)
  const diyaGeo = new THREE.SphereGeometry(0.22, 6, 4);
  const diyaPos = [];
  for (let i = 0; i <= 16; i++) { const x = -PW / 2 + i * PW / 16; diyaPos.push([x, PZ - PD / 2 - 0.5], [x, PZ + PD / 2 + 0.5]); }
  for (let i = 1; i < 10; i++) { const z = PZ - PD / 2 + i * PD / 10; diyaPos.push([-PW / 2 - 0.5, z], [PW / 2 + 0.5, z]); }
  const diyas = new THREE.InstancedMesh(diyaGeo, mat.diya, diyaPos.length);
  const tmp = new THREE.Object3D();
  diyaPos.forEach(([x, z], i) => { tmp.position.set(x, 1.55, z); tmp.updateMatrix(); diyas.setMatrixAt(i, tmp.matrix); });
  scene.add(diyas);
  const glow1 = new THREE.PointLight(0xffa040, 0, 40, 1.6); glow1.position.set(0, 4, PZ); scene.add(glow1);
  const glow2 = new THREE.PointLight(0xffb060, 0, 30, 1.6); glow2.position.set(0, 6, -4); scene.add(glow2);

  // ---------- Trees (instanced) ----------
  const treeSpots = [];
  for (let i = 0; i < 160; i++) {
    const x = (rand() - 0.5) * 300, z = (rand() - 0.5) * 300;
    const inCourt = Math.abs(x) < 30 && z > -26 && z < 34;
    const onRoad = Math.abs(x - 46) < 18 || Math.abs(z + 150) < 32 || (Math.abs(z + 40) < 7);
    const nearHanu = Math.hypot(x + 60, z - 40) < 14;
    if (!inCourt && !onRoad && !nearHanu) treeSpots.push([x, z, 0.7 + rand() * 0.9]);
  }
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; treeSpots.push([Math.cos(a) * 33, PZ - 8 + Math.sin(a) * 26 * 1.05, 0.9]); }
  const trunkI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 4, 5), mat.trunk, treeSpots.length);
  const crownI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.2, 0), mat.leaf, treeSpots.length);
  treeSpots.forEach(([x, z, s], i) => {
    tmp.position.set(x, 2 * s, z); tmp.scale.setScalar(s); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); trunkI.setMatrixAt(i, tmp.matrix);
    tmp.position.set(x, 5.4 * s, z); tmp.rotation.set(rand(), rand(), rand()); tmp.scale.set(s, s * 0.9, s); tmp.updateMatrix(); crownI.setMatrixAt(i, tmp.matrix);
    crownI.setColorAt(i, new THREE.Color().setHSL(0.24 + rand() * 0.07, 0.45, 0.3 + rand() * 0.1));
  });
  [trunkI, crownI].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });

  // palms around the pond (as in the Commons photo)
  const palm = (x, z, h = 9) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const t = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h, 6), mat.trunk)); t.position.y = h / 2; t.rotation.z = (rand() - 0.5) * 0.15; g.add(t);
    for (let i = 0; i < 7; i++) {
      const f = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.6, 4), mat.palm));
      f.position.y = h; f.rotation.set(Math.PI / 2.6, i / 7 * Math.PI * 2, 0, 'YXZ');
      f.translateY(2.1); g.add(f);
    }
    scene.add(g);
  };
  for (let i = 0; i < 8; i++) { palm(-PW / 2 - 4, PZ - PD / 2 + i * PD / 7, 8 + rand() * 3); palm(PW / 2 + 4, PZ - PD / 2 + i * PD / 7, 8 + rand() * 3); }

  // ---------- Surkhet Road (N–S) + cross road + bazaar ----------
  const RX = 46;
  const road = box(12, 0.12, 900, mat.road); road.position.set(RX, 0.12, -150); road.castShadow = false; scene.add(road);
  const cross = box(500, 0.11, 10, mat.road); cross.position.set(40, 0.11, -40); cross.castShadow = false; scene.add(cross);
  const dashI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.05, 3), mat.mark, 150);
  for (let i = 0; i < 150; i++) { tmp.position.set(RX, 0.2, 290 - i * 6); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1); tmp.updateMatrix(); dashI.setMatrixAt(i, tmp.matrix); }
  scene.add(dashI);
  // chowk roundabout
  const chowk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 0.8, 20), mat.cream)); chowk.position.set(RX, 0.5, -40); scene.add(chowk);
  const chowkPost = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 8), mat.gold)); chowkPost.position.set(RX, 3, -40); scene.add(chowkPost);
  addLabel('Surkhet Road<small>chowks & sekuwa evenings</small>', new THREE.Vector3(RX, 9, -40));
  addLabel('↑ Kohalpur · 16 km', new THREE.Vector3(RX, 6, -260), 'sign');
  addLabel('↓ Jamunaha border', new THREE.Vector3(RX, 6, 150), 'sign');

  // bazaar buildings (instanced), pastel facades like Nepalgunj Bazar photos
  const palette = [0xf0c9b8, 0xe9d8a6, 0xf4efe6, 0xc9d9e6, 0xe7b48a, 0xd9a3a8, 0xf1e1c4, 0xb9cfb0];
  const bSpots = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let z = 140; z > -300; z -= 7 + rand() * 4) {
      if (Math.abs(z + 40) < 9) continue;
      for (let row = 0; row < 3; row++) {
        const w = 6 + rand() * 3, d = 7 + rand() * 4, h = 4 + rand() * (row === 0 ? 10 : 7);
        const x = RX + side * (10 + row * 10 + rand() * 2);
        if (side < 0 && x > RX - 34 && z > -30 && z < 38) continue;
        bSpots.push([x, z, w, h, d]);
      }
    }
  }
  const bI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xffffff), bSpots.length);
  const winSpots = [];
  bSpots.forEach(([x, z, w, h, d], i) => {
    tmp.position.set(x, h / 2, z); tmp.rotation.set(0, 0, 0); tmp.scale.set(w, h, d); tmp.updateMatrix(); bI.setMatrixAt(i, tmp.matrix);
    bI.setColorAt(i, new THREE.Color(palette[Math.floor(rand() * palette.length)]));
    const floors = Math.floor(h / 3);
    const face = x < RX ? x + w / 2 + 0.02 : x - w / 2 - 0.02;
    for (let f = 0; f < floors; f++) if (rand() > 0.35) winSpots.push([face, 1.8 + f * 3, z + (rand() - 0.5) * (d - 2)]);
  });
  bI.castShadow = true; bI.receiveShadow = true; scene.add(bI);
  const winI = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.2, 1.5), mat.windowLit, winSpots.length);
  winSpots.forEach(([x, y, z], i) => { tmp.position.set(x, y, z); tmp.rotation.set(0, Math.PI / 2, 0); tmp.scale.set(1, 1, 1); tmp.updateMatrix(); winI.setMatrixAt(i, tmp.matrix); });
  mat.windowLit.side = THREE.DoubleSide;
  scene.add(winI);

  // traffic: buses, tempos, motorbikes
  const vehicles = [];
  const vCols = [0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b, 0xffffff, 0xe0702a];
  for (let i = 0; i < 26; i++) {
    const big = i % 5 === 0, bike = i % 3 === 1;
    const g = new THREE.Group();
    const b = box(big ? 2.6 : bike ? 0.7 : 2, big ? 3 : bike ? 1.3 : 1.7, big ? 10 : bike ? 2 : 4.2, M(vCols[i % vCols.length], { roughness: 0.5 }));
    b.position.y = (big ? 3 : bike ? 1.3 : 1.7) / 2 + 0.3; g.add(b);
    const lane = i % 2 ? 1 : -1;
    g.position.set(RX + lane * 2.8, 0, 280 - rand() * 560);
    g.userData = { speed: (big ? 9 : bike ? 16 : 12) * (0.8 + rand() * 0.4) * -lane };
    scene.add(g); vehicles.push(g);
  }

  // ---------- Giant Hanuman statue (stylized) ----------
  const hanu = new THREE.Group(); hanu.position.set(-60, 0, 40);
  const moat = box(26, 0.3, 26, M(0x2f4f5a, { roughness: 0.25 })); moat.position.y = 0.1; hanu.add(moat);
  const hb = box(16, 1.6, 16, mat.concrete); hb.position.y = 0.8; hanu.add(hb);
  const hb2 = shadow(new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 1.4, 20), mat.concrete)); hb2.position.y = 2.3; hanu.add(hb2);
  const legL = box(1.5, 7, 1.7, mat.saffron); legL.position.set(-1.1, 6.5, 0); hanu.add(legL);
  const legR = legL.clone(); legR.position.x = 1.1; hanu.add(legR);
  const dhoti = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 4, 8), mat.red)); dhoti.position.y = 9.5; hanu.add(dhoti);
  const torso = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.0, 6, 8), mat.saffron)); torso.position.y = 14.2; hanu.add(torso);
  const neck = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.25, 6, 12), mat.gold)); neck.rotation.x = Math.PI / 2; neck.position.y = 16.6; hanu.add(neck);
  const head = shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), mat.saffron)); head.position.y = 18.6; hanu.add(head);
  const crown = shadow(new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 8), mat.gold)); crown.position.y = 20.9; hanu.add(crown);
  const armR = box(1.1, 5, 1.1, mat.saffron); armR.position.set(3.1, 16.2, 0.4); armR.rotation.z = -0.2; hanu.add(armR); // raised in blessing
  const armL = box(1.1, 6, 1.1, mat.saffron); armL.position.set(-3, 12.6, 0.3); armL.rotation.z = 0.12; hanu.add(armL);
  const gadaH = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), mat.gold)); gadaH.position.set(-3.6, 6.6, 0.8); hanu.add(gadaH);
  const gada = shadow(new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), mat.gold)); gada.position.set(-3.6, 3.6, 0.8); gada.scale.y = 1.25; hanu.add(gada);
  hanu.rotation.y = 0.6;
  scene.add(hanu);
  addLabel('Hanumangadhi<small>108-ft Hanuman</small>', new THREE.Vector3(-60, 25, 40));

  // ---------- River + steel truss bridge (Rapti-style) ----------
  const RZ = -150;
  const riverGeo = new THREE.PlaneGeometry(1600, 46, 80, 4); riverGeo.rotateX(-Math.PI / 2);
  const river = new THREE.Mesh(riverGeo, mat.river); river.position.set(0, 0.25, RZ); river.receiveShadow = true; scene.add(river);
  [-1, 1].forEach(s => { const bank = new THREE.Mesh(new THREE.PlaneGeometry(1600, 14), mat.sand); bank.rotation.x = -Math.PI / 2; bank.position.set(0, 0.3, RZ + s * 28); bank.receiveShadow = true; scene.add(bank); });
  const bridge = new THREE.Group(); bridge.position.set(RX, 0, RZ);
  const deck = box(10, 1, 74, mat.concrete); deck.position.y = 5; bridge.add(deck);
  for (let i = -1; i <= 1; i++) { const pier = box(3, 5, 3, mat.concrete); pier.position.set(0, 2.5, i * 18); bridge.add(pier); }
  // truss: lines on both sides
  const trussPts = [];
  for (const sx of [-5, 5]) {
    for (let z = -36; z < 36; z += 6) {
      trussPts.push(sx, 5.5, z, sx, 5.5, z + 6, sx, 11, z, sx, 11, z + 6, sx, 5.5, z, sx, 11, z + 6, sx, 11, z, sx, 5.5, z + 6, sx, 5.5, z, sx, 11, z);
    }
    trussPts.push(sx, 5.5, 36, sx, 11, 36);
  }
  for (let z = -36; z <= 36; z += 6) trussPts.push(-5, 11, z, 5, 11, z);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(trussPts, 3));
  bridge.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0x9aa3ab })));
  // chunky beams for visibility from afar
  for (const sx of [-5, 5]) { const top = box(0.5, 0.5, 72, mat.steel); top.position.set(sx, 11, 0); bridge.add(top); }
  scene.add(bridge);
  // new concrete bridge under construction beside it
  const nb = new THREE.Group(); nb.position.set(RX + 22, 0, RZ);
  for (let i = -2; i <= 2; i++) { const p = box(3.2, 7, 3.2, mat.concrete); p.position.set(0, 3.5, i * 14); nb.add(p); }
  const seg = box(11, 1.2, 30, mat.concrete); seg.position.set(0, 7.4, -22); nb.add(seg);
  const crane = box(0.6, 18, 0.6, M(0xf2c230)); crane.position.set(6, 9, 4); nb.add(crane);
  const jib = box(14, 0.5, 0.5, M(0xf2c230)); jib.position.set(1, 18, 4); nb.add(jib);
  scene.add(nb);
  addLabel('Rapti River bridges<small>old steel truss · new bridge rising</small>', new THREE.Vector3(RX + 10, 18, RZ));

  // little Twin Otter circling (Nepalgunj is the hub for western hill flights)
  const plane = new THREE.Group();
  const fus = box(1.4, 1.4, 9, M(0xf4f4f4)); plane.add(fus);
  const wing = box(14, 0.25, 1.8, M(0xd23b2a)); wing.position.set(0, 0.7, -0.5); plane.add(wing);
  const tail = box(0.25, 2, 1.4, M(0xd23b2a)); tail.position.set(0, 1.2, 4); plane.add(tail);
  scene.add(plane);

  // ---------- Sun / time of day ----------
  const sunDir = new THREE.Vector3();
  const dayFog = new THREE.Color(0xd8c7a8), duskFog = new THREE.Color(0xe39a6a), nightFog = new THREE.Color(0x0d1324);
  const warm = new THREE.Color(0xffa25a), white = new THREE.Color(0xfff4e2);
  let hour = opts.hour ?? 16.6;
  let night = 0;
  function applySun() {
    const { el, az } = sunPosition(hour);
    sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    su.sunPosition.value.copy(sunDir);
    sun.position.copy(sunDir).multiplyScalar(200).add(sun.target.position);
    const e = Math.sin(el);
    const dayK = THREE.MathUtils.smoothstep(e, -0.05, 0.25);
    night = 1 - THREE.MathUtils.smoothstep(e, -0.18, 0.02);
    sun.intensity = Math.max(0, THREE.MathUtils.smoothstep(e, -0.02, 0.15)) * 3.0;
    sun.color.copy(warm).lerp(white, THREE.MathUtils.smoothstep(e, 0.02, 0.45));
    hemi.intensity = 0.35 + dayK * 0.4;
    moon.intensity = night * 0.9;
    hemi.color.setHex(night > 0.5 ? 0x6c7fb8 : 0xcfe3ff);
    renderer.toneMappingExposure = 0.5 + dayK * 0.08;
    const fogC = night > 0.01 ? duskFog.clone().lerp(nightFog, night) : duskFog.clone().lerp(dayFog, THREE.MathUtils.smoothstep(e, 0.05, 0.4));
    scene.fog.color.copy(fogC);
    starMat.opacity = night * 0.95;
    sky.visible = night < 0.98;
    scene.background = night > 0.6 ? nightFog : null;
    mat.windowLit.emissiveIntensity = night * 2.2;
    mat.diya.emissiveIntensity = night * 3;
    glow1.intensity = night * 60; glow2.intensity = night * 40;
    opts.onSun?.({ hour, el: el / DEG, az: az / DEG, night });
  }
  applySun();

  // ---------- Camera views ----------
  const views = {
    aerial: { p: [130, 105, 150], t: [8, 4, -10] },
    temple: { p: [16, 9, 14], t: [0, 9, -12] },
    pond: { p: [-24, 7, 44], t: [0, 3, 20] },
    bazaar: { p: [56, 8, 30], t: [46, 4, -40] },
    hanuman: { p: [-38, 14, 64], t: [-60, 13, 40] },
    bridge: { p: [100, 22, -100], t: [52, 7, -150] }
  };
  let tween = null;
  function goTo(name) {
    const v = views[name]; if (!v) return;
    controls.autoRotate = false;
    tween = { t0: performance.now(), dur: 1800, p0: camera.position.clone(), t0v: controls.target.clone(), p1: new THREE.Vector3(...v.p), t1: new THREE.Vector3(...v.t) };
  }

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let running = true, follow = false, frames = 0, fpsT = 0, traffic = true;
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
      if (k >= 1) tween = null;
    }
    if (follow) { hour += dt * 0.8; if (hour >= 24) hour -= 24; applySun(); }
    if (traffic) vehicles.forEach(v => { v.position.z += v.userData.speed * dt; if (v.position.z < -300) v.position.z = 280; if (v.position.z > 280) v.position.z = -300; });
    flag.rotation.y = Math.sin(t * 3) * 0.35;
    const pa = t * 0.12; plane.position.set(Math.cos(pa) * 210, 70 + Math.sin(t * 0.5) * 3, Math.sin(pa) * 210); plane.rotation.set(0, -pa, 0.25);
    const rp = riverGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) rp.setY(i, Math.sin(rp.getX(i) * 0.05 + t * 1.2) * 0.12);
    rp.needsUpdate = true;
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    frames++; fpsT += dt; if (fpsT > 0.5) { opts.onFps?.(Math.round(frames / fpsT)); frames = 0; fpsT = 0; }
    requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } }
  function stop() { running = false; }
  requestAnimationFrame(frame);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); labelRenderer.setSize(w, h);
  }
  addEventListener('resize', resize);
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; tween = null; });
  renderer.domElement.addEventListener('dblclick', e => {
    const r = renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    const hit = ray.intersectObjects(scene.children, true)[0];
    if (hit) tween = { t0: performance.now(), dur: 900, p0: camera.position.clone(), t0v: controls.target.clone(), p1: camera.position.clone(), t1: hit.point.clone() };
  });

  return {
    setHour(h) { hour = h; applySun(); },
    getHour: () => hour,
    setFollow(f) { follow = f; },
    setLabels(on) { labels.forEach(l => l.visible = on); },
    setTraffic(on) { traffic = on; vehicles.forEach(v => v.visible = on); },
    setAutoRotate(on) { controls.autoRotate = on; },
    goTo, start, stop, resize,
    camera, controls
  };
}

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
