import { CREDITS } from './credits-data.js';
import { HERO_VIDEO, SKY_CLIPS, PLACE_VIDEOS } from './media-config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;
const small = matchMedia('(max-width: 760px)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Loader ---------- */
const loader = $('#loader');
const loaderText = $('.loader-text');
const steps = ['Raising the temple roofs…', 'Filling the Bageshwori pond…', 'Lighting the sekuwa grills…', 'Namaste Nepalgunj'];
let si = 0; const stepTimer = setInterval(() => { si = Math.min(si + 1, steps.length - 1); loaderText.textContent = steps[si]; }, 550);
function hideLoader() { clearInterval(stepTimer); loader.classList.add('done'); setTimeout(() => loader.remove(), 900); }
setTimeout(hideLoader, 4500); // never block the page

/* ---------- Nav ---------- */
const nav = $('.nav');
$('.nav-toggle').addEventListener('click', e => { const o = nav.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
$$('.nav nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

/* ---------- Video helpers ---------- */
function makeVideo({ src, poster, alt = '', sources }) {
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: false, preload: 'none' });
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
  if (poster) v.poster = poster;
  if (alt) v.setAttribute('aria-label', alt);
  if (sources) sources.forEach(s => { const el = document.createElement('source'); el.src = s.src; el.type = s.type; v.appendChild(el); });
  else if (src) v.dataset.src = src;
  return v;
}
// Lazy-load & play videos only while visible (saves data, battery, CPU)
const vidObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting) {
      if (v.dataset.src && !v.src) { v.src = v.dataset.src; }
      if (!reduceMotion) v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  });
}, { rootMargin: '200px 0px', threshold: 0.15 });
const lazyVideo = v => { if (reduceMotion) v.removeAttribute('autoplay'); vidObserver.observe(v); };
$$('video.lazy-video').forEach(lazyVideo);

/* ---------- Hero video ---------- */
(function heroVideo() {
  const slot = $('[data-hero-video]'); if (!slot) return;
  $('[data-hero-credit]').textContent = HERO_VIDEO.credit || '';
  if (!HERO_VIDEO.enabled || reduceMotion || saveData) return;   // poster image stays as fallback
  const sources = [];
  if (HERO_VIDEO.webm && !small) sources.push({ src: HERO_VIDEO.webm, type: 'video/webm' });
  sources.push({ src: small && HERO_VIDEO.mp4Small ? HERO_VIDEO.mp4Small : HERO_VIDEO.mp4, type: 'video/mp4' });
  const v = makeVideo({ poster: HERO_VIDEO.poster, alt: HERO_VIDEO.caption, sources });
  v.className = 'hero-video'; v.preload = 'auto'; v.autoplay = true;
  v.addEventListener('playing', () => slot.classList.add('playing'), { once: true });
  slot.appendChild(v);
  v.play().catch(() => {});
  new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(slot);
})();

