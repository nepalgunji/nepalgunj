import { AERIAL, CL, start, addPins, flyTo, setHour, setEnabled, setMinDistance } from './aerial.js';
import { createPano } from './pano.js';
import { createFX } from './fx.js';
import { PLACES } from './places.js';
import { toX, toZ } from '../w3d/imagery.js';

const Q = new URLSearchParams(location.search); const SHOT = Q.has('shot');
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, SHOT ? 0 : ms));
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.documentElement.classList.add('touch');
const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
const NET = navigator.connection || {}, SLOW = NET.saveData || /2g|3g/.test(NET.effectiveType || '');
// desktop/tablet (or a fast high-DPR phone) gets the HD encode, phones the 720p one
const HD = !SLOW && (Math.min(innerWidth, innerHeight) >= 700 || ((devicePixelRatio || 1) >= 2 && (NET.downlink || 0) >= 10));
const clipUrl = n => `assets/videos/c/${n}${HD ? '-hd' : ''}.mp4`, clipPoster = n => `assets/videos/c/${n}-poster.webp`;
const thumbOf = p => p.nodes && p.nodes.length ? (p.nodes[0].film ? clipPoster(p.nodes[0].film) : `assets/pano/${p.nodes[0].id}-thumb.webp`) : p.clips ? clipPoster(p.clips[0]) : 'assets/videos/drone1-poster.webp';

// every place gets a 'nodes' list: 360° panoramas and/or real footage views
for (const p of PLACES) {
  const film = (p.clips || []).map((c, i) => ({ id: `${p.id}-v${i}`, film: c, label: (p.labels || [])[i] || (i ? 'View ' + (i + 1) : 'Live'), drone: (p.droneIdx || []).includes(i) }));
  p.nodes = [...(p.nodes || []), ...film];
}
const nodeThumb = n => n.film ? clipPoster(n.film) : `assets/pano/${n.id}-thumb.webp`;
// ── bearings from BP Chowk sky node to other places (real compass directions)
for (const p of PLACES) for (const n of p.nodes) if (!n.film) {
  n.hots = [];
  for (const l of n.links || []) {
    if (l.to) {
      const q = byId[l.to]; const dx = toX(q.lon) - toX(p.lon), dz = toZ(q.lat) - toZ(p.lat);
      const d = Math.hypot(dx, dz); const yaw = Math.atan2(dx, -dz) * 180 / Math.PI;
      const pitch = -Math.atan2(n.alt || 2, d) * 180 / Math.PI;
      n.hots.push({ label: q.name, yaw, pitch, place: q.id, cls: 'go' });
    } else if (l.node) {
      const yaw = (n.yaw0 || 0) + l.u * 360, pitch = (0.5 - l.v) * 180;
      const t = p.nodes.find(m => m.id === l.node); n.hots.push({ label: t.label, yaw, pitch, node: l.node });
    }
  }
}

// ── UI: time of day
const tod = $$('#tod button');
tod.forEach(b => b.onclick = () => { tod.forEach(x => x.classList.toggle('on', x === b)); setHour(+b.dataset.h); });
setHour(Q.has('h') ? +Q.get('h') : 11.6, true);
if (Q.has('h')) tod.forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.h - +Q.get('h')) < 0.6));

// ── drawer
const drawer = $('#drawer');
$('#drawer ul').innerHTML = PLACES.map(p => `<li><button data-id="${p.id}"><img src="${thumbOf(p)}" alt="" loading="lazy"><span><b>${p.name}</b><small>${p.dev}</small></span>${p.kind === 'pano' ? `<em class="tag p">${p.partial ? 'Pano' : '360°'}</em>` : p.kind === 'film' ? '<em class="tag">Film</em>' : '<em class="tag">Aerial</em>'}</button></li>`).join('');
$('#listBtn').onclick = e => { e.stopPropagation(); drawer.classList.toggle('on'); };
drawer.onclick = e => { const b = e.target.closest('button[data-id]'); if (!b) return; drawer.classList.remove('on'); go(byId[b.dataset.id]); };
addEventListener('pointerdown', e => { if (!drawer.contains(e.target) && e.target !== $('#listBtn')) drawer.classList.remove('on'); });

