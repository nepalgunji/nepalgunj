import * as THREE from 'three';

const sq = (s) => s / Math.SQRT2;
function frustum(bottom, top, h, mat) { // square hip-roof tier
  const g = new THREE.CylinderGeometry(sq(top), sq(bottom), h, 4, 1, true); g.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function box(w, h, d, mat, y = 0) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y + h / 2, 0); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; }

// Bageshwori Mandir — three-tier pagoda: cream walls, red bands, red tiled roofs, carved eaves, gilt gajur
export function makeTemple(tex) {
  const g = new THREE.Group(); const lights = [];
  const cream = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.92, 0.86, 0.78, THREE.SRGBColorSpace), map: tex.plaster, normalMap: tex.plasterN, roughness: 0.85 });
  const red = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.62, 0.1, 0.08, THREE.SRGBColorSpace), roughness: 0.55, normalMap: tex.tileN, normalScale: new THREE.Vector2(1.2, 1.2) });
  const band = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.78, 0.25, 0.3, THREE.SRGBColorSpace), roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.42, 0.24, 0.12, THREE.SRGBColorSpace), roughness: 0.7 });
  const marble = new THREE.MeshStandardMaterial({ color: 0xd8d2c8, map: tex.marble, roughness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(1.0, 0.72, 0.28, THREE.SRGBColorSpace), metalness: 1, roughness: 0.28 });
  g.add(box(22, 1.0, 22, marble));               // plinth
  g.add(box(19, 0.4, 19, marble, 1.0));
  // ring of pillars + porch
  for (let i = 0; i < 24; i++) {
    const side = Math.floor(i / 6), k = (i % 6) / 5 - 0.5; const s = 15.6;
    const x = [k * s, s / 2, -k * s, -s / 2][side], z = [-s / 2, k * s, s / 2, -k * s][side];
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 5.2, 10), cream); p.position.set(x, 1.4 + 2.6, z); p.castShadow = true; g.add(p);
  }
  g.add(box(11.5, 6.6, 11.5, cream, 1.4));                    // sanctum
  g.add(box(11.7, 0.9, 11.7, band, 4.2));                    // red patterned band
  g.add(box(16.6, 0.55, 16.6, band, 6.6));                    // eave beam
  // roofs (3 tiers) with struts
  const tiers = [[19.5, 10.2, 7.15, 2.2], [13.6, 6.6, 12.6, 1.9], [8.8, 0.7, 17.2, 2.9]];
  const walls = [[9.0, 9.35, 3.3], [5.9, 14.5, 2.75]];
  tiers.forEach(([b, t, y, h], i) => {
    const r = frustum(b, t, h, red); r.position.y = y + h / 2; g.add(r);
    const e = box(b + 0.2, 0.35, b + 0.2, band, y - 0.35); g.add(e);
    // eave light string (lit at night)
    for (let k = 0; k < 4; k++) for (let j = 0; j <= 12; j++) {
      const f = j / 12 - 0.5, s = b / 2 + 0.05; const P = [[f * b, -s], [s, f * b], [-f * b, s], [-s, -f * b]][k];
      lights.push(P[0], y - 0.4, P[1]);
    }
    // struts
    const s = b / 2 - 1.4;
    for (let k = 0; k < 4; k++) for (let j = -2; j <= 2; j++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.0, 0.22), wood);
      const a = k * Math.PI / 2; const ox = Math.cos(a), oz = Math.sin(a); const tx = -oz, tz = ox;
      st.position.set(ox * s + tx * j * b / 6, y - 0.9, oz * s + tz * j * b / 6); st.rotation.set(oz * 0.5, 0, -ox * 0.5); g.add(st);
    }
    if (walls[i]) { const [w, wy, wh] = walls[i]; g.add(box(w, wh, w, cream, wy)); g.add(box(w + 0.15, 0.5, w + 0.15, band, wy + wh - 0.9)); }
  });
  // gajur (gilt finial)
  const prof = [[0, 0], [0.55, 0], [0.6, 0.25], [0.35, 0.45], [0.75, 0.9], [0.8, 1.3], [0.5, 1.7], [0.28, 1.85], [0.45, 2.1], [0.3, 2.45], [0.12, 2.9], [0.04, 3.5], [0, 3.6]];
  const gaj = new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 24), gold); gaj.position.y = 19.9; gaj.castShadow = true; g.add(gaj);
  // flag poles with red/orange flags on the corners
  const flagM = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.9, 0.18, 0.06, THREE.SRGBColorSpace), side: THREE.DoubleSide, roughness: 0.8 });
  for (const [x, z] of [[10, 10], [-10, 10], [10, -10], [-10, -10]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 9, 6), wood); pole.position.set(x, 5.5, z); g.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), flagM); fl.position.set(x + 0.9, 9.3, z); g.add(fl);
  }
  return { group: g, lights };
}

// 108-ft Hanuman — a cut-out of the real statue photo standing on a 3D plinth (turns to face the camera)
export function makeHanuman(tex) {
  const g = new THREE.Group();
  const conc = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, map: tex.conc2, roughness: 0.9 });
  const base = box(14, 3.2, 14, conc); g.add(base);
  g.add(box(10, 2.2, 10, conc, 3.2));
  const steps = box(4.5, 1.6, 4, conc, 0); steps.position.z = 8.6; g.add(steps);
  const H = 33, aspect = tex.hanuman.image.width / tex.hanuman.image.height;
  const plane = new THREE.PlaneGeometry(H * aspect, H); plane.translate(0, H / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex.hanuman, alphaTest: 0.5, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex.hanuman, emissiveIntensity: 0.0 });
  const st = new THREE.Mesh(plane, mat); st.position.y = 5.2; st.castShadow = true;
  st.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex.hanuman, alphaTest: 0.5 });
  g.add(st);
  return { group: g, statue: st, mat };
}

// Tribhuvan Chowk roundabout: ring kerb, garden, central plinth with a bronze statue silhouette and flags
export function makeChowk(tex) {
  const g = new THREE.Group();
  const kerb = new THREE.MeshStandardMaterial({ color: 0xcfc8bb, roughness: 0.9 });
  const grass = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.22, 0.32, 0.12, THREE.SRGBColorSpace), roughness: 1 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.3, 0.5, 48), kerb); ring.position.y = 0.25; g.add(ring);
  const gr = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.4, 0.56, 48), grass); gr.position.y = 0.28; gr.receiveShadow = true; g.add(gr);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 4, 8), kerb); ped.position.y = 2.3; ped.castShadow = true; g.add(ped);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x5a4430, metalness: 0.8, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.6, 6, 12), bronze); body.position.y = 5.6; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), bronze); head.position.y = 6.95; g.add(head);
  return g;
}
