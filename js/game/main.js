/* Namaste Nepalgunj — walkable 3D game. Scene manager, HUD, interactions, food passport, maps. */
import { THREE, pickQuality, makeRenderer, makeComposer, isMobile } from './engine.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { loadWorld } from './world-data.js';
import { DISHES, passport } from './food.js';
import { foodModel } from './prefabs.js';
import { PLACE_INFO } from './info.js';
import { LANDMARKS } from '../landmarks.js';
import { CAT_ICON } from './scenes/city.js';
import { CREDITS } from '../credits-data.js';

const $ = s => document.querySelector(s);
const SCENES = {
  city: () => import('./scenes/city.js'),
  temple: () => import('./scenes/temple.js'),
  wonderland: () => import('./scenes/wonderland.js'),
  hanuman: () => import('./scenes/hanuman.js'),
  ravan: () => import('./scenes/ravan.js'),
  restaurant: () => import('./scenes/restaurant.js'),
  school: () => import('./scenes/school.js'),
  rapti: () => import('./scenes/rapti.js')
};

/* ---------- setup ---------- */
const qPref = localStorage.getItem('ng-quality') || 'auto';
const quality = pickQuality(qPref);
document.body.classList.toggle('touch', isMobile);
const container = $('#game');
const renderer = makeRenderer(container, quality);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 3000);
const labelR = new CSS2DRenderer(); labelR.setSize(innerWidth, innerHeight); labelR.domElement.className = 'labels'; container.appendChild(labelR.domElement);
let composer = null;
const hud = $('#hud');
const input = new Input(renderer.domElement, hud);
const player = new Player();
const ctx = { quality, renderer, camera, toast, labelPool: isMobile ? 6 : 10, onTile: polys => { if (cur === city) drawPolys(bctx, polys, mapB, mapScale); } };
let city = null, cur = null, hour = 16.6, autoTime = true, running = false, busy = false, ret = null, eating = null, overlay = null;
const clock = new THREE.Clock(); let T = 0, frameN = 0;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); labelR.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight);
  sizeMinimap();
});

/* ---------- scene switching ---------- */
function fade(on) { return new Promise(r => { $('#fade').classList.toggle('on', on); setTimeout(r, on ? 380 : 10); }); }
function pauseScreens(sc) { sc.traverse(o => o.userData?.pause?.()); }
function activate(S, spawn) {
  if (cur && cur !== S) { pauseScreens(cur.scene); cur.labels?.forEach(l => { l.visible = false; l.element.style.display = 'none'; }); }
  cur = S; S.scene.add(player.mesh);
  S.labels?.forEach(l => l.visible = true);
  player.setSpawn(spawn || S.spawn);
  player.pos.y = S.heightAt ? S.heightAt(player.pos.x, player.pos.z) : 0;
  if (!composer) composer = makeComposer(renderer, S.scene, camera, quality);
  else composer.passes[0].scene = S.scene;
  $('#where').textContent = S === city ? 'Nepalgunj' : S.name;
  document.body.dataset.scene = S === city ? 'city' : S.sceneKey;
  drawMapBase();
}
async function enter(key, params = {}, retPoint) {
  if (busy) return; busy = true; closeOverlay();
  await fade(true);
  $('#loadmsg').textContent = 'Loading ' + (params.name || key) + '…';
  try {
    const mod = await SCENES[key]();
    const S = await mod.create(ctx, params); S.sceneKey = key;
    if (cur && cur !== city) cur.dispose?.();
    ret = retPoint || ret;
    activate(S);
    toast(`📍 ${S.name}`);
  } catch (e) { console.warn('scene load failed', e); toast('Could not load this place'); }
  $('#loadmsg').textContent = '';
  await fade(false); busy = false;
}
async function exitToCity(at) {
  if (busy) return; busy = true; closeOverlay();
  await fade(true);
  const old = cur; const sp = at || ret || city.spawn; await city.ready?.(sp.x, sp.z); activate(city, sp); if (old && old !== city) old.dispose?.();
  await fade(false); busy = false;
}