// ── aerial card (for places without street media)
const card = $('#card');
function showCard(p) {
  if (!p) { card.classList.remove('on'); return; }
  card.querySelector('h2').textContent = p.name; card.querySelector('.dev').textContent = p.dev; card.querySelector('.line').textContent = p.line;
  card.classList.add('on');
}
AERIAL.onInteract = () => { $('#hint').style.opacity = 0; if (state.aerialPlace && !state.flying) { /* keep card */ } };

// ── place view
const panoCanvas = $('#pano'); const pano = createPano(panoCanvas, $('#hots'));
const place = $('#place'), ptitle = $('#ptitle'), nodesEl = $('#nodes'), film = $('#film'), ptag = $('#ptag');
const vfg = film.querySelector('.fg'), vbg = film.querySelector('.bg');
const state = { p: null, node: null, flying: false, aerialPlace: null };
function setTitle(p) {
  ptitle.classList.remove('on');
  ptitle.querySelector('h2').textContent = p.name; ptitle.querySelector('.dev').textContent = p.dev; ptitle.querySelector('.line').textContent = p.line;
  requestAnimationFrame(() => requestAnimationFrame(() => ptitle.classList.add('on')));
  clearTimeout(setTitle.t); if (!SHOT) setTitle.t = setTimeout(() => ptitle.classList.remove('on'), 6500);
}
function nodeStrip(p, cur) {
  nodesEl.className = ''; nodesEl.innerHTML = '';
  if (p.nodes.length > 1) for (const n of p.nodes) {
    const b = document.createElement('button'); b.className = n.id === cur ? 'on' : ''; b.setAttribute('aria-label', n.label);
    b.innerHTML = `<img src="${nodeThumb(n)}" alt=""><span>${n.label}</span>`;
    b.onclick = () => showNode(p, n); nodesEl.appendChild(b);
  }
  // nearby places (Street-View style jumps)
  for (const q of nearby(p)) {
    const b = document.createElement('button'); b.className = 'near'; b.setAttribute('aria-label', q.name);
    b.innerHTML = `<img src="${thumbOf(q)}" alt=""><span>${q.name} →</span>`;
    b.onclick = () => { if (q.kind === 'aerial') back().then(() => go(q)); else enterPlace(q, true); }; nodesEl.appendChild(b);
  }
}
function nearby(p) {
  if (p.lat == null) return [byId.bp];
  return PLACES.filter(q => q !== p && q.lat != null && q.kind !== 'aerial').map(q => [q, Math.hypot(toX(q.lon) - toX(p.lon), toZ(q.lat) - toZ(p.lat))]).sort((a, b) => a[1] - b[1]).slice(0, 2).map(x => x[0]);
}
async function showNode(p, n, first) {
  state.node = n; nodeStrip(p, n.id);
  history.replaceState(null, '', '#' + n.id);
  place.classList.toggle('film', !!n.film);
  ptag.textContent = n.film ? '' : n.span ? 'Pano' : '360°'; ptag.className = '';
  if (n.film) {
    pano.stop(); panoCanvas.style.display = 'none'; $('#hots').style.display = 'none';
    film.classList.add('on'); playClip(p, n); return;
  }
  film.classList.remove('on'); vfg.pause(); vbg.pause(); vfg.removeAttribute('src'); vbg.removeAttribute('src');
  panoCanvas.style.display = ''; $('#hots').style.display = '';
  pano.start();
  await pano.show(n, { look: n.start, cut: first });
  pano.setAuto(false);
  if (!first) pano.playIntro({ y0: n.start[0] - 14, y1: n.start[0], p1: n.start[1], f0: 84, f1: n.fov || 72, dur: 4.5 });
}
function playClip(p, n) {
  const c = n.film;
  vfg.poster = clipPoster(c);
  vfg.src = clipUrl(c); vbg.removeAttribute('src'); vbg.load();
  film.classList.remove('pan'); filmPan.x = 50; vfg.style.objectPosition = ''; film.classList.toggle('drone', !!n.drone);
  vfg.onloadedmetadata = () => { const va = vfg.videoWidth / vfg.videoHeight, sa = innerWidth / innerHeight; filmPan.on = !n.drone && va > sa * 1.25; film.classList.toggle('pan', filmPan.on); if (!filmPan.on) vfg.style.objectPosition = va < 1 ? '50% 48%' : '50% 50%'; };
  const pl = v => v.play().catch(() => { });
  pl(vfg);
}
// wide footage on a narrow (portrait) screen: fill the screen and let the user drag across it
const filmPan = { on: false, x: 50, v: 0.6, drag: null, idle: 0 };
film.addEventListener('pointerdown', e => { if (!filmPan.on) return; film.setPointerCapture(e.pointerId); filmPan.drag = e.clientX; filmPan.idle = 0; });
film.addEventListener('pointermove', e => { if (filmPan.drag == null) return; const W = innerWidth, va = vfg.videoWidth / vfg.videoHeight || 1.78; const over = innerHeight * va - W; filmPan.x = Math.min(100, Math.max(0, filmPan.x - (e.clientX - filmPan.drag) / Math.max(1, over) * 100)); filmPan.drag = e.clientX; });
const endPan = () => { filmPan.drag = null; }; film.addEventListener('pointerup', endPan); film.addEventListener('pointercancel', endPan);
(function panLoop() { if (filmPan.on && state.p && filmPan.drag == null) { filmPan.idle++; if (filmPan.idle > 240) { filmPan.x += filmPan.v * 0.12; if (filmPan.x > 92 || filmPan.x < 8) filmPan.v *= -1; } } if (filmPan.on) vfg.style.objectPosition = filmPan.x.toFixed(2) + '% 50%'; requestAnimationFrame(panLoop); })();
pano.onHot(h => {
  if (h.node) { showNode(state.p, state.p.nodes.find(n => n.id === h.node)); return; }
  if (h.place) { const q = byId[h.place]; if (q.kind === 'aerial') { back().then(() => go(q)); } else enterPlace(q, true); }
});
async function enterPlace(p, direct) {
  state.p = p; document.body.classList.add('inplace');
  setTitle(p);
  const n = (Q.get('node') && p.nodes.find(n => n.id === Q.get('node'))) || p.nodes[0]; Q.delete('node');
  await showNode(p, n, !direct);
  if (!n.film) {
    // cinematic entry: slow push-in with a gentle yaw drift; any drag cancels it
    pano.playIntro({ y0: n.start[0] - (n.range ? 10 : 28), y1: n.start[0] + (n.range ? 4 : 6), p0: direct ? n.start[1] - 6 : -40, p1: n.start[1], f0: direct ? 88 : 108, f1: n.fov || 72, dur: direct ? 6 : 8 });
    $('#phint').classList.add('on'); setTimeout(() => $('#phint').classList.remove('on'), 3200);
  }
  place.classList.add('on'); place.setAttribute('aria-hidden', 'false');
  setEnabled(false);
}
function animPitch(to) { const from = pano.pitch, t0 = performance.now(); const st = () => { const k = Math.min(1, (performance.now() - t0) / 2200); const e = 1 - Math.pow(1 - k, 3); pano.pitch = from + (to - from) * e; if (k < 1 && !SHOT) requestAnimationFrame(st); }; if (SHOT) pano.pitch = to; else st(); }

