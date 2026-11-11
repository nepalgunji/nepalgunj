/* Nepalgunj — a scroll film. Real footage is the picture; the 3D OSM map is the connective tissue. */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS as BASE, PLACE_FACTS } from '../cine/chapters.js';
import { SCENES } from './scenes.js';
gsap.registerPlugin(ScrollTrigger);

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const mobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
const STILL = new URLSearchParams(location.search).has('still');
if (STILL) document.documentElement.classList.add('still');

/* chapters: the shared text + a 'plan' chapter for the map */
const CH = BASE.map(c => ({ ...c }));
CH[0].body = ['Scroll to travel through the city — footage filmed in Nepalgunj, stitched together by its real street plan.'];
CH.splice(1, 0, { id: 'plan', kicker: 'The street plan', title: 'Thirteen thousand roofs', dev: 'शहरको नक्सा',
  lede: 'Every lane, pond and building footprint of the city core, as mapped by OpenStreetMap contributors.',
  body: ['Temples and ponds sit inside a dense grid of bazaars; the broad Surkhet Road axis links the big chowks. Follow the gold marker through the chapters.'],
  cam: { hour: 7.0 }, labels: ['bageshwori', 'tribhuvan', 'ranitalau', 'dhamboji', 'bpchowk', 'masjid'] });
const hours = CH.map(c => c.cam.hour);

/* ---------- DOM ---------- */
const src = o => (mobile && o.m) ? o.m : o.v;
function frameHTML(f) {
  if (f.img) return `<figure class="frame photo${f.tall ? ' tall' : ''}"><img loading="lazy" src="${f.img}" alt=""></figure>`;
  return `<figure class="frame${f.wide ? ' wide' : ''}"><video muted loop playsinline preload="none" poster="${f.p}" data-src="${src(f)}"></video></figure>`;
}
function build() {
  const story = $('#story'), stage = $('#stage'), dots = $('#dots');
  CH.forEach((c, i) => {
    const S = SCENES[c.id] || { bg: { mode: 'map' } };
    // stage layer
    const sc = document.createElement('div'); sc.className = 'scene mode-' + S.bg.mode; sc.dataset.i = i;
    const b = S.bg;
    if (b.mode === 'full' || b.mode === 'scrub') sc.innerHTML = `<video class="bg" muted ${b.mode === 'scrub' && !mobile ? 'preload="auto"' : 'loop preload="none"'} playsinline poster="${b.p}" data-src="${src(b)}"></video>`;
    else if (b.mode === 'column') sc.innerHTML = `<img class="blur" src="${b.p}" alt=""><video class="col" muted loop playsinline preload="none" poster="${b.p}" data-src="${src(b)}"></video>`;
    else if (b.mode === 'photo') sc.innerHTML = `<img class="bg kb" src="${b.img}" alt="">`;
    sc.insertAdjacentHTML('beforeend', '<div class="shade"></div>');
    stage.appendChild(sc);
    // story section
    const sec = document.createElement('section'); sec.className = 'chapter ch-' + c.id; sec.id = c.id; sec.dataset.i = i;
    const gallery = c.gallery ? `<div class="gallery">${c.gallery.map(([s, cap]) => `<figure><img loading="lazy" src="${s.replace('-sm.webp', '.webp')}" alt="${cap}"><figcaption>${cap}<span>representative photo</span></figcaption></figure>`).join('')}</div>` : '';
    sec.innerHTML = `<div class="panel${i === 0 ? ' hero' : ''}">
        <p class="kicker">${c.kicker}</p><h2>${c.title}</h2><p class="dev">${c.dev}</p>
        <p class="lede">${c.lede}</p>${c.body.map(t => `<p>${t}</p>`).join('')}
        ${i === 0 ? '<p class="scroll-cue"><span></span>Scroll</p>' : ''}</div>
      ${S.frames ? `<div class="frames">${S.frames.map(frameHTML).join('')}</div>` : ''}${gallery}`;
    story.appendChild(sec);
    const d = document.createElement('button'); d.title = c.title; d.setAttribute('aria-label', c.title); d.onclick = () => lenis.scrollTo(sec, { duration: 2 }); dots.appendChild(d);
  });
}
build();

