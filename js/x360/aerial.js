import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeTier, IMAGERY_GLSL, toX, toZ } from '../w3d/imagery.js';
import { loadCity, buildCity, roadGlow, buildWater, rng } from '../w3d/city.js';
import { buildTrees } from '../w3d/trees.js';
import { makeTemple, makeHanuman, makeChowk } from '../w3d/landmarks.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot');
const MOBILE = Math.min(innerWidth, innerHeight) < 600 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = s => document.querySelector(s);

// ───────── renderer / scene
const canvas = $('#gl');
export const AERIAL = { ready: false };
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let PR = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 1.75); renderer.setPixelRatio(PR);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(MOBILE ? 55 : 42, innerWidth / innerHeight, 2, 45000);
const U = {
  uTime: { value: 0 }, uNight: { value: 0 },
  tFar: { value: null }, tMid: { value: null }, tNear: { value: null },
  bFar: { value: new THREE.Vector4() }, bMid: { value: new THREE.Vector4() }, bNear: { value: new THREE.Vector4() },
  uFieldCol: { value: new THREE.Color(0.18, 0.2, 0.12) },
  tGlow: { value: null }, bGlow: { value: new THREE.Vector4() },
  tFocus: { value: null }, bFocus: { value: new THREE.Vector4() }, uFocusOK: { value: 0 }, tDetail: { value: null },
};

