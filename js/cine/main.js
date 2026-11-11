/* Nepalgunj — scroll-driven cinematic WebGL film over the real OSM city. */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { makeAtmosphere, U } from './atmos.js';
import { buildCity, pip } from './city.js';
import { bakeHuman, makePeople, loadVehicles, makeTraffic } from './actors.js';
import * as LM from './landmarks.js';
import { CHAPTERS, PLACE_FACTS } from './chapters.js';
gsap.registerPlugin(ScrollTrigger);

const qs = new URLSearchParams(location.search);
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
const tier = qs.get('q') || (mobile ? 'low' : 'high');
const Q = tier === 'high' ? { tier, pr: Math.min(devicePixelRatio, 1.6), shadows: true, shadowMap: 4096, post: true, people: 1 }
  : { tier, pr: Math.min(devicePixelRatio, 1.25), shadows: false, shadowMap: 1024, post: false, people: 0.4 };
document.documentElement.dataset.tier = tier;
const $ = s => document.querySelector(s);
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const progress = v => { const b = $('#loader .bar i'); if (b) b.style.width = Math.round(v * 100) + '%'; };

/* ---------- build the DOM story from chapters ---------- */
function buildStory() {
  const main = $('#story'), nav = $('#dots');
  CHAPTERS.forEach((c, i) => {
    const sec = document.createElement('section'); sec.className = 'chapter ch-' + c.id; sec.id = c.id; sec.dataset.i = i;
    const media = (c.media || []).map(m => m.video
      ? `<figure class="media${m.vertical ? ' vertical' : ''}"><video muted loop playsinline preload="none" poster="${m.poster}" data-src="${mobile && m.mobile ? m.mobile : m.video}"></video></figure>`
      : `<figure class="media"><img loading="lazy" src="${m.img}" alt=""></figure>`).join('');
    const gallery = c.gallery ? `<div class="gallery">${c.gallery.map(([src, cap]) => `<figure><img loading="lazy" src="${src}" alt="${cap}"><figcaption>${cap}<span>representative photo</span></figcaption></figure>`).join('')}</div>` : '';
    sec.innerHTML = `<div class="panel${i === 0 ? ' hero' : ''}">
      <p class="kicker">${c.kicker}</p><h2>${c.title}</h2><p class="dev">${c.dev}</p>
      <p class="lede">${c.lede}</p>${c.body.map(b => `<p>${b}</p>`).join('')}
      ${i === 0 ? '<p class="scroll-cue"><span></span>Scroll</p>' : ''}
      </div>${media ? `<div class="medias">${media}</div>` : ''}${gallery}`;
    main.appendChild(sec);
    const d = document.createElement('button'); d.title = c.title; d.setAttribute('aria-label', c.title); d.onclick = () => lenis.scrollTo(sec, { duration: 2.2 }); nav.appendChild(d);
  });
}
buildStory();

/* ---------- smooth scroll + reveals ---------- */
const lenis = new Lenis({ duration: 1.25, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
document.querySelectorAll('.chapter').forEach(sec => {
  const els = sec.querySelectorAll('.panel > *, .medias figure, .gallery figure');
  gsap.fromTo(els, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.06,
    scrollTrigger: { trigger: sec, start: 'top 72%', end: 'bottom 20%', toggleActions: 'play none none reverse' } });
});
// videos play only while visible
const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: 0.25 });
document.querySelectorAll('video[data-src]').forEach(v => io.observe(v));

/* ---------- renderer / scene ---------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q.post, powerPreference: 'high-performance' });
renderer.setPixelRatio(Q.pr); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.5, 14000);
const atm = makeAtmosphere(scene, renderer, { shadows: Q.shadows, shadowMap: Q.shadowMap });
const labelR = new CSS2DRenderer({ element: $('#labels') }); labelR.setSize(innerWidth, innerHeight);

let composer = null, grade = null;
if (Q.post) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  try { const ao = new GTAOPass(scene, camera, innerWidth, innerHeight); ao.updateGtaoMaterial({ radius: 2.5, distanceExponent: 1.4, thickness: 1.5, scale: 1.0, samples: 12 }); ao.blendIntensity = 0.85; composer.addPass(ao); } catch (e) { console.warn('GTAO off', e); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.32, 0.55, 0.92); composer.addPass(bloom); composer.bloom = bloom;
  composer.addPass(new OutputPass());
  grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uNight: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: /* glsl */`uniform sampler2D tDiffuse; uniform float uTime; uniform float uNight; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(c, c * vec3(1.04, 1.0, 0.93), 0.6 * (1.0 - uNight));            // warm Terai grade
        c = mix(vec3(l), c, 0.94);                                               // gently desaturate
        c = c * 0.965 + vec3(0.018, 0.014, 0.010);                               // lifted blacks
        vec2 d = vUv - 0.5; c *= mix(1.0, smoothstep(0.85, 0.25, length(d * vec2(1.15, 1.0))), 0.42);
        c += (h(vUv * 1000.0 + fract(uTime) * 61.0) - 0.5) * 0.028;              // film grain
        gl_FragColor = vec4(c, 1.0); }` });
  composer.addPass(grade);
}