/* ---------- Sky gallery ---------- */
(function sky() {
  const g = $('#skyGallery'); if (!g) return;
  SKY_CLIPS.forEach((c, i) => {
    const fig = document.createElement('figure');
    fig.className = 'sky-clip reveal' + (i === 0 ? ' lead' : '') + (c.src ? '' : ' empty');
    fig.style.setProperty('--ar', c.aspect || '16/9');
    const frame = document.createElement('div'); frame.className = 'sky-frame';
    if (c.src) {
      const v = makeVideo({ src: c.src, poster: c.poster, alt: c.title });
      frame.appendChild(v); lazyVideo(v);
    } else {
      frame.innerHTML = `<img src="${esc(c.poster)}" alt="" loading="lazy" decoding="async"><span class="soon">Drone clip coming soon</span>`;
    }
    fig.appendChild(frame);
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<strong>${esc(c.title)}</strong><span>${esc(c.chapters || '')}</span>${c.credit ? `<em class="credit-line">${esc(c.credit)}</em>` : ''}`;
    fig.appendChild(cap);
    g.appendChild(fig);
  });
})();

/* ---------- Place videos ---------- */
(function places() {
  $$('[data-place-video]').forEach(card => {
    const h = PLACE_VIDEOS[card.dataset.placeVideo]; if (!h || !h.src) return;
    const media = $('.card-media', card);
    const v = makeVideo({ src: h.src, poster: h.poster, alt: h.title });
    media.innerHTML = ''; media.appendChild(v); lazyVideo(v);
    const set = (sel, val) => { const el = $(sel, card); if (el && val != null) el.textContent = val; };
    set('[data-pv-title]', h.title); set('[data-pv-location]', h.location); set('[data-pv-credit]', h.credit || '');
  });
  // Bageshwori Day/Night
  const b = PLACE_VIDEOS.bageshwori, sec = $('[data-daynight="bageshwori"]');
  if (b && sec) {
    const v = $('.dn-video', sec), tog = $('.dn-toggle', sec), lbl = $('[data-dn-label]', sec);
    $('[data-dn-credit]', sec).textContent = b.credit || '';
    const setMode = mode => {
      const m = b[mode]; if (!m) return;
      const wasPlaying = !v.paused;
      v.poster = m.poster; v.dataset.src = m.src; v.setAttribute('aria-label', m.alt || '');
      if (v.src) { v.src = m.src; if (wasPlaying) v.play().catch(() => {}); }
      lbl.textContent = mode === 'day' ? 'Day' : 'Night';
      sec.dataset.mode = mode;
      $$('.dn-btn', tog).forEach(x => x.classList.toggle('active', x.dataset.mode === mode));
    };
    setMode('day');
    if (b.night) { tog.hidden = false; $$('.dn-btn', tog).forEach(x => x.addEventListener('click', () => setMode(x.dataset.mode))); }
  }
  const rc = $('[data-rapti-credit]'); if (rc) rc.textContent = SKY_CLIPS[1]?.credit || '';
})();

/* ---------- Credits ---------- */
(function credits() {
  const ol = $('#creditList');
  ol.innerHTML = CREDITS.map(c => `<li><a href="${esc(c.page)}" target="_blank" rel="noopener">${esc(c.title.replace(/^File:/, ''))}</a> — ${esc(c.author)} · <a href="${esc(c.license_url)}" target="_blank" rel="noopener">${esc(c.license)}</a><span class="muted"> · ${esc(c.notes)}</span></li>`).join('');
  const vids = [HERO_VIDEO, ...SKY_CLIPS, ...Object.values(PLACE_VIDEOS)].map(x => x.credit).filter(Boolean);
  $('#videoCredits').innerHTML = [...new Set(vids)].map(c => `<li>🎥 ${esc(c)}</li>`).join('');
})();

/* ---------- Tilt cards ---------- */
if (!reduceMotion && matchMedia('(hover: hover)').matches) {
  $$('.tilt').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`); el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(x + 0.5) * 100}%`); el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

/* ---------- Scroll animations (GSAP if available, else IntersectionObserver) ---------- */
function initScroll() {
  const { gsap, ScrollTrigger } = window;
  if (gsap && ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('gsap');
    $$('.reveal').forEach(el => gsap.fromTo(el, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    $$('.parallax img').forEach(img => gsap.fromTo(img, { yPercent: -8, scale: 1.16 }, { yPercent: 8, scale: 1.16, ease: 'none', scrollTrigger: { trigger: img.closest('.parallax'), scrub: true } }));
    gsap.to('.hero-content', { yPercent: -30, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-media', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    const track = $('.wild-track');
    if (track) gsap.fromTo(track, { x: 0 }, { x: () => -(track.scrollWidth - innerWidth + 40), ease: 'none', scrollTrigger: { trigger: '.wild-strip', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    $$('.route .draw').forEach(p => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.route', start: 'top 75%', once: true } }); });
    $$('.timeline li').forEach(li => ScrollTrigger.create({ trigger: li, start: 'top 60%', end: 'bottom 40%', toggleClass: 'active' }));
    // count-up
    $$('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), o = { v: 0 };
      gsap.to(o, { v: end, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); } });
    });
    addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.1 });
    document.documentElement.classList.add('io');
    $$('.reveal').forEach(el => io.observe(el));
  }
}
if (document.readyState === 'complete') initScroll(); else addEventListener('load', initScroll);

/* ---------- 3D scene ---------- */
const sceneEl = $('#scene');
/* TikTok: load official embed only on click */
$$('.tiktok-slot').forEach(slot => $('.tiktok-load', slot).addEventListener('click', () => {
  slot.innerHTML = `<blockquote class="tiktok-embed" cite="${slot.dataset.tiktok}" data-video-id="${slot.dataset.id}" style="max-width:325px;min-width:280px;margin:0 auto"><section><a target="_blank" rel="noopener" href="${slot.dataset.tiktok}">@${slot.dataset.user} on TikTok</a></section></blockquote>`;
  if (window.tiktokEmbed?.lib?.render) { window.tiktokEmbed.lib.render(); }
  else if (!document.getElementById('tt-embed-js')) { const s = document.createElement('script'); s.id = 'tt-embed-js'; s.async = true; s.src = 'https://www.tiktok.com/embed.js'; document.body.appendChild(s); }
  else { document.getElementById('tt-embed-js').remove(); const s = document.createElement('script'); s.id = 'tt-embed-js'; s.async = true; s.src = 'https://www.tiktok.com/embed.js'; document.body.appendChild(s); }
}));
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
async function init3D() {
  if (!webglOK()) { sceneEl.classList.add('no-webgl'); hideLoader(); return; }
  try {
    const { createScene } = await import('./scene.js');
    const sunRead = $('#sunRead'), clockRead = $('#clockRead'), slider = $('#hour'), fps = $('#fps'), compassNeedle = $('#compass i');
    const fmt = h => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
    const app = createScene(sceneEl, {
      hour: +slider.value,
      onSun: ({ hour, el, az, night }) => {
        sunRead.textContent = `az ${az.toFixed(0)}° · alt ${el.toFixed(0)}°`;
        clockRead.textContent = fmt(hour) + ' NPT';
        if (document.activeElement !== slider) slider.value = hour;
        $('#explore').classList.toggle('is-night', night > 0.5);
      },
      onFps: f => { fps.textContent = `${f} fps`; }
    });
    sceneEl.classList.add('ready');
    hideLoader();
    slider.addEventListener('input', () => app.setHour(+slider.value));
    const fbtn = $('#followSun'); let following = false;
    fbtn.addEventListener('click', () => { following = !following; app.setFollow(following); fbtn.classList.toggle('on', following); fbtn.textContent = following ? '❚❚ Pause sun' : '▶ Follow the sun'; });
    $('#nowBtn').addEventListener('click', () => {
      const now = new Date(), npt = (now.getUTCHours() + now.getUTCMinutes() / 60 + 5.75) % 24;
      app.setHour(npt);
    });
    $$('[data-view]').forEach(b => b.addEventListener('click', () => { app.goTo(b.dataset.view); $$('[data-view]').forEach(x => x.classList.toggle('active', x === b)); }));
    const tg = (id, fn) => { const b = $(id); b.addEventListener('click', () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); fn(on); }); };
    tg('#tglLabels', on => app.setLabels(on)); tg('#tglTraffic', on => app.setTraffic(on)); tg('#tglRotate', on => app.setAutoRotate(on));
    const panel = $('#panel');
    $('.panel-min').addEventListener('click', () => panel.classList.toggle('min'));
    addEventListener('keydown', e => { if ((e.key === 'h' || e.key === 'H') && !/input|textarea/i.test(document.activeElement.tagName)) panel.classList.toggle('hidden'); });
    // pause rendering when off-screen
    new IntersectionObserver(([e]) => e.isIntersecting ? app.start() : app.stop(), { threshold: 0 }).observe(sceneEl);
    // compass follows camera heading
    const tick = () => { const c = app.camera, t = app.controls.target; const a = Math.atan2(c.position.x - t.x, c.position.z - t.z); compassNeedle.parentElement.style.transform = `rotate(${a}rad)`; requestAnimationFrame(tick); };
    tick();
    window.__nepalgunj3d = app;
  } catch (err) {
    console.warn('3D scene failed to start:', err);
    sceneEl.classList.add('no-webgl'); hideLoader();
  }
}
// Start 3D once the browser is idle (hero video first)
if (sceneEl) ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(init3D, { timeout: 1200 });
else setTimeout(hideLoader, 600);
