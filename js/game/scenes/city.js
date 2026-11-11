/* Overworld: Nepalgunj city laid out from world data (default stylized or OSM-derived). */
import { THREE, M, PAL, box, cyl, Colliders, makeEnv, videoScreen, Particles, mulberry32, signMesh, pbr, tex, glowMat, palm, nightMats } from '../engine.js';
import { pavilion, pagoda, hanumanStatue, ravanEffigy, waterSlide, stall, institution, mosque, shikhara, bus, photoBoard } from '../prefabs.js';
import { distToLine, distToSeg, ribbon } from '../geo.js';
import { STALLS, DISHES } from '../food.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';


const FOOTPRINT = { bageshwori: 26, hanuman: 18, ranitalau: 24, wonderland: 26, ravan: 30, biryani: 9, school: 18, hospital: 18, college: 18, mosque: 14, bazaar: 14, park: 22, cinema: 10, buspark: 22, temple: 8, airport: 60, border: 12, chowk: 9, rapti: 10 };

function facadeTextures(rand) {
  const W = 256, c = document.createElement('canvas'), e = document.createElement('canvas'); c.width = e.width = W; c.height = e.height = W;
  const g = c.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = '#e9e4da'; g.fillRect(0, 0, W, W); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, W);
  // grime
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,70,60,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 20, 2 + Math.random() * 30); }
  const rows = 4, cols = 3, cw = W / cols, rh = W / rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = k * cw + cw * 0.22, y = r * rh + rh * 0.25, w = cw * 0.56, h = rh * 0.5;
    if (r === rows - 1) { // ground floor shop shutters
      g.fillStyle = ['#7a8a96', '#8f6f4f', '#5a6f8a'][k % 3]; g.fillRect(k * cw + 6, r * rh + 10, cw - 12, rh - 10);
      g.strokeStyle = 'rgba(0,0,0,.25)'; for (let s = 0; s < 8; s++) { g.beginPath(); g.moveTo(k * cw + 6, r * rh + 14 + s * 6); g.lineTo(k * cw + cw - 6, r * rh + 14 + s * 6); g.stroke(); }
      g.fillStyle = ['#c0392b', '#1f6b3a', '#2a6dd2', '#d68910'][Math.floor(Math.random() * 4)]; g.fillRect(k * cw + 4, r * rh + 2, cw - 8, 8);
      ge.fillStyle = Math.random() > 0.5 ? '#ffb860' : '#000'; ge.fillRect(k * cw + 6, r * rh + 10, cw - 12, rh - 10);
      continue;
    }
    g.fillStyle = '#d8d2c6'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = '#26323c'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, w, h * 0.3);
    g.strokeStyle = '#d8d2c6'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 4, y + h + 3, w + 8, 4); // sill shadow
    if (Math.random() > 0.45) { ge.fillStyle = Math.random() > 0.5 ? '#ffd28a' : '#ffb860'; ge.fillRect(x, y, w, h); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const te = new THREE.CanvasTexture(e); te.colorSpace = THREE.SRGBColorSpace;
  return { t, te };
}

const CAT_COL = [null, 0xf3e2a0, 0xf7f7f4, 0xf0b070, 0xdff0e0, 0xe8dcc8, 0xf1d2c0, 0xd8e4ec, 0x5a5a66, 0xf4ead2];
const CAT_ICON = { school: '🏫', college: '🎓', hospital: '🏥', temple: '🛕', mosque: '🕌', government: '🏛️', police: '👮', hotel: '🏨', restaurant: '🍛', bank: '🏦', cinema: '🎬', church: '⛪', gurudwara: '🛕', park: '🌳', chowk: '🚦', bazaar: '🛍️', stadium: '🏟️', bus_park: '🚌', bridge: '🌉', border: '🛂', airport: '✈️' };
export { CAT_ICON };
const PAL_B = [0xf6efe4, 0xf3d9c6, 0xe9e0b8, 0xd8e4ec, 0xf1c6b0, 0xe8d0d8, 0xf4ead2, 0xd6e3c8, 0xffffff, 0xe4b7a0, 0xcfe0e8, 0xf0e0a8];