// ───────── textures
const TL = new THREE.TextureLoader();
const loadT = (url, srgb, rep = 1) => new Promise(res => TL.load(url, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
let progress = { a: 0, b: 0 };
const bar = $('#loader .bar i');
const setBar = () => bar.style.width = (100 * clamp(progress.a / Math.max(1, progress.b), 0, 1)).toFixed(0) + '%';

// ───────── sky, sun, fog, lights
const sky = new Sky(); sky.scale.setScalar(40000); scene.add(sky);
const SU = sky.material.uniforms;
SU.turbidity.value = 7.5; SU.rayleigh.value = 1.6; SU.mieCoefficient.value = 0.006; SU.mieDirectionalG.value = 0.86;
const envScene = new THREE.Scene(); const envSky = new Sky(); envSky.scale.setScalar(900); envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer);
const envCache = new Map();
// horizon probe: render the sky toward the view azimuth into a tiny float target and read it back -> fog colour
const probeRT = new THREE.WebGLRenderTarget(16, 4, { type: THREE.FloatType });
const probeCam = new THREE.PerspectiveCamera(30, 4, 1, 2000);
const probeBuf = new Float32Array(16 * 4 * 4);
let probeAz = 999, probeEl = 999, probeT = 0;
const fogTarget = new THREE.Color();
function probeHorizon(force) {
  const now = performance.now();
  const d = camera.getWorldDirection(_dir); const az = Math.atan2(d.x, -d.z);
  if (!force && (now - probeT < 250 || (Math.abs(az - probeAz) < 0.08 && Math.abs(curEl - probeEl) < 0.3))) return;
  probeT = now; probeAz = az; probeEl = curEl;
  envSky.material.uniforms.sunPosition.value.copy(sunDir);
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = SU[k].value;
  probeCam.position.set(0, 0, 0); probeCam.lookAt(Math.sin(az), 0.035, -Math.cos(az));
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(probeRT); renderer.render(envScene, probeCam); renderer.setRenderTarget(prev);
  renderer.readRenderTargetPixels(probeRT, 0, 0, 16, 4, probeBuf);
  let r = 0, g = 0, b = 0; for (let i = 0; i < 64; i++) { r += probeBuf[i * 4]; g += probeBuf[i * 4 + 1]; b += probeBuf[i * 4 + 2]; }
  const f = ramp(FOG, curEl);
  fogTarget.setRGB(Math.max(r / 64, f[0] * 0.3), Math.max(g / 64, f[1] * 0.3), Math.max(b / 64, f[2] * 0.3));
  const L = 0.2126 * fogTarget.r + 0.7152 * fogTarget.g + 0.0722 * fogTarget.b; const cap = 0.62;
  if (L > cap) fogTarget.multiplyScalar(cap / L);
  if (force) fogNow.copy(fogTarget);
}
const _dir = new THREE.Vector3(); const _cityGlow = new THREE.Color(0.025, 0.018, 0.016); const _hillBase = new THREE.Color(0.04, 0.06, 0.07); const fogNow = new THREE.Color();
const sunDir = new THREE.Vector3();
const sunL = new THREE.DirectionalLight(0xffffff, 3); sunL.castShadow = true;
sunL.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.6; sunL.shadow.radius = 3;
scene.add(sunL, sunL.target);
const hemi = new THREE.HemisphereLight(0xbcd2ff, 0x5a4a35, 0.4); scene.add(hemi);
scene.fog = new THREE.FogExp2(0xc8c4bc, 0.00026);
// stars
{
  const n = 2500, p = new Float32Array(n * 3), R = rng(5);
  for (let i = 0; i < n; i++) { const a = R() * 6.283, y = R() * 0.95 + 0.05, r = Math.sqrt(1 - y * y); p.set([Math.cos(a) * r * 30000, y * 30000, Math.sin(a) * r * 30000], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  var stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
}

// ramps keyed by sun elevation (deg)
const ramp = (stops, e) => { if (e <= stops[0][0]) return stops[0].slice(1); for (let i = 1; i < stops.length; i++) if (e <= stops[i][0]) { const a = stops[i - 1], b = stops[i], t = (e - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => lerp(v, b[k + 1], t)); } return stops[stops.length - 1].slice(1); };
//            el     r     g     b
const FOG = [[-14, 0.012, 0.016, 0.03], [-6, 0.06, 0.06, 0.09], [-1, 0.42, 0.3, 0.3], [4, 0.85, 0.58, 0.4], [12, 0.82, 0.72, 0.62], [30, 0.72, 0.74, 0.76], [60, 0.68, 0.75, 0.84]];
const SUNC = [[-4, 1, 0.4, 0.2, 0], [1, 1, 0.42, 0.18, 0.6], [6, 1, 0.62, 0.36, 2.0], [15, 1, 0.84, 0.66, 3.0], [40, 1, 0.96, 0.9, 3.6]];
const HEMI = [[-14, 0.08, 0.1, 0.18, 0.5], [-4, 0.2, 0.2, 0.3, 0.4], [2, 0.6, 0.55, 0.6, 0.25], [15, 0.75, 0.82, 1.0, 0.25], [50, 0.75, 0.84, 1.0, 0.3]];
let curEl = 99, curAz = 0;
function sunAt(hour) {
  const rise = 6.3, set = 17.6;
  let el; if (hour < rise) el = -(rise - hour) * 13; else if (hour > set) el = -(hour - set) * 13; else el = 48 * Math.sin(Math.PI * (hour - rise) / (set - rise));
  el = Math.max(el, -32);
  const az = lerp(108, 252, clamp((hour - rise) / (set - rise), -0.15, 1.15));
  return { el, az };
}
function applyTime(hour) {
  const { el, az } = sunAt(hour);
  if (Math.abs(el - curEl) < 0.05 && Math.abs(az - curAz) < 0.05) return;
  curEl = el; curAz = az;
  const e = el * DEG, a = az * DEG;
  sunDir.set(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a));
  SU.sunPosition.value.copy(sunDir);
  const night = smooth(-1, -9, el); U.uNight.value = night;
  scene.fog.density = lerp(0.00015, 0.00024, smooth(10, 0, Math.abs(el)));
  const s = ramp(SUNC, el);
  if (el > -4) { sunL.color.setRGB(s[0], s[1], s[2]); sunL.intensity = s[3] * 1.25; }
  else { // moonlight
    sunL.color.setRGB(0.55, 0.65, 1.0); sunL.intensity = 0.16;
  }
  const h = ramp(HEMI, el); hemi.color.setRGB(h[0], h[1], h[2]); hemi.groundColor.setRGB(h[0] * 0.45, h[1] * 0.38, h[2] * 0.3); hemi.intensity = h[3];
  stars.material.opacity = smooth(-6, -14, el) * 0.9;
  renderer.toneMappingExposure = lerp(0.82, 1.25, night) * (el > 0 && el < 8 ? 0.95 : 1);
  SU.rayleigh.value = lerp(1.6, 0.6, smooth(10, -4, el));
  // env map (cached per 3°)
  const key = Math.round(el / 3);
  let env = envCache.get(key);
  if (!env) {
    envSky.material.uniforms.sunPosition.value.copy(sunDir);
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = SU[k].value;
    env = pmrem.fromScene(envScene, 0.04).texture; envCache.set(key, env);
  }
  scene.environment = env;
  scene.environmentIntensity = lerp(0.55, 0.3, night);
  bloom && (bloom.strength = lerp(0.15, 0.45, night), bloom.threshold = lerp(1.6, 1.1, night), bloom.radius = 0.35);
}

// ───────── ground (aerial imagery draped)
const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
groundMat.onBeforeCompile = s => {
  Object.assign(s.uniforms, U);
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix*vec4(transformed,1.0)).xyz;');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uNight; uniform sampler2D tGlow; uniform vec4 bGlow; uniform sampler2D tDetail;\n' + IMAGERY_GLSL)
    .replace('#include <map_fragment>', `{ vec3 im = imagery(vWP.xz);
      float dd = distance(cameraPosition, vWP); float fade = 1.0 - smoothstep(60.0, 420.0, dd);
      float d1 = texture2D(tDetail, vWP.xz/5.0).g, d2 = texture2D(tDetail, vWP.xz/23.0).g;
      im *= mix(1.0, (d1*0.6+d2*0.4)/0.477, 0.5*fade);
      diffuseColor.rgb *= im; }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec2 gu = (vWP.xz - bGlow.xy)/(bGlow.zw-bGlow.xy); float gin = step(0.0,gu.x)*step(gu.x,1.0)*step(0.0,gu.y)*step(gu.y,1.0);
  totalEmissiveRadiance += texture2D(tGlow, vec2(gu.x,1.0-gu.y)).rgb * gin * uNight * 0.3; }`);
};
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI / 2), groundMat);
ground.receiveShadow = true; scene.add(ground);
// distant Siwalik (Chure) hills to the north, softened by haze
{
  const g = new THREE.PlaneGeometry(140000, 2000, 400, 8); const p = g.attributes.position; const R = rng(3);
  const ph = [R() * 10, R() * 10, R() * 10];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + 1000; const t = y / 2000;
    const n = 0.55 + 0.25 * Math.sin(x / 2300 + ph[0]) + 0.15 * Math.sin(x / 830 + ph[1]) + 0.06 * Math.sin(x / 260 + ph[2]);
    p.setY(i, t * n * 950);
  }
  g.computeVertexNormals();
  var hills = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8a8f96, fog: false }));
  hills.position.set(0, -10, -21000); scene.add(hills);
}

