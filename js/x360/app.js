import { AERIAL, start, addPins, flyTo, setHour, setEnabled, setMinDistance } from './aerial.js';
import { createPano } from './pano.js';
import { PLACES } from './places.js';
import { toX, toZ } from '../w3d/imagery.js';

const Q = new URLSearchParams(location.search); const SHOT = Q.has('shot');
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, SHOT ? 0 : ms));
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.documentElement.classList.add('touch');
const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
const clipUrl = n => `assets/videos/c/${n}.mp4`, clipPoster = n => `assets/videos/c/${n}-poster.webp`;
const thumbOf = p => p.kind === 'pano' ? `assets/pano/${p.nodes[0].id}-thumb.webp` : p.clips ? clipPoster(p.clips[0]) : 'assets/videos/drone1-poster.webp';

// ── bearings from BP Chowk sky node to other places (real compass directions)
for (const p of PLACES) if (p.kind === 'pano') for (const n of p.nodes) {
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
$('#drawer ul').innerHTML = PLACES.map(p => `<li><button data-id="${p.id}"><img src="${thumbOf(p)}" alt="" loading="lazy"><span><b>${p.name}</b><small>${p.dev}</small></span>${p.kind === 'pano' ? '<em class="tag p">360°</em>' : p.kind === 'film' ? '<em class="tag">Film</em>' : '<em class="tag">Aerial</em>'}</button></li>`).join('');
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
  if (p.kind === 'pano' && p.nodes.length > 1) {
    for (const n of p.nodes) {
      const b = document.createElement('button'); b.className = n.id === cur ? 'on' : ''; b.setAttribute('aria-label', n.label);
      b.innerHTML = `<img src="assets/pano/${n.id}-thumb.webp" alt=""><span>${n.label}</span>`;
      b.onclick = () => showNode(p, n); nodesEl.appendChild(b);
    }
  } else if (p.kind === 'film' && p.clips.length > 1) {
    nodesEl.className = 'dots';
    p.clips.forEach((c, i) => { const b = document.createElement('button'); b.className = i === cur ? 'on' : ''; b.setAttribute('aria-label', 'Clip ' + (i + 1)); b.onclick = () => playClip(p, i); nodesEl.appendChild(b); });
  }
}
async function showNode(p, n, first) {
  state.node = n; nodeStrip(p, n.id);
  history.replaceState(null, '', '#' + n.id);
  await pano.show(n, { look: n.start, cut: first });
  pano.setAuto(false);
}
function playClip(p, i) {
  const c = p.clips[i]; nodeStrip(p, i);
  vfg.poster = clipPoster(c); vbg.poster = clipPoster(c);
  vfg.src = clipUrl(c); vbg.src = clipUrl(c);
    const pl = v => v.play().catch(() => { });
  pl(vfg); pl(vbg);
  history.replaceState(null, '', '#' + p.id);
}
pano.onHot(h => {
  if (h.node) { showNode(state.p, state.p.nodes.find(n => n.id === h.node)); return; }
  if (h.place) { const q = byId[h.place]; if (q.kind === 'aerial') { back().then(() => go(q)); } else enterPlace(q, true); }
});
async function enterPlace(p, direct) {
  state.p = p; document.body.classList.add('inplace');
  place.classList.toggle('film', p.kind === 'film');
  ptag.textContent = p.kind === 'pano' ? '360°' : 'Real footage'; ptag.className = p.kind === 'pano' ? '' : 'f';
  setTitle(p);
  if (p.kind === 'pano') {
    film.classList.remove('on'); vfg.pause(); vbg.pause(); vfg.removeAttribute('src'); vbg.removeAttribute('src');
    panoCanvas.style.display = ''; $('#hots').style.display = '';
    const n = (Q.get('node') && p.nodes.find(n => n.id === Q.get('node'))) || p.nodes[0];
    pano.start();
    if (!direct) { pano.snapFov(108); pano.pitch = -38; }
    await showNode(p, n, !direct);
    if (!direct) { pano.pitch = -38; pano.fov = 75; animPitch(n.start[1]); }
    $('#phint').classList.add('on'); setTimeout(() => $('#phint').classList.remove('on'), 3200);
  } else {
    pano.stop(); panoCanvas.style.display = 'none'; $('#hots').style.display = 'none';
    film.classList.add('on'); playClip(p, 0);
  }
  place.classList.add('on'); place.setAttribute('aria-hidden', 'false');
  setEnabled(false);
}
function animPitch(to) { const from = pano.pitch, t0 = performance.now(); const st = () => { const k = Math.min(1, (performance.now() - t0) / 2200); const e = 1 - Math.pow(1 - k, 3); pano.pitch = from + (to - from) * e; if (k < 1 && !SHOT) requestAnimationFrame(st); }; if (SHOT) pano.pitch = to; else st(); }