/* ---------- scroll ---------- */
const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
$$('.chapter').forEach(sec => {
  const els = sec.querySelectorAll('.panel > *, .frame, .gallery figure');
  gsap.fromTo(els, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.07,
    scrollTrigger: { trigger: sec, start: 'top 75%', toggleActions: 'play none none reverse' } });
  sec.querySelectorAll('.frame').forEach((f, k) => gsap.fromTo(f, { yPercent: 12 + k * 8 }, { yPercent: -10 - k * 6, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } }));
});
// framed clips play while visible
const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } else if (!v.paused) v.pause(); }), { threshold: 0.2 });
$$('.frame video').forEach(v => io.observe(v));

/* ---------- active scene ---------- */
const scenes = $$('.scene'), secs = $$('.chapter');
let active = -1, mapApi = null;
function load(v) { if (v && !v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; v.preload = 'auto'; } }
function setActive(i) {
  if (i === active) return; active = i;
  scenes.forEach((s, j) => {
    const on = j === i; s.classList.toggle('on', on);
    const v = s.querySelector('video');
    if (on) { load(v); if (v && !s.classList.contains('mode-scrub')) v.play().catch(() => {}); if (v && s.classList.contains('mode-scrub') && mobile) { v.loop = true; v.play().catch(() => {}); } }
    else if (v && !v.paused) v.pause();
    if (j === i + 1) load(v);                      // warm the next one
    else if (v && v.getAttribute('src') && Math.abs(j - i) > 1) { v.pause(); v.removeAttribute('src'); v.load(); }   // free decoders far away
  });
  secs.forEach((sec, j) => { if (Math.abs(j - i) > 1) sec.querySelectorAll('.frame video').forEach(v => { if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); } }); });
  $$('#dots button').forEach((d, j) => d.classList.toggle('on', j === i));
  const S = SCENES[CH[i].id] || {};
  document.body.dataset.chapter = CH[i].id;
  mapApi?.show(S.bg?.mode === 'map' ? 'full' : 'inset', S.map, CH[i].labels);
  $('#diyas').classList.toggle('on', !!S.diyas);
}
function onScroll() {
  const mid = scrollY + innerHeight * 0.55;
  let i = 0; for (let k = 0; k < secs.length; k++) if (secs[k].offsetTop <= mid) i = k;
  setActive(i);
  const sec = secs[i], p = Math.min(1, Math.max(0, (mid - sec.offsetTop) / sec.offsetHeight));
  const s = scenes[i];
  // slow push-in on stills / full-bleed footage
  const bg = s.querySelector('.bg'); if (bg && !s.classList.contains('mode-scrub')) bg.style.transform = `scale(${1.12 - p * 0.1}) translate3d(0, ${(p - 0.5) * -2}%, 0)`;
  // scrub the Dhamboji drone flight with the scroll (desktop)
  if (s.classList.contains('mode-scrub') && !mobile) { const v = s.querySelector('video'); if (v.readyState >= 1 && v.duration) { const t = Math.min(v.duration - 0.05, p * v.duration); if (Math.abs(v.currentTime - t) > 0.03) v.currentTime = t; } }
  // time of day between chapter hours
  const h = hours[i] + (hours[Math.min(i + 1, hours.length - 1)] - hours[i]) * Math.max(0, (p - 0.5) * 2);
  tod(h);
}
const TOD = [[5.5, [40, 50, 90], 0.35], [6.6, [255, 150, 120], 0.16], [8.5, [255, 230, 190], 0.06], [12, [255, 245, 230], 0.0], [16, [255, 190, 110], 0.10], [17.6, [255, 130, 60], 0.18], [18.7, [60, 50, 110], 0.28], [20.5, [15, 20, 55], 0.36]];
function tod(h) {
  let a = TOD[0], b = TOD[TOD.length - 1];
  for (let k = 0; k < TOD.length - 1; k++) if (h >= TOD[k][0] && h <= TOD[k + 1][0]) { a = TOD[k]; b = TOD[k + 1]; break; }
  const t = Math.min(1, Math.max(0, (h - a[0]) / ((b[0] - a[0]) || 1)));
  const c = a[1].map((v, k) => Math.round(v + (b[1][k] - v) * t)), o = a[2] + (b[2] - a[2]) * t;
  $('#tod').style.background = `rgba(${c.join(',')},${o.toFixed(3)})`;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  $('#clock b').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('#clock i').style.setProperty('--r', `${(h / 24) * 360 - 90}deg`);
  $('#clock span').textContent = h < 6.9 ? 'Dawn' : h < 15.5 ? 'Day' : h < 18.2 ? 'Golden hour' : 'Night';
}
lenis.on('scroll', onScroll); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
onScroll();

