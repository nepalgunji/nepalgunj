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
    tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uYaw0A: { value: 0 }, uYaw0B: { value: 0 },
    uInvPV: { value: new THREE.Matrix4() }, uFade: { value: 1 }, uGrade: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `precision highp float; varying vec2 vNdc;
      uniform sampler2D tA, tB; uniform float uMix, uYaw0A, uYaw0B, uFade, uGrade; uniform mat4 uInvPV;
      const float PI = 3.14159265;
      vec3 samp(sampler2D t, vec3 d, float yaw0){
        float az = atan(d.x, -d.z);            // 0 = north / forward, clockwise
        float u = fract((az - yaw0)/(2.0*PI)); float v = 0.5 + asin(clamp(d.y,-1.0,1.0))/PI;
        return texture2D(t, vec2(u, v)).rgb;
      }
      void main(){
        vec4 p = uInvPV * vec4(vNdc, 1.0, 1.0); vec3 d = normalize(p.xyz / p.w);
        vec3 c = samp(tA, d, uYaw0A);
        if (uMix > 0.001) c = mix(c, samp(tB, d, uYaw0B), uMix);
        // gentle cinematic grade + vignette
        float l = dot(c, vec3(0.2126,0.7152,0.0722));
        c = mix(c, smoothstep(0.0, 1.0, c), 0.25*uGrade);
        c = mix(vec3(l), c, 1.0 + 0.08*uGrade);
        float vg = smoothstep(1.55, 0.55, length(vNdc*vec2(0.85,1.0)));
        c *= mix(0.78, 1.0, vg);
        gl_FragColor = vec4(c * uFade, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const view = new THREE.PerspectiveCamera(75, 1, 0.1, 10);
  let yaw = 0, pitch = 0, fov = 75, vYaw = 0, vPitch = 0, tFov = 75, auto = !SHOT, idle = 0;
  let gyro = null, gyroBase = null, enabled = false, raf = 0, last = performance.now();
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
  async function show(node, opts = {}) {
    const big = !opts.small;
    const small = await load(urlFor(node.id, false)); // fast first paint
    if (U.tA.value && !opts.cut) {
      U.tB.value = small; U.uYaw0B.value = (node.yaw0 || 0) * DEG; U.uMix.value = 0;
      await tween(0.9, k => U.uMix.value = k);
      U.tA.value = U.tB.value; U.uYaw0A.value = U.uYaw0B.value; U.uMix.value = 0;
    } else { U.tA.value = small; U.uYaw0A.value = (node.yaw0 || 0) * DEG; }
    if (opts.look) { yaw = opts.look[0]; pitch = opts.look[1]; }
    setHots(node.hots || []);
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
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, t: performance.now() }; vYaw = vPitch = 0; auto = false; idle = 0; if (pts.size === 2) pinch0 = null; });
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
  canvas.addEventListener('wheel', e => { e.preventDefault(); tFov = clamp(tFov * Math.exp(e.deltaY * 0.0012), 30, 100); auto = false; idle = 0; }, { passive: false });
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
    if (gyro) gyroLook();
    else if (!drag) {
      yaw += vYaw; pitch = clamp(pitch + vPitch, -85, 85); vYaw *= Math.pow(0.04, dt); vPitch *= Math.pow(0.04, dt);
      idle += dt; if (idle > 6 && !SHOT) auto = true; if (auto) yaw += dt * 2.2;
    }
    fov += (tFov - fov) * (SHOT ? 1 : 1 - Math.pow(0.002, dt));
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * renderer.getPixelRatio()) || canvas.height !== Math.round(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
    view.aspect = W / H; view.fov = W < H ? Math.min(100, fov * 1.25) : fov; view.updateProjectionMatrix();
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
    show, render, enableGyro, disableGyro, setFade: f => U.uFade.value = f, setGrade: g => U.uGrade.value = g,
    get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; },
    get fov() { return tFov; }, set fov(v) { tFov = v; }, snapFov(v) { fov = tFov = v; },
    onHot(f) { onHot = f; }, preload: id => load(urlFor(id, false)),
    start() { enabled = true; last = performance.now(); cancelAnimationFrame(raf); if (!SHOT) raf = requestAnimationFrame(render); },
    stop() { enabled = false; cancelAnimationFrame(raf); disableGyro(); },
    get gyroOn() { return !!gyro; }, setAuto: a => { auto = a; idle = 0; },
  };
}
