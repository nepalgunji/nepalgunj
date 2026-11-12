import * as THREE from 'three';
import { IMAGERY_GLSL } from './imagery.js';

export async function loadCity(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf); let o = 0;
  const nB = dv.getUint32(0, true), nC = dv.getUint32(4, true), nR = dv.getUint32(8, true), nW = dv.getUint32(12, true); o = 16;
  const counts = new Uint16Array(buf.slice(o, o + nB * 2)); o += nB * 2;
  const meta = new Uint8Array(buf.slice(o, o + nB * 2)); o += nB * 2; if (o % 2) o++;
  const coords = new Int16Array(buf.slice(o, o + nC * 4)); o += nC * 4;
  const buildings = []; let c = 0;
  for (let i = 0; i < nB; i++) {
    const n = counts[i], pts = [];
    for (let k = 0; k < n; k++, c++) pts.push([coords[c * 2] / 10, coords[c * 2 + 1] / 10]);
    buildings.push({ pts, lv: meta[i * 2], type: meta[i * 2 + 1] });
  }
  const roads = [];
  for (let r = 0; r < nR; r++) {
    const rank = dv.getUint16(o, true), n = dv.getUint16(o + 2, true); o += 4; const pts = [];
    for (let k = 0; k < n; k++, o += 4) pts.push([dv.getInt16(o, true) / 10, dv.getInt16(o + 2, true) / 10]);
    roads.push({ rank, pts });
  }
  const water = [];
  for (let w = 0; w < nW; w++) {
    const n = dv.getUint16(o, true); o += 2; const pts = [];
    for (let k = 0; k < n; k++, o += 4) pts.push([dv.getInt16(o, true) / 10, dv.getInt16(o + 2, true) / 10]);
    water.push(pts);
  }
  return { buildings, roads, water };
}

export function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function pip(x, z, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}
const PALETTE = [ // Terai town facades (linear-ish sRGB picks)
  [0.84, 0.8, 0.72], [0.86, 0.85, 0.82], [0.86, 0.85, 0.82], [0.84, 0.75, 0.72], [0.87, 0.8, 0.64],
  [0.72, 0.78, 0.82], [0.76, 0.8, 0.72], [0.88, 0.72, 0.6], [0.8, 0.76, 0.7], [0.9, 0.86, 0.77],
  [0.6, 0.59, 0.56], [0.6, 0.59, 0.56], [0.57, 0.57, 0.56], [0.56, 0.4, 0.33], [0.66, 0.63, 0.58], [0.78, 0.66, 0.66],
];