/* ---------- diyas: warm floating lamp bokeh over the festival chapter ---------- */
(function diyas() {
  const cv = $('#diyas'), g = cv.getContext('2d'); let W, H; const P = Array.from({ length: mobile ? 26 : 50 }, () => ({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 7, s: 0.2 + Math.random() * 0.6, f: Math.random() * 6 }));
  const size = () => { W = cv.width = innerWidth * 0.5; H = cv.height = innerHeight * 0.5; }; size(); addEventListener('resize', size);
  (function loop(t) { if (cv.classList.contains('on') && !STILL) { g.clearRect(0, 0, W, H); for (const p of P) { p.y -= p.s * 0.0006; if (p.y < -0.05) p.y = 1.05; const x = (p.x + Math.sin(t * 0.0003 + p.f) * 0.01) * W, y = p.y * H, fl = 0.6 + 0.4 * Math.sin(t * 0.006 + p.f * 9);
      const gr = g.createRadialGradient(x, y, 0, x, y, p.r * 3); gr.addColorStop(0, `rgba(255,190,90,${0.55 * fl})`); gr.addColorStop(0.35, `rgba(255,140,40,${0.22 * fl})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, p.r * 3, 0, 7); g.fill(); } }
    requestAnimationFrame(loop); })(0);
  if (STILL) { size(); for (const p of P) { const x = p.x * W, y = p.y * H; const gr = g.createRadialGradient(x, y, 0, x, y, p.r * 3); gr.addColorStop(0, 'rgba(255,190,90,.5)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, p.r * 3, 0, 7); g.fill(); } }
})();

/* ---------- info card ---------- */
export function openCard(id, approx) {
  const f = PLACE_FACTS[id]; if (!f) return; const c = $('#card');
  c.innerHTML = `<button class="x" aria-label="Close">×</button><h3>${f.name}</h3>${f.facts.map(t => `<p>${t}</p>`).join('')}${approx ? '<p class="note">Shown at the edge of the map — not to scale.</p>' : ''}`;
  c.classList.add('on'); c.querySelector('.x').onclick = () => c.classList.remove('on');
}
document.addEventListener('click', e => { if (!e.target.closest('#card') && !e.target.closest('.hot')) $('#card').classList.remove('on'); });

/* ---------- 3D map (lazy, after first paint) ---------- */
const ready = () => { document.body.classList.add('ready'); document.body.dataset.ready = '1'; };
const firstPoster = new Image(); firstPoster.src = SCENES.intro.bg.p; firstPoster.decode().catch(() => {}).finally(() => setTimeout(ready, 300));
(async () => {
  try {
    const { makeMap } = await import('./map.js');
    mapApi = await makeMap($('#map'), $('#maplabels'), { mobile, still: STILL, openCard });
    const S = SCENES[CH[active].id] || {}; mapApi.show(S.bg?.mode === 'map' ? 'full' : 'inset', S.map, CH[active].labels, true);
    document.body.dataset.map = '1';
  } catch (e) { console.warn('map unavailable', e); }
})();

/* test hooks for headless screenshots */
window.__film = {
  chapters: CH.map(c => c.id),
  goto(id, f = 0.35) { const sec = document.getElementById(id); const y = sec.offsetTop + sec.offsetHeight * f - innerHeight * 0.55; lenis.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); onScroll(); ScrollTrigger.update(); },
  render() { mapApi?.renderNow(); mapApi?.renderNow(); },
  get mapReady() { return !!mapApi; }
};
