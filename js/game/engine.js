/* Shared engine helpers: renderer, sky/day-night environment, materials, prefab helpers,
   colliders (OBB grid), video screens, particles. */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { THREE };

/* ---------- Quality tiers ---------- */
export function pickQuality(pref = 'auto') {
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const tier = pref === 'auto' ? (mobile ? 'low' : 'high') : pref;
  return tier === 'high'
    ? { tier, pixelRatio: Math.min(devicePixelRatio, 1.75), shadows: true, shadowMap: 2048, bloom: true, density: 1, antialias: true, drawDist: 600 }
    : { tier, pixelRatio: Math.min(devicePixelRatio, 1), shadows: false, shadowMap: 512, bloom: false, density: 0.45, antialias: false, drawDist: 320 };
}

/* ---------- Renderer + post ---------- */
export function makeRenderer(container, quality) {
  const r = new THREE.WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance' });
  r.setPixelRatio(quality.pixelRatio); r.setSize(container.clientWidth, container.clientHeight);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.6;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = quality.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(r.domElement);
  return r;
}
export function makeComposer(renderer, scene, camera, quality) {
  if (!quality.bloom) return null;
  const c = new EffectComposer(renderer);
  c.addPass(new RenderPass(scene, camera));
  const size = renderer.getSize(new THREE.Vector2());
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.35, 0.5, 0.92);
  c.addPass(bloom); c.addPass(new OutputPass());
  c.bloom = bloom;
  return c;
}

/* ---------- Textures (Poly Haven CC0) ---------- */
const texLoader = new THREE.TextureLoader();
const texCache = new Map();
export function tex(path, repeat = 1, srgb = true) {
  const k = path + '|' + repeat;
  if (texCache.has(k)) return texCache.get(k);
  const t = texLoader.load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(k, t); return t;
}
const pbrCache = new Map();
export function pbr(name, repeat = 1, o = {}) {
  const k = name + repeat + JSON.stringify(o);
  if (pbrCache.has(k)) return pbrCache.get(k);
  const m = new THREE.MeshStandardMaterial({
    map: tex(`assets/tex/${name}_diff.jpg`, repeat), normalMap: tex(`assets/tex/${name}_nor_gl.jpg`, repeat, false),
    roughness: 0.9, ...o
  });
  pbrCache.set(k, m); return m;
}
/* Photo material (licensed photos from assets/img) */
export function photoMat(path, o = {}) {
  const t = texLoader.load(path); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide, ...o });
}
/* HDRI environment lighting (Poly Haven CC0) */
let envTexPromise = null;
export function loadHDRI(renderer) {
  if (!envTexPromise) envTexPromise = new Promise(res => {
    new RGBELoader().load('assets/tex/sky_1k.hdr', hdr => {
      const pm = new THREE.PMREMGenerator(renderer);
      const env = pm.fromEquirectangular(hdr).texture; hdr.dispose(); pm.dispose(); res(env);
    }, undefined, () => res(null));
  });
  return envTexPromise;
}

const DEG = Math.PI / 180;
export const isMobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;

/* ---------- Sun for Nepalgunj (28.05N, 81.617E, UTC+5:45) ---------- */
export function sunPosition(hour, date = new Date()) {
  const N = Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5);
  const decl = 23.44 * Math.sin(2 * Math.PI * (284 + N) / 365) * DEG;
  const B = 2 * Math.PI * (N - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const lst = hour + (4 * (81.617 - 15 * 5.75) + eot) / 60;
  const H = 15 * (lst - 12) * DEG, phi = 28.05 * DEG;
  const el = Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) + Math.PI;
  return { el, az };
}

/* ---------- Materials ---------- */
const matCache = new Map();
export function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!o.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  delete m.unique;
  if (!o.unique) matCache.set(key, m);
  return m;
}
export const nightMats = new Set();   // emissive materials that glow at night: {mat, max}
export function glowMat(color, emissive, max = 2.5) {
  const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0 });
  nightMats.add({ mat: m, max }); return m;
}
export const PAL = {
  ground: 0x8a9a52, pave: 0xd9cdb8, plinth: 0xb8aa95, cream: 0xf1e6cf, red: 0xa8231d, roof: 0xe9e9ea,
  gold: 0xd9a935, yellow: 0xf2c230, orange: 0xe0702a, road: 0x3b3b40, mark: 0xf5f1e4, trunk: 0x6b4b2e,
  leaf: 0x4f7d32, palm: 0x3f7a3a, steel: 0x8c949c, concrete: 0xbdb6aa, sand: 0xd8c39a, saffron: 0xe8641c,
  water: 0x4f8f96, white: 0xf4f4f4, blue: 0x2a6dd2, green: 0x2fa36b, pink: 0xe58fa8
};

