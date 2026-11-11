/* A dusk "architectural model" of Nepalgunj from OpenStreetMap: extruded footprints, glowing roads, ponds.
   Full-screen in the map chapters, a small circular locator otherwise. */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { gsap } from 'gsap';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLACE_FACTS } from '../cine/chapters.js';

export async function makeMap(canvas, labelEl, { mobile, still, openCard }) {
  const world = await (await fetch('assets/data/world.json')).json();
  const places = {}; world.places.forEach(p => places[p.id] = p);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(); const BG = new THREE.Color(0x15110e); scene.background = BG; scene.fog = new THREE.Fog(BG, 1800, 6500);
  const camera = new THREE.PerspectiveCamera(32, 1, 5, 20000);
  const labels = new CSS2DRenderer({ element: labelEl });
  scene.add(new THREE.HemisphereLight(0xbcc6d6, 0x2a1d12, 0.9));
  const sun = new THREE.DirectionalLight(0xffc48a, 2.4); sun.position.set(-900, 700, -500); scene.add(sun);

  // ground
  const [x0, z0, x1, z1] = world.bounds; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9000, 64).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x241c15 }));
  ground.position.set(cx, -0.5, cz); scene.add(ground);
  const shapeGeo = (pts, y) => { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
  const greens = world.green.filter(g => g.pts.length > 2).map(g => shapeGeo(g.pts, 0));
  if (greens.length) scene.add(new THREE.Mesh(mergeGeometries(greens), new THREE.MeshLambertMaterial({ color: 0x2b2a18 })));
  const waters = world.water.polys.filter(w => w.pts.length > 2).map(w => shapeGeo(w.pts, 0.4));
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d3a44, roughness: 0.15, metalness: 0.6, emissive: 0x0b1c22 });
  if (waters.length) scene.add(new THREE.Mesh(mergeGeometries(waters), waterMat));

  // roads: flat ribbons, warmer and brighter for main roads
  const roadGeo = { main: [], minor: [] };
  for (const r of world.roads) {
    const main = r.type === 'primary' || r.type === 'secondary'; if (r.type === 'path') continue;
    const w = main ? Math.max(9, r.width || 9) : Math.max(4, (r.width || 5) * 0.8), arr = main ? roadGeo.main : roadGeo.minor;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2;
      arr.push(ax + nx, az + nz, ax - nx, az - nz, bx - nx, bz - nz, ax + nx, az + nz, bx - nx, bz - nz, bx + nx, bz + nz);
    }
  }
  const ribbon = (a, y) => { const p = new Float32Array(a.length / 2 * 3); for (let i = 0, j = 0; i < a.length; i += 2, j += 3) { p[j] = a[i]; p[j + 1] = y; p[j + 2] = a[i + 1]; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g; };
  const roadMinor = new THREE.MeshBasicMaterial({ color: 0x6b5644, fog: true }), roadMain = new THREE.MeshBasicMaterial({ color: 0xd9a35e, fog: true });
  scene.add(new THREE.Mesh(ribbon(roadGeo.minor, 0.6), roadMinor), new THREE.Mesh(ribbon(roadGeo.main, 0.9), roadMain));

  // buildings: extruded walls + roofs merged, vertex-coloured by height
  const pos = [], col = [], c = new THREE.Color();
  const tiles = world.tiles || [];
  const datas = [];
  for (let i = 0; i < tiles.length; i += 30) datas.push(...await Promise.all(tiles.slice(i, i + 30).map(k => fetch(`assets/data/tiles/b_${k}.json`).then(r => r.json()).catch(() => null))));
  for (const d of datas) if (d) for (const b of d.b) {
    const floors = Math.max(1, b[0] || 1), h = floors * 3.1 + 0.6; const pts = []; for (let i = 2; i < b.length; i += 2) pts.push([b[i] / 10, b[i + 1] / 10]);
    if (pts.length < 3) continue;
    let A = 0; for (let i = 0; i < pts.length; i++) { const [a1, b1] = pts[i], [a2, b2] = pts[(i + 1) % pts.length]; A += a1 * b2 - a2 * b1; } if (A < 0) pts.reverse();
    const shade = 0.78 + ((Math.abs(pts[0][0] * 13.1 + pts[0][1] * 7.7) % 10) / 10) * 0.22;
    c.setRGB(0.80 * shade, 0.74 * shade, 0.66 * shade);
    for (let i = 0; i < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      pos.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, 0, az, bx, h, bz, ax, h, az); for (let k = 0; k < 6; k++) col.push(c.r * (k === 2 || k === 4 || k === 5 ? 1 : 0.55), c.g * (k === 2 || k === 4 || k === 5 ? 1 : 0.55), c.b * (k === 2 || k === 4 || k === 5 ? 1 : 0.55)); }
    const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const t of tri) for (const k of [t[0], t[2], t[1]]) { pos.push(pts[k][0], h, pts[k][1]); col.push(c.r * 1.08, c.g * 1.06, c.b * 1.02); }
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.computeVertexNormals();
  const bMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(bg, bMat));

  // markers
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 900, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  marker.geometry.translate(0, 450, 0); scene.add(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(18, 24, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.9, depthWrite: false })); ring.position.y = 2; scene.add(ring);
  const tags = {};
  for (const id of Object.keys(PLACE_FACTS)) { const p = places[id]; if (!p) continue;
    const el = document.createElement('button'); el.className = 'hot'; el.innerHTML = `<i></i><span>${PLACE_FACTS[id].name}${p.approx ? ' <em>≈ ' + (p.realDistKm ? p.realDistKm.toFixed(1) + ' km' : 'far') + '</em>' : ''}</span>`;
    el.addEventListener('click', e => { e.stopPropagation(); openCard(id, p.approx); });
    const o = new CSS2DObject(el); o.position.set(p.x, 30, p.z); scene.add(o); tags[id] = el; }

  // camera rig
  const cam = { x: 0, z: 0, dist: 3000, az: 200, el: 50 }, tgt = { ...cam };
  let mode = 'inset', W = 0, H = 0, dirty = true;
  const at = v => Array.isArray(v.at) ? { x: v.at[0], z: v.at[1] } : places[v.at] || { x: 0, z: 0 };
  function size() { W = innerWidth; H = innerHeight; renderer.setPixelRatio(mode === 'full' ? Math.min(devicePixelRatio, 1.5) : 0.75); renderer.setSize(W, H, false); labels.setSize(W, H); camera.aspect = W / H; dirty = true; }
  size(); addEventListener('resize', size);
  function show(m, view, ids = [], immediate = false) {
    if (m !== mode) { mode = m; size(); }
    document.body.classList.toggle('map-full', m === 'full'); document.body.classList.toggle('map-inset', m !== 'full');
    if (view) { const p = at(view); Object.assign(tgt, { x: p.x, z: p.z, dist: m === 'full' ? view.dist : 1700, az: view.az ?? 200, el: m === 'full' ? view.el : 72 });
      if (immediate || still) Object.assign(cam, tgt); else gsap.to(cam, { ...tgt, az: cam.az + (((tgt.az - cam.az + 540) % 360) - 180), duration: 2.2, ease: 'power2.inOut', onUpdate: () => dirty = true }); }
    marker.position.set(tgt.x, 0, tgt.z); ring.position.set(tgt.x, 2, tgt.z);
    Object.entries(tags).forEach(([id, el]) => el.classList.toggle('on', m === 'full' && ids.includes(id)));
    dirty = true;
  }
  function renderNow(t = performance.now() / 1000) {
    const drift = mode === 'full' && !still ? Math.sin(t * 0.07) * 6 : 0;
    const a = (cam.az + drift) * Math.PI / 180, e = cam.el * Math.PI / 180;
    camera.position.set(cam.x + Math.sin(a) * Math.cos(e) * cam.dist, Math.sin(e) * cam.dist, cam.z - Math.cos(a) * Math.cos(e) * cam.dist);
    camera.lookAt(cam.x, 0, cam.z);
    // inset: shift the projection so the target sits in the centre of the locator circle
    if (mode !== 'full') { const r = Math.min(W, H) * 0.09 + 18, ccx = W - r - 28, ccy = H - r - 28; camera.setViewOffset(W, H, W / 2 - ccx, H / 2 - ccy, W, H);
      renderer.setScissorTest(true); renderer.setScissor(ccx - r - 4, H - ccy - r - 4, 2 * r + 8, 2 * r + 8); } else { camera.clearViewOffset(); renderer.setScissorTest(false); }
    camera.updateProjectionMatrix();
    const pulse = 1 + 0.15 * Math.sin(t * 3); ring.scale.setScalar(pulse * (mode === 'full' ? 1 : 0.6));
    renderer.render(scene, camera); if (mode === 'full') labels.render(scene, camera);
  }
  let last = 0;
  function loop(t) { requestAnimationFrame(loop); const vis = mode === 'full' || !mobile; if (!vis) return; if (mode !== 'full' && t - last < 66 && !dirty) return; last = t; dirty = false; renderNow(t / 1000); }
  if (!still) requestAnimationFrame(loop);
  return { show, renderNow };
}