/* ---------- world ---------- */
let city, people, traffic, places = {}, effigy = null, festLight = null, diya = null, sparks = null;
const labels = [];
async function boot() {
  await Promise.all([document.fonts.load('700 40px "Noto Sans Devanagari"').catch(() => {}), document.fonts.ready]);
  const world = await (await fetch('assets/data/world.json')).json();
  world.places.forEach(p => places[p.id] = p); world.pois?.forEach(p => { if (!places[p.id]) places[p.id] = p; });
  city = await buildCity(scene, world, Q, v => progress(v * 0.6));
  progress(0.65);
  const M = LM.makeMaterials();
  const human = await bakeHuman(); progress(0.75);
  // Hanuman: idle pose with the right forearm raised in blessing
  human.hanuman = human.bake('Idle_Loop', 0.1, B => { if (B.upperarm_r) { B.upperarm_r.rotateZ(0.9); } if (B.lowerarm_r) { B.lowerarm_r.rotateZ(1.5); } if (B.upperarm_l) B.upperarm_l.rotateZ(-0.25); });
  const P = id => places[id];
  const pondNear = (x, z) => city.ponds.reduce((b, p) => { const d = Math.hypot(p.cx - x, p.cz - z); return !b || d < b.d ? { p, d } : b; }, null)?.p;
  scene.add(LM.bageshwori(P('bageshwori'), M));
  const jp = pondNear(P('junge').x, P('junge').z); if (jp) scene.add(LM.jungePavilion(jp, M, { x: jp.cx, z: jp.cz }));
  scene.add(LM.hanumanStatue(P('hanuman'), M, human));
  scene.add(LM.masjid(P('masjid'), M));
  scene.add(LM.chowkIsland(P('tribhuvan'), M, 'tribhuvan'));
  const dh = LM.chowkIsland(P('dhamboji'), M, 'dhamboji'); LM.statueOnPillar(dh, human, M, 10.9); scene.add(dh);
  for (const id of ['bpchowk', 'pushpalal', 'charbahini', 'ganeshman']) if (P(id) && !P(id).approx) scene.add(LM.chowkIsland(P(id), M, 'plain'));
  // yellow arch near Dhamboji: across the nearest main road ~60 m from the chowk
  { const d = P('dhamboji'); const r = city.nearRoad(d.x + 45, d.z + 30); if (r) { const s = r.s, a = Math.atan2(s[2] - s[0], s[3] - s[1]) + Math.PI / 2; scene.add(LM.archway(d.x + 45 + r.dx * 0, d.z + 30, a, M)); } }
  // Rani Talau peepal + corner pillars
  { const rt = pondNear(P('ranitalau').x, P('ranitalau').z); if (rt) { const xs = rt.pts.map(p => p[0]), zs = rt.pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const g = new THREE.Group(); for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4, 1.4), M.white); c.position.set(x, 1.5, z); c.castShadow = true; g.add(c); }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 7, 10), M.wood); trunk.position.set(x1 + 9, 3.5, (z0 + z1) / 2); g.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 2), new THREE.MeshStandardMaterial({ color: 0x3e4f2a, roughness: 1 })); crown.position.set(x1 + 9, 13, (z0 + z1) / 2); crown.scale.set(1.2, 0.8, 1.2); crown.castShadow = true; g.add(crown);
    scene.add(g); } }
  // Ramlila effigy + festival light
  effigy = LM.ravanEffigy(P('ravan'), human, M); scene.add(effigy.g);
  festLight = new THREE.PointLight(0xff7a28, 0, 160, 1.6); festLight.position.set(P('ravan').x, 14, P('ravan').z); scene.add(festLight);
  { const N = 600, pos = new Float32Array(N * 3); sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xffb060, size: 0.6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sparks.userData = { N, seed: Array.from({ length: N }, (_, i) => [hash(i, 1), hash(i, 2), hash(i, 3)]) }; sparks.frustumCulled = false; scene.add(sparks); }
  // diyas: temple pond ghats, Rani Talau, temple courtyard, Ramlila edge
  const lists = []; if (jp) lists.push({ pts: jp.pts, y: 0.45, step: 1.0 });
  const rt = pondNear(P('ranitalau').x, P('ranitalau').z); if (rt) lists.push({ pts: rt.pts, y: 0.45, step: 1.1 });
  { const b = P('bageshwori'); const sq = [[-20, -20], [20, -20], [20, 20], [-20, 20]].map(([x, z]) => { const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0); return [b.x + x * c + z * s, b.z - x * s + z * c]; }); lists.push({ pts: sq, y: 0.4, step: 0.9 }); }
  diya = LM.diyas(lists, 3000); scene.add(diya.mesh);

  /* people */
  const spots = { idle: [], talk: [], sit: [], walk: [] }; const nP = Q.people;
  const around = (p, r0, r1, n, list, face = true) => { for (let i = 0; i < n; i++) { const a = hash(i, p.x | 0) * Math.PI * 2, r = lerp(r0, r1, hash(i, 77)); const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; list.push({ x, z, a: face ? Math.atan2(p.x - x, p.z - z) + (hash(i, 5) - 0.5) : hash(i, 4) * 6.28 }); } };
  around(P('bageshwori'), 10, 20, Math.round(70 * nP), spots.idle); around(P('bageshwori'), 10, 20, Math.round(40 * nP), spots.talk, false);
  around(P('hanuman'), 14, 24, Math.round(40 * nP), spots.idle);
  around(P('tribhuvan'), 11, 22, Math.round(60 * nP), spots.talk, false);
  around(P('dhamboji'), 12, 24, Math.round(50 * nP), spots.talk, false);
  around(P('bpchowk'), 10, 20, Math.round(50 * nP), spots.talk, false);
  // festival crowd in front of the effigy
  { const r = P('ravan'); for (let i = 0; i < Math.round(420 * nP); i++) { const a = (hash(i, 31) - 0.5) * 2.2 + Math.PI, d = 22 + hash(i, 32) * 34; const x = r.x + Math.sin(a) * d, z = r.z + Math.cos(a) * d; spots.idle.push({ x, z, a: Math.atan2(r.x - x, r.z - z) + (hash(i, 33) - 0.5) * 0.4 }); } }
  // sitting on the ghats
  for (const pd of [jp, rt]) if (pd) pd.pts.forEach(([x, z], i) => { if (hash(i, 9) < 0.7) { const k = 1 + 2.4 / pd.R; spots.sit.push({ x: pd.cx + (x - pd.cx) * k, z: pd.cz + (z - pd.cz) * k, a: Math.atan2(pd.cx - x, pd.cz - z), y: 0.2 }); } });
  // shop fronts: people standing / walking on the sidewalks
  const C = { x: 60, z: 200 };
  city.fronts.forEach(([x, z, a, L], i) => {
    if (Math.hypot(x - C.x, z - C.z) > 1200) return; const r = hash(i, 21);
    const ox = Math.sin(a), oz = Math.cos(a);
    if (r < 0.32 * nP) spots.walk.push({ x: x + ox * 2.2, z: z + oz * 2.2, a: a + Math.PI / 2, len: Math.min(L, 6 + hash(i) * 10), ph: hash(i, 3) * 10 });
    else if (r < 0.62 * nP) spots.idle.push({ x: x + ox * 1.4, z: z + oz * 1.4, a: a + (hash(i, 8) - 0.5) * 2 });
  });
  people = makePeople(scene, human, spots, Q); progress(0.85);

  /* vehicles */
  const V = await loadVehicles(); progress(0.95);
  const parked = [], movers = [];
  city.fronts.forEach(([x, z, a, L], i) => {
    if (Math.hypot(x - C.x, z - C.z) > 1300 || hash(i, 41) > 0.45 * (Q.tier === 'high' ? 1 : 0.5)) return;
    const n = 1 + Math.floor(hash(i, 42) * 3), ox = Math.sin(a), oz = Math.cos(a), tx = Math.cos(a), tz = -Math.sin(a);
    for (let k = 0; k < n; k++) { const s = (k - (n - 1) / 2) * 0.9; parked.push({ t: hash(i, 43 + k) < 0.7 ? 'moto' : (hash(i, 44 + k) < 0.5 ? 'scooter' : 'cycle'), x: x + ox * 3.4 + tx * s, z: z + oz * 3.4 + tz * s, a: a + Math.PI + (hash(i, k) - 0.5) * 0.3 }); }
    if (hash(i, 47) < 0.12) parked.push({ t: hash(i, 48) < 0.5 ? 'sedan' : 'suv', x: x + ox * 6.5, z: z + oz * 6.5, a: a + Math.PI / 2 });
  });
  for (const id of ['tribhuvan', 'dhamboji', 'bpchowk', 'buspark', 'rapti-buspark']) { const p = P(id); if (!p) continue; for (let k = 0; k < (id.includes('bus') ? 6 : 5); k++) { const a = hash(k, id.length) * 6.28, r = 16 + k * 2; parked.push({ t: id.includes('bus') && k % 2 ? 'bus' : 'tempo', x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, a: a + Math.PI / 2 }); } }
  const mains = world.roads.filter(r => r.type === 'primary' || r.type === 'secondary');
  const nMov = Q.tier === 'high' ? 160 : 50; const TYPES = ['moto', 'moto', 'moto', 'moto', 'scooter', 'tempo', 'tempo', 'cycle', 'sedan', 'suv', 'bus', 'truck', 'moto', 'scooter'];
  for (let i = 0; i < nMov; i++) {
    const rd = mains[Math.floor(hash(i, 51) * mains.length)]; if (!rd || rd.pts.length < 2) continue;
    if (!rd._path) { const seg = []; let len = 0; for (let k = 0; k < rd.pts.length - 1; k++) { const l = Math.hypot(rd.pts[k + 1][0] - rd.pts[k][0], rd.pts[k + 1][1] - rd.pts[k][1]); seg.push(l); len += l; } rd._path = { pts: rd.pts, seg, len }; }
    if (rd._path.len < 30) continue;
    const t = TYPES[Math.floor(hash(i, 52) * TYPES.length)];
    movers.push({ t, path: rd._path, off: hash(i, 53) * rd._path.len * 2, speed: t === 'cycle' ? 3 : t === 'bus' || t === 'truck' ? 6 : 7 + hash(i, 54) * 4, lane: (rd.width || 8) * 0.22, rider: true });
  }
  parked.forEach(v => v.rider = false);
  traffic = makeTraffic(scene, V, parked, movers, human.poses.ride, human, Q);

  /* labels */
  Object.keys(PLACE_FACTS).forEach(id => {
    const p = places[id]; if (!p) return; const el = document.createElement('button'); el.className = 'hot'; el.innerHTML = `<i></i><span>${PLACE_FACTS[id].name}${p.approx ? ' <em>≈' + (p.realDistKm ? p.realDistKm.toFixed(1) + ' km' : 'far') + '</em>' : ''}</span>`;
    el.onclick = e => { e.stopPropagation(); openCard(id); };
    const o = new CSS2DObject(el); o.position.set(p.x, (id === 'hanuman' ? 36 : id === 'bageshwori' ? 22 : 12), p.z); scene.add(o); labels.push({ id, o, el });
  });
  progress(1);
  document.body.classList.add('ready'); document.body.dataset.ready = '1';
}
function openCard(id) {
  const f = PLACE_FACTS[id]; if (!f) return; const c = $('#card');
  c.innerHTML = `<button class="x" aria-label="Close">×</button><h3>${f.name}</h3>${f.facts.map(t => `<p>${t}</p>`).join('')}${places[id]?.approx ? '<p class="note">Shown at the edge of the map — not to scale.</p>' : ''}`;
  c.classList.add('on'); c.querySelector('.x').onclick = () => c.classList.remove('on');
}
document.addEventListener('click', e => { if (!e.target.closest('#card')) $('#card').classList.remove('on'); });