async function go(p) {
  if (state.flying) return; showCard(null); $('#hint').style.opacity = 0;
  if (p.lat == null) { enterPlace(p, true); return; }
  state.flying = true; document.body.classList.add('flying'); letterbox(true);
  const x = toX(p.lon), z = toZ(p.lat);
  if (p.kind === 'aerial') {
    setMinDistance();
    await flyTo(x, z, { dist: 900, polar: 0.8, dur: SHOT ? 0.01 : 2.6 });
    state.flying = false; document.body.classList.remove('flying'); letterbox(false); state.aerialPlace = p; showCard(p);
    history.replaceState(null, '', '#' + p.id);
    return;
  }
  setMinDistance(500);
  if (p.nodes[0] && !p.nodes[0].film) pano.preload(p.nodes[0].id).catch(() => { });
  const dur = SHOT ? 0.01 : 2.4;
  const fly = flyTo(x, z, { dist: 640, polar: 0.32, dur, lock: true });
  await sleep(dur * 1000 - 800); $('#flash').classList.add('on');
  await fly; await enterPlace(p, false);
  await sleep(250); $('#flash').classList.remove('on');
  setTimeout(() => letterbox(false), SHOT ? 0 : 2600);
  state.flying = false; document.body.classList.remove('flying');
}
async function back() {
  if (!state.p) return;
  const p = state.p; state.p = null;
  place.classList.remove('on'); place.setAttribute('aria-hidden', 'true'); document.body.classList.remove('inplace');
  setEnabled(true); pano.stop(); vfg.pause(); vbg.pause();
  history.replaceState(null, '', location.pathname + location.search);
  setMinDistance(); state.flying = true; letterbox(true);
  if (p.lat != null) await flyTo(toX(p.lon), toZ(p.lat), { dist: 1300, polar: 0.92, dur: SHOT ? 0.01 : 2.4 });
  state.flying = false; letterbox(false);
  setTimeout(() => { vfg.removeAttribute('src'); vbg.removeAttribute('src'); }, 1200);
}
$('#back').onclick = back;
addEventListener('keydown', e => { if (e.key === 'Escape') { if (state.p) back(); else if (state.aerialPlace) { showCard(null); state.aerialPlace = null; setMinDistance(); } } });
AERIAL.onFrame = (h, dist) => { if (state.aerialPlace && !state.flying && dist > 1100) { showCard(null); state.aerialPlace = null; setMinDistance(); } };
$('#gyroBtn').onclick = async () => { const b = $('#gyroBtn'); if (pano.gyroOn) { pano.disableGyro(); b.classList.remove('on'); } else if (await pano.enableGyro()) b.classList.add('on'); };
$('#fsBtn').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => { }); };