/* ---------- toast / prompt ---------- */
let toastT = 0;
function toast(msg, ms = 2600) { const el = $('#toast'); el.innerHTML = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
let near = null;
function findNear() {
  if (!cur || eating) return null;
  let best = null, bd = 1e9;
  for (const it of cur.interactables) { const d = Math.hypot(player.pos.x - it.x, player.pos.z - it.z); if (d < it.r && d < bd) { bd = d; best = it; } }
  return best;
}
function updatePrompt() {
  const n = findNear();
  if (n !== near) {
    near = n; const p = $('#prompt');
    if (n) { p.innerHTML = `<kbd>${isMobile ? 'TAP' : 'E'}</kbd> ${n.label}`; p.classList.add('on'); $('#btnUse').classList.add('on'); }
    else { p.classList.remove('on'); $('#btnUse').classList.remove('on'); }
  }
}
function use() {
  if (player.sitting && !overlay) { player.sitting = false; return; }
  const it = near; if (!it) return;
  if (it.type === 'enter') enter(it.scene, it.params, cur.front ? cur.front(it, 4) : { x: it.x, z: it.z + 3.5, yaw: 0 });
  else if (it.type === 'exit') exitToCity();
  else if (it.type === 'info') openCard(it.place, it.params);
  else if (it.type === 'food') openFood(it.dishes, it.stall, it.anchor);
  else if (it.type === 'menu') { player.sitting = true; player.pos.set(it.seat.x, 0, it.seat.z); player.body.rotation.y = it.seat.faceYaw; player.yaw = 0; openFood(it.menu, it.stall, new THREE.Vector3(it.seat.table.x, it.seat.table.y + 0.05, it.seat.table.z), true); }
  else if (it.type === 'action') it.run();
}

/* ---------- overlays ---------- */
function openOverlay(id) {
  closeOverlay(true); overlay = id; $(id).classList.add('on'); input.enabled = false; input.keys.clear();
  if (document.pointerLockElement) { suppressPause = true; document.exitPointerLock(); }
}
function closeOverlay(keep) {
  if (overlay) { $(overlay).classList.remove('on'); $(overlay).querySelectorAll('video').forEach(v => v.pause()); }
  overlay = null; if (!keep && running) input.enabled = true;
}
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { closeOverlay(); if (player.sitting) player.sitting = false; }));
let suppressPause = false;
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && running && !overlay && !suppressPause && !isMobile) openPause();
  suppressPause = false;
});
addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (overlay) { closeOverlay(); player.sitting = false; } else if (running) openPause(); }
});

/* info card */
function infoFor(id, params = {}) {
  const lm = LANDMARKS.find(l => l.id === id); if (lm) return lm;
  const q = city?.pois?.find(x => x.id === id);
  if (q) return { icon: CAT_ICON[q.cat] || '📍', name: q.name, dev: q.name_ne, tag: [q.cat, q.ward ? 'Ward ' + q.ward : ''].filter(Boolean).join(' · '),
    facts: [q.address ? 'Address: ' + q.address : null, 'A real place in Nepalgunj, mapped in OpenStreetMap' + (q.approx ? ' (approximate position).' : '.'), q.cat === 'school' || q.cat === 'college' ? 'Only the name and location come from map data — no other details are invented here.' : null].filter(Boolean),
    source: '© OpenStreetMap contributors (ODbL)' };
  if (PLACE_INFO[id]) return PLACE_INFO[id];
  const p = city?.places.find(x => x.id === id);
  if (p && (p.kind === 'school' || id === 'school')) return { ...PLACE_INFO.school, name: p?.name || params.name };
  if (id === 'school') return { ...PLACE_INFO.school, name: params.name || 'Featured school' };
  return { icon: '📍', name: p?.name || id, dev: p?.dev, tag: p?.kind || '', facts: ['A real place in Nepalgunj. More details will be added from sourced research.'] };
}
function openCard(id, params) {
  const L = infoFor(id, params), c = $('#card');
  const m = L.media || {};
  const media = m.video ? `<video src="${m.video}" poster="${m.poster || ''}" muted loop playsinline autoplay></video>` : m.img ? `<img src="${m.img}" alt="${L.name}">` : '';
  c.querySelector('.c-media').innerHTML = media;
  c.querySelector('.c-media').style.display = media ? '' : 'none';
  c.querySelector('h2').innerHTML = `${L.icon || '📍'} ${L.name}${L.dev ? ` <small>${L.dev}</small>` : ''}`;
  c.querySelector('.c-tag').textContent = L.tag || '';
  c.querySelector('ul').innerHTML = (L.facts || []).map(f => `<li>${f}</li>`).join('') + (L.source ? `<li class="src">Source: ${L.source}</li>` : '');
  const a = c.querySelector('.c-story'); a.href = 'story.html' + (L.section || ''); 
  openOverlay('#card');
}