// ───────── post
let composer, bloom;
function setupPost() {
  const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 4 });
  composer = new EffectComposer(renderer, rt); composer.setPixelRatio(PR); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  if (!MOBILE && !Q.has('noao')) {
    const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
    ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 0.85;
    ao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.4, thickness: 4, scale: 1, samples: 12 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(ao); window.__ao = ao;
  }
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.3, 0.55, 1.4);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
setupPost();
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 60 : 45; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize); resize();

// ───────── dynamic lights: streetlights, vehicles, diyas
let vehicles = null, streetPts = null, diyas = null;
function pointsMat(color, size, add = true) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uOp: { value: 0 }, uScale: { value: innerHeight * PR / 2 }, uTime: U.uTime },
    vertexShader: `attribute float aSeed; uniform float uSize; uniform float uScale; uniform float uTime; varying float vF;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv;
        vF = 0.75 + 0.25*sin(uTime*(3.0+aSeed*5.0) + aSeed*40.0);
        gl_PointSize = clamp(uSize * uScale / -mv.z, 1.5, 14.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOp; varying float vF;
      void main(){ vec2 c = gl_PointCoord-0.5; float d = length(c); float a = smoothstep(0.5,0.0,d); a = a*a;
        gl_FragColor = vec4(uColor * (0.6 + 1.6*smoothstep(0.18,0.0,d)) * vF, a*uOp); }`,
    transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}