// ── climate · मौसम (cross-faded; applies to aerial, panoramas and the fx overlay)
const MOBILE = Math.min(innerWidth, innerHeight) < 600;
const fx = createFX($('#fx'), MOBILE);
const PRESET = {
  clear:   { fog: 0, rain: 0, heat: 0, desat: 0, cool: 0, warm: 0, dark: 0, wet: 0, drops: 0, light: 0 },
  winter:  { fog: 1, rain: 0, heat: 0, desat: 0.4, cool: 0.55, warm: 0, dark: 0.06, wet: 0, drops: 0, light: 0 },
  summer:  { fog: 0, rain: 0, heat: 1, desat: 0, cool: 0, warm: 0.55, dark: 0, wet: 0, drops: 0, light: 0 },
  drizzle: { fog: 0.25, rain: 0.4, heat: 0, desat: 0.18, cool: 0.25, warm: 0, dark: 0.16, wet: 0.5, drops: 0.4, light: 0 },
  monsoon: { fog: 0.4, rain: 1, heat: 0, desat: 0.32, cool: 0.35, warm: 0, dark: 0.36, wet: 1, drops: 1, light: 1 },
};
const C = { ...PRESET.clear }; let CT = PRESET.clear, climName = 'clear';
function setClimate(name, instant) {
  climName = name; CT = PRESET[name] || PRESET.clear;
  $$('#climPanel button').forEach(b => b.classList.toggle('on', b.dataset.c === name));
  if (instant) Object.assign(C, CT);
}
$('#climBtn').onclick = e => { e.stopPropagation(); const o = $('#clim').classList.toggle('open'); $('#climBtn').setAttribute('aria-expanded', o); };
$('#climPanel').onclick = e => { const b = e.target.closest('button[data-c]'); if (!b) return; setClimate(b.dataset.c); $('#clim').classList.remove('open'); try { localStorage.setItem('ngj-climate', b.dataset.c); } catch { } };
addEventListener('pointerdown', e => { if (!$('#clim').contains(e.target)) $('#clim').classList.remove('open'); });
let flash = 0, nextBolt = 6, lastT = performance.now(), letter = 0, letterT = 0;
function climLoop() {
  const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  const k = SHOT ? 1 : 1 - Math.pow(0.35, dt);   // ~2.5 s cross-fade
  for (const key in C) C[key] += (CT[key] - C[key]) * k;
  // lightning (monsoon): double-flicker every 7-16 s
  nextBolt -= dt;
  if (C.light > 0.5 && nextBolt < 0 && !SHOT) { flash = 1; nextBolt = 7 + Math.random() * 9; setTimeout(() => flash = 0.8, 140); }
  flash *= Math.pow(0.0005, dt);
  const night = AERIAL.U ? AERIAL.U.uNight.value : 0;
  Object.assign(CL, { fog: C.fog, rain: C.rain, heat: C.heat, desat: C.desat, cool: C.cool, warm: C.warm, dark: C.dark, wet: C.wet, flash: flash * C.light * 0.35 });
  const P = pano.U; P.uFog.value = C.fog * 0.55; P.uHeat.value = C.heat; P.uDesat.value = C.desat; P.uCool.value = C.cool; P.uWarm.value = C.warm; P.uDark.value = C.dark + flash * C.light * -0.4; P.uWet.value = C.wet;
  letter += ((letterT) - letter) * (SHOT ? 1 : 1 - Math.pow(0.02, dt));
  const S = fx.S; S.rain = C.rain; S.fog = C.fog * (state.p ? 0.55 : 0.45); S.drops = C.drops * (state.p ? 1 : 0.5); S.flash = flash * C.light; S.night = night; S.warm = C.heat * 0.8;
  S.grain = state.p && film.classList.contains('on') ? 0.012 : MOBILE ? 0.035 : 0.05; // keep real footage crisp S.letter = letter; S.pan = state.p ? pano.yaw / 90 : 0;
  fx.render();
  if (!SHOT) requestAnimationFrame(climLoop);
}
climLoop();
window.__fxRender = () => climLoop();
function letterbox(on) { letterT = on ? 1 : 0; }