/* ---------- Geometry helpers ---------- */
export function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true;
  parent?.add(m); return m;
}
export function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true;
  parent?.add(m); return m;
}
export function frustum(top, bottom, h, mat, x = 0, y = 0, z = 0, parent) {
  const g = new THREE.CylinderGeometry(top, bottom, h, 4, 1); g.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true;
  parent?.add(m); return m;
}
export function ground(size, color, parent, y = 0) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M(color));
  g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = true; parent.add(g); return g;
}
export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* Text sign texture (canvas) */
export function textSign(text, { w = 512, h = 128, bg = '#a8231d', fg = '#fff8e8', font = 'bold 54px Inter, sans-serif', sub = '' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
  g.fillText(text, w / 2, sub ? h * 0.4 : h / 2, w - 30);
  if (sub) { g.font = `${Math.round(h * 0.22)}px Inter, sans-serif`; g.globalAlpha = .85; g.fillText(sub, w / 2, h * 0.75, w - 30); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function signMesh(text, width = 6, opts = {}) {
  const t = textSign(text, opts); const h = width * (opts.h || 128) / (opts.w || 512);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false }));
  return m;
}

/* ---------- Colliders: oriented boxes in a uniform grid ---------- */
export class Colliders {
  constructor(cell = 16) { this.cell = cell; this.grid = new Map(); this.list = []; }
  key(i, j) { return i * 73856093 ^ j * 19349663; }
  add(cx, cz, hx, hz, rot = 0, h = 99) {
    const c = { cx, cz, hx, hz, rot, cos: Math.cos(rot), sin: Math.sin(rot), h };
    this.list.push(c);
    const r = Math.hypot(hx, hz), s = this.cell;
    for (let i = Math.floor((cx - r) / s); i <= Math.floor((cx + r) / s); i++)
      for (let j = Math.floor((cz - r) / s); j <= Math.floor((cz + r) / s); j++) {
        const k = this.key(i, j); if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(c);
      }
    return c;
  }
  addCircle(cx, cz, r, h = 99) { return this.add(cx, cz, r * 0.8, r * 0.8, Math.PI / 4, h); }
  // push a circle (x,z,radius) out of all boxes; returns corrected {x,z}
  resolve(x, z, rad, y = 0) {
    const s = this.cell, cand = this.grid.get(this.key(Math.floor(x / s), Math.floor(z / s)));
    if (!cand) return { x, z };
    for (let iter = 0; iter < 2; iter++) for (const c of cand) {
      if (y > c.h) continue;
      const dx = x - c.cx, dz = z - c.cz;
      const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;   // to local
      const px = Math.max(-c.hx, Math.min(c.hx, lx)), pz = Math.max(-c.hz, Math.min(c.hz, lz));
      let ox = lx - px, oz = lz - pz, d = Math.hypot(ox, oz);
      if (d >= rad) continue;
      let nx, nz, push;
      if (d > 1e-4) { nx = ox / d; nz = oz / d; push = rad - d; }
      else { // centre inside box: push along smallest penetration axis
        const ax = c.hx - Math.abs(lx), az = c.hz - Math.abs(lz);
        if (ax < az) { nx = Math.sign(lx) || 1; nz = 0; push = ax + rad; } else { nx = 0; nz = Math.sign(lz) || 1; push = az + rad; }
      }
      const wx = nx * c.cos - nz * c.sin, wz = nx * c.sin + nz * c.cos;      // back to world
      x += wx * push; z += wz * push;
    }
    return { x, z };
  }
}