function buildStreetLights(roads) {
  const P = [], S = []; const R = rng(11);
  for (const r of roads) {
    if (r.rank > 2) continue; const sp = r.rank <= 1 ? 26 : 34; let acc = R() * sp;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i]; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (!L) continue;
      const nx = dz / L, nz = -dx / L;
      for (; acc < L; acc += sp) { const t = acc / L, side = (Math.floor(acc / sp) % 2 ? 1 : -1) * (r.rank <= 1 ? 7 : 4.5); P.push(a[0] + dx * t + nx * side, 7.5, a[1] + dz * t + nz * side); S.push(R()); }
      acc -= L;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S.map(s => s * 0.02), 1));
  const m = new THREE.Points(g, pointsMat(new THREE.Color(1.0, 0.62, 0.28), 2.2)); m.frustumCulled = false; scene.add(m); return m;
}
function buildVehicles(roads, n) {
  const paths = roads.filter(r => r.rank <= 2).map(r => { const cum = [0]; for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1])); return { pts: r.pts, cum, L: cum[cum.length - 1], rank: r.rank }; }).filter(p => p.L > 120);
  const R = rng(21); const V = [];
  const types = [[4.3, 1.5, 1.8, 0.5], [9.5, 3.0, 2.5, 0.08], [2.9, 1.7, 1.4, 0.22], [1.9, 1.25, 0.7, 0.2]]; // car bus tempo bike
  const cols = [[0.85, 0.85, 0.85], [0.08, 0.08, 0.09], [0.6, 0.62, 0.65], [0.55, 0.08, 0.07], [0.12, 0.2, 0.4], [0.9, 0.75, 0.2], [0.15, 0.4, 0.25]];
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 }), n);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const p = paths[Math.floor(R() * paths.length)]; const rr = R(); let ti = rr < 0.45 ? 0 : rr < 0.52 ? 1 : rr < 0.75 ? 2 : 3;
    const dir = R() < 0.5 ? 1 : -1; const t = types[ti];
    V.push({ p, s: R() * p.L, v: (ti === 1 ? 7 : 9) + R() * 5, dir, t });
    const k = ti === 1 ? (R() < 0.5 ? [0.85, 0.55, 0.12] : [0.2, 0.35, 0.6]) : ti === 2 ? [0.15, 0.35, 0.2] : cols[Math.floor(R() * cols.length)];
    mesh.setColorAt(i, c.setRGB(k[0], k[1], k[2], THREE.SRGBColorSpace));
  }
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  const lg = new THREE.BufferGeometry(); const lp = new Float32Array(n * 3 * 2); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n * 2), 1));
  const head = new THREE.Points(lg, pointsMat(new THREE.Color(1, 0.95, 0.85), 2.4)); head.frustumCulled = false; scene.add(head);
  const tg = new THREE.BufferGeometry(); const tp = new Float32Array(n * 3); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n), 1));
  const tail = new THREE.Points(tg, pointsMat(new THREE.Color(1, 0.08, 0.04), 1.6)); tail.frustumCulled = false; scene.add(tail);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function update(dt) {
    for (let i = 0; i < V.length; i++) {
      const o = V[i]; o.s += o.v * dt * o.dir; if (o.s > o.p.L) o.s -= o.p.L; if (o.s < 0) o.s += o.p.L;
      const cum = o.p.cum; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= o.s) lo = m; else hi = m; }
      const a = o.p.pts[lo], b = o.p.pts[hi], L = cum[hi] - cum[lo] || 1, t = (o.s - cum[lo]) / L;
      let dx = (b[0] - a[0]) / L * o.dir, dz = (b[1] - a[1]) / L * o.dir;
      const off = o.p.rank <= 1 ? 2.8 : 1.6; // keep left (Nepal)
      const x = a[0] + (b[0] - a[0]) * t - dz * off, z = a[1] + (b[1] - a[1]) * t + dx * off;
      q.setFromAxisAngle(up, Math.atan2(dx, dz) + Math.PI / 2);
      ps.set(x, 0.15, z); sc.set(o.t[0], o.t[1], o.t[2]); m4.compose(ps, q, sc); mesh.setMatrixAt(i, m4);
      const hl = o.t[0] / 2;
      lp[i * 6] = x + dx * hl - dz * 0.5; lp[i * 6 + 1] = 0.9; lp[i * 6 + 2] = z + dz * hl + dx * 0.5;
      lp[i * 6 + 3] = x + dx * hl + dz * 0.5; lp[i * 6 + 4] = 0.9; lp[i * 6 + 5] = z + dz * hl - dx * 0.5;
      tp[i * 3] = x - dx * hl; tp[i * 3 + 1] = 0.9; tp[i * 3 + 2] = z - dz * hl;
    }
    mesh.instanceMatrix.needsUpdate = true; lg.attributes.position.needsUpdate = true; tg.attributes.position.needsUpdate = true;
  }
  return { update, mesh, head, tail };
}