export function buildCity(data, U, tex, excl, quality) {
  const R = rng(1234);
  const wallP = [], wallN = [], wallUV = [], wallC = [], wallI = [];
  const roofP = [], roofC = [];
  const tanks = [], heads = [];
  const col = new THREE.Color();
  for (const b of data.buildings) {
    const pts = b.pts; const n = pts.length;
    let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
    if (excl.some(e => Math.hypot(cx - e[0], cz - e[1]) < e[2])) continue;
    const h = b.lv * 3.1 + (b.type === 2 ? 2 : 0) + (R() - 0.5) * 0.4, par = b.lv > 1 || R() < 0.6 ? 0.95 : 0.25;
    const pc = PALETTE[Math.floor(R() * PALETTE.length)];
    const sh = (0.92 + R() * 0.12) * 0.82; col.setRGB(pc[0] * sh, pc[1] * sh, pc[2] * sh, THREE.SRGBColorSpace);
    const seed = R();
    let u = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], bb = pts[(i + 1) % n];
      const dx = bb[0] - a[0], dz = bb[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.05) continue;
      const nx = dz / L, nz = -dx / L, top = h + par;
      const v = [a[0], 0, a[1], a[0], top, a[1], bb[0], 0, bb[1], bb[0], 0, bb[1], a[0], top, a[1], bb[0], top, bb[1]];
      const uv = [u, 0, u, top, u + L, 0, u + L, 0, u, top, u + L, top];
      wallP.push(...v); wallUV.push(...uv);
      for (let k = 0; k < 6; k++) { wallN.push(nx, 0, nz); wallC.push(col.r, col.g, col.b); wallI.push(h, seed); }
      u += L;
    }
    // roof
    const contour = pts.map(p => new THREE.Vector2(p[0], p[1]));
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { tris = []; }
    const rc = 0.9 + R() * 0.2;
    for (const t of tris) {
      const A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
      const cr = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const tri = cr > 0 ? [A, C, B] : [A, B, C];
      for (const p of tri) { roofP.push(p[0], h, p[1]); roofC.push(rc, rc, rc); }
    }
    // roof furniture: black Sintex tanks + stair-head "mumty"
    let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], bb = pts[(i + 1) % n]; area += a[0] * bb[1] - bb[0] * a[1]; } area = Math.abs(area / 2);
    if (b.lv >= 2 && area > 35) {
      const pick = () => { for (let k = 0; k < 6; k++) { const x = cx + (R() - 0.5) * 6, z = cz + (R() - 0.5) * 6; if (pip(x, z, pts)) return [x, z]; } return [cx, cz]; };
      if (R() < 0.62) { const [x, z] = pick(); tanks.push(x, h, z, R() < 0.8 ? 0 : 1, 0.8 + R() * 0.5); if (R() < 0.3) { const [x2, z2] = pick(); tanks.push(x2, h, z2, 0, 0.8 + R() * 0.4); } }
      if (R() < 0.45) { const [x, z] = pick(); heads.push(x, h, z, col.r, col.g, col.b, R() * Math.PI); }
    }
  }
  const geoW = new THREE.BufferGeometry();
  geoW.setAttribute('position', new THREE.Float32BufferAttribute(wallP, 3));
  geoW.setAttribute('normal', new THREE.Float32BufferAttribute(wallN, 3));
  geoW.setAttribute('uv', new THREE.Float32BufferAttribute(wallUV, 2));
  geoW.setAttribute('color', new THREE.Float32BufferAttribute(wallC, 3));
  geoW.setAttribute('aInfo', new THREE.Float32BufferAttribute(wallI, 2));
  geoW.computeBoundingSphere();
  const geoR = new THREE.BufferGeometry();
  geoR.setAttribute('position', new THREE.Float32BufferAttribute(roofP, 3));
  geoR.setAttribute('color', new THREE.Float32BufferAttribute(roofC, 3));
  const rn = new Float32Array(roofP.length); for (let i = 1; i < rn.length; i += 3) rn[i] = 1; geoR.setAttribute('normal', new THREE.BufferAttribute(rn, 3));
  geoR.computeBoundingSphere();

  // ---- wall material: tinted plaster + procedural windows/shutters, lit at night
  const wallMat = new THREE.MeshStandardMaterial({ map: tex.conc, normalMap: tex.concNW, normalScale: new THREE.Vector2(0.6, 0.6), vertexColors: true, roughness: 0.92, metalness: 0 });
  wallMat.onBeforeCompile = s => {
    s.uniforms.uNight = U.uNight;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aInfo; varying vec2 vInfo; varying vec2 vM;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvInfo = aInfo; vM = uv;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform float uNight; varying vec2 vInfo; varying vec2 vM; float wm; float wlit; float wshop;
float h31(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }`)
      .replace('#include <map_fragment>', `
{ vec4 tx = texture2D(map, vM/3.5); float l = dot(tx.rgb, vec3(0.299,0.587,0.114));
  diffuseColor.rgb *= mix(1.0, l/0.23, 0.55);
  float H = vInfo.x, seed = vInfo.y; vec2 m = vM;
  float fl = floor(m.y/3.1), fy = fract(m.y/3.1);
  float bay = 2.9 + fract(seed*7.31)*1.1; float bx = floor(m.x/bay), fx = fract(m.x/bay);
  float hh = h31(vec3(bx, fl, seed*97.0));
  wshop = step(m.y, 3.1) * step(0.45, fract(seed*13.7));
  // window opening with a light frame, two-leaf mullion and a steel grill
  float wx0 = 0.3 + 0.06*fract(seed*3.1), wx1 = 1.0 - wx0;
  float inW = step(wx0,fx)*step(fx,wx1)*step(0.36,fy)*step(fy,0.78)*step(m.y, H-0.4)*step(0.1,hh);
  float fr = inW * (1.0 - step(wx0+0.025,fx)*step(fx,wx1-0.025)*step(0.385,fy)*step(fy,0.755));
  float mull = inW * (1.0 - step(0.012, abs(fx-0.5))) ;
  float grill = inW * step(0.55, fract(seed*5.3)) * (1.0 - step(0.006, abs(fract(fx*bay*3.2)-0.5)-0.47));
  float sw = step(0.05,fx)*step(fx,0.95)*step(0.02,fy)*step(fy,0.84)*step(0.15,hh);
  float w = inW;
  wm = mix(w*(1.0-fr)*(1.0-mull), sw, wshop);
  vec3 glass = vec3(0.05,0.06,0.07) + 0.05*hh;
  if (hh > 0.72) glass = vec3(0.32,0.12,0.09)*(0.6+hh*0.4); // curtains
  vec3 shut = vec3(0.30,0.31,0.32)*(0.6+0.5*hh);
  if (wshop > 0.5 && hh > 0.6) shut = vec3(0.45,0.22,0.12)*(0.7+0.4*hh); // painted shutter
  if (wshop > 0.5) shut *= 0.85 + 0.15*step(0.5, fract(fy*22.0)); // shutter ribs
  diffuseColor.rgb = mix(diffuseColor.rgb, wshop > 0.5 ? shut : glass, wm);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75,0.74,0.7), (fr+mull)*(1.0-wshop)*0.8);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08), grill*(1.0-wshop)*0.7);
  // sun-shade slab over each window + floor slab line + coping
  float shade = step(0.2,fx)*step(fx,0.8)*smoothstep(0.84,0.8,fy)*step(0.8,fy)*(1.0-wshop)*step(m.y,H);
  float slab = (1.0 - smoothstep(0.0,0.05,fy)) * step(m.y, H+0.1) * step(0.5, m.y);
  diffuseColor.rgb *= 1.0 - 0.28*slab - 0.25*shade;
  diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 2.2, m.y));             // ground grime
  diffuseColor.rgb *= 1.0 - 0.18*smoothstep(H-0.2, H+0.9, m.y)*step(H, m.y+0.0); // weathered parapet
  float streak = h31(vec3(floor(m.x*1.3), seed, 3.0)); diffuseColor.rgb *= 1.0 - 0.12*streak*smoothstep(H, 0.0, m.y)*step(0.6,streak);
  wlit = wm * step(hh, 0.18 + uNight*0.42) * uNight;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, wm*(1.0-wshop));')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += wlit * mix(vec3(1.0,0.6,0.28), vec3(1.0,0.92,0.8), wshop) * (wshop>0.5 ? 0.9 : 0.75);`);
  };
  const walls = new THREE.Mesh(geoW, wallMat); walls.castShadow = walls.receiveShadow = true;

  // ---- roof material: the real aerial photo of each roof (world-space projection)
  const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  roofMat.onBeforeCompile = s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix*vec4(transformed,1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\n' + IMAGERY_GLSL)
      .replace('#include <map_fragment>', '{ vec3 im = imagery(vWP.xz); float l = dot(im, vec3(0.3,0.59,0.11)); diffuseColor.rgb *= mix(vec3(l*0.7+0.12)*vec3(1.0,0.98,0.95), im, 0.55); }');
  };
  const roofs = new THREE.Mesh(geoR, roofMat); roofs.castShadow = true; roofs.receiveShadow = true;

  // ---- tanks
  const nT = tanks.length / 5;
  const tankGeo = new THREE.CylinderGeometry(0.62, 0.66, 1.3, 14); tankGeo.translate(0, 0.65 + 0.95, 0);
  const tankMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 });
  const tankM = new THREE.InstancedMesh(tankGeo, tankMat, nT);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (let i = 0; i < nT; i++) {
    const s = tanks[i * 5 + 4]; ps.set(tanks[i * 5], tanks[i * 5 + 1] - 0.95 + 0.0, tanks[i * 5 + 2]); sc.set(s, s, s);
    m4.compose(ps, q, sc); tankM.setMatrixAt(i, m4);
    tankM.setColorAt(i, tanks[i * 5 + 3] ? col.setRGB(0.16, 0.3, 0.55) : col.setRGB(0.035, 0.035, 0.04));
  }
  tankM.castShadow = true; tankM.receiveShadow = true;
  // ---- stair heads
  const nH = heads.length / 7;
  const headGeo = new THREE.BoxGeometry(2.6, 2.5, 3.0); headGeo.translate(0, 1.25, 0);
  const headM = new THREE.InstancedMesh(headGeo, wallMatSimple(tex), nH);
  for (let i = 0; i < nH; i++) {
    ps.set(heads[i * 7], heads[i * 7 + 1], heads[i * 7 + 2]); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), heads[i * 7 + 6]); sc.set(1, 1, 1);
    m4.compose(ps, q, sc); headM.setMatrixAt(i, m4); headM.setColorAt(i, col.setRGB(heads[i * 7 + 3], heads[i * 7 + 4], heads[i * 7 + 5]));
  }
  headM.castShadow = headM.receiveShadow = true;
  const g = new THREE.Group(); g.add(walls, roofs, tankM, headM);
  return g;
}
function wallMatSimple(tex) {
  return new THREE.MeshStandardMaterial({ roughness: 0.92, color: 0xffffff });
}