/* ---------- Environment: sky, sun, hemi, fog, stars; day/night ---------- */
export function makeEnv(scene, { quality, renderer, fogNear = 90, fogFar = 520 } = {}) {
  if (renderer) loadHDRI(renderer).then(e => { if (e) scene.environment = e; });
  const sky = new Sky(); sky.scale.setScalar(3000);
  const su = sky.material.uniforms; su.turbidity.value = 9; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.82;
  scene.add(sky);
  scene.fog = new THREE.Fog(0xd8c7a8, fogNear, fogFar);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5d4a2e, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  const shadows = quality.shadows;
  sun.castShadow = shadows;
  if (shadows) {
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  }
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0); moon.position.set(-120, 160, 80); scene.add(moon);
  const sp = [];
  for (let i = 0; i < 900; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(1 - (Math.random() * 0.5 + 0.02)); sp.push(1500 * Math.sin(ph) * Math.cos(th), 1500 * Math.cos(ph), 1500 * Math.sin(ph) * Math.sin(th)); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(sg, starMat));
  const dir = new THREE.Vector3(), warm = new THREE.Color(0xffa25a), white = new THREE.Color(0xfff4e2);
  const dayFog = new THREE.Color(0xd8c7a8), duskFog = new THREE.Color(0xe39a6a), nightFog = new THREE.Color(0x10172a);
  const env = {
    night: 0, sun,
    setHour(hour, renderer) {
      const { el, az } = sunPosition(hour);
      dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      su.sunPosition.value.copy(dir);
      const e = Math.sin(el);
      const dayK = THREE.MathUtils.smoothstep(e, -0.05, 0.25);
      const night = 1 - THREE.MathUtils.smoothstep(e, -0.18, 0.02);
      env.night = night; env.dir = dir;
      sun.intensity = THREE.MathUtils.smoothstep(e, -0.02, 0.15) * 3.0;
      sun.color.copy(warm).lerp(white, THREE.MathUtils.smoothstep(e, 0.02, 0.45));
      hemi.intensity = 0.4 + dayK * 0.4; hemi.color.setHex(night > 0.5 ? 0x7083c0 : 0xcfe3ff);
      moon.intensity = night * 0.9;
      if (renderer) renderer.toneMappingExposure = 0.5 + dayK * 0.08;
      scene.fog.color.copy(night > 0.01 ? duskFog.clone().lerp(nightFog, night) : duskFog.clone().lerp(dayFog, THREE.MathUtils.smoothstep(e, 0.05, 0.4)));
      starMat.opacity = night * 0.95;
      sky.visible = night < 0.98;
      scene.background = night > 0.6 ? nightFog : null;
      nightMats.forEach(n => n.mat.emissiveIntensity = night * n.max);
      scene.environmentIntensity = 0.15 + dayK * 0.65;
    },
    follow(target) { // keep shadow camera around the player
      sun.target.position.copy(target);
      sun.position.copy(dir).multiplyScalar(150).add(target);
    }
  };
  return env;
}

/* ---------- Video screen (billboard) ---------- */
export function videoScreen(src, poster, w = 8, aspect = 16 / 9, { frame = true } = {}) {
  const g = new THREE.Group();
  const h = w / aspect;
  const video = document.createElement('video');
  Object.assign(video, { src, muted: true, loop: true, playsInline: true, preload: 'none', crossOrigin: 'anonymous' });
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  const posterTex = poster ? new THREE.TextureLoader().load(poster, t => { t.colorSpace = THREE.SRGBColorSpace; }) : null;
  const mat = new THREE.MeshBasicMaterial({ map: posterTex, color: posterTex ? 0xffffff : 0x111111, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  screen.position.y = h / 2;
  g.add(screen);
  if (frame) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, h + 0.4, 0.3), M(0x1b1410)); f.position.set(0, h / 2, -0.2); g.add(f);
  }
  let vt = null, playing = false;
  g.userData = {
    video,
    play() {
      if (playing) return; playing = true;
      if (!vt) { vt = new THREE.VideoTexture(video); vt.colorSpace = THREE.SRGBColorSpace; }
      video.play().then(() => { mat.map = vt; mat.color.set(0xffffff); mat.needsUpdate = true; }).catch(() => { playing = false; });
    },
    pause() { if (!playing) return; playing = false; video.pause(); },
    dispose() { video.pause(); video.removeAttribute('src'); video.load(); vt?.dispose(); posterTex?.dispose(); }
  };
  return g;
}

/* ---------- Particles (sparkles / fireworks / smoke) ---------- */
export class Particles {
  constructor(scene, max = 600, size = 0.5) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.col = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; scene.add(this.points);
    this.gravity = -6;
  }
  burst(x, y, z, count, color, speed = 6, life = 1.4, up = 0) {
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k++) {
      const i = this.n++ % this.max;
      this.pos.set([x, y, z], i * 3);
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), s = speed * (0.5 + Math.random() * 0.5);
      this.vel.set([Math.sin(ph) * Math.cos(th) * s, Math.abs(Math.cos(ph)) * s * 0.6 + up, Math.sin(ph) * Math.sin(th) * s], i * 3);
      this.life[i] = life * (0.6 + Math.random() * 0.4);
      this.col.set([c.r, c.g, c.b], i * 3);
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] += this.gravity * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = Math.min(1, this.life[i]); this.col[i * 3] *= 0.995 + 0.005 * f;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}

/* Low-poly tree helpers */
export function tree(parent, x, z, s = 1, rand = Math.random) {
  cyl(0.3 * s, 0.45 * s, 3.5 * s, 5, M(PAL.trunk), x, 0, z, parent);
  const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 * s, 0), M(PAL.leaf));
  c.position.set(x, 4.6 * s, z); c.rotation.set(rand(), rand(), rand()); c.castShadow = true; parent.add(c);
}
export function palm(parent, x, z, h = 8, rand = Math.random) {
  cyl(0.22, 0.35, h, 6, M(PAL.trunk), x, 0, z, parent);
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4, 4), M(PAL.palm));
    f.position.set(x, h, z); f.rotation.set(Math.PI / 2.6, i / 7 * Math.PI * 2 + rand(), 0, 'YXZ'); f.translateY(1.8); f.castShadow = true; parent.add(f);
  }
}