export async function create(ctx) {
  const { quality, renderer, world } = ctx;
  const OSM = !!world.osm;
  const rand = mulberry32(42);
  const scene = new THREE.Scene();
  const env = makeEnv(scene, { quality, renderer, fogNear: OSM ? 120 : 80, fogFar: quality.drawDist });
  const colliders = new Colliders(16);
  const interactables = [], screens = [], labels = [], animated = [];
  const places = world.places, pois = world.pois || [];
  const byId = Object.fromEntries(places.map(p => [p.id, p]));
  const roads = world.roads, rivers = world.rivers || [], bridges = world.bridges || [];
  const [bx0, bz0, bx1, bz1] = world.bounds || [-300, -300, 300, 300];
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, span = Math.max(bx1 - bx0, bz1 - bz0) + 800;

  // ---------- ground ----------
  const groundMat = pbr('aerial_grass_rock', span / 14, { color: OSM ? 0xb9ae8c : 0xb8b48a, roughness: 1 });
  const groundM = new THREE.Mesh(new THREE.PlaneGeometry(span, span), groundMat);
  groundM.rotation.x = -Math.PI / 2; groundM.position.set(cx, 0, cz); groundM.receiveShadow = true; scene.add(groundM);

  // ---------- merged ribbons ----------
  const ribbonBuf = new Map();
  function addRibbon(pts, width, y, mat, uScale) {
    const r = ribbon(pts, width, y, uScale); let b = ribbonBuf.get(mat);
    if (!b) { b = { pos: [], uv: [], idx: [] }; ribbonBuf.set(mat, b); }
    const o = b.pos.length / 3; b.pos.push(...r.pos); b.uv.push(...r.uv); for (const i of r.idx) b.idx.push(i + o);
  }
  function flushRibbons() {
    ribbonBuf.forEach((b, mat) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m);
    });
    ribbonBuf.clear();
  }
  // spatial grid of segments for fast "is on road?" queries
  const RG = 24, roadGrid = new Map();
  const gk = (i, j) => i * 100003 + j;
  roads.forEach(rd => {
    const w = rd.width || 8;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], seg = [ax, az, bx, bz, w, rd];
      const pad = w / 2 + 4;
      for (let gi = Math.floor((Math.min(ax, bx) - pad) / RG); gi <= Math.floor((Math.max(ax, bx) + pad) / RG); gi++)
        for (let gj = Math.floor((Math.min(az, bz) - pad) / RG); gj <= Math.floor((Math.max(az, bz) + pad) / RG); gj++) {
          const k = gk(gi, gj); let a = roadGrid.get(k); if (!a) roadGrid.set(k, a = []); a.push(seg);
        }
    }
  });
  const onRoad = (x, z, pad = 0, noPath = true) => {
    const a = roadGrid.get(gk(Math.floor(x / RG), Math.floor(z / RG))); if (!a) return false;
    for (const s of a) { if (noPath && s[5].type === 'path') continue; if (distToSeg(x, z, s[0], s[1], s[2], s[3]).d < s[4] / 2 + 2 + pad) return true; }
    return false;
  };

  // ---------- roads ----------
  const asphalt = pbr('asphalt_02', 1, { color: 0x9a9a9a, roughness: 0.95 });
  asphalt.map.repeat.set(1, 1); asphalt.normalMap.repeat.set(1, 1);
  const asphaltB = asphalt.clone(); asphaltB.color.setHex(0x8a8a88); asphaltB.polygonOffset = true; asphaltB.polygonOffsetFactor = -1;
  const sidewalkMat = pbr('concrete_floor_02', 1, { color: 0xc9c2b4 });
  const dirtMat = pbr('aerial_grass_rock', 1, { color: 0xd8c39a, roughness: 1 });
  const markMat = M(0xf5f1e4, { roughness: 0.6 });
  const dashes = [];
  roads.forEach(rd => {
    const w = rd.width || 8;
    if (rd.type === 'path') { addRibbon(rd.pts, w, 0.04, dirtMat, 0.3); return; }
    const main = rd.type === 'primary' || rd.type === 'secondary';
    if (main || !OSM) addRibbon(rd.pts, w + 4, 0.03, sidewalkMat, 0.25);
    addRibbon(rd.pts, w, rd.type === 'primary' ? 0.07 : main ? 0.065 : 0.055, main ? asphalt : asphaltB, 1 / w);
    if (rd.type === 'primary') for (let i = 0; i < rd.pts.length - 1; i++) {
      const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
      for (let s = 2; s < L; s += 7) dashes.push([ax + (bx - ax) * s / L, az + (bz - az) * s / L, ang]);
    }
  });
  if (dashes.length) {
    const di = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.25, 3).rotateX(-Math.PI / 2), markMat, dashes.length); const o = new THREE.Object3D();
    dashes.forEach(([x, z, a], i) => { o.position.set(x, 0.085, z); o.rotation.set(0, a, 0); o.updateMatrix(); di.setMatrixAt(i, o.matrix); });
    scene.add(di);
  }

  // ---------- water ----------
  const waterN = tex('assets/tex/waternormals.jpg', 6, false);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3f6f6a, roughness: 0.08, metalness: 0.2, normalMap: waterN, normalScale: new THREE.Vector2(0.6, 0.6), transparent: true, opacity: 0.94 });
  const sandMat = pbr('aerial_grass_rock', 8, { color: 0xe6cfa0 });
  rivers.forEach(rv => { addRibbon(rv.pts, rv.width + 26, 0.02, sandMat, 0.02); addRibbon(rv.pts, rv.width, 0.12, waterMat, 0.02); });
  const inRiver = (x, z) => rivers.some(rv => distToLine(x, z, rv.pts) < rv.width / 2);
  const shapeGeo = pts => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); };
  const pip = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const bbox = pts => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; };
  const ponds = [], canals = [];
  const rimMat = M(0xd9c7a2, { roughness: 0.9 });
  if (world.water) {
    world.water.polys.forEach(w => {
      if (w.pts.length < 3) return;
      const m = new THREE.Mesh(shapeGeo(w.pts), waterMat); m.position.y = 0.18; scene.add(m);
      addRibbon([...w.pts, w.pts[0]], 1.2, 0.3, rimMat, 0.2);
      ponds.push({ pts: w.pts, bb: bbox(w.pts), name: w.name });
    });
    world.water.lines.forEach(l => { addRibbon(l.pts, l.width, 0.1, waterMat, 0.05); canals.push(l); });
  }
  const greenMats = { park: pbr('aerial_grass_rock', 1, { color: 0x8fb06a }), grass: pbr('aerial_grass_rock', 1, { color: 0x9fb37a }), pitch: pbr('aerial_grass_rock', 1, { color: 0x86ad5c }), forest: pbr('aerial_grass_rock', 1, { color: 0x6f8f4c }), farm: pbr('aerial_grass_rock', 1, { color: 0xb5b06e }), plaza: pbr('concrete_floor_02', 1, { color: 0xd8d0c0 }) };
  (world.green || []).forEach(gr => {
    const g = shapeGeo(gr.pts); const uv = g.attributes.uv; const p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 12, p.getZ(i) / 12);
    const m = new THREE.Mesh(g, greenMats[gr.type] || greenMats.grass); m.position.y = 0.025; m.receiveShadow = true; scene.add(m);
  });
  const inPond = (x, z, pad = 0) => ponds.some(p => x > p.bb[0] - pad && x < p.bb[2] + pad && z > p.bb[1] - pad && z < p.bb[3] + pad && pip(x, z, p.pts));
  const inCanal = (x, z) => canals.some(l => distToLine(x, z, l.pts) < l.width / 2) && !onRoad(x, z, -1, false);

  // ---------- bridges (default world) ----------
  const bridgeInfo = [];
  bridges.forEach(b => {
    const [ax, az] = b.a, [bx, bz] = b.b, L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
    const g = new THREE.Group(); g.position.set((ax + bx) / 2, 0, (az + bz) / 2); g.rotation.y = ang; scene.add(g);
    const conc = pbr('concrete_floor_02', 2, { color: 0xbdb6aa }), deck = b.deck || 4, w = b.width || 9;
    if (b.kind === 'truss') {
      box(w, 0.6, L - 16, conc, 0, deck - 0.6, 0, g);
      for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 9), conc); r.position.set(0, deck / 2 - 0.3, s * (L / 2 - 4)); r.rotation.x = s * Math.atan2(deck, 8); g.add(r); }
      for (let i = -2; i <= 2; i++) box(2.4, deck - 0.6, 2.4, conc, 0, 0, i * (L - 16) / 4.5, g);
      const steel = M(0x7d868f, { metalness: 0.75, roughness: 0.35 }), half = (L - 16) / 2, hgt = 6;
      for (const sx of [-w / 2, w / 2]) { box(0.35, 0.35, L - 16, steel, sx, deck + hgt, 0, g); box(0.35, 0.35, L - 16, steel, sx, deck, 0, g); for (let z = -half; z <= half + 0.01; z += 5) box(0.25, hgt, 0.25, steel, sx, deck, z, g); }
      bridgeInfo.push({ ax, az, bx, bz, L, w, deck, walk: true });
    } else {
      for (let i = -2; i <= 2; i++) box(3, deck + 1, 3, conc, 0, 0, i * (L - 10) / 4.5, g);
      bridgeInfo.push({ ax, az, bx, bz, L, w, deck, walk: false });
    }
  });
  function bridgeAt(x, z) {
    for (const b of bridgeInfo) { if (!b.walk) continue; const r = distToSeg(x, z, b.ax, b.az, b.bx, b.bz); if (r.d < b.w / 2 - 0.3) { const s = r.t * b.L, end = Math.min(s, b.L - s); return Math.min(b.deck, Math.max(0, end / 8 * b.deck)); } }
    return null;
  }

  // ---------- OSM buildings: streamed tiles ----------
  const tileSet = new Set(world.tiles || []), TS = world.tileSize || 200, tiles = new Map();
  const { t: facadeT, te: facadeE } = facadeTextures(rand);
  const facade = new THREE.MeshStandardMaterial({ map: facadeT, emissiveMap: facadeE, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85, vertexColors: true, normalMap: tex('assets/tex/plastered_wall_04_nor_gl.jpg', 1, false), normalScale: new THREE.Vector2(0.4, 0.4) });
  nightMats.add({ mat: facade, max: 1.4 });
  const roofT = tex('assets/tex/concrete_floor_02_diff.jpg', 1);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofT, color: 0xc9c3b8, roughness: 0.95, vertexColors: true });
  const tankGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.3, 10), tankMat = M(0x1b1b1b, { roughness: 0.5 });
  const tankMat2 = M(0x2a62b8, { roughness: 0.5 });
  function buildTile(key, data) {
    const wp = [], wn = [], wu = [], wc = [], rp = [], rc = [], ru = [], polys = [], tanks = [];
    const col = new THREE.Color();
    data.b.forEach((b, bi) => {
      const f = b[0], cat = b[1], pts = []; for (let i = 2; i < b.length; i += 2) pts.push([b[i] / 10, b[i + 1] / 10]);
      if (pts.length < 3) return;
      let A = 0; for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; A += x1 * z2 - x2 * z1; }
      if (A < 0) pts.reverse();
      const h = f * 3.2 + 0.5;
      col.setHex(CAT_COL[cat] || PAL_B[(bi * 7 + (pts[0][0] | 0)) % PAL_B.length]);
      let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length]; const L = Math.hypot(bx - ax, bz - az); if (L < 0.05) continue;
        const nx = (bz - az) / L, nz = -(bx - ax) / L, u0 = acc / 9, u1 = (acc + L) / 9, v = h / 12.8; acc += L;
        // (a0, b1, b0) + (a0, a1, b1)
        wp.push(ax, 0, az, bx, h, bz, bx, 0, bz, ax, 0, az, ax, h, az, bx, h, bz);
        wu.push(u0, 0, u1, v, u1, 0, u0, 0, u0, v, u1, v);
        for (let k = 0; k < 6; k++) { wn.push(nx, 0, nz); wc.push(col.r, col.g, col.b); }
      }
      const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
      const rcCol = cat === 3 ? [0.85, 0.45, 0.25] : [0.9, 0.88, 0.85];
      for (const [a, bb, c] of tri) {
        const P = [pts[a], pts[bb], pts[c]];
        const ny = (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]) - (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]);
        const order = ny >= 0 ? [0, 1, 2] : [0, 2, 1];
        for (const o of order) { rp.push(P[o][0], h, P[o][1]); ru.push(P[o][0] / 6, P[o][1] / 6); rc.push(...rcCol); }
      }
      const bb = bbox(pts); polys.push({ pts, bb, name: data.n?.[bi], cat });
      if (f >= 2 && ((bi * 13) % 10) < 5 && (bb[2] - bb[0]) > 4 && (bb[3] - bb[1]) > 4) tanks.push([(bb[0] + bb[2]) / 2 + ((bi % 3) - 1), h + 0.65, (bb[1] + bb[3]) / 2, bi % 4 === 0]);
    });
    const grp = new THREE.Group();
    if (wp.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(wn, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
      const m = new THREE.Mesh(g, facade); m.castShadow = m.receiveShadow = quality.shadows; grp.add(m);
    }
    if (rp.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, roofMat); m.receiveShadow = true; grp.add(m);
    }
    for (const [mat, list] of [[tankMat, tanks.filter(t => !t[3])], [tankMat2, tanks.filter(t => t[3])]]) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(tankGeo, mat, list.length); const o = new THREE.Object3D();
      list.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = quality.shadows; grp.add(im);
    }
    scene.add(grp);
    return { grp, polys };
  }
  async function loadTile(key) {
    tiles.set(key, { loading: true, polys: [] });
    try {
      const r = await fetch(`assets/data/tiles/b_${key}.json`); const data = await r.json();
      if (!tiles.has(key)) return;
      const t = buildTile(key, data); tiles.set(key, t); ctx.onTile?.(t.polys);
    } catch (e) { tiles.delete(key); }
  }
  function unloadTile(key) {
    const t = tiles.get(key); if (!t) return; tiles.delete(key);
    if (t.grp) { scene.remove(t.grp); t.grp.traverse(o => { if (o.geometry && o.geometry !== tankGeo) o.geometry.dispose(); }); }
  }
  const TR = quality.tier === 'high' ? 3 : 2;
  function streamTiles(px, pz, force) {
    const ti = Math.floor(px / TS), tj = Math.floor(pz / TS);
    for (let i = ti - TR; i <= ti + TR; i++) for (let j = tj - TR; j <= tj + TR; j++) {
      const k = `${i}_${j}`; if (tileSet.has(k) && !tiles.has(k)) loadTile(k);
    }
    tiles.forEach((t, k) => { const [i, j] = k.split('_').map(Number); if (Math.abs(i - ti) > TR + 1 || Math.abs(j - tj) > TR + 1) unloadTile(k); });
  }
  const inBuilding = (x, z, rad = 0.35) => {
    const ti = Math.floor(x / TS), tj = Math.floor(z / TS);
    for (let i = ti - 1; i <= ti + 1; i++) for (let j = tj - 1; j <= tj + 1; j++) {
      const t = tiles.get(`${i}_${j}`); if (!t || !t.polys) continue;
      for (const p of t.polys) {
        if (x < p.bb[0] - rad || x > p.bb[2] + rad || z < p.bb[1] - rad || z > p.bb[3] + rad) continue;
        if (pip(x, z, p.pts)) return true;
        for (let a = 0, b = p.pts.length - 1; a < p.pts.length; b = a++) if (distToSeg(x, z, p.pts[b][0], p.pts[b][1], p.pts[a][0], p.pts[a][1]).d < rad) return true;
      }
    }
    return false;
  };

  const heightAt = (x, z) => bridgeAt(x, z) ?? 0;
  const blockedArea = [];
  const isWater = (x, z) => inRiver(x, z) || (OSM && (inPond(x, z) || inCanal(x, z)));
  const blocked = (x, z, y) => {
    const onB = bridgeAt(x, z); if (onB !== null) return false;
    if (inRiver(x, z)) return true;
    for (const c of blockedArea) if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
    if (OSM) { if (inPond(x, z, 0.3) || inCanal(x, z) || inBuilding(x, z)) return true; }
    return false;
  };

  // ---------- place prefabs ----------
  const label = (text, x, y, z, cls = '') => {
    const el = document.createElement('div'); el.className = 'w-label ' + cls; el.innerHTML = text;
    const o = new CSS2DObject(el); o.position.set(x, y, z); scene.add(o); labels.push(o); return o;
  };
  // local frame of a place: rotation.y = rot maps local (x,z) -> world
  const F = p => { const r = p.rot || 0, c = Math.cos(r), s = Math.sin(r); return { r, w: (lx, lz) => [p.x + lx * c + lz * s, p.z - lx * s + lz * c] }; };
  const colL = (p, lx, lz, hx, hz, h = 99) => { const f = F(p); const [x, z] = f.w(lx, lz); colliders.add(x, z, hx, hz, -f.r, h); };
  const addScreenL = (p, src, poster, lx, lz, lrot, w = 9, aspect = 16 / 9) => {
    const f = F(p); const [x, z] = f.w(lx, lz); const rotY = f.r + lrot;
    const s = videoScreen(src, poster, w, aspect); s.position.set(x, 2.2, z); s.rotation.y = rotY; scene.add(s);
    const legM = M(0x222222); for (const k of [-0.35, 0.35]) box(0.3, 2.2, 0.3, legM, x + Math.cos(rotY) * w * k, 0, z - Math.sin(rotY) * w * k, scene);
    screens.push(s); return s;
  };
  const doorL = (p, lx, lz, label2, scene2, params = {}) => {
    const [x, z] = F(p).w(lx, lz);
    interactables.push({ x, z, r: 3.5, label: label2, type: 'enter', scene: scene2, place: p.id, params, yaw: F(p).r });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 32), new THREE.MeshBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.12, z); scene.add(ring); animated.push(t => { ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.3; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06); });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    beam.position.set(x, 7, z); scene.add(beam);
  };
  const infoL = (p, lx, lz, r = 6) => { const [x, z] = F(p).w(lx, lz); interactables.push({ x, z, r, label: `About ${p.name.split('·')[0].trim()}`, type: 'info', place: p.id }); };
  const approxNote = p => p.approx ? `<small>≈${p.realDistKm} km away in real life · not to scale</small>` : '';

  const builders = {
    bageshwori(p, g) {
      const wallM = pbr('plastered_wall_04', 4, { color: 0xf0e3c8 });
      const S = 22;
      [[0, -S, 2 * S, 1], [-S, 0, 1, 2 * S], [S, 0, 1, 2 * S]].forEach(([x, z, w, d]) => { box(w, 3, d, wallM, x, 0, z, g); colL(p, x, z, w / 2, d / 2); });
      [[-S / 2 - 3, S], [S / 2 + 3, S]].forEach(([x, z]) => { box(S - 6, 3, 1, wallM, x, 0, z, g); colL(p, x, z, (S - 6) / 2, 0.5); });
      const gate = new THREE.Group(); gate.position.set(0, 0, S); g.add(gate);
      for (const x of [-3.2, 3.2]) box(1.2, 6, 1.4, M(PAL.red), x, 0, 0, gate);
      box(8, 1.2, 1.8, M(PAL.red), 0, 6, 0, gate); const roofG = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 5.6, 1.6, 4), M(0xe9e9ea, { roughness: 0.45 })); roofG.rotation.y = Math.PI / 4; roofG.scale.z = 0.4; roofG.position.y = 8; gate.add(roofG);
      const sg = signMesh('श्री बागेश्वरी मन्दिर', 6, { bg: '#a8231d', fg: '#ffe6a8', font: 'bold 60px "Tiro Devanagari Hindi", serif' }); sg.position.set(0, 7.1, 0.95); gate.add(sg);
      const pg = pagoda(g, 0.9); pg.position.set(0, 0, -6); animated.push(t => { pg.userData.flag.rotation.y = Math.sin(t * 3) * 0.35; });
      colL(p, 0, -6, 8, 7);
      for (let i = 0; i < 6; i++) { const lx = -S + 3 + i * 1.6 * 5 % (2 * S - 6); palm(g, lx, S - 3, 7 + rand() * 3, rand); const [wx, wz] = F(p).w(lx, S - 3); colliders.addCircle(wx, wz, 0.5); }
      doorL(p, 0, S + 2, 'Enter Bageshwori Mandir', 'temple');
      addScreenL(p, 'assets/videos/bageshwori-day.mp4', 'assets/videos/bageshwori-day-poster.webp', 14, S + 8, -0.5, 7, 1);
      infoL(p, -8, S + 4);
    },
    junge(p, g) { // Junge Mahadev pavilion in the real Bageshwori pond
      const pv = pavilion(g); pv.position.y = 0.8; colliders.addCircle(p.x, p.z, 4.5);
      label('Junge Mahadev<small>जुंगे महादेव · in Bageshwori Pond</small>', p.x, 11, p.z);
      const near = ponds.find(o => pip(p.x, p.z, o.pts));
      // info point on the nearest pond edge
      let ex = p.x, ez = p.z; if (near) { let bd = 1e9; near.pts.forEach(([x, z]) => { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; ex = x; ez = z; } }); const k = 3 / Math.max(1, Math.hypot(ex - p.x, ez - p.z)); ex += (ex - p.x) * k; ez += (ez - p.z) * k; }
      interactables.push({ x: ex, z: ez, r: 6, label: 'About Junge Mahadev', type: 'info', place: 'junge' });
    },
    hanuman(p, g) {
      const conc = pbr('concrete_floor_02', 3, { color: 0xcfc8bb });
      const moat = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 30), new THREE.MeshStandardMaterial({ color: 0x2f4f5a, roughness: 0.1, metalness: 0.3, normalMap: waterN })); moat.position.y = 0.1; g.add(moat);
      box(18, 2, 18, conc, 0, 0, 0, g); colL(p, 0, 0, 9.5, 9.5, 1.9);
      blockedArea.push({ x: p.x, z: p.z, r: 15 });
      box(4, 2, 8, conc, 0, 0, 13, g);
      const st = hanumanStatue(g, 33); st.position.y = 2;
      box(10, 0.2, 2, M(0xf2c230), 0, 0, 18, g);
      doorL(p, 0, 20, 'Visit Hanumangadhi', 'hanuman');
      addScreenL(p, 'assets/videos/hanuman.mp4', 'assets/videos/hanuman-poster.webp', -14, 22, 0.4, 4.5, 9 / 16);
      infoL(p, 8, 21);
      label('108-ft Hanuman<small>Hanumangadhi</small>', p.x, 38, p.z, 'big');
    },
    ranitalau(p, g) {
      const pond = ponds.find(o => pip(p.x, p.z, o.pts)) || ponds.find(o => o.name && /rani/i.test(o.name));
      let edge = [p.x - 26, p.z + 14];
      if (pond) {
        const [a, b, c, d] = pond.bb; edge = [(a + c) / 2, d + 4];
        for (let i = 0; i < 4; i++) { const bt = new THREE.Group(); box(1.6, 0.5, 3, M([0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b][i], { roughness: 0.4 }), 0, 0, 0, bt); const bx = a + (c - a) * (0.3 + i * 0.13), bz = b + (d - b) * (i % 2 ? 0.4 : 0.6); if (!pip(bx, bz, pond.pts)) continue; bt.position.set(bx, 0.3, bz); bt.rotation.y = rand() * 3; scene.add(bt); animated.push(t => { bt.position.y = 0.3 + Math.sin(t * 1.5 + i) * 0.05; }); }
      } else {
        const W = 40, D = 24; const wm = new THREE.Mesh(new THREE.PlaneGeometry(W, D), waterMat); wm.rotation.x = -Math.PI / 2; wm.position.y = 0.35; g.add(wm); colliders.add(p.x, p.z, W / 2, D / 2, 0, 0.7);
      }
      const pb = photoBoard(scene, 'assets/img/rani-talau-sm.webp', 4.5, 1.5, 'Rani Talau · ~200 years old'); pb.position.set(edge[0], 0, edge[1]);
      interactables.push({ x: edge[0], z: edge[1] + 2, r: 6, label: 'About Rani Talau', type: 'info', place: 'ranitalau' });
      label('Rani Talau<small>रानी तलाउ · Ward 8</small>', p.x, 9, p.z);
    },
    wonderland(p, g) {
      box(30, 1, 1, M(0x2fa36b), 0, 7, 12, g);
      for (const x of [-12, 12]) { cyl(0.8, 0.8, 8, 10, M(0xf2c230), x, 0, 12, g); const [wx, wz] = F(p).w(x, 12); colliders.addCircle(wx, wz, 0.9); }
      const sg = signMesh('Wonder Land', 14, { bg: '#2a6dd2', fg: '#ffffff', font: 'bold 72px Inter, sans-serif' }); sg.position.set(0, 9.2, 12.6); g.add(sg);
      const fenceM = M(0x2fa36b, { metalness: 0.4 });
      [[-15, -6, 1, 36], [15, -6, 1, 36], [0, -24, 30, 1]].forEach(([x, z, w, d]) => { box(w, 2.2, d, fenceM, x, 0, z, g); colL(p, x, z, w / 2, d / 2); });
      [[-9.5, 12], [9.5, 12]].forEach(([x, z]) => { box(9, 2.2, 1, fenceM, x, 0, z, g); colL(p, x, z, 4.5, 0.5); });
      waterSlide(g, -6, -10, 12, 0xd23b2a, 0xffffff, 2.2, 4); waterSlide(g, 7, -14, 9, 0x2fa36b, 0xffffff, 1.6, 3.5);
      colL(p, 0, -10, 13, 10);
      doorL(p, 0, 15, 'Enter Wonder Land', 'wonderland');
      addScreenL(p, 'assets/videos/wonderland.mp4', 'assets/videos/wonderland-poster.webp', 20, 16, -0.5, 6, 1);
    },
    ravan(p, g) {
      const field = new THREE.Mesh(new THREE.PlaneGeometry(60, 52), pbr('aerial_grass_rock', 6, { color: 0xd6c08a })); field.rotation.x = -Math.PI / 2; field.position.y = 0.04; field.receiveShadow = true; g.add(field);
      const ef = ravanEffigy(g, 20); ef.position.set(0, 0, -10); colL(p, 0, -10, 4, 2);
      box(16, 1.5, 8, M(0x5b3a22), 0, 0, -20, g); colL(p, 0, -20, 8, 4);
      for (let i = 0; i < 6; i++) { cyl(0.1, 0.1, 6, 6, M(0x333333), -7 + i * 2.8, 1.5, -23.5, g); const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xffffff, 0xfff0c0, 5)); b.position.set(-7 + i * 2.8, 7.6, -23.5); g.add(b); }
      doorL(p, 0, 22, 'Enter Ramlila Ground (Ravan Dahan)', 'ravan');
      addScreenL(p, 'assets/videos/ravan-dahan.mp4', 'assets/videos/ravan-dahan-poster.webp', 18, 20, -0.4, 9, 16 / 9);
      const [lx, lz] = F(p).w(0, -10); label('Ravan Dahan<small>Ramlila Ground · रामलीला मैदान</small>', lx, 24, lz);
    },
    biryani(p, g) {
      const wall = pbr('brick_wall_10', 2, { color: 0xd9b89a });
      box(14, 6.5, 10, wall, 0, 0, 0, g); colL(p, 0, 0, 7, 5);
      box(15, 0.4, 3, M(0x1f6b3a), 0, 3.6, 6.2, g);
      const sg = signMesh('BIRYANI CORNER', 10, { bg: '#1f6b3a', fg: '#ffe6a8', font: 'bold 64px Inter, sans-serif', sub: 'बिरयानी · कबाब · कोरमा' }); sg.position.set(0, 5.2, 5.05); g.add(sg);
      box(3, 3, 0.3, glowMat(0x2a1a0a, 0xffb860, 1.5), 0, 0, 5.05, g);
      doorL(p, 0, 7.5, 'Enter Biryani Corner', 'restaurant');
    },
    school(p, g) {
      const ins = institution(g, p.name, { w: 32, d: 12, floors: 3, color: 0xf6efe0, accent: p.id === 'hope-intl' ? 0x2a6dd2 : 0xd9a935, sign: p.id === 'hope-intl' ? '#1d4f91' : '#8a5a00' });
      ins.position.z = -8; colL(p, 0, -8, 16, 6);
      const yard = new THREE.Mesh(new THREE.PlaneGeometry(32, 14), pbr('concrete_floor_02', 4)); yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.05, 5); g.add(yard);
      cyl(0.08, 0.08, 9, 6, M(0xdddddd, { metalness: 0.7 }), -12, 0, 6, g);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), M(0xd8261c, { side: THREE.DoubleSide })); fl.position.set(-10.9, 8.2, 6); g.add(fl); animated.push(t => fl.rotation.y = Math.sin(t * 2.5) * 0.3);
      doorL(p, 0, 13, `Visit ${p.name}`, 'school', { name: p.name, id: p.id });
    },
    airport(p, g) {
      const rw = new THREE.Mesh(new THREE.PlaneGeometry(160, 22), pbr('asphalt_02', 6, { color: 0x6a6a6a })); rw.rotation.x = -Math.PI / 2; rw.position.set(0, 0.07, -30); g.add(rw);
      for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), markMat); m.rotation.x = -Math.PI / 2; m.position.set(-70 + i * 11, 0.09, -30); g.add(m); }
      const term = institution(g, 'Nepalgunj Airport', { w: 40, d: 14, floors: 2, color: 0xf2f2ee, accent: 0x1d4f91, sign: '#1d4f91' }); term.position.z = 0; colL(p, 0, 0, 20, 7);
      cyl(1.6, 2, 14, 10, M(0xf2f2ee), 26, 0, 0, g); box(5, 3, 5, M(0x2b3a48, { metalness: 0.5, roughness: 0.1 }), 26, 14, 0, g);
      const pl = new THREE.Group(); box(1.7, 1.7, 13, M(0xf4f4f4, { metalness: 0.3, roughness: 0.4 }), 0, 1.2, 0, pl); box(19, 0.3, 2.2, M(0xd23b2a), 0, 3.2, -1, pl); box(0.3, 3, 2, M(0xd23b2a), 0, 2.9, 6, pl); pl.position.set(-20, 0, -14); pl.rotation.y = 0.4; g.add(pl); colL(p, -20, -14, 2.5, 6.5);
      const pb = photoBoard(g, 'assets/img/nepalgunj-airport-tara-air-sm.webp', 4.5, 1.33, 'Nepalgunj Airport · KEP'); pb.position.set(-6, 0, 12);
      infoL(p, -6, 14);
    },
    border(p, g) {
      for (const x of [-10, 10]) { box(2.4, 8, 2.4, pbr('brick_wall_10', 1, { color: 0xc9a07a }), x, 0, 0, g); colL(p, x, 0, 1.2, 1.2); }
      box(22, 2, 2.6, M(0xb3261e), 0, 8, 0, g);
      const sg = signMesh('नेपाल · Welcome to Nepal', 14, { bg: '#b3261e', fg: '#ffffff', font: 'bold 52px Inter, sans-serif', sub: 'Jamunaha · Nepalgunj' }); sg.position.set(0, 9, 1.35); g.add(sg);
      for (const x of [-14, 14]) { box(4, 3, 4, M(0xf2f2ee), x, 0, -6, g); colL(p, x, -6, 2, 2); }
      infoL(p, 6, 5);
    },
    rapti(p, g) {
      // portal to the Rapti river scene (outside the city)
      const sg = signMesh('राप्ती नदी → Rapti River', 9, { bg: '#1f5a8a', fg: '#ffffff', font: 'bold 56px Inter, sans-serif', sub: 'outside the city · not to scale' }); sg.position.set(0, 5, 0); g.add(sg);
      for (const x of [-4.2, 4.2]) cyl(0.15, 0.15, 5, 8, M(0x444444), x, 0, 0, g);
      doorL(p, 0, 5, 'Go to the Rapti River bridges', 'rapti');
      infoL(p, 6, 5);
    },
    chowk(p, g) {
      cyl(4.2, 4.6, 0.6, 28, pbr('marble_01', 2), 0, 0, 0, g); colliders.addCircle(p.x, p.z, 4.4, 0.5);
      cyl(3.6, 3.6, 0.2, 24, M(0x5f8a3a), 0, 0.6, 0, g);
      cyl(0.5, 0.7, 5, 12, M(0xd9a935, { metalness: 0.7, roughness: 0.3 }), 0, 0.7, 0, g);
      const sg = signMesh(p.name, 6, { bg: '#1f6b3a', fg: '#ffffff', font: 'bold 52px Inter, sans-serif' }); sg.position.set(0, 7.2, 0); g.add(sg);
      const sg2 = sg.clone(); sg2.rotation.y = Math.PI / 2; g.add(sg2);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const lx = Math.cos(a) * 9, lz = Math.sin(a) * 9; if (onRoad(p.x + lx, p.z + lz, -2)) continue; cyl(0.1, 0.12, 6, 6, M(0x333333), lx, 0, lz, g); const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xffeec0, 0xffd080, 5)); b.position.set(lx, 6.1, lz); g.add(b); }
      infoL(p, 6, 6, 5);
    }
  };
  // default (stylized) world also uses generic institution builders
  const generic = {
    hospital(p, g) { institution(g, p.name, { w: 36, d: 16, floors: 4, color: 0xf7f7f2, accent: 0xb3261e, sign: '#b3261e', cross: true }); colliders.add(p.x, p.z, 18, 8); infoL(p, 0, 10); },
    college(p, g) { institution(g, p.name, { w: 34, d: 14, floors: 3, color: 0xefe2c8, accent: 0x7a2c3a, sign: '#7a2c3a' }); colliders.add(p.x, p.z, 17, 7); },
    mosque(p, g) { mosque(g); colliders.add(p.x, p.z, 9, 6.5); infoL(p, 0, 10); },
    temple(p, g) { shikhara(g, 1); colliders.add(p.x, p.z, 4, 4); },
    cinema(p, g) { institution(g, p.name, { w: 22, d: 14, floors: 3, color: 0x2b2b33, accent: 0xf2a33a, sign: '#111111' }); colliders.add(p.x, p.z, 11, 7); infoL(p, 0, 10); },
    park(p, g) { const lawn = new THREE.Mesh(new THREE.CircleGeometry(20, 32), pbr('aerial_grass_rock', 4, { color: 0x88a860 })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.05; g.add(lawn); infoL(p, 0, 0, 10); },
    bazaar(p, g) { for (let i = 0; i < 8; i++) { const c = [0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b, 0xe0702a][i % 5]; const x = (i % 4) * 6 - 9, z = Math.floor(i / 4) * 8 - 4; box(4.5, 1, 2, M(0x7a5232), x, 0, z, g); box(5, 0.1, 3.2, M(c), x, 2.6, z, g); colliders.add(p.x + x, p.z + z, 2.3, 1); } infoL(p, 0, 8); },
    buspark(p, g) { const lot = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), pbr('asphalt_02', 4, { color: 0x8a8a8a })); lot.rotation.x = -Math.PI / 2; lot.position.y = 0.05; g.add(lot); for (let i = 0; i < 5; i++) { const b = bus(g, [0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b, 0xffffff][i]); b.position.set(-14 + i * 7, 0, -4); colliders.add(p.x - 14 + i * 7, p.z - 4, 1.3, 5); } infoL(p, 0, 12); }
  };
  // OSM mode: real buildings already exist for these, so only a marker + info point
  const marker = (p) => {
    const pole = cyl(0.12, 0.12, 4, 8, M(0x333333), p.x, 0, p.z, scene);
    const icon = { hospital: '🏥', mosque: '🕌', cinema: '🎬', buspark: '🚌', park: '🌳', restaurant: '🍛', gurudwara: '🛕' }[p.kind] || '📍';
    infoL({ ...p, rot: 0 }, 0, 0, 7);
    if (p.kind === 'buspark') for (let i = 0; i < 3; i++) { const b = bus(scene, [0xd23b2a, 0x2a6dd2, 0xf2c230][i]); b.position.set(p.x - 8 + i * 6, 0, p.z + 6); b.visible = !inBuilding(p.x - 8 + i * 6, p.z + 6); }
    return icon;
  };

  const placeGroups = {};
  places.forEach(p => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.rot || 0; scene.add(g); placeGroups[p.id] = g;
    let icon = '';
    if (builders[p.kind]) builders[p.kind](p, g);
    else if (OSM) icon = marker(p);
    else (generic[p.kind] || generic.college)(p, g);
    if (!['hanuman', 'ravan', 'junge', 'ranitalau'].includes(p.kind))
      label((icon ? icon + ' ' : '') + p.name + (p.dev ? `<small>${p.dev}</small>` : '') + approxNote(p), p.x, p.kind === 'chowk' ? 10 : p.kind === 'bageshwori' ? 24 : OSM && !builders[p.kind] ? 16 : 15, p.z, p.kind === 'chowk' ? 'chowk' : p.approx ? 'far' : '');
  });

  // ---------- POIs (all mapped schools, hospitals, temples, mosques …) ----------
  pois.forEach(q => interactables.push({ x: q.x, z: q.z, r: 6, label: `About ${q.name}`, type: 'info', place: q.id, poi: true }));
  const poolN = isFinite(ctx.labelPool) ? ctx.labelPool : 10, pool = [];
  for (let i = 0; i < poolN && pois.length; i++) { const o = label('', 0, -100, 0, 'poi'); o.visible = false; pool.push(o); }
  function updatePoiLabels(px, pz) {
    const near = []; for (const q of pois) { const d = Math.hypot(q.x - px, q.z - pz); if (d < 90) near.push([d, q]); }
    near.sort((a, b) => a[0] - b[0]);
    pool.forEach((o, i) => { const n = near[i]; if (!n) { o.visible = false; o.userData.q = null; return; } const q = n[1]; if (o.userData.q !== q) { o.userData.q = q; o.element.innerHTML = `${CAT_ICON[q.cat] || '📍'} ${q.name}`; o.position.set(q.x, 9, q.z); } o.visible = true; });
  }

  // ---------- food stalls ----------
  STALLS.forEach(s => {
    const p = byId[s.at]; if (!p) return;
    let x = p.x + s.off[0], z = p.z + s.off[1];
    for (let k = 0; k < 10 && onRoad(x, z, -1.5); k++) { x += Math.sign(s.off[0]) * 1.5; z += Math.sign(s.off[1]) * 1.5; }
    const st = stall(scene, s.type, s.name, [0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b][s.dishes[0].length % 4]);
    st.position.set(x, 0, z); st.rotation.y = Math.atan2(p.x - x, p.z - z);
    colliders.add(x, z, 1.4, 0.8, -st.rotation.y);
    const fx = x + Math.sin(st.rotation.y) * 2, fz = z + Math.cos(st.rotation.y) * 2;
    interactables.push({ x: fx, z: fz, r: 2.6, label: `Buy & eat at ${s.name}`, type: 'food', dishes: s.dishes, stall: s.name, anchor: new THREE.Vector3(x, 1.6, z) });
  });

  const tmp = new THREE.Object3D();
  // ---------- procedural buildings (default stylized world only) ----------
  const occ = new Set(), cell = 7;
  const occKey = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const nearPlace = (x, z, pad) => places.some(p => Math.hypot(x - p.x, z - p.z) < (FOOTPRINT[p.kind] || 12) + pad);
  if (!OSM) {
    const bspots = [];
    roads.forEach(rd => {
      const hw = (rd.width || 8) / 2 + 2;
      for (let i = 0; i < rd.pts.length - 1; i++) {
        const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 4) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux, ang = Math.atan2(ux, uz);
        for (const side of [-1, 1]) for (let s = 4; s < L - 4; s += 9 + rand() * 4) {
          if (rand() > quality.density) continue;
          const w = 7 + rand() * 4, d = 8 + rand() * 5, h = 6 + Math.floor(rand() * 4) * 3.2, off = hw + 1 + d / 2;
          const x = ax + ux * s + nx * side * off, z = az + uz * s + nz * side * off;
          if (onRoad(x, z, d / 2 - 2) || nearPlace(x, z, 6) || rivers.some(rv => distToLine(x, z, rv.pts) < rv.width / 2 + 16) || occ.has(occKey(x, z))) continue;
          if (bridgeInfo.some(b => distToSeg(x, z, b.ax, b.az, b.bx, b.bz).d < 12)) continue;
          occ.add(occKey(x, z)); bspots.push({ x, z, w, d, h, rot: ang + (side > 0 ? Math.PI : 0) });
        }
      }
    });
    const facade1 = facade.clone(); facade1.vertexColors = false; nightMats.add({ mat: facade1, max: 1.4 });
    const roof1 = pbr('concrete_floor_02', 1, { color: 0xb0aaa0 });
    const binst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [facade1, facade1, roof1, roof1, facade1, facade1], bspots.length);
    bspots.forEach((b, i) => { tmp.position.set(b.x, b.h / 2, b.z); tmp.rotation.set(0, b.rot, 0); tmp.scale.set(b.w, b.h, b.d); tmp.updateMatrix(); binst.setMatrixAt(i, tmp.matrix); binst.setColorAt(i, new THREE.Color(PAL_B[Math.floor(rand() * PAL_B.length)])); colliders.add(b.x, b.z, b.w / 2, b.d / 2, -b.rot); });
    binst.castShadow = binst.receiveShadow = true; scene.add(binst);
  }

  // ---------- trees ----------
  let tspots = [];
  if (OSM && world.trees) tspots = world.trees.filter((_, i) => i % Math.round(1 / Math.max(0.2, quality.density)) === 0).map(([x, z]) => [x, z, 0.7 + rand() * 0.8]);
  else for (let i = 0; i < 700 * quality.density; i++) { const x = bx0 + rand() * (bx1 - bx0), z = bz0 + rand() * (bz1 - bz0); if (onRoad(x, z, 2) || nearPlace(x, z, 4) || inRiver(x, z) || occ.has(occKey(x, z))) continue; tspots.push([x, z, 0.7 + rand() * 0.8]); }
  tspots = tspots.filter(([x, z]) => !nearPlace(x, z, 3));
  const trunkI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 4, 6), M(PAL.trunk), tspots.length);
  const crownI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3, 1), M(0x5a8a3a, { roughness: 0.9 }), tspots.length);
  tspots.forEach(([x, z, s], i) => {
    tmp.position.set(x, 2 * s, z); tmp.rotation.set(0, 0, 0); tmp.scale.setScalar(s); tmp.updateMatrix(); trunkI.setMatrixAt(i, tmp.matrix);
    tmp.position.set(x, 5.6 * s, z); tmp.rotation.set(rand(), rand(), rand()); tmp.scale.set(s * 1.1, s, s * 1.1); tmp.updateMatrix(); crownI.setMatrixAt(i, tmp.matrix);
    crownI.setColorAt(i, new THREE.Color().setHSL(0.22 + rand() * 0.08, 0.4, 0.28 + rand() * 0.12));
    colliders.addCircle(x, z, 0.45 * s);
  });
  trunkI.castShadow = crownI.castShadow = quality.shadows; scene.add(trunkI, crownI);

  // ---------- street lamps along main roads ----------
  const lampPts = [];
  roads.filter(r => r.type === 'primary' || (OSM && r.type === 'secondary')).forEach(rd => {
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1) continue; const ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let s = 10; s < L; s += 30) for (const side of [-1, 1]) { const off = (rd.width || 8) / 2 + 1; lampPts.push([ax + ux * s - uz * side * off, az + uz * s + ux * side * off]); }
    }
  });
  const poleI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), M(0x3a3a3a, { metalness: 0.6 }), lampPts.length);
  const bulbI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), glowMat(0xfff2d0, 0xffd590, 6), lampPts.length);
  lampPts.forEach(([x, z], i) => { tmp.position.set(x, 3.5, z); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1); tmp.updateMatrix(); poleI.setMatrixAt(i, tmp.matrix); tmp.position.y = 7.1; tmp.updateMatrix(); bulbI.setMatrixAt(i, tmp.matrix); });
  scene.add(poleI, bulbI);
  flushRibbons();

  // ---------- traffic ----------
  const totalLen = rd => { let L = 0; for (let i = 0; i < rd.pts.length - 1; i++) L += Math.hypot(rd.pts[i + 1][0] - rd.pts[i][0], rd.pts[i + 1][1] - rd.pts[i][1]); return L; };
  roads.forEach(r => r._len = totalLen(r));
  const vehicles = [];
  const vcols = [0xd23b2a, 0x2a6dd2, 0xf2c230, 0x2fa36b, 0xffffff, 0xe0702a, 0x333333];
  const trafficRoads = roads.filter(r => (r.type === 'primary' || (OSM && r.type === 'secondary')) && r._len > 60);
  const budget = Math.round((OSM ? 90 : 40) * quality.density + 10), totalL = trafficRoads.reduce((a, r) => a + r._len, 0) || 1;
  trafficRoads.forEach(rd => {
    const n = Math.max(1, Math.round(budget * rd._len / totalL));
    for (let i = 0; i < n; i++) {
      const kind = (i + vehicles.length) % 5; const g = new THREE.Group();
      if (kind === 0) bus(g, vcols[i % vcols.length]);
      else if (kind === 1) { box(1.3, 1.6, 2.4, M(0x2fa36b, { roughness: 0.5 }), 0, 0.3, 0, g); box(1.4, 0.1, 2.6, M(0x1b1b1b), 0, 1.9, 0, g); }
      else if (kind === 2 || kind === 4) { box(0.5, 1.1, 1.8, M(0x222222), 0, 0.3, 0, g); box(0.4, 0.7, 0.4, M(vcols[i % 7]), 0, 1.3, -0.1, g); }
      else { box(1.8, 1.0, 4.2, M(vcols[i % vcols.length], { roughness: 0.3, metalness: 0.5 }), 0, 0.35, 0, g); box(1.6, 0.6, 2.2, M(0x1b2630, { roughness: 0.1, metalness: 0.6 }), 0, 1.35, -0.2, g); }
      if (quality.shadows) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      vehicles.push({ g, rd, s: rand(), dir: i % 2 ? 1 : -1, speed: (kind === 0 ? 7 : kind === 2 ? 11 : 9) * (0.8 + rand() * 0.4) });
    }
  });
  function pointAt(rd, dist) {
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
      if (dist <= L) return { x: ax + (bx - ax) * dist / L, z: az + (bz - az) * dist / L, ang: Math.atan2(bx - ax, bz - az) };
      dist -= L;
    }
    const n = rd.pts.length - 1; return { x: rd.pts[n][0], z: rd.pts[n][1], ang: 0 };
  }

  // ---------- spawn & fast travel ----------
  const doorOf = id => interactables.find(i => i.place === id && i.type === 'enter');
  const front = (it, d = 3.5) => ({ x: it.x + Math.sin(it.yaw || 0) * d, z: it.z + Math.cos(it.yaw || 0) * d, yaw: it.yaw || 0 });
  const bd = doorOf('bageshwori');
  const spawn = bd ? front(bd, 9) : { x: (byId.pushpalal || places[0]).x - 10, z: (byId.pushpalal || places[0]).z + 10, yaw: 0 };
  const fast = places.map(p => {
    const d = doorOf(p.id) || interactables.find(i => i.place === p.id && i.type === 'info');
    let f = d ? front(d, d.type === 'enter' ? 2.2 : 2) : { x: p.x, z: p.z + (FOOTPRINT[p.kind] || 10) + 4, yaw: 0 };
    return { id: p.id, name: p.name, kind: p.kind, approx: !!p.approx, ...f };
  });
  if (OSM) streamTiles(spawn.x, spawn.z);

  const particles = new Particles(scene, 400, 0.35);
  let screenT = 0, streamT = 0;
  const vis = new THREE.Vector3();
  return {
    name: 'Nepalgunj', scene, env, colliders, blocked, isWater, heightAt, bounds: [bx0, bz0, bx1, bz1], osm: OSM,
    interactables, spawn, fast, particles, labels, places, pois, roads, rivers, bridges: bridgeInfo, ponds, canals, green: world.green || [], world,
    tilesLoaded: () => tiles, front,
    async ready(x, z) { if (!OSM) return; streamTiles(x, z); for (let k = 0; k < 100 && [...tiles.values()].some(t => t.loading); k++) await new Promise(r => setTimeout(r, 50)); },
    update(dt, t, player) {
      animated.forEach(f => f(t));
      waterN.offset.x += dt * 0.02; waterN.offset.y += dt * 0.012;
      for (const v of vehicles) {
        v.s = (v.s + v.dir * v.speed * dt / v.rd._len + 1) % 1;
        const p = pointAt(v.rd, v.s * v.rd._len), lane = (v.rd.width || 8) * 0.22 * v.dir;
        v.g.position.set(p.x + Math.cos(p.ang) * lane, 0.25, p.z - Math.sin(p.ang) * lane); v.g.rotation.y = p.ang + (v.dir < 0 ? Math.PI : 0);
        v.g.visible = Math.abs(v.g.position.x - player.pos.x) < quality.drawDist && Math.abs(v.g.position.z - player.pos.z) < quality.drawDist;
      }
      particles.update(dt);
      screenT -= dt; streamT -= dt;
      if (screenT <= 0) { screenT = 0.5;
        screens.forEach(s => { const d = s.position.distanceTo(player.pos); d < 55 ? s.userData.play() : s.userData.pause(); });
        updatePoiLabels(player.pos.x, player.pos.z);
      }
      if (OSM && streamT <= 0) { streamT = 0.6; streamTiles(player.pos.x, player.pos.z); }
    },
    dispose() { screens.forEach(s => s.userData.dispose()); labels.forEach(l => l.element.remove()); }
  };
}