/* food: choose dish → eat */
let pendingFood = null;
function openFood(dishes, stall, anchor, seated) {
  if (dishes.length === 1 && !seated) return eat(dishes[0], stall, anchor);
  pendingFood = { stall, anchor };
  const el = $('#foodmenu');
  el.querySelector('h2').textContent = stall;
  el.querySelector('.dishes').innerHTML = dishes.map(id => { const d = DISHES[id]; return `<button data-dish="${id}"><span class="ic">${d.icon}</span><b>${d.name}</b><small>${d.dev}</small>${passport.tried.has(id) ? '<em>✓ stamped</em>' : ''}</button>`; }).join('');
  el.querySelectorAll('[data-dish]').forEach(b => b.onclick = () => { closeOverlay(); eat(b.dataset.dish, pendingFood.stall, pendingFood.anchor); });
  openOverlay('#foodmenu');
}
function eat(id, stall, anchor) {
  const d = DISHES[id]; if (!d || eating) return;
  const m = foodModel(d.model, d.color);
  const pos = anchor ? anchor.clone() : player.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  if (!player.sitting) { // hold in front of player
    const f = new THREE.Vector3(-Math.sin(player.body.rotation.y + Math.PI), 0, -Math.cos(player.body.rotation.y + Math.PI));
    pos.copy(player.pos).addScaledVector(f, 0.55); pos.y = player.pos.y + 1.15;
  }
  m.position.copy(pos); m.scale.setScalar(1.3); cur.scene.add(m);
  player.eating = true; player.eatT = 0;
  eating = { m, t: 0, id, dur: 2.6, pos };
  toast(`${d.icon} Eating ${d.name}… <i>yum!</i>`, 2400);
}
function finishEat() {
  const { m, id, pos } = eating; cur.scene.remove(m); player.eating = false; eating = null;
  const d = DISHES[id]; const isNew = passport.add(id);
  cur.particles?.burst(pos.x, pos.y + 0.3, pos.z, 50, 0xffd27a, 3, 1.1);
  const c = $('#eatcard');
  c.querySelector('.e-photo').innerHTML = d.photo ? `<img src="${d.photo}" alt="${d.name}">` : `<div class="big-ic">${d.icon}</div>`;
  c.querySelector('h2').innerHTML = `${d.icon} ${d.name} <small>${d.dev}</small>`;
  c.querySelector('p').textContent = d.fact;
  c.querySelector('.stamp').textContent = isNew ? '🎉 New Food Passport stamp!' : 'Already stamped — tasty again!';
  updatePassportHUD();
  openOverlay('#eatcard');
  if (isNew && passport.complete) setTimeout(() => { renderPassport(); $('#passport').classList.add('complete'); openOverlay('#passport'); toast('🏅 Nepalgunj Food Master! All dishes collected', 5000); }, 2200);
}
function updatePassportHUD() { $('#ppCount').textContent = `${passport.tried.size}/${passport.total}`; $('#btnPassport').classList.toggle('gold', passport.complete); }
function renderPassport() {
  const el = $('#passport .grid');
  el.innerHTML = Object.entries(DISHES).map(([id, d]) => `<div class="stampbox ${passport.tried.has(id) ? 'got' : ''}"><span>${passport.tried.has(id) ? d.icon : '❔'}</span><b>${d.name}</b><small>${d.dev}</small></div>`).join('');
  $('#passport .badge').classList.toggle('on', passport.complete);
  $('#passport .pcount').textContent = `${passport.tried.size} of ${passport.total} dishes`;
}