// ── auto tour: flies through every place, lingers, returns, moves on
const TOUR = ['bp', 'bageshwori', 'hanuman', 'tribhuvan', 'ranitalau', 'food', 'dhamboji', 'qfx', 'goldenabc', 'hope', 'bheri'];
let tour = null;
async function runTour() {
  const me = tour = { i: 0 };
  $('#tourBtn').classList.add('on');
  while (tour === me) {
    const p = byId[TOUR[me.i % TOUR.length]]; me.i++;
    await go(p); if (tour !== me) break;
    await new Promise(r => setTimeout(r, p.kind === 'aerial' ? 4500 : 11000)); if (tour !== me) break;
    if (state.p) await back(); else { showCard(null); state.aerialPlace = null; setMinDistance(); }
    await new Promise(r => setTimeout(r, 1200));
  }
}
function stopTour() { if (!tour) return; tour = null; $('#tourBtn').classList.remove('on'); }
$('#tourBtn').onclick = e => { e.stopPropagation(); if (tour) stopTour(); else runTour(); };
['pointerdown', 'wheel', 'keydown'].forEach(ev => addEventListener(ev, e => { if (tour && !e.target.closest?.('#tourBtn') && e.isTrusted) stopTour(); }, { capture: true }));

// ── boot
addPins(PLACES, go);
{ let c = Q.get('climate'); if (!c) try { c = localStorage.getItem('ngj-climate'); } catch { } setClimate(PRESET[c] ? c : 'clear', true); }
AERIAL.onReady = () => {
  $('#loader').classList.add('done');
  const h = location.hash.slice(1) || Q.get('place');
  if (h) {
    const p = byId[h] || PLACES.find(p => p.nodes && p.nodes.some(n => n.id === h));
    if (p) { if (p.nodes && p.nodes.some(n => n.id === h)) Q.set('node', h); setTimeout(() => go(p), SHOT ? 0 : 600); }
  }
};
start();
window.__x360 = { AERIAL, pano, go, back, PLACES, state, enterPlace, setClimate, fx, letterbox };