/* ---------- camera rig driven by scroll ---------- */
const camState = CHAPTERS.map(c => c.cam);
function camAt(c) {
  const p = Array.isArray(c.at) ? { x: c.at[0], z: c.at[1] } : places[c.at] || { x: 0, z: 0 };
  return { tx: p.x, tz: p.z, ty: c.lift, dist: c.dist, az: c.az, el: c.el, fov: c.fov, hour: c.hour, r: c.r };
}
let chapterIdx = 0, forced = null;
function scrollState() {
  if (forced) return forced;
  const secs = document.querySelectorAll('.chapter'); const y = window.scrollY + innerHeight * 0.5;
  for (let i = 0; i < secs.length; i++) { const s = secs[i], top = s.offsetTop, h = s.offsetHeight; if (y < top + h || i === secs.length - 1) return { i, s: Math.max(0, Math.min(1, (y - top) / h)) }; }
  return { i: 0, s: 0 };
}
const tgt = new THREE.Vector3(), camP = new THREE.Vector3();
function rig(t) {
  const { i, s } = scrollState(); chapterIdx = i;
  const A = camAt(camState[i]), B = camAt(camState[Math.min(i + 1, camState.length - 1)]);
  const k = s < 0.58 ? 0 : smooth((s - 0.58) / 0.42);
  const far = Math.hypot(A.tx - B.tx, A.tz - B.tz) > 250 ? 1 : 0, arc = Math.sin(k * Math.PI) * far;
  let daz = ((B.az - A.az + 540) % 360) - 180;
  const az = A.az + daz * k + (s < 0.58 ? (s - 0.29) * 10 : 2.9 * (1 - k)) + Math.sin(t * 0.05) * 0.6;
  const el = lerp(A.el, B.el, k) + arc * 14;
  const dist = Math.exp(lerp(Math.log(A.dist), Math.log(B.dist), k)) * (1 + arc * 0.5) * (mobile ? 1.25 : 1);
  tgt.set(lerp(A.tx, B.tx, k), lerp(A.ty, B.ty, k), lerp(A.tz, B.tz, k));
  const ce = Math.cos(el * Math.PI / 180);
  camP.set(tgt.x + Math.sin(az * Math.PI / 180) * ce * dist, tgt.y + Math.sin(el * Math.PI / 180) * dist, tgt.z - Math.cos(az * Math.PI / 180) * ce * dist);
  camera.position.copy(camP); camera.lookAt(tgt);
  camera.fov = lerp(A.fov, B.fov, k) * (mobile && innerWidth < innerHeight ? 1.35 : 1); camera.updateProjectionMatrix();
  const hour = lerp(A.hour, B.hour, k);
  atm.setHour(hour, tgt, lerp(A.r, B.r, k));
  // HUD
  const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
  $('#clock b').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('#clock i').style.transform = `rotate(${(hour / 24) * 360 - 90}deg)`;
  document.querySelectorAll('#dots button').forEach((d, j) => d.classList.toggle('on', j === i));
  // labels for the active chapter
  const show = new Set(CHAPTERS[i].labels.concat(k > 0.5 ? CHAPTERS[Math.min(i + 1, CHAPTERS.length - 1)].labels : []));
  labels.forEach(l => l.el.classList.toggle('on', show.has(l.id) && (k < 0.15 || k > 0.85)));
  return { i, k, hour };
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const STILL = qs.has('still'); if (STILL) document.documentElement.classList.add('still');
function frame() {
  const t = clock.getElapsedTime();
  if (city) {
    const st = rig(t);
    const n = atm.state.night;
    city.setNight(n); city.update(t); diya?.set(Math.max(0, (n - 0.4) / 0.6));
    people?.update(t); traffic?.update(t);
    // effigy burns in the festival chapter at night
    const fest = CHAPTERS[st.i].id === 'festivals' ? 1 - st.k : (CHAPTERS[Math.min(st.i + 1, CHAPTERS.length - 1)].id === 'festivals' ? st.k : 0);
    const burn = fest * n;
    if (effigy) { effigy.cloth.emissiveIntensity = burn * (2.2 + Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.4); }
    if (festLight) festLight.intensity = burn * (900 + Math.sin(t * 11) * 200);
    if (sparks) { const a = sparks.geometry.attributes.position.array, r = places.ravan; sparks.material.opacity = burn; sparks.userData.seed.forEach(([u, v, w], j) => { const life = (t * 0.35 + u) % 1; a[j * 3] = r.x + (v - 0.5) * 9 * (1 + life * 2); a[j * 3 + 1] = 4 + life * 34; a[j * 3 + 2] = r.z + (w - 0.5) * 9 * (1 + life * 2); }); sparks.geometry.attributes.position.needsUpdate = true; }
    atm.update(t, camera.position);
    if (composer) { grade.uniforms.uTime.value = t; grade.uniforms.uNight.value = n; composer.bloom.strength = 0.28 + n * 0.55; composer.render(); }
    else renderer.render(scene, camera);
    labelR.render(scene, camera);
  }
  if (!STILL) requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); labelR.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
boot().then(() => { requestAnimationFrame(frame); }).catch(e => { console.error(e); $('#loader p').textContent = 'Could not load the 3D city — please refresh.'; });

/* test hook for headless screenshots */
window.__cine = {
  goto(id, s = 0.3) { const i = CHAPTERS.findIndex(c => c.id === id); forced = { i, s }; const sec = document.getElementById(id); lenis.scrollTo(sec.offsetTop + sec.offsetHeight * s - innerHeight * 0.5, { immediate: true, force: true }); ScrollTrigger.update(); },
  render(n = 1) { for (let i = 0; i < n; i++) frame(); return renderer.info.render.calls + ' calls ' + renderer.info.render.triangles + ' tris'; },
  release() { forced = null; }, chapters: CHAPTERS.map(c => c.id), get ready() { return document.body.dataset.ready === '1'; }
};
