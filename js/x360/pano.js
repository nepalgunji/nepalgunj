// Lightweight equirectangular 360° viewer: full-screen ray shader (no sphere seams),
// drag / inertia look-around, wheel + pinch zoom, gyro, HTML hotspots.
import * as THREE from 'three';
const DEG = Math.PI / 180, clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const Q = new URLSearchParams(location.search); const SHOT = Q.has('shot');

export function createPano(canvas, hotLayer) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: SHOT, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const maxTex = renderer.capabilities.maxTextureSize;
  const scene = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = {
    tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uYaw0A: { value: 0 }, uYaw0B: { value: 0 }, uSpanA: { value: new THREE.Vector2(2 * Math.PI, Math.PI) }, uSpanB: { value: new THREE.Vector2(2 * Math.PI, Math.PI) },
    uInvPV: { value: new THREE.Matrix4() }, uFade: { value: 1 }, uGrade: { value: 1 }, uTime: { value: 0 },
    uDesat: { value: 0 }, uCool: { value: 0 }, uWarm: { value: 0 }, uDark: { value: 0 }, uHeat: { value: 0 }, uFog: { value: 0 }, uWet: { value: 0 }, uNight: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `precision highp float; varying vec2 vNdc;
      uniform sampler2D tA, tB; uniform vec2 uSpanA, uSpanB; uniform float uMix, uYaw0A, uYaw0B, uFade, uGrade, uTime, uDesat, uCool, uWarm, uDark, uHeat, uFog, uWet, uNight; uniform mat4 uInvPV;
      const float PI = 3.14159265;
      vec3 samp(sampler2D t, vec3 d, float yaw0, vec2 span){
        float az = atan(d.x, -d.z);            // 0 = north / forward, clockwise
        float el = asin(clamp(d.y,-1.0,1.0));
        if (span.x > 6.0) return texture2D(t, vec2(fract((az - yaw0)/(2.0*PI)), 0.5 + el/PI)).rgb;
        // partial panorama: yaw0 = left edge, span = (horizontal, vertical) angular size
        float da = mod(az - yaw0 + 4.0*PI, 2.0*PI);
        vec2 uv = vec2(da / span.x, 0.5 + el / span.y);
        vec3 c = texture2D(t, clamp(uv, 0.001, 0.999)).rgb;
        float m = step(0.0, uv.x)*step(uv.x, 1.0)*step(0.0, uv.y)*step(uv.y, 1.0);
        return mix(c*0.15, c, m);
      }
      void main(){
        vec4 p = uInvPV * vec4(vNdc, 1.0, 1.0); vec3 d = normalize(p.xyz / p.w);
        // summer heat shimmer near the horizon
        if (uHeat > 0.01) { float hb = smoothstep(0.25, 0.0, abs(d.y + 0.05));
          d.x += uHeat*hb*0.0025*sin(d.y*420.0 + uTime*7.0 + d.x*30.0); d.y += uHeat*hb*0.0018*sin(d.x*260.0 - uTime*5.0); d = normalize(d); }
        vec3 c = samp(tA, d, uYaw0A, uSpanA);
        if (uMix > 0.001) c = mix(c, samp(tB, d, uYaw0B, uSpanB), uMix);
        float l = dot(c, vec3(0.2126,0.7152,0.0722));
        // climate grade
        c = mix(c, vec3(l), uDesat);
        c *= mix(vec3(1.0), vec3(0.86, 0.95, 1.1), uCool);
        c *= mix(vec3(1.0), vec3(1.1, 1.0, 0.84), uWarm);
        c = mix(c, c*c*1.25, uWet*0.35);                    // wet: deeper, more contrast
        c *= 1.0 - 0.55*uDark;
        // fog: thicker toward the horizon and below it (distance), lighter overhead
        float fh = 1.0 - smoothstep(-0.05, 0.55, d.y);
        float fn = 0.75 + 0.25*sin(d.x*6.0 + uTime*0.05) * sin(d.z*5.0 - uTime*0.04);
        vec3 fogC = mix(vec3(0.78, 0.8, 0.82), vec3(0.18, 0.2, 0.24), uNight);
        c = mix(c, fogC*(1.0-0.4*uDark), clamp(uFog * (0.25 + 0.6*fh) * fn, 0.0, 0.9));
        // gentle cinematic grade + vignette
        c = mix(c, smoothstep(0.0, 1.0, c), 0.22*uGrade);
        c *= mix(vec3(1.0), vec3(1.03, 1.0, 0.96), 0.5*uGrade);
        float vg = smoothstep(1.6, 0.5, length(vNdc*vec2(0.85,1.0)));
        c *= mix(0.74, 1.0, vg);
        gl_FragColor = vec4(c * uFade, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const view = new THREE.PerspectiveCamera(75, 1, 0.1, 10);
  let yaw = 0, pitch = 0, fov = 75, vYaw = 0, vPitch = 0, tFov = 75, auto = !SHOT, idle = 0;
  let gyro = null, gyroBase = null, enabled = false, raf = 0, last = performance.now();
  let intro = null; let range = null, autoDir = 1; // cinematic entry move: { t, dur, y0, y1, p0, p1, f0, f1 }
  let video = null, vtex = null;
  function stopVideo() { if (video) { video.pause(); video.removeAttribute('src'); video.load(); video = null; } if (vtex) { vtex.dispose(); vtex = null; } }
  function playVideo(url, yaw0) {
    stopVideo(); if (SHOT) return;
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.crossOrigin = 'anonymous'; v.preload = 'auto';
    v.src = url; video = v;
    const go = () => { if (video !== v) return; vtex = new THREE.VideoTexture(v); vtex.colorSpace = THREE.SRGBColorSpace; vtex.generateMipmaps = false; vtex.minFilter = THREE.LinearFilter; vtex.wrapS = THREE.RepeatWrapping;
      U.tB.value = vtex; U.uYaw0B.value = yaw0; U.uSpanB.value.set(2 * Math.PI, Math.PI); U.uMix.value = 0; tween(1.2, k => U.uMix.value = k).then(() => { if (video !== v) return; U.tA.value = vtex; U.uYaw0A.value = yaw0; U.uSpanA.value.set(2 * Math.PI, Math.PI); U.uMix.value = 0; }); };
    v.addEventListener('playing', go, { once: true });
    v.play().catch(() => { });
  }
  const hots = []; let onHot = null;
  const loader = new THREE.TextureLoader(); const cache = new Map();
  function load(url) {
    if (cache.has(url)) return cache.get(url);
    const p = new Promise((res, rej) => loader.load(url, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 1; res(t);
    }, undefined, rej));
    cache.set(url, p); return p;
  }
  const urlFor = (id, big) => `assets/pano/${id}${big && maxTex >= 4096 ? '' : '-2k'}.webp`;
  const partial = new Set();
  async function show(node, opts = {}) {
    const big = !opts.small;
    const span = node.span ? [node.span[0] * DEG, node.span[1] * DEG] : [2 * Math.PI, Math.PI];
    const small = await load(urlFor(node.id, false)); // fast first paint
    if (U.tA.value && !opts.cut) {
      U.tB.value = small; U.uYaw0B.value = (node.yaw0 || 0) * DEG; U.uSpanB.value.set(...span); U.uMix.value = 0;
      await tween(0.9, k => U.uMix.value = k);
      U.tA.value = U.tB.value; U.uYaw0A.value = U.uYaw0B.value; U.uSpanA.value.copy(U.uSpanB.value); U.uMix.value = 0;
    } else { U.tA.value = small; U.uYaw0A.value = (node.yaw0 || 0) * DEG; U.uSpanA.value.set(...span); }
    if (opts.look) { yaw = opts.look[0]; pitch = opts.look[1]; }
    setHots(node.hots || []);
    range = node.range || null;
    stopVideo();
    if (node.video) { const net = navigator.connection || {}, slow = net.saveData || /2g|3g/.test(net.effectiveType || ''); const mob = Math.min(innerWidth, innerHeight) < 600 || maxTex < 4096 || slow; const big = !mob && Math.max(screen.width, screen.height) * Math.min(devicePixelRatio || 1, 2) >= 1800 && !((net.downlink || 99) < 6); playVideo(`assets/pano/v/${node.id}-${mob ? 1920 : big ? 3840 : 2880}.mp4`, (node.yaw0 || 0) * DEG); return; }
    if (big && maxTex >= 4096) load(urlFor(node.id, true)).then(t => { if (U.tA.value === small && !U.uMix.value) U.tA.value = t; }).catch(() => { });
  }
  function tween(d, f) { return new Promise(r => { const t0 = performance.now(); const st = () => { const k = clamp((performance.now() - t0) / (d * 1000), 0, 1); f(k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(st); else r(); }; st(); }); }
  function setHots(list) {
    hotLayer.innerHTML = ''; hots.length = 0;
    for (const h of list) {
      const el = document.createElement('button'); el.className = 'hot' + (h.cls ? ' ' + h.cls : '');
      el.innerHTML = `<i></i><span>${h.label}</span>`; el.setAttribute('aria-label', h.label);
      el.onclick = e => { e.stopPropagation(); onHot && onHot(h); };
      hotLayer.appendChild(el); hots.push({ h, el, v: new THREE.Vector3(Math.sin(h.yaw * DEG) * Math.cos(h.pitch * DEG), Math.sin(h.pitch * DEG), -Math.cos(h.yaw * DEG) * Math.cos(h.pitch * DEG)) });
    }
  }
  // ── input
  let drag = null; const pts = new Map();
  canvas.addEventListener('pointerdown', e => { intro = null; canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, t: performance.now() }; vYaw = vPitch = 0; auto = false; idle = 0; if (pts.size === 2) pinch0 = null; });
  let pinch0 = null;
  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) tFov = clamp(tFov * pinch0 / d, 30, 100); pinch0 = d; fov = tFov; return; }
    if (!drag) return; const k = fov / innerHeight; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const now = performance.now(), dtm = Math.max(1, now - drag.t);
    yaw -= dx * k; pitch = clamp(pitch + dy * k, -85, 85);
    vYaw = -dx * k / dtm * 16; vPitch = dy * k / dtm * 16; drag = { x: e.clientX, y: e.clientY, t: now }; idle = 0;
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size === 0) drag = null; pinch0 = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); intro = null; tFov = clamp(tFov * Math.exp(e.deltaY * 0.0012), 30, 100); auto = false; idle = 0; }, { passive: false });
  addEventListener('keydown', e => { if (!enabled) return; const s = 6; if (e.key === 'ArrowLeft') yaw -= s; if (e.key === 'ArrowRight') yaw += s; if (e.key === 'ArrowUp') pitch = clamp(pitch + s, -85, 85); if (e.key === 'ArrowDown') pitch = clamp(pitch - s, -85, 85); if (e.key === '+' || e.key === '=') tFov = clamp(tFov - 8, 30, 100); if (e.key === '-') tFov = clamp(tFov + 8, 30, 100); auto = false; idle = 0; });
  // gyro
  function onOri(e) { if (e.alpha == null) return; gyro = [e.alpha, e.beta, e.gamma]; }
  async function enableGyro() {
    try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false; } } catch { return false; }
    addEventListener('deviceorientation', onOri); gyroBase = null; auto = false; return true;
  }
  function disableGyro() { removeEventListener('deviceorientation', onOri); gyro = null; gyroBase = null; }
  const zee = new THREE.Vector3(0, 0, 1), eul = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), qs = new THREE.Quaternion();
  const fwd = new THREE.Vector3();
  function gyroLook() {
    const [a, b, g] = gyro; const orient = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    eul.set(b * DEG, a * DEG, -g * DEG, 'YXZ'); qs.setFromEuler(eul); qs.multiply(q1); qs.multiply(q0.setFromAxisAngle(zee, -orient * DEG));
    fwd.set(0, 0, -1).applyQuaternion(qs);
    const gy = Math.atan2(fwd.x, -fwd.z) / DEG, gp = Math.asin(clamp(fwd.y, -1, 1)) / DEG;
    if (!gyroBase) gyroBase = { yaw: yaw - gy };
    yaw = gy + gyroBase.yaw; pitch = clamp(gp, -85, 85);
  }
  // ── render
  const _v = new THREE.Vector3();
  function render() {
    const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    U.uTime.value = now / 1000;
    if (intro && !drag && !gyro) {
      intro.t = Math.min(1, intro.t + dt / intro.dur); const k = 1 - Math.pow(1 - intro.t, 3), k2 = intro.t * intro.t * (3 - 2 * intro.t);
      yaw = intro.y0 + (intro.y1 - intro.y0) * k2; pitch = intro.p0 + (intro.p1 - intro.p0) * k; fov = tFov = intro.f0 + (intro.f1 - intro.f0) * k;
      if (intro.t >= 1) { intro = null; idle = 0; }
    } else if (gyro) gyroLook();
    else if (!drag) {
      yaw += vYaw; pitch = clamp(pitch + vPitch, -85, 85); vYaw *= Math.pow(0.04, dt); vPitch *= Math.pow(0.04, dt);
      idle += dt; if (idle > 6 && !SHOT) auto = true; if (auto) yaw += autoDir * dt * 2.0 * Math.min(1, (idle - 6) / 3 + 0.001);
    }
    fov += (tFov - fov) * (SHOT ? 1 : 1 - Math.pow(0.002, dt));
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * renderer.getPixelRatio()) || canvas.height !== Math.round(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
    view.aspect = W / H; view.fov = W < H ? Math.min(100, fov * 1.25) : fov; view.updateProjectionMatrix();
    if (range) { // partial (stitched) panorama: keep the view inside the real imagery
      view.fov = Math.min(view.fov, (range[3] - range[2]) * 0.98); view.updateProjectionMatrix();
      const hf = Math.atan(Math.tan(view.fov * DEG / 2) * view.aspect) / DEG, vf = view.fov / 2;
      const [y0, y1, p0, p1] = range; const span = y1 - y0;
      if (span < hf * 2) yaw = (y0 + y1) / 2; else { if (yaw < y0 + hf) { yaw = y0 + hf; autoDir = 1; vYaw = 0; } if (yaw > y1 - hf) { yaw = y1 - hf; autoDir = -1; vYaw = 0; } }
      if (p1 - p0 < vf * 2) pitch = (p0 + p1) / 2; else pitch = clamp(pitch, p0 + vf, p1 - vf);
      if (tFov > (p1 - p0) * 0.98) tFov = (p1 - p0) * 0.98; if (fov > tFov + 0.01 && tFov < (p1 - p0)) fov = Math.min(fov, (p1 - p0) * 0.98);
    }
    view.position.set(0, 0, 0); view.rotation.set(pitch * DEG, -yaw * DEG, 0, 'YXZ'); view.updateMatrixWorld();
    U.uInvPV.value.copy(view.projectionMatrixInverse).premultiply(view.matrixWorld);
    // rotation-only inverse: zero translation (camera at origin) so it's fine
    renderer.render(scene, cam);
    for (const o of hots) {
      _v.copy(o.v).applyMatrix4(view.matrixWorldInverse).applyMatrix4(view.projectionMatrix);
      const vis = _v.z < 1 && _v.z > -1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05 && o.v.clone().applyMatrix4(view.matrixWorldInverse).z < 0;
      o.el.classList.toggle('on', vis);
      if (vis) o.el.style.transform = `translate3d(${((_v.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-_v.y * 0.5 + 0.5) * H).toFixed(1)}px,0)`;
    }
    if (enabled && !SHOT) raf = requestAnimationFrame(render);
  }
  return {
    U, playIntro(o) { if (SHOT) { yaw = o.y1; pitch = o.p1; fov = tFov = o.f1; return; } intro = { t: 0, dur: o.dur || 7, y0: o.y0 ?? yaw, y1: o.y1, p0: o.p0 ?? pitch, p1: o.p1, f0: o.f0 ?? fov, f1: o.f1 ?? 72 }; auto = false; idle = 0; },
    show, render, enableGyro, disableGyro, setFade: f => U.uFade.value = f, setGrade: g => U.uGrade.value = g,
    get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; },
    get fov() { return tFov; }, set fov(v) { tFov = v; }, snapFov(v) { fov = tFov = v; },
    onHot(f) { onHot = f; }, preload: id => load(urlFor(id, false)),
    start() { enabled = true; last = performance.now(); cancelAnimationFrame(raf); if (!SHOT) raf = requestAnimationFrame(render); },
    stop() { enabled = false; cancelAnimationFrame(raf); disableGyro(); stopVideo(); intro = null; },
    get gyroOn() { return !!gyro; }, setAuto: a => { auto = a; idle = 0; },
  };
}