async function go(p) {
  if (state.flying) return; showCard(null); $('#hint').style.opacity = 0;
  if (p.lat == null) { enterPlace(p, true); return; }
  state.flying = true; document.body.classList.add('flying');
  const x = toX(p.lon), z = toZ(p.lat);
  if (p.kind === 'aerial') {
    setMinDistance();
    await flyTo(x, z, { dist: 900, polar: 0.8, dur: SHOT ? 0.01 : 2.6 });
    state.flying = false; document.body.classList.remove('flying'); state.aerialPlace = p; showCard(p);
    history.replaceState(null, '', '#' + p.id);
    return;
  }
  setMinDistance(500);
  if (p.kind === 'pano') pano.preload(p.nodes[0].id).catch(() => { });
  const dur = SHOT ? 0.01 : 2.4;
  const fly = flyTo(x, z, { dist: 640, polar: 0.32, dur, lock: true });
  await sleep(dur * 1000 - 800); $('#flash').classList.add('on');
  await fly; await enterPlace(p, false);
  await sleep(250); $('#flash').classList.remove('on');
  state.flying = false; document.body.classList.remove('flying');
}
async function back() {
  if (!state.p) return;
  const p = state.p; state.p = null;
  place.classList.remove('on'); place.setAttribute('aria-hidden', 'true'); document.body.classList.remove('inplace');
  setEnabled(true); pano.stop(); vfg.pause(); vbg.pause();
  history.replaceState(null, '', location.pathname + location.search);
  setMinDistance(); state.flying = true;
  if (p.lat != null) await flyTo(toX(p.lon), toZ(p.lat), { dist: 1300, polar: 0.92, dur: SHOT ? 0.01 : 2.4 });
  state.flying = false;
  setTimeout(() => { vfg.removeAttribute('src'); vbg.removeAttribute('src'); }, 1200);
}
$('#back').onclick = back;
addEventListener('keydown', e => { if (e.key === 'Escape') { if (state.p) back(); else if (state.aerialPlace) { showCard(null); state.aerialPlace = null; setMinDistance(); } } });
AERIAL.onFrame = (h, dist) => { if (state.aerialPlace && !state.flying && dist > 1100) { showCard(null); state.aerialPlace = null; setMinDistance(); } };
$('#gyroBtn').onclick = async () => { const b = $('#gyroBtn'); if (pano.gyroOn) { pano.disableGyro(); b.classList.remove('on'); } else if (await pano.enableGyro()) b.classList.add('on'); };
$('#fsBtn').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => { }); };

// ── boot
addPins(PLACES, go);
AERIAL.onReady = () => {
  $('#loader').classList.add('done');
  const h = location.hash.slice(1) || Q.get('place');
  if (h) {
    const p = byId[h] || PLACES.find(p => p.nodes && p.nodes.some(n => n.id === h));
    if (p) { if (p.nodes && p.nodes.some(n => n.id === h)) Q.set('node', h); setTimeout(() => go(p), SHOT ? 0 : 600); }
  }
};
start();
window.__x360 = { AERIAL, pano, go, back, PLACES, state, enterPlace };
