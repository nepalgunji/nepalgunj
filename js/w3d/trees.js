// Trees placed where the real aerial photo is green (and not under a building).
import * as THREE from 'three';
import { rng } from './city.js';

function canopyGeo(seed) {
  const R = rng(seed);
  const parts = [];
  const lobes = 7 + Math.floor(R() * 3);
  for (let l = 0; l < lobes; l++) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    // clumps distributed over an ellipsoid shell -> broken, leafy silhouette
    const u = R() * 6.283, v = Math.acos(2 * R() - 1) * 0.75;
    const r = l === 0 ? 0 : 0.55 + R() * 0.25, s = l === 0 ? 0.75 : 0.32 + R() * 0.22;
    const ox = Math.sin(v) * Math.cos(u) * r, oz = Math.sin(v) * Math.sin(u) * r, oy = Math.cos(v) * r * 0.7 - 0.05;
    const p = g.attributes.position; const ph = [R() * 9, R() * 9, R() * 9];
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + 0.22 * Math.sin(x * 5.1 + ph[0]) * Math.sin(y * 4.7 + ph[1]) * Math.sin(z * 5.3 + ph[2]) + 0.1 * Math.sin(x * 11 + y * 9 + z * 10 + ph[0]);
      p.setXYZ(i, ox + x * s * n, oy + y * s * n * 0.85, oz + z * s * n);
    }
    g.computeVertexNormals(); parts.push(g);
  }
  // merge
  let count = 0; parts.forEach(g => count += g.index ? g.index.count : g.attributes.position.count);
  const pos = [], nor = [];
  for (const g of parts) {
    const gg = g.index ? g.toNonIndexed() : g;
    pos.push(...gg.attributes.position.array); nor.push(...gg.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.translate(0, 0.95, 0); out.scale(1, 1, 1);
  return out;
}

export function buildTrees(tier, buildings, excl, max, U, water = []) {
  const { canvas, bounds } = tier; const W = canvas.width, H = canvas.height;
  const img = tier.ctx.getImageData(0, 0, W, H).data;
  // occupancy: buildings + water drawn in the same projection
  const oc = document.createElement('canvas'); oc.width = W >> 1; oc.height = H >> 1; const ox = oc.getContext('2d');
  const sx = oc.width / (bounds.z - bounds.x), sz = oc.height / (bounds.w - bounds.y);
  ox.fillStyle = '#000'; ox.fillRect(0, 0, oc.width, oc.height); ox.fillStyle = '#fff';
  for (const w of water) { ox.beginPath(); w.forEach((p, i) => { const X = (p[0] - bounds.x) * sx, Y = (p[1] - bounds.y) * sz; i ? ox.lineTo(X, Y) : ox.moveTo(X, Y); }); ox.fill(); }
  for (const b of buildings) { ox.beginPath(); b.pts.forEach((p, i) => { const X = (p[0] - bounds.x) * sx, Y = (p[1] - bounds.y) * sz; i ? ox.lineTo(X, Y) : ox.moveTo(X, Y); }); ox.fill(); }
  const occ = ox.getImageData(0, 0, oc.width, oc.height).data;
  const R = rng(99);
  const step = 3.4; const list = [];
  const mpx = (bounds.z - bounds.x) / W;
  for (let z = bounds.y + 4; z < bounds.w - 4; z += step) for (let x = bounds.x + 4; x < bounds.z - 4; x += step) {
    const jx = x + (R() - 0.5) * step, jz = z + (R() - 0.5) * step;
    if (excl.some(e => Math.hypot(jx - e[0], jz - e[1]) < e[2])) continue;
    const px = Math.floor((jx - bounds.x) / mpx), py = Math.floor((jz - bounds.y) / ((bounds.w - bounds.y) / H));
    // average 3x3 px
    let r = 0, g = 0, b = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = ((py + dy) * W + px + dx) * 4; r += img[k]; g += img[k + 1]; b += img[k + 2]; }
    r /= 9; g /= 9; b /= 9;
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    if (!(g > r + 5 && g > b + 3 && lum < 105 && lum > 22)) continue;
    const ok = occ[((py >> 1) * oc.width + (px >> 1)) * 4]; if (ok > 0) continue;
    if (R() > 0.55) continue;
    list.push([jx, jz, r, g, b, lum]);
  }
  // keep a random subset up to max
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  list.length = Math.min(list.length, max);
  const geos = [canopyGeo(1), canopyGeo(2), canopyGeo(3)];
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, color: 0xffffff });
  mat.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP; varying vec3 vWPt;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPt = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vLP; varying vec3 vWPt;
float th(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float tn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(th(i),th(i+vec3(1,0,0)),f.x),mix(th(i+vec3(0,1,0)),th(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(th(i+vec3(0,0,1)),th(i+vec3(1,0,1)),f.x),mix(th(i+vec3(0,1,1)),th(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float lf = tn(vWPt*2.2)*0.6 + tn(vWPt*5.5)*0.4;
diffuseColor.rgb *= 0.45 + 0.9*lf*lf + 0.25*tn(vWPt*11.0);
diffuseColor.rgb *= mix(0.45, 1.05, smoothstep(0.1, 1.7, vLP.y));`);
  };
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 1 });
  const group = new THREE.Group();
  const per = geos.map(() => []); list.forEach((t, i) => per[i % 3].push(t));
  const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  let ti = 0;
  per.forEach((arr, gi) => {
    const im = new THREE.InstancedMesh(geos[gi], mat, arr.length);
    arr.forEach((t, i) => {
      const rad = 2.2 + R() * 2.6 + (t[5] < 60 ? 1.2 : 0), hgt = rad * (1.5 + R() * 0.9);
      const canopyH = rad * (0.85 + R() * 0.3), trunkH = hgt - canopyH * 1.5;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28);
      p.set(t[0], Math.max(1.2, trunkH), t[1]); s.set(rad, canopyH, rad); m4.compose(p, q, s); im.setMatrixAt(i, m4);
      // colour from the photo, pushed toward healthy foliage
      c.setRGB(t[2] / 255, t[3] / 255, t[4] / 255, THREE.SRGBColorSpace);
      const hsl = {}; c.getHSL(hsl); c.setHSL(0.22 + (hsl.h - 0.22) * 0.4 + (R() - 0.5) * 0.04, Math.min(0.42, hsl.s * 1.0 + 0.08), Math.min(0.15, Math.max(0.055, hsl.l * 0.75)));
      im.setColorAt(i, c);
      p.set(t[0], 0, t[1]); s.set(rad * 0.9, Math.max(1.6, trunkH + canopyH * 0.6), rad * 0.9); m4.compose(p, q, s); trunk.setMatrixAt(ti++, m4);
    });
    im.castShadow = true; im.receiveShadow = true; group.add(im);
  });
  trunk.count = ti; trunk.castShadow = true; group.add(trunk);
  return { group, count: list.length };
}