// Night glow map: warm sodium light along roads, painted into a canvas used as ground emissive
export function roadGlow(roads, half = 2000, size = 2048) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, size, size);
  const k = size / (half * 2); const P = p => [(p[0] + half) * k, (p[1] + half) * k];
  x.lineCap = 'round'; x.lineJoin = 'round';
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = size; const y = tmp.getContext('2d');
  y.lineCap = 'round'; y.lineJoin = 'round';
  for (const pass of [{ blur: 6, a: 0.55, w: [16, 12, 8, 5] }, { blur: 1.5, a: 0.85, w: [7, 5, 3.5, 2] }]) {
    y.clearRect(0, 0, size, size);
    for (const r of roads) {
      y.strokeStyle = r.rank <= 1 ? `rgba(255,178,96,${pass.a})` : `rgba(255,190,120,${pass.a * (r.rank === 2 ? 0.8 : 0.45)})`;
      y.lineWidth = pass.w[r.rank] * k * 2; y.beginPath();
      r.pts.forEach((p, i) => { const q = P(p); i ? y.lineTo(q[0], q[1]) : y.moveTo(q[0], q[1]); }); y.stroke();
    }
    x.filter = `blur(${pass.blur}px)`; x.globalCompositeOperation = 'lighter'; x.drawImage(tmp, 0, 0); x.globalCompositeOperation = 'source-over';
  }
  x.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, bounds: new THREE.Vector4(-half, -half, half, half) };
}

export function buildWater(polys, U, tex) {
  const P = [];
  for (const pts of polys) {
    const contour = pts.map(p => new THREE.Vector2(p[0], p[1]));
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { continue; }
    for (const t of tris) {
      const A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
      const cr = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      for (const p of (cr > 0 ? [A, C, B] : [A, B, C])) P.push(p[0], 0.25, p[1]);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const n = new Float32Array(P.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  const uv = new Float32Array(P.length / 3 * 2); for (let i = 0; i < P.length / 3; i++) { uv[i * 2] = P[i * 3] / 9; uv[i * 2 + 1] = P[i * 3 + 2] / 9; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.085, 0.06), roughness: 0.06, metalness: 0.0, normalMap: tex.waterN, normalScale: new THREE.Vector2(0.25, 0.25), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, envMapIntensity: 1.6 });
  mat.onBeforeCompile = s => {
    s.uniforms.uTime = U.uTime;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_NORMALMAP\nvNormalMapUv += vec2(uTime*0.012, uTime*0.007);\n#endif');
  };
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}
