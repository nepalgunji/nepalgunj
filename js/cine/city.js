/* Cinematic Nepalgunj city from real OSM data (world.json + building tiles).
   Photo-PBR facades with procedural windows / shutters / signboards / grime, parapets, stair-head rooms,
   rooftop tanks & rebar, roads with dusty edges, ponds with ghats, trees, poles + overhead wires, awnings. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hazy, noiseTex, U } from './atmos.js';
import { T, pbrSet, worldMapped } from './mats.js';
import { signAtlas } from './signs.js';

export const night = { value: 0 };   // shared night uniform for emissives
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function distSeg(px, pz, ax, az, bx, bz) { const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az; const L = vx * vx + vz * vz; let t = L ? (wx * vx + wz * vz) / L : 0; t = Math.max(0, Math.min(1, t)); const dx = px - (ax + t * vx), dz = pz - (az + t * vz); return [Math.hypot(dx, dz), dx, dz]; }
export const pip = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };

// Terai bazaar paint palette (muted, sun-faded; linear-ish sRGB hex)
const PAINT = [0xe8e0d0, 0xe9dcc4, 0xf0e6d6, 0xdcc9a8, 0xe3c7b0, 0xd9b9a3, 0xcfd6c4, 0xc9d3d6, 0xe6d3a2, 0xd7a98c, 0xefe9e0, 0xd4c2b0, 0xbfc9b2, 0xe2b98f, 0xc8b8a6, 0xa9b9c0];

export async function buildCity(scene, world, quality, onProgress) {
  const group = new THREE.Group(); scene.add(group);
  const [bx0, bz0, bx1, bz1] = world.bounds;
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, span = Math.max(bx1 - bx0, bz1 - bz0) + 6000;
  const roads = world.roads;

  /* ---------- ground ---------- */
  const groundMat = worldMapped(pbrSet('dry_ground_01', { color: 0xb9a78c }), 0.12, { breakup: 0.45, tint2: 0x9aa070 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), groundMat);
  ground.position.set(cx, 0, cz); ground.receiveShadow = true; group.add(ground);

  const shapeGeo = (pts, y) => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
  const grassMat = worldMapped(new THREE.MeshStandardMaterial({ map: (() => { const t = new THREE.TextureLoader().load('assets/tex/aerial_grass_rock_diff.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })(), color: 0x9da77a, roughness: 1 }), 0.08, { breakup: 0.5, tint2: 0xc8b98a });
  const greens = (world.green || []).map(g => shapeGeo(g.pts, 0.03));
  if (greens.length) { const m = new THREE.Mesh(mergeGeometries(greens), grassMat); m.receiveShadow = true; group.add(m); }

  /* ---------- roads (ribbons with across-coordinate for dusty edges) ---------- */
  const asphalt = pbrSet('worn_asphalt', { color: 0xbab4aa });
  asphalt.onBeforeCompile = sh => {
    sh.uniforms.uNoiseB = { value: noiseTex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aRoad; varying vec3 vRoad; varying vec2 vRW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = aRoad; vRW = (modelMatrix*vec4(position,1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uNoiseB; varying vec3 vRoad; varying vec2 vRW;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float e = abs(vRoad.x - 0.5)*2.0; vec4 n = texture2D(uNoiseB, vRW*0.07); vec4 n2 = texture2D(uNoiseB, vRW*0.6);
        float dust = smoothstep(0.55, 1.05, e + (n.r-0.5)*0.5 + (n2.g-0.5)*0.25) ;
        dust = max(dust, vRoad.y * smoothstep(0.35, 0.75, n.g*0.7 + n2.r*0.3));
        vec3 dustC = vec3(0.56, 0.48, 0.37) * (0.8 + 0.4*n2.b);
        float track = smoothstep(0.08, 0.0, abs(e - 0.45)) * 0.12;
        diffuseColor.rgb *= (0.88 + 0.24*n.b) * (1.0 - track);
        diffuseColor.rgb = mix(diffuseColor.rgb, dustC, dust); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.1, 0.0, 1.0);');
  };
  asphalt.customProgramCacheKey = () => 'asph';
  hazy(asphalt, { key: 'asph' });
  const dirt = pbrSet('dry_ground_01', { color: 0xc9b597 });
  hazy(dirt, { key: 'dirt' });
  const rb = new Map();
  function ribbon(pts, width, y, mat, dust = 0) {
    let b = rb.get(mat); if (!b) rb.set(mat, b = { pos: [], uv: [], road: [], idx: [] });
    let acc = 0; const o = b.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const nx = -dz, nz = dx, h = width / 2;
      if (i > 0) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      b.pos.push(p[0] + nx * h, y, p[1] + nz * h, p[0] - nx * h, y, p[1] - nz * h);
      b.uv.push(0, acc * 0.22, width * 0.22, acc * 0.22);
      b.road.push(0, dust, 0, 1, dust, 0);
      if (i > 0) { const a = o + (i - 1) * 2; b.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  }
  function flush() {
    rb.forEach((b, mat) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('aRoad', new THREE.Float32BufferAttribute(b.road, 3)); g.setIndex(b.idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; group.add(m);
    }); rb.clear();
  }
  roads.forEach(rd => {
    const w = rd.width || 7;
    if (rd.type === 'path') { ribbon(rd.pts, w, 0.04, dirt); return; }
    const main = rd.type === 'primary' || rd.type === 'secondary';
    ribbon(rd.pts, w + (main ? 5 : 2.5), 0.045, dirt);        // dusty shoulders
    ribbon(rd.pts, w, rd.type === 'primary' ? 0.08 : main ? 0.075 : 0.065, asphalt, main ? 0.15 : 0.45);
  });
  flush();

  // road segment grid (for front detection / placement)
  const RG = 30, grid = new Map(), gk = (i, j) => i * 100003 + j, segs = [];
  roads.forEach(rd => { if (rd.type === 'path') return; const w = rd.width || 7;
    for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1]; const s = [ax, az, bx, bz, w, rd.type]; segs.push(s);
      for (let gi = Math.floor((Math.min(ax, bx) - 12) / RG); gi <= Math.floor((Math.max(ax, bx) + 12) / RG); gi++)
        for (let gj = Math.floor((Math.min(az, bz) - 12) / RG); gj <= Math.floor((Math.max(az, bz) + 12) / RG); gj++) { const k = gk(gi, gj); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(s); } } });
  const nearRoad = (x, z) => { const a = grid.get(gk(Math.floor(x / RG), Math.floor(z / RG))); if (!a) return null; let best = null;
    for (const s of a) { const [d, dx, dz] = distSeg(x, z, s[0], s[1], s[2], s[3]); const e = d - s[4] / 2; if (!best || e < best.e) best = { e, dx, dz, d, s }; } return best; };

  /* ---------- water ---------- */
  const wn = new THREE.TextureLoader().load('assets/tex/waternormals.jpg'); wn.wrapS = wn.wrapT = THREE.RepeatWrapping; wn.repeat.set(0.05, 0.05);
  const waterMat = hazy(new THREE.MeshStandardMaterial({ color: 0x1f2b20, roughness: 0.06, metalness: 0.0, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3 }), { key: 'water' });
  const ghat = pbrSet('dirty_concrete', { color: 0xc8bfae }); worldMapped(ghat, 0.3, { breakup: 0.3 });
  const ponds = [];
  const ghatGeos = [], waterGeos = [];
  (world.water?.polys || []).forEach(w => {
    if (w.pts.length < 3) return;
    const g = shapeGeo(w.pts, 0.0); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
    waterGeos.push(g.translate(0, -0.55, 0));
    // stepped ghats: rings shrinking toward the centroid
    let mx = 0, mz = 0; w.pts.forEach(([x, z]) => { mx += x; mz += z; }); mx /= w.pts.length; mz /= w.pts.length;
    const R = Math.max(...w.pts.map(([x, z]) => Math.hypot(x - mx, z - mz)));
    for (let s = 0; s < 3; s++) {
      const k0 = 1 + (1.6 - s * 0.8) / R, k1 = 1 + (0.8 - s * 0.8) / R, y = 0.15 - s * 0.25;
      const ring = []; for (let i = 0; i <= w.pts.length; i++) { const [x, z] = w.pts[i % w.pts.length]; ring.push([mx + (x - mx) * k0, mz + (z - mz) * k0], [mx + (x - mx) * k1, mz + (z - mz) * k1]); }
      const pos = [], idx = []; ring.forEach(([x, z]) => pos.push(x, y, z));
      for (let i = 0; i < w.pts.length; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
      if (rg.attributes.normal.getY(0) < 0) { const ix = rg.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } rg.computeVertexNormals(); }
      rg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
      ghatGeos.push(rg);
    }
    ponds.push({ pts: w.pts, name: w.name, cx: mx, cz: mz, R });
  });
  (world.water?.lines || []).forEach(l => { const r = l.pts; const w = l.width || 3; ribbon(r, w + 2, 0.02, dirt); ribbon(r, w, -0.3, waterMat); });
  flush();
  if (waterGeos.length) { const m = new THREE.Mesh(mergeGeometries(waterGeos), waterMat); m.receiveShadow = true; group.add(m); }
  if (ghatGeos.length) { const m = new THREE.Mesh(mergeGeometries(ghatGeos), ghat); m.receiveShadow = true; group.add(m); }

  /* ---------- buildings ---------- */
  const sign = signAtlas();
  const facade = new THREE.MeshStandardMaterial({ map: T('worn_plaster_wall_diff'), normalMap: T('worn_plaster_wall_nor_gl', false), normalScale: new THREE.Vector2(0.8, 0.8), vertexColors: true, roughness: 0.92 });
  const facU = { uBrick: { value: T('rough_plaster_brick_diff') }, uShutter: { value: T('rusty_metal_shutter_diff') }, uSign: { value: sign.tex }, uNoiseB: { value: noiseTex }, uNightF: night };
  facade.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, facU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aW; attribute vec2 aW2; varying vec4 vW; varying vec2 vW2; varying vec2 vWall;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = aW; vW2 = aW2; vWall = uv / 0.33;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uBrick; uniform sampler2D uShutter; uniform sampler2D uSign; uniform sampler2D uNoiseB; uniform float uNightF;
varying vec4 vW; varying vec2 vW2; varying vec2 vWall;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float gWin; float gGlass; float gLit;`)
      .replace('#include <map_fragment>', `
  vec2 wv = vWall; float seed = vW.x; float floors = vW.y; float lu = vW.z; float L = vW.w; float wallH = vW2.x; float front = vW2.y;
  float fh = 3.05; float fl = floor(wv.y / fh); float fy = fract(wv.y / fh);
  float nC = max(1.0, floor(L / (3.0 + seed*0.8) + 0.5)); float cw = L / nC; float cx = fract(lu / cw); float ci = floor(lu / cw);
  vec3 pl = texture2D(map, vMapUv).rgb; float lum = dot(pl, vec3(0.333));
  vec3 base = vColor.rgb * (0.55 + 0.75*lum);
  float brick = step(0.86, seed) + step(0.7, fract(seed*7.31)) * step(floors - 0.5, fl + 1.0) * step(1.5, floors);
  if (brick > 0.5) base = texture2D(uBrick, wv*0.42).rgb * vec3(1.05, 0.95, 0.9);
  float parapet = step(wallH - 0.95, wv.y);
  gWin = 0.0; gGlass = 0.0; gLit = 0.0;
  vec3 col = base;
  bool ground = fl < 0.5;
  if (parapet < 0.5) {
    if (ground && front > 0.5) {
      // shop front: pillars, rolling shutter or open shop, signboard band
      float pillar = step(cx, 0.06) + step(0.94, cx);
      float hs = h21(vec2(ci, seed*91.0));
      if (fy > 0.80 && fy < 0.97 && pillar < 0.5) {
        float idx = floor(hs * 16.0); vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0));
        vec2 suv = vec2((cell.x + clamp((cx - 0.06)/0.88, 0.0, 1.0)) / 2.0, 1.0 - (cell.y + 1.0 - (fy - 0.80)/0.17) / 8.0);
        col = texture2D(uSign, suv).rgb; gLit = 0.25;
      } else if (fy < 0.80 && pillar < 0.5) {
        if (hs > 0.45) { vec3 sh = texture2D(uShutter, vec2(cx*cw, fy*fh)*0.45).rgb; col = sh * mix(vec3(0.9,0.95,1.0), vec3(0.65,0.8,0.7), step(0.75, hs)); }
        else { col = vec3(0.05, 0.045, 0.04) + vec3(0.18, 0.12, 0.06) * smoothstep(0.0, 0.8, fy) * h21(vec2(ci, 3.0)); gLit = 1.0; gGlass = 0.2; }
      }
    } else {
      // windows with frames, sills and occasional grills / curtains
      float wx = smoothstep(0.24, 0.25, cx) * (1.0 - smoothstep(0.75, 0.76, cx));
      float wy = smoothstep(0.30, 0.31, fy) * (1.0 - smoothstep(0.80, 0.81, fy));
      float fr = (smoothstep(0.21, 0.22, cx) * (1.0 - smoothstep(0.78, 0.79, cx))) * (smoothstep(0.27, 0.28, fy) * (1.0 - smoothstep(0.83, 0.84, fy)));
      float hw = h21(vec2(ci + fl*17.0, seed*53.0));
      if (fr > 0.5) col = mix(base, vec3(0.78, 0.74, 0.68), 0.6);
      if (wx * wy > 0.5) {
        vec3 glass = vec3(0.035, 0.045, 0.055);
        if (hw > 0.8) glass = mix(vec3(0.45, 0.30, 0.18), vec3(0.20, 0.30, 0.45), step(0.9, hw)) * 0.5; // curtains
        float mull = step(abs(cx - 0.5), 0.012) + step(abs(fy - 0.55), 0.01);
        col = mix(glass, vec3(0.16, 0.15, 0.14), clamp(mull, 0.0, 1.0));
        gWin = 1.0; gGlass = 1.0 - clamp(mull, 0.0, 1.0); gLit = step(0.55, h21(vec2(ci*3.1 + fl, seed*11.0)));
      }
      if (fy > 0.25 && fy < 0.28 && wx > 0.5) col *= 0.55;         // sill shadow
    }
  } else { col = base * 1.02; if (wv.y > wallH - 0.12) col = vec3(0.72, 0.70, 0.66); }
  // slab edge band and its shadow
  float slab = step(fy, 0.07) * step(0.5, fl);
  col = mix(col, base * 0.82, slab * (1.0 - gWin));
  // weathering: rain splash at the base, streaks under windows, macro breakup
  vec4 n1 = texture2D(uNoiseB, vec2(lu*0.15 + seed*7.0, wv.y*0.025));
  vec4 n2 = texture2D(uNoiseB, wv*0.08 + seed);
  float streak = smoothstep(0.55, 0.85, n1.r) * (1.0 - gWin) * 0.35;
  col *= mix(0.62, 1.0, smoothstep(0.0, 1.4, wv.y + (n2.g - 0.5)));
  col *= 1.0 - streak;
  col *= 0.86 + 0.28*n2.b;
  // corner AO
  float edge = min(lu, L - lu); col *= mix(0.78, 1.0, smoothstep(0.0, 0.7, edge));
  diffuseColor.rgb = col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, gGlass);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.62, 0.30) * gLit * uNightF * (0.9 + 0.6*h21(vec2(seed, vW.z)));');
  };
  facade.customProgramCacheKey = () => 'facade';
  hazy(facade, { key: 'fac' });
  const roofMat = worldMapped(pbrSet('dirty_concrete', { color: 0xcfc6b8, vertexColors: true }), 0.18, { breakup: 0.4 });

  const tiles = world.tiles || [];
  const CH = 400, chunks = new Map();
  const tanksB = [], tanksC = [], rebars = [], fronts = [];
  let done = 0;
  const loadOne = async key => { try { const r = await fetch(`assets/data/tiles/b_${key}.json`); const d = await r.json(); return d; } catch { return null; } finally { done++; onProgress?.(done / tiles.length); } };
  const datas = [];
  for (let i = 0; i < tiles.length; i += 24) datas.push(...await Promise.all(tiles.slice(i, i + 24).map(loadOne)));
  const col = new THREE.Color();
  const buildingPolys = [];
  datas.forEach(data => { if (!data) return; data.b.forEach((b, bi) => {
    const f = b[0], cat = b[1], pts = []; for (let i = 2; i < b.length; i += 2) pts.push([b[i] / 10, b[i + 1] / 10]);
    if (pts.length < 3) return;
    let A = 0, mx = 0, mz = 0; for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; A += x1 * z2 - x2 * z1; mx += x1; mz += z1; }
    if (A < 0) pts.reverse(); A = Math.abs(A) / 2; mx /= pts.length; mz /= pts.length;
    const seed = hash(Math.round(mx * 10), Math.round(mz * 10));
    const floors = Math.max(1, f), h = floors * 3.05 + 0.25, wallH = h + 0.95;
    const key = `${Math.floor(mx / CH)}_${Math.floor(mz / CH)}`;
    let c = chunks.get(key); if (!c) chunks.set(key, c = { wp: [], wn: [], wu: [], wc: [], wa: [], wb: [], rp: [], rc: [], ru: [] });
    col.setHex(PAINT[Math.floor(seed * PAINT.length)]);
    if (cat === 3) col.setHex(0xd8d2c6);
    buildingPolys.push({ pts, mx, mz, h, cat, name: data.n?.[bi] });
    const addWalls = (P, h0, h1, fl, frontAllowed, sd) => {
      for (let i = 0; i < P.length; i++) {
        const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length]; const L = Math.hypot(bx - ax, bz - az); if (L < 0.05) continue;
        const nx = (bz - az) / L, nz = -(bx - ax) / L;
        let front = 0;
        if (frontAllowed && L > 2.5) { const r = nearRoad((ax + bx) / 2 + nx * 1, (az + bz) / 2 + nz * 1); if (r && r.e < 7 && (-(r.dx * nx + r.dz * nz)) / (r.d || 1) > 0.5) { front = 1; if (r.s[5] !== 'residential' || hash(i, Math.round(mx)) > 0.6) fronts.push([(ax + bx) / 2, (az + bz) / 2, Math.atan2(nx, nz), L, h0]); } }
        const hh = h1 - h0;
        c.wp.push(ax, h0, az, bx, h1, bz, bx, h0, bz, ax, h0, az, ax, h1, az, bx, h1, bz);
        const v0 = h0 * 0.33, v1 = h1 * 0.33, u0 = 0, u1 = L * 0.33;
        c.wu.push(u0, v0, u1, v1, u1, v0, u0, v0, u0, v1, u1, v1);
        const lus = [0, L, L, 0, 0, L];
        for (let k = 0; k < 6; k++) { c.wn.push(nx, 0, nz); c.wc.push(col.r, col.g, col.b); c.wa.push(sd, fl, lus[k], L); c.wb.push(h1, front); }
      }
    };
    addWalls(pts, 0, wallH, floors, true, seed);
    // roof (at h, inside the parapet)
    const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
    const rcol = 0.85 + seed * 0.2;
    for (const [a, bb, cc] of tri) { const P = [pts[a], pts[bb], pts[cc]];
      const ny = (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]) - (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]);
      for (const o of (ny >= 0 ? [0, 1, 2] : [0, 2, 1])) { c.rp.push(P[o][0], h, P[o][1]); c.ru.push(0, 0); c.rc.push(rcol, rcol * 0.98, rcol * 0.95); } }
    // stair-head room ("machan") + tanks + rebar stubs
    const r = rng(Math.floor(seed * 1e6));
    if (floors >= 2 && A > 45 && r() < 0.55) {
      const sx = 1.4, sz = 1.7; let ox = mx + (r() - 0.5) * 2, oz = mz + (r() - 0.5) * 2;
      if (pip(ox, oz, pts) && pip(ox + sx, oz + sz, pts) && pip(ox - sx, oz - sz, pts)) {
        const P = [[ox - sx, oz - sz], [ox + sx, oz - sz], [ox + sx, oz + sz], [ox - sx, oz + sz]];
        // walls from roof level, treated as 1 floor, no shop front
        const before = c.wa.length; addWalls(P, h, h + 2.6, 1, false, (seed * 3.7) % 1);
        for (let k = before; k < c.wa.length; k += 4) c.wa[k + 1] = 1;
        for (const tri3 of [[0, 1, 2], [0, 2, 3]]) { const Q = tri3.map(q => P[q]); const ny = (Q[1][1] - Q[0][1]) * (Q[2][0] - Q[0][0]) - (Q[1][0] - Q[0][0]) * (Q[2][1] - Q[0][1]);
          for (const o of (ny >= 0 ? [0, 1, 2] : [0, 2, 1])) { c.rp.push(Q[o][0], h + 2.6, Q[o][1]); c.ru.push(0, 0); c.rc.push(0.8, 0.78, 0.75); } }
        if (r() < 0.8) (r() < 0.75 ? tanksB : tanksC).push([ox + (r() - 0.5) * 1.2, h + 2.6, oz + (r() - 0.5) * 1.2, r()]);
      } else if (r() < 0.6) (r() < 0.75 ? tanksB : tanksC).push([mx, h, mz, r()]);
    } else if (floors >= 1 && A > 30 && r() < 0.35) (r() < 0.8 ? tanksB : tanksC).push([mx, h, mz, r()]);
    if (floors >= 2 && r() < 0.3) for (let i = 0; i < pts.length && i < 8; i++) { const [x, z] = pts[i]; const k = 0.4 / Math.max(1, Math.hypot(mx - x, mz - z)); rebars.push([x + (mx - x) * k, wallH, z + (mz - z) * k, 0.6 + r() * 0.8]); }
  }); });
  const chunkMeshes = [];
  chunks.forEach(c => {
    if (c.wp.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(c.wp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(c.wn, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(c.wu, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(c.wc, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(c.wa, 4)); g.setAttribute('aW2', new THREE.Float32BufferAttribute(c.wb, 2));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, facade); m.castShadow = m.receiveShadow = quality.shadows; group.add(m); chunkMeshes.push(m);
    }
    if (c.rp.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(c.rp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(c.ru, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(c.rc, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, roofMat); m.receiveShadow = true; m.castShadow = quality.shadows; group.add(m);
    }
  });

  /* ---------- rooftop tanks (ribbed plastic), rebar ---------- */
  const tankProfile = []; for (let i = 0; i <= 14; i++) { const y = i / 14 * 1.25; const r = 0.58 + 0.025 * Math.cos(i * Math.PI * 1.0) - (i > 12 ? (i - 12) * 0.12 : 0); tankProfile.push(new THREE.Vector2(Math.max(0.12, r), y)); }
  const tankGeo = new THREE.LatheGeometry(tankProfile, 14);
  const addInst = (geo, mat, list, f, cast = true) => { if (!list.length) return null; const im = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D(); list.forEach((it, i) => { f(o, it, i); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = cast && quality.shadows; im.receiveShadow = true; group.add(im); return im; };
  addInst(tankGeo, hazy(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45 }), { key: 'tk' }), tanksB, (o, [x, y, z, s]) => { o.position.set(x, y, z); o.rotation.set(0, s * 6, 0); o.scale.setScalar(0.85 + s * 0.4); });
  addInst(tankGeo, hazy(new THREE.MeshStandardMaterial({ color: 0x2f5f9a, roughness: 0.5 }), { key: 'tk2' }), tanksC, (o, [x, y, z, s]) => { o.position.set(x, y, z); o.scale.setScalar(0.9 + s * 0.3); });
  addInst(new THREE.CylinderGeometry(0.02, 0.02, 1, 4).translate(0, 0.5, 0), hazy(new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.8, metalness: 0.4 }), { key: 'rb' }), rebars, (o, [x, y, z, hh]) => { o.position.set(x, y, z); o.scale.set(1, hh, 1); o.rotation.set((hash(x | 0) - 0.5) * 0.2, 0, (hash(z | 0) - 0.5) * 0.2); }, false);

  /* ---------- awnings / tarps over shop fronts ---------- */
  const TARP = [0x3d6a8c, 0x8a3a2a, 0xa0782e, 0x4f6b3a, 0x6b6b6b, 0x2e4f6e, 0x9c5a2a, 0x7a2a3a];
  const awnGeo = new THREE.BoxGeometry(1, 0.04, 1.6).translate(0, 0, 0.8);
  const awnMat = hazy(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide }), { key: 'awn' });
  const awnList = fronts.filter((f, i) => hash(i, 7) < 0.7);
  const awn = addInst(awnGeo, awnMat, awnList, (o, [x, z, a, L], i) => { o.position.set(x, 2.75, z); o.rotation.set(0, a, 0, 'YXZ'); o.rotateX(0.32); o.scale.set(Math.min(L * 0.85, 7), 1, 0.8 + hash(i) * 0.6); });
  if (awn) { const c2 = new THREE.Color(); awnList.forEach((_, i) => { c2.setHex(TARP[Math.floor(hash(i, 3) * TARP.length)]).multiplyScalar(0.75 + hash(i, 5) * 0.3); awn.setColorAt(i, c2); }); }

  /* ---------- trees ---------- */
  const crownParts = [];
  for (let k = 0; k < 5; k++) { const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; const r = rng(k + 1);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = 1 + 0.22 * Math.sin(x * 5.1 + k) * Math.cos(z * 4.3) + 0.15 * Math.sin(y * 7.7); p.setXYZ(i, x * d, y * d * 0.8, z * d); }
    g.scale(1.6 + r(), 1.4 + r() * 0.6, 1.6 + r()); g.translate((r() - 0.5) * 2.6, 5.4 + r() * 1.6, (r() - 0.5) * 2.6); g.computeVertexNormals(); crownParts.push(g); }
  const crownGeo = mergeGeometries(crownParts);
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 5.5, 6).translate(0, 2.75, 0);
  const leafMat = hazy(new THREE.MeshStandardMaterial({ color: 0x8a9a6a, roughness: 0.95 }), { key: 'leaf' });
  const barkMat = hazy(new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 }), { key: 'bark' });
  const trees = (world.trees || []).filter((_, i) => quality.tier === 'high' || i % 2 === 0);
  const tr = addInst(trunkGeo, barkMat, trees, (o, [x, z], i) => { const s = 0.7 + hash(i, 9) * 0.7; o.position.set(x, 0, z); o.scale.setScalar(s); o.rotation.set(0, hash(i) * 6, 0); });
  const cr = addInst(crownGeo, leafMat, trees, (o, [x, z], i) => { const s = 0.7 + hash(i, 9) * 0.7; o.position.set(x, 0, z); o.scale.setScalar(s); o.rotation.set(0, hash(i) * 6, 0); });
  if (cr) { const c2 = new THREE.Color(); trees.forEach((_, i) => { c2.setRGB(0.20 + hash(i, 1) * 0.10, 0.28 + hash(i, 2) * 0.10, 0.12 + hash(i, 4) * 0.06); cr.setColorAt(i, c2); }); }

  /* ---------- poles, overhead wires, street lamps ---------- */
  const poles = [], wires = [], lamps = [];
  roads.forEach((rd, ri) => {
    if (!(rd.type === 'primary' || rd.type === 'secondary' || (rd.type === 'residential' && ri % 3 === 0))) return;
    const w = rd.width || 7, side = ri % 2 ? 1 : -1, step = rd.type === 'residential' ? 38 : 32; let carry = 0, prev = null;
    for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1]; const L = Math.hypot(bx - ax, bz - az); if (L < 1) continue; const ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let s = carry; s < L; s += step) { const off = w / 2 + 1.3; const x = ax + ux * s - uz * side * off, z = az + uz * s + ux * side * off;
        poles.push([x, z, Math.atan2(ux, uz)]); if (rd.type !== 'residential') lamps.push([x + uz * side * 1.4, z - ux * side * 1.4]);
        if (prev) wires.push([prev[0], prev[1], x, z]); prev = [x, z]; carry = s + step - L; } }
  });
  const poleMat = hazy(new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.9 }), { key: 'pole' });
  const poleGeo = mergeGeometries([new THREE.BoxGeometry(0.22, 9, 0.22).translate(0, 4.5, 0), new THREE.BoxGeometry(1.6, 0.1, 0.1).translate(0, 8.4, 0), new THREE.BoxGeometry(0.1, 0.1, 1.4).translate(0, 7.6, 0.7).rotateY(0)]);
  addInst(poleGeo, poleMat, poles, (o, [x, z, a]) => { o.position.set(x, 0, z); o.rotation.set(0, a, 0); });
  const wp = [];
  wires.forEach(([ax, az, bx, bz], wi) => { const L = Math.hypot(bx - ax, bz - az); if (L > 60) return;
    for (let k = 0; k < 4; k++) { const off = (k - 1.5) * 0.45, y0 = 8.4 - (k % 2) * 0.05, sag = 0.5 + L * 0.012 + k * 0.08; const nx = -(bz - az) / L * off, nz = (bx - ax) / L * off;
      let px = ax + nx, py = y0, pz = az + nz; for (let s = 1; s <= 8; s++) { const t = s / 8; const x = ax + (bx - ax) * t + nx, z = az + (bz - az) * t + nz, y = y0 - 4 * sag * t * (1 - t); wp.push(px, py, pz, x, y, z); px = x; py = y; pz = z; } } });
  if (wp.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); group.add(new THREE.LineSegments(g, hazy(new THREE.LineBasicMaterial({ color: 0x1a1612, transparent: true, opacity: 0.75 }), { key: 'wire' }))); }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffa040, emissiveIntensity: 0 });
  const lampIM = addInst(new THREE.SphereGeometry(0.22, 8, 6), lampMat, lamps, (o, [x, z]) => o.position.set(x, 7.5, z), false);

  return {
    group, ponds, buildingPolys, nearRoad, segs, fronts, facadeMat: facade,
    setNight(n) { night.value = n; lampMat.emissiveIntensity = n * 6; },
    update(t) { wn.offset.set(t * 0.004, t * 0.002); }
  };
}