// ───────── orbit controls (aerial only: never close enough to look fake)
const MIN_D = MOBILE ? 950 : 850, MAX_D = 5200;
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minDistance = MIN_D; controls.maxDistance = MAX_D;
controls.minPolarAngle = 0.12; controls.maxPolarAngle = MOBILE ? 0.98 : 1.08; // keep ≥ ~28° above the horizon
controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.9; controls.panSpeed = 0.9;
controls.screenSpacePanning = false; controls.zoomToCursor = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.autoRotate = !SHOT; controls.autoRotateSpeed = 0.25;
controls.target.set(60, 0, 80);
camera.position.set(60 - 1150, 1500, 80 + 1300);
let idleT = 0; let flying = null;
controls.addEventListener('start', () => { controls.autoRotate = false; idleT = 0; if (flying && !flying.lock) flying = null; AERIAL.onInteract && AERIAL.onInteract(); });
controls.addEventListener('end', () => { idleT = 0; });
const BOUND = 1900;
function clampTarget() {
  const t = controls.target; t.x = clamp(t.x, -BOUND, BOUND); t.z = clamp(t.z, -BOUND, BOUND); t.y = 0;
  if (camera.position.y < 60) camera.position.y = 60;
}

// ───────── time of day (dawn / day / dusk / night)
let hour = 7.2, hourTarget = 7.2;
export function setHour(h, instant) { hourTarget = h; if (instant) hour = h; }

// ───────── fly-to
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const _sph = new THREE.Spherical(), _o = new THREE.Vector3();
export function flyTo(x, z, opts = {}) {
  const dist = opts.dist ?? 900, polar = opts.polar ?? 0.9, dur = opts.dur ?? 2.2;
  const fromT = controls.target.clone(); const fromP = camera.position.clone();
  _o.subVectors(fromP, fromT); _sph.setFromVector3(_o);
  const theta0 = _sph.theta, phi0 = _sph.phi, r0 = _sph.radius;
  let theta1 = opts.theta ?? theta0; while (theta1 - theta0 > Math.PI) theta1 -= 2 * Math.PI; while (theta1 - theta0 < -Math.PI) theta1 += 2 * Math.PI;
  controls.autoRotate = false;
  if (SHOT) { flying = { t: 1, dur: 1, fromT, toT: new THREE.Vector3(x, 0, z), theta0, theta1, phi0, phi1: polar, r0, r1: dist, res: () => { } }; stepFly(0); return Promise.resolve(); }
  return new Promise(res => { flying = { t: 0, dur, fromT, toT: new THREE.Vector3(x, 0, z), theta0, theta1, phi0, phi1: polar, r0, r1: dist, res, lock: !!opts.lock, below: opts.below }; });
}
function stepFly(dt) {
  if (!flying) return;
  const f = flying; f.t = Math.min(1, f.t + dt / f.dur); const k = ease(f.t);
  controls.target.lerpVectors(f.fromT, f.toT, k);
  // arc: rise slightly mid-flight for a cinematic swoop
  const r = lerp(f.r0, f.r1, k) * (1 + 0.25 * Math.sin(Math.PI * k) * (f.r1 < f.r0 ? 0.3 : 1));
  _sph.set(r, lerp(f.phi0, f.phi1, k), lerp(f.theta0, f.theta1, k));
  camera.position.copy(controls.target).add(_o.setFromSpherical(_sph));
  camera.lookAt(controls.target);
  if (f.t >= 1) { flying = null; f.res(); }
}
export function setMinDistance(d) { controls.minDistance = d ?? MIN_D; }
export function setEnabled(on) { controls.enabled = on; AERIAL.paused = !on; if (on) { lastFrame = performance.now(); } }