/* pause / credits / controls */
function openPause() { openOverlay('#pause'); }
$('#btnResume').onclick = () => closeOverlay();
$('#btnMenu').onclick = openPause;
if ($('#btnCredits')) $('#btnCredits').onclick = () => { renderCredits(); openOverlay('#credits'); };
$('#btnControls').onclick = () => openOverlay('#controls');
$('#btnAuto').onclick = () => { autoTime = !autoTime; $('#btnAuto').textContent = `Auto day/night: ${autoTime ? 'ON' : 'OFF'}`; };
$('#btnResetPP').onclick = () => { if (confirm('Reset your Food Passport?')) { passport.tried.clear(); localStorage.removeItem('nepalgunj-food-passport-v1'); updatePassportHUD(); toast('Passport cleared'); } };
document.querySelectorAll('[data-q]').forEach(b => { b.classList.toggle('sel', b.dataset.q === qPref); b.onclick = () => { localStorage.setItem('ng-quality', b.dataset.q); location.reload(); }; });
function renderCredits() {
  const v = [
    ['Rapti River drone footage', 'shared by the site owner'], ['Golden-hour drone footage', '@nepalgunjiya'], ['Bageshwori pond, Hanuman, Ravan Dahan clips', 'shared by the site owner'],
    ['Wonder Land clip', '@BeautyofNepalgunj']
  ];
  $('#credits .list').innerHTML =
    '<h3>Videos</h3>' + v.map(([a, b]) => `<li>${a} — ${b}</li>`).join('') +
    '<h3>Photos (Wikimedia Commons)</h3>' + CREDITS.map(c => `<li><a href="${c.page}" target="_blank" rel="noopener">${c.title.replace('File:', '')}</a> — ${c.author} · <a href="${c.license_url}" target="_blank" rel="noopener">${c.license}</a></li>`).join('') +
    '<h3>3D textures & sky</h3><li>PBR textures and HDRI sky from <a href="https://polyhaven.com" target="_blank" rel="noopener">Poly Haven</a> — CC0</li><li>Water normal map from the three.js examples — MIT</li><li>Engine: <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> (MIT)</li>' +
    `<h3>Map data</h3><li>${city?.world?.attribution || 'Stylized layout'}</li><li>Places marked “not to scale” (airport, border, Wonder Land, Chaulika, Rapti) are pulled closer to the centre so you can walk there.</li><li>Food photos are representative, not shot in Nepalgunj</li>`;
}