// ───────── pins (HTML, projected)
const pinsEl = $('#pins'); const PINS = [];
export function addPins(places, onPick) {
  for (const p of places) {
    if (p.lat == null) continue;
    const x = toX(p.lon), z = toZ(p.lat);
    const el = document.createElement('button'); el.className = 'pin k-' + p.kind; el.setAttribute('aria-label', p.name);
    el.innerHTML = `<i></i><span><b>${p.name}</b>${p.kind === 'pano' ? '<em>360°</em>' : ''}</span>`;
    el.onclick = e => { e.stopPropagation(); onPick(p); };
    pinsEl.appendChild(el); PINS.push({ p, el, v: new THREE.Vector3(x, p.h || 12, z) });
  }
}
const _pp = new THREE.Vector3();
function updatePins() {
  const W = innerWidth, H = innerHeight; const d = camera.position.distanceTo(controls.target);
  for (const o of PINS) {
    _pp.copy(o.v).project(camera);
    const vis = _pp.z < 1 && Math.abs(_pp.x) < 1.1 && Math.abs(_pp.y) < 1.1 && !AERIAL.hidePins;
    o.el.classList.toggle('on', vis);
    if (vis) { o.el.style.transform = `translate3d(${((_pp.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-_pp.y * 0.5 + 0.5) * H).toFixed(1)}px, 0)`; o.el.style.zIndex = String(1000 - Math.round(_pp.z * 900)); }
    o.el.classList.toggle('far', d > 3000);
  }
}
export function pinScreen(p) { const o = PINS.find(o => o.p === p); if (!o) return null; _pp.copy(o.v).project(camera); return [(_pp.x * 0.5 + 0.5) * innerWidth, (-_pp.y * 0.5 + 0.5) * innerHeight]; }

// ───────── focus tier: sharp z18 imagery around wherever the camera looks (when low)
const focusCache = new Map(); let focusKey = '';
function requestFocusAt(x, z) {
  const g = 500; const kx = Math.round(x / g), kz = Math.round(z / g); const key = kx + ',' + kz;
  if (key === focusKey) return; focusKey = key;
  let entry = focusCache.get(key);
  if (!entry) {
    const t = makeTier(18, kx * g, kz * g, MOBILE ? 4 : 6, MOBILE ? 4 : 6, '#555a45');
    entry = { t, p: t.load(null, 8) }; focusCache.set(key, entry);
    if (focusCache.size > 4) { const [k0, e0] = focusCache.entries().next().value; if (k0 !== key) { e0.t.tex.dispose(); focusCache.delete(k0); } }
  }
  entry.p.then(t => { if (focusKey !== key) return; U.tFocus.value = t.tex; U.bFocus.value.copy(t.bounds); U.uFocusOK.value = 1; });
}

// ───────── load everything
const clock = new THREE.Clock();
async function init() {
  const tierN = MOBILE ? [8, 9] : [9, 10];
  const far = makeTier(13, 0, 0, 8, 8, '#3f4a30'), mid = makeTier(15, 300, 0, MOBILE ? 6 : 8, MOBILE ? 6 : 8, '#4a5038'), nearT = makeTier(17, 313, -17, tierN[0], tierN[1], '#555a45');
  U.tFar.value = far.tex; U.bFar.value.copy(far.bounds); U.tMid.value = mid.tex; U.bMid.value.copy(mid.bounds); U.tNear.value = nearT.tex; U.bNear.value.copy(nearT.bounds);
  progress.b = far.total + mid.total + nearT.total + 12;
  const tick = () => { progress.a++; setBar(); };
  const texP = Promise.all([
    loadT('assets/tex2/dirty_concrete_diff.webp', true), loadT('assets/tex2/dirty_concrete_nor_gl.webp', false),
    loadT('assets/tex2/worn_plaster_wall_diff.webp', true, 0.25), loadT('assets/tex2/worn_plaster_wall_nor_gl.webp', false, 0.25),
    loadT('assets/tex2/marble_tiles_diff.webp', true, 3), loadT('assets/tex/waternormals.jpg', false),
    loadT('assets/w3d/hanuman.webp', true), loadT('assets/tex2/dry_ground_01_diff.webp', false), loadT('assets/tex2/red_plaster_weathered_nor_gl.webp', false, 2), loadT('assets/tex2/dirty_concrete_diff.webp', true, 2),
  ]).then(r => { r.forEach(tick); return r; });
  const cityP = loadCity('assets/w3d/city.bin').then(d => { tick(); return d; });
  const tilesP = Promise.all([far.load(tick, 8), mid.load(tick, 8), nearT.load(tick, 10)]);
  const [tx, city] = await Promise.all([texP, cityP]);
  const tex = { conc: tx[0], concN: tx[1], plaster: tx[2], plasterN: tx[3], marble: tx[4], waterN: tx[5], hanuman: tx[6], tileN: tx[8], conc2: tx[9] };
  U.tDetail.value = tx[7];
  tex.hanuman.wrapS = tex.hanuman.wrapT = THREE.ClampToEdgeWrapping; tex.hanuman.repeat.set(1, 1);
  tex.concNW = tex.concN.clone(); tex.concNW.repeat.set(1 / 3.5, 1 / 3.5); tex.concNW.needsUpdate = true;
  tex.waterN.repeat.set(1, 1);
  const LM = { temple: [-21.8, 4.8], hanuman: [-128.7, 66.3], tribhuvan: [-29.1, 429.8] };
  const excl = [[...LM.temple, 16], [...LM.hanuman, 11], [...LM.tribhuvan, 10]];
  scene.add(buildCity(city, U, tex, excl, MOBILE ? 0 : 1));
  scene.add(buildWater(city.water, U, tex));
  const glow = roadGlow(city.roads); U.tGlow.value = glow.tex; U.bGlow.value.copy(glow.bounds);
  streetPts = buildStreetLights(city.roads);
  vehicles = buildVehicles(city.roads, MOBILE ? 140 : 320);
  const temple = makeTemple(tex); temple.group.position.set(LM.temple[0], 0, LM.temple[1]); scene.add(temple.group);
  const han = makeHanuman(tex); han.group.position.set(LM.hanuman[0], 0, LM.hanuman[1]); scene.add(han.group); window.__han = han;
  const chowk = makeChowk(tex); chowk.position.set(LM.tribhuvan[0], 0, LM.tribhuvan[1]); scene.add(chowk);
  // diyas: around ponds near the temple + temple eave strings
  {
    const pts = [], seeds = []; const R = rng(77);
    for (const poly of city.water) {
      let cx = 0, cz = 0; poly.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= poly.length; cz /= poly.length;
      if (Math.hypot(cx - LM.temple[0], cz - LM.temple[1]) > 160 && Math.hypot(cx - 253, cz - 584) > 60) continue;
      for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < L; s += 1.1) { const t = s / L; pts.push(a[0] + (b[0] - a[0]) * t + (R() - .5) * .3, 0.55, a[1] + (b[1] - a[1]) * t + (R() - .5) * .3); seeds.push(R()); } }
    }
    for (let i = 0; i < temple.lights.length; i += 3) { pts.push(temple.lights[i] + LM.temple[0], temple.lights[i + 1], temple.lights[i + 2] + LM.temple[1]); seeds.push(R()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    diyas = new THREE.Points(g, pointsMat(new THREE.Color(1.0, 0.55, 0.18), 1.8)); diyas.frustumCulled = false; scene.add(diyas);
  }
  // first frame with low-detail tiers, then trees once the near tier has landed
  await Promise.race([Promise.all([far.load ? tilesP : null]), new Promise(r => setTimeout(r, SHOT ? 90000 : 6000))]);
  const doneTrees = () => {
    try { const t = buildTrees(nearT, city.buildings, excl, MOBILE ? 2500 : 7000, U, city.water); scene.add(t.group); window.__trees = t.count; } catch (e) { console.warn('trees', e); }
    progress.a = progress.b; setBar();
    document.body.dataset.ready = '1';
    AERIAL.ready = true; AERIAL.onReady && AERIAL.onReady();
  };
  tilesP.then(() => { if (!document.body.dataset.ready) doneTrees(); });
  if (!SHOT) setTimeout(() => { if (!document.body.dataset.ready) doneTrees(); }, 9000);
  AERIAL.tiles = () => [far.ok, mid.ok, nearT.ok, far.total + mid.total + nearT.total];
}