/* ---------- minimap & big map ---------- */
const mm = $('#minimap'), mmx = mm.getContext('2d');
const base = document.createElement('canvas'); const bctx = base.getContext('2d');
let mapScale = 1, mapB = [0, 0, 1, 1];
function sizeMinimap() { const s = Math.round(mm.clientWidth * Math.min(devicePixelRatio, 2)); mm.width = mm.height = s || 180; }
function drawPolys(g, polys, b, sc) {
  const col = ['#b9aa94', '#e0c860', '#f2f2f2', '#e8a050', '#9fd0a8', '#c8b898', '#e0a890', '#a8c0d8', '#555', '#e8d8b0'];
  for (const p of polys) { g.fillStyle = col[p.cat] || col[0]; g.beginPath(); p.pts.forEach(([x, z], i) => i ? g.lineTo((x - b[0]) * sc, (z - b[1]) * sc) : g.moveTo((x - b[0]) * sc, (z - b[1]) * sc)); g.closePath(); g.fill(); }
}
function drawMapBase() {
  const S = cur; const b = S === city ? city.bounds : S.bounds; mapB = b;
  const W = b[2] - b[0], H = b[3] - b[1]; mapScale = (S === city && city.osm ? 2048 : 1024) / Math.max(W, H);
  base.width = Math.ceil(W * mapScale); base.height = Math.ceil(H * mapScale);
  const g = bctx; const X = x => (x - b[0]) * mapScale, Z = z => (z - b[1]) * mapScale;
  const poly = pts => { g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); };
  g.fillStyle = S === city ? '#cfc6a8' : '#d8d2c4'; g.fillRect(0, 0, base.width, base.height);
  if (S === city) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    city.green.forEach(gr => { g.fillStyle = gr.type === 'farm' ? '#c8c48a' : gr.type === 'plaza' ? '#ddd5c5' : '#a9c48a'; poly(gr.pts); g.closePath(); g.fill(); });
    city.rivers.forEach(r => { g.strokeStyle = '#5fa8c8'; g.lineWidth = (r.width || 30) * mapScale; poly(r.pts); g.stroke(); });
    city.canals.forEach(r => { g.strokeStyle = '#6fb0cc'; g.lineWidth = Math.max(1.5, r.width * mapScale); poly(r.pts); g.stroke(); });
    city.ponds.forEach(p => { g.fillStyle = '#5fa8c8'; poly(p.pts); g.closePath(); g.fill(); });
    city.tilesLoaded?.().forEach(t => t.polys && drawPolys(g, t.polys, b, mapScale));
    const order = { path: 0, residential: 1, secondary: 2, primary: 3 };
    [...city.roads].sort((a, c) => (order[a.type] ?? 1) - (order[c.type] ?? 1)).forEach(r => {
      g.strokeStyle = r.type === 'primary' ? '#ffd27a' : r.type === 'secondary' ? '#fff6e0' : r.type === 'path' ? 'rgba(255,255,255,.45)' : '#f3eee2';
      g.lineWidth = Math.max(r.type === 'path' ? 0.8 : 1.6, (r.width || 7) * mapScale); poly(r.pts); g.stroke(); });
    (city.bridges || []).forEach(br => { g.strokeStyle = br.walk ? '#6b4a2a' : '#999'; g.lineWidth = Math.max(3, (br.w || 8) * mapScale); g.beginPath(); g.moveTo(X(br.ax), Z(br.az)); g.lineTo(X(br.bx), Z(br.bz)); g.stroke(); });
    city.places.forEach(p => { const col = { bageshwori: '#c0392b', hanuman: '#e8641c', ranitalau: '#2a7fb0', wonderland: '#2a6dd2', ravan: '#7a1a1a', biryani: '#0f5b3a', school: '#1d4f91', chowk: '#333', junge: '#c0392b' }[p.kind] || '#6a5a4a';
      g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(X(p.x), Z(p.z), p.kind === 'chowk' ? 5 : 8, 0, 7); g.fill(); g.stroke(); });
  } else {
    g.strokeStyle = '#7a6a5a'; g.lineWidth = 6; g.strokeRect(3, 3, base.width - 6, base.height - 6);
  }
  const X2 = X, Z2 = Z;
  S.interactables.forEach(it => { if (it.poi) return; if (it.type === 'enter' || it.type === 'exit') { g.fillStyle = it.type === 'exit' ? '#2fa3d8' : '#f2a33a'; g.beginPath(); g.arc(X2(it.x), Z2(it.z), 6, 0, 7); g.fill(); } if (it.type === 'food' || it.type === 'menu') { g.fillStyle = '#e8b21a'; g.fillRect(X2(it.x) - 4, Z2(it.z) - 4, 8, 8); } });
}
function drawMinimap() {
  const s = mm.width, g = mmx, R = s / 2, view = cur === city ? 160 : Math.max(mapB[2] - mapB[0], mapB[3] - mapB[1]) * 0.8; // metres across
  const k = s / view;
  g.save(); g.clearRect(0, 0, s, s); g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.clip();
  g.fillStyle = '#b8ae90'; g.fillRect(0, 0, s, s);
  g.translate(R, R); g.rotate(player.yaw); // heading-up
  const px = (player.pos.x - mapB[0]) * mapScale, pz = (player.pos.z - mapB[1]) * mapScale;
  g.scale(k / mapScale, k / mapScale); g.drawImage(base, -px, -pz);
  g.restore();
  // player arrow
  g.save(); g.translate(R, R); g.fillStyle = '#ff3b30'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  // N marker
  const a = player.yaw; g.fillStyle = '#fff'; g.font = `bold ${Math.round(s / 12)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', R + Math.sin(a) * (R - 14), R - Math.cos(a) * (R - 14));
}
function updateCompass() {
  const h = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
  $('#compass .strip').style.transform = `translateX(${-h * 2}px)`;
  $('#heading').textContent = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(h / 45) % 8];
}
function openMap() {
  const el = $('#bigmap'); const cv = el.querySelector('canvas'); const g = cv.getContext('2d');
  const src = city; const save = cur; if (cur !== city) { cur = city; drawMapBase(); }
  cv.width = base.width; cv.height = base.height; g.drawImage(base, 0, 0);
  const X = x => (x - city.bounds[0]) * mapScale, Z = z => (z - city.bounds[1]) * mapScale;
  g.font = `bold ${Math.round(14 * cv.width / 1024)}px Inter, sans-serif`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.fillStyle = '#1b1410';
  city.places.forEach(p => { const t = p.name.split('·')[0].trim() + (p.approx ? ' ↗' : ''); g.strokeText(t, X(p.x), Z(p.z) - 12); g.fillText(t, X(p.x), Z(p.z) - 12); });
  if (save === city) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(X(player.pos.x), Z(player.pos.z), 9, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
  if (save !== city) { cur = save; drawMapBase(); }
  el.querySelector('.fast').innerHTML = src.fast.map(f => `<button data-fast="${f.id}">${f.name}${f.approx ? ' <i>(far)</i>' : ''}</button>`).join('');
  el.querySelectorAll('[data-fast]').forEach(b => b.onclick = () => fastTravel(b.dataset.fast));
  cv.onclick = e => { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * cv.width / mapScale + city.bounds[0], z = (e.clientY - r.top) / r.height * cv.height / mapScale + city.bounds[1];
    let best = null, bd = 1e9; src.fast.forEach(f => { const d = Math.hypot(f.x - x, f.z - z); if (d < bd) { bd = d; best = f; } }); if (best && bd < 80) fastTravel(best.id); };
  openOverlay('#bigmap');
}
async function fastTravel(id) {
  const f = city.fast.find(x => x.id === id); if (!f) return;
  closeOverlay();
  if (cur !== city) return exitToCity({ x: f.x, z: f.z, yaw: 0 });
  await fade(true); player.setSpawn({ x: f.x, z: f.z, yaw: f.yaw || 0 }); player.pos.y = city.heightAt(f.x, f.z); await city.ready?.(f.x, f.z); await fade(false);
  toast(`📍 ${f.name}`);
}

/* ---------- HUD buttons ---------- */
const toggleNight = () => { hour = (hour > 6 && hour < 18.2) ? 19.8 : 9.5; toast(hour > 18 ? '🌙 Night falls over Nepalgunj' : '☀️ Good morning, Nepalgunj'); };
$('#btnMap').onclick = openMap; $('#btnDay').onclick = toggleNight;
$('#btnView').onclick = () => player.firstPerson = !player.firstPerson;
$('#btnPassport').onclick = () => { renderPassport(); openOverlay('#passport'); };
$('#btnUse').addEventListener('touchstart', e => { e.preventDefault(); use(); }); $('#btnUse').onclick = use;
$('#btnJump').addEventListener('touchstart', e => { e.preventDefault(); input.jump = true; });
$('#btnSprint').addEventListener('touchstart', e => { e.preventDefault(); input.sprint = !input.sprint; $('#btnSprint').classList.toggle('sel', input.sprint); });

/* ---------- main loop ---------- */
const _v = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); T += dt; frameN++;
  if (!cur) return;
  if (running) {
    let a; while ((a = input.popAction())) {
      if (a === 'use') use(); else if (a === 'map') openMap(); else if (a === 'daynight') toggleNight();
      else if (a === 'view') player.firstPerson = !player.firstPerson; else if (a === 'passport') { renderPassport(); openOverlay('#passport'); }
    }
    if (autoTime && !overlay) hour = (hour + dt * 24 / 900) % 24; // 15 real minutes per day
    player.update(dt, input, cur, camera);
    updatePrompt();
    if (eating) {
      eating.t += dt; const k = eating.t / eating.dur;
      eating.m.scale.setScalar(1.3 * Math.max(0.05, 1 - k)); eating.m.rotation.y += dt * 2;
      if (Math.random() < 0.3) cur.particles?.burst(eating.pos.x, eating.pos.y + 0.2, eating.pos.z, 2, 0xfff2c0, 1.2, 0.6);
      if (k >= 1) finishEat();
    }
    if (frameN % 2 === 0) { drawMinimap(); updateCompass(); }
    if (cur === city && frameN % 15 === 0) {
      let best = null, bd = 60; city.places.forEach(p => { const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z); if (d < bd) { bd = d; best = p; } });
      if (!best) { bd = 22; (city.pois || []).forEach(p => { const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z); if (d < bd) { bd = d; best = p; } }); }
      $('#where').textContent = best ? best.name.split('·')[0].trim() : 'Nepalgunj';
    }
  } else { // attract mode: slow orbit behind start screen
    const s = cur.spawn; camera.position.set(s.x + Math.cos(T * 0.05) * 70, 38, s.z + Math.sin(T * 0.05) * 70); camera.lookAt(s.x, 4, s.z);
  }
  cur.env.setHour(hour, renderer); cur.env.follow(_v.copy(player.pos));
  cur.update(dt, T, player);
  if (cur.labels && frameN % 10 === 0) cur.labels.forEach(l => { if (l.element.classList.contains('poi')) return; l.visible = l.position.distanceTo(camera.position) < (l.element.classList.contains('far') ? 400 : cur === city ? 170 : 90); });
  composer ? composer.render() : renderer.render(cur.scene, camera);
  labelR.render(cur.scene, camera);
}

/* ---------- boot ---------- */
async function boot() {
  $('#compass .strip').innerHTML = Array.from({ length: 25 }, (_, i) => { const d = -360 + i * 45; return `<span style="left:${d * 2}px" class="${d % 90 ? 'm' : ''}">${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][((d / 45) % 8 + 8) % 8]}</span>`; }).join('');
  sizeMinimap(); updatePassportHUD();
  const prog = $('#startProg');
  prog.textContent = 'Building Nepalgunj…';
  const world = await loadWorld();
  const mod = await SCENES.city();
  city = await mod.create({ ...ctx, world }); city.sceneKey = 'city';
  prog.textContent = 'Loading streets & buildings…';
  await city.ready?.(city.spawn.x, city.spawn.z);
  activate(city);
  frame();
  prog.textContent = world.osm ? 'Real street map · © OpenStreetMap contributors' : 'Stylized map of Nepalgunj';
  $('#btnStart').disabled = false; $('#btnStart').textContent = '▶ Start exploring';
  document.body.dataset.ready = '1';
}
$('#btnStart').onclick = () => {
  $('#start').classList.add('gone'); $('#start video')?.pause(); running = true; input.enabled = true; hud.classList.add('on');
  toast(isMobile ? 'Left thumb: walk · right thumb: look · tap the hand to interact' : 'WASD to walk · mouse to look · Shift to run · E to interact', 4200);
};
boot().catch(e => { console.error(e); $('#startProg').textContent = 'Could not start the 3D world — try the story version.'; });

/* test hooks for automated screenshots */
window.__game = {
  get state() { return { scene: document.body.dataset.scene, pos: player.pos.toArray(), hour, passport: [...passport.tried] }; },
  start: () => $('#btnStart').click(),
  setHour: h => { hour = h; autoTime = false; },
  teleport: id => fastTravel(id),
  pose: (x, z, yaw = 0, pitch = 0.25, dist = 7) => { player.setSpawn({ x, z, yaw }); player.pos.y = cur.heightAt ? cur.heightAt(x, z) : 0; player.pitch = pitch; player.dist = dist; },
  enter: (key, params) => enter(key, params, { x: player.pos.x, z: player.pos.z + 3, yaw: 0 }),
  exit: () => exitToCity(),
  eat: id => eat(id, 'test', null),
  near: () => near && near.label,
  use, closeOverlay, openMap
};