let fpsAcc = 0, fpsN = 0, adapt = 0, lastFrame = performance.now(), focusT = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); const time = clock.elapsedTime; U.uTime.value = time;
  if (AERIAL.paused && !SHOT) { requestAnimationFrame(frame); return; }
  hour += (hourTarget - hour) * (SHOT ? 1 : 1 - Math.pow(0.25, dt));
  if (Math.abs(hourTarget - hour) < 0.002) hour = hourTarget;
  applyTime(hour);
  if (flying) stepFly(dt); else { controls.update(dt); clampTarget(); }
  idleT += dt; if (!SHOT && !flying && idleT > 9 && controls.enabled) controls.autoRotate = true;
  // shadow camera follows the target, sized to the view
  const tg = controls.target, dist = camera.position.distanceTo(tg);
  const half = clamp(dist * 0.75, 220, 1400);
  const sc = sunL.shadow.camera; sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 10; sc.far = 4000; sc.updateProjectionMatrix();
  const sd = curEl > -4 ? sunDir : _v.set(-0.4, 0.6, -0.5).normalize();
  sunL.target.position.copy(tg); sunL.position.copy(tg).addScaledVector(sd, 1600);
  focusT += dt; if (!SHOT && dist < 1300 && focusT > 0.5 && U.tDetail.value) { focusT = 0; requestFocusAt(tg.x, tg.z); }
  const night = U.uNight.value, dusk = smooth(4, -2, curEl);
  if (vehicles) { vehicles.update(dt); vehicles.head.material.uniforms.uOp.value = dusk; vehicles.tail.material.uniforms.uOp.value = dusk; }
  if (streetPts) streetPts.material.uniforms.uOp.value = smooth(2, -4, curEl);
  if (diyas) diyas.material.uniforms.uOp.value = night;
  if (window.__han) { const s = window.__han.statue; const wp = window.__han.group.position; s.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z); window.__han.mat.emissiveIntensity = 0; }
  probeHorizon(SHOT);
  fogNow.lerp(fogTarget, SHOT ? 1 : 0.08);
  const nf = U.uNight.value; scene.fog.color.copy(fogNow).multiplyScalar(lerp(0.92, 1.0, nf));
  if (nf > 0.5) scene.fog.color.lerp(_cityGlow, (nf - 0.5) * 0.3);
  hills.material.color.copy(scene.fog.color).multiplyScalar(0.8).lerp(_hillBase, 0.12);
  updatePins();
  AERIAL.onFrame && AERIAL.onFrame(hour, dist);
  composer.render();
  if (!SHOT) { fpsAcc += dt; fpsN++; if (fpsAcc > 2) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; if (fps < 32 && PR > 0.8 && adapt < 4) { PR = Math.max(0.8, PR - 0.25); adapt++; renderer.setPixelRatio(PR); composer.setPixelRatio(PR); resize(); } } }
  if (!SHOT) requestAnimationFrame(frame);
}
const _v = new THREE.Vector3();
Object.assign(AERIAL, { scene, camera, controls, U, render: () => frame(), flyTo, setHour, toX, toZ,
  view: (tx, tz, dist, polar, theta) => { controls.target.set(tx, 0, tz); _sph.set(dist, polar, theta); camera.position.copy(controls.target).add(_o.setFromSpherical(_sph)); camera.lookAt(controls.target); controls.update(); } });
export function start() {
  init().catch(e => { console.error(e); AERIAL.ready = true; AERIAL.onReady && AERIAL.onReady(); });
  applyTime(hour);
  if (!SHOT) requestAnimationFrame(frame);
}
