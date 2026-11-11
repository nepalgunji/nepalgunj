/* Atmosphere: sky dome, sun/hemi light ramps, sun-aware horizon fog injected into every material,
   and an environment map rendered from the sky. Technique inspired by the Stonehenge solstice reference
   (sky colour ramps keyed to sun elevation + horizon-coloured exp² fog); values retuned for hazy Terai light. */
import * as THREE from 'three';

const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* Solar position for Nepalgunj (28.06N, 81.62E, UTC+5:45) on a given date */
export function sunPosition(hour, date = new Date(Date.UTC(2026, 10, 12))) {
  const N = Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5);
  const decl = 23.44 * Math.sin(2 * Math.PI * (284 + N) / 365) * DEG;
  const B = 2 * Math.PI * (N - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const lst = hour + (4 * (81.62 - 15 * 5.75) + eot) / 60;
  const H = 15 * (lst - 12) * DEG, phi = 28.06 * DEG;
  const el = Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) + Math.PI;
  return { el: el / DEG, az: az / DEG };
}

// colour ramps keyed to sun elevation (degrees), linear RGB
const ramp = (stops, e) => { if (e <= stops[0][0]) return stops[0].slice(1); for (let i = 1; i < stops.length; i++) if (e <= stops[i][0]) { const a = stops[i - 1], b = stops[i], t = (e - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => lerp(v, b[k + 1], t)); } return stops[stops.length - 1].slice(1); };
const ZEN  = [[-14, .004, .006, .016], [-6, .012, .020, .055], [-2, .030, .050, .13], [0, .050, .085, .21], [4, .075, .13, .31], [12, .095, .17, .40], [30, .10, .19, .45], [60, .095, .19, .47]];
const HORA = [[-14, .030, .022, .024], [-6, .055, .045, .060], [-2, .17, .14, .18], [0, .30, .25, .28], [4, .42, .38, .40], [12, .55, .52, .52], [30, .58, .58, .60], [60, .56, .59, .64]];
const HORB = [[-14, .040, .026, .022], [-6, .12, .06, .04], [-2, .62, .27, .11], [0, 1.05, .52, .20], [4, 1.10, .70, .36], [12, .98, .80, .60], [30, .80, .78, .70], [60, .70, .72, .72]];
const SUNC = [[-2, 1, .30, .08, 0], [0, 1, .42, .15, 1.4], [2, 1, .55, .27, 2.2], [5, 1, .66, .40, 2.6], [12, 1, .80, .60, 2.8], [30, 1, .92, .82, 2.7], [60, 1, .96, .92, 2.6]];
const HEMI = [[-14, .05], [-6, .09], [-2, .24], [0, .38], [4, .50], [12, .55], [30, .58], [60, .58]];
const CLIT = [[-14, .02, .02, .03], [-6, .10, .07, .08], [-2, .9, .40, .24], [0, 1.2, .62, .38], [4, 1.25, .86, .64], [12, 1.12, 1.0, .9], [30, 1.05, 1.03, 1.0]];

export const U = {
  uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uHorA: { value: new THREE.Color() }, uHorB: { value: new THREE.Color() },
  uFogD1: { value: 0.00011 }, uFogD2: { value: 0.00052 }, uNight: { value: 0 }
};
const GLSL_ATMOS = /* glsl */`
uniform vec3 uSunDir; uniform vec3 uHorA; uniform vec3 uHorB; uniform float uFogD1; uniform float uFogD2; uniform float uNight;
vec3 horizonCol(vec3 d){
  vec2 a = normalize(d.xz + vec2(1e-5)), b = normalize(uSunDir.xz + vec2(1e-5));
  float m = max(dot(a, b), 0.0);
  return mix(uHorA, uHorB, m*m*m*(0.35 + 0.65*m));
}`;

/* Inject world-position varying + sun-aware haze into any built-in material */
let pid = 0;
export function hazy(mat, extra = {}) {
  if (mat.userData.hazy) return mat; mat.userData.hazy = true;
  const prev = mat.onBeforeCompile, key = 'hz' + (extra.key || '') + (pid++);
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => key + (prevKey ? prevKey() : '');
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHzW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      #ifdef USE_INSTANCING
        vHzW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vHzW = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHzW;\n' + GLSL_ATMOS)
      .replace('#include <tonemapping_fragment>', `{ vec3 fd = vHzW - cameraPosition; float fl = length(fd);
        float ff = 1.0 - exp(-uFogD1*fl - uFogD2*uFogD2*fl*fl);
        ff *= mix(1.0, 0.55, smoothstep(0.0, 0.6, fd.y / max(fl, 1.0)));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, horizonCol(fd / fl) * mix(1.0, 0.7, uNight), ff); }
      #include <tonemapping_fragment>`);
  };
  mat.needsUpdate = true;
  return mat;
}

/* Noise texture for clouds (tileable value-noise fbm, 4 channels) */
function noiseTexture(N = 256) {
  const rnd = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, p, s) => { const X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = rnd(X % p, Y % p, s), b = rnd((X + 1) % p, Y % p, s), c = rnd(X % p, (Y + 1) % p, s), d = rnd((X + 1) % p, (Y + 1) % p, s); return lerp(lerp(a, b, u), lerp(c, d, u), v); };
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (let c = 0; c < 4; c++) {
    let s = 0, a = 1, n = 0, p = [4, 8, 3, 6][c]; for (let o = 0; o < 5; o++) { s += a * vn(x / N * p, y / N * p, p, o + c * 7); n += a; a *= 0.5; p *= 2; }
    data[(y * N + x) * 4 + c] = s / n * 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
export const noiseTex = noiseTexture();

export function makeAtmosphere(scene, renderer, quality) {
  const skyU = { uZen: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uSunVis: { value: 1 }, uCloudLit: { value: new THREE.Color() }, uCloudSh: { value: new THREE.Color() }, uNoise: { value: noiseTex }, uStars: { value: 0 } };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, skyU), side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; gl_Position.z = gl_Position.w * 0.99999; }`,
    fragmentShader: /* glsl */`
uniform sampler2D uNoise; uniform vec3 uZen; uniform vec3 uSunCol; uniform float uSunVis; uniform vec3 uCloudLit; uniform vec3 uCloudSh; uniform float uTime; uniform float uStars;
varying vec3 vDir;
${GLSL_ATMOS}
float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main(){
  vec3 d = normalize(vDir);
  vec3 hor = horizonCol(d);
  float y = max(d.y, 0.0);
  vec3 col = mix(hor, uZen, 1.0 - exp(-3.6*y));
  float sd = dot(d, uSunDir), mu = max(sd, 0.0);
  col += uSunCol * (0.16*pow(mu, 5.0) + 0.32*pow(mu, 40.0) + 0.9*pow(mu, 600.0)) * uSunVis;
  vec2 cuv = d.xz/(abs(d.y) + 0.12);
  float c1 = texture2D(uNoise, cuv*0.05 + uTime*vec2(0.0009,0.0003)).r;
  float c2 = texture2D(uNoise, cuv*0.17 - uTime*vec2(0.0014,-0.0005)).g;
  float c3 = texture2D(uNoise, vec2(cuv.x*0.028, cuv.y*0.18) + 0.3 + uTime*0.0005).a;
  float cov = smoothstep(0.55, 0.85, c1*0.66 + c2*0.34)*0.7 + smoothstep(0.64, 0.92, c3)*0.35;
  cov = clamp(cov, 0.0, 1.0) * smoothstep(0.0, 0.12, d.y);
  vec3 cc = mix(uCloudSh, uCloudLit, clamp(0.3 + 0.7*pow(mu, 3.0) + (c2 - 0.5)*0.8, 0.0, 1.0));
  col = mix(col, cc, cov*0.8);
  col += uSunCol * smoothstep(0.99993, 0.99997, sd) * 40.0 * uSunVis * (1.0 - 0.7*cov);
  // stars
  vec3 sp = floor(d*420.0); float st = step(0.9985, hash(sp)) * smoothstep(0.05, 0.4, d.y) * (1.0 - cov);
  col += vec3(0.9, 0.95, 1.0) * st * uStars * 0.6;
  col = mix(col, hor, smoothstep(0.0, -0.02, d.y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = quality.shadows;
  if (quality.shadows) {
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6; sun.shadow.radius = 3;
  }
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);

  // environment map from the sky (re-rendered when the light changes noticeably)
  const envScene = new THREE.Scene(); const envSky = new THREE.Mesh(sky.geometry, skyMat); envScene.add(envSky);
  const groundDisc = new THREE.Mesh(new THREE.CircleGeometry(4000, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a3226 })); groundDisc.position.y = -20; envScene.add(groundDisc);
  const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null, lastEnvEl = 999;

  const sunDir = new THREE.Vector3();
  const state = { el: 30, az: 180, night: 0, sunDir };
  function setHour(hour, focus = new THREE.Vector3(), radius = 260) {
    const { el, az } = sunPosition(hour);
    state.el = el; state.az = az;
    const a = az * DEG, e = el * DEG, ce = Math.cos(e);
    sunDir.set(ce * Math.sin(a), Math.sin(e), -ce * Math.cos(a));
    U.uSunDir.value.copy(sunDir);
    const zen = ramp(ZEN, el), ha = ramp(HORA, el), hb = ramp(HORB, el), sc = ramp(SUNC, el), he = ramp(HEMI, el)[0], cl = ramp(CLIT, el);
    skyU.uZen.value.setRGB(zen[0], zen[1], zen[2]); U.uHorA.value.setRGB(ha[0], ha[1], ha[2]); U.uHorB.value.setRGB(hb[0], hb[1], hb[2]);
    skyU.uSunCol.value.setRGB(sc[0], sc[1], sc[2]); skyU.uSunVis.value = smooth(-1.6, 0.2, el);
    skyU.uCloudLit.value.setRGB(cl[0], cl[1], cl[2]);
    skyU.uCloudSh.value.setRGB(zen[0] * 0.5 + ha[0] * 0.55, zen[1] * 0.5 + ha[1] * 0.55, zen[2] * 0.5 + ha[2] * 0.55);
    const night = 1 - smooth(-7, 0, el); state.night = night; U.uNight.value = night;
    skyU.uStars.value = night;
    sun.color.setRGB(sc[0], sc[1], sc[2]); sun.intensity = sc[3] * Math.PI * 0.62;
    { const r = zen[0] * 0.9 + ha[0] * 0.75, g = zen[1] * 0.9 + ha[1] * 0.75, b = zen[2] * 0.9 + ha[2] * 0.75, l = (r + g + b) / 3;
      hemi.color.setRGB(lerp(r, l, 0.35), lerp(g, l, 0.35), lerp(b, l, 0.35)); }
    hemi.groundColor.setRGB(0.22 * (ha[0] + 0.3), 0.19 * (ha[1] + 0.3), 0.13 * (ha[2] + 0.3));
    hemi.intensity = he * Math.PI * 0.9 + night * 0.25;
    // shadow camera fitted to the focus area; sun never lower than ~8° for shadow purposes
    const eh = Math.max(e, 8 * DEG);
    const dl = new THREE.Vector3(Math.cos(eh) * Math.sin(a), Math.sin(eh), -Math.cos(eh) * Math.cos(a));
    sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(dl, 800);
    const sc2 = sun.shadow.camera; sc2.left = -radius; sc2.right = radius; sc2.top = radius; sc2.bottom = -radius; sc2.near = 300; sc2.far = 1400; sc2.updateProjectionMatrix();
    sun.visible = sc[3] > 0.01;
    // env refresh
    if (Math.abs(el - lastEnvEl) > 1.5) {
      lastEnvEl = el;
      groundDisc.material.color.setRGB(0.18 * (ha[0] + 0.2), 0.15 * (ha[1] + 0.2), 0.11 * (ha[2] + 0.2));
      const rt = pmrem.fromScene(envScene, 0.02, 1, 9000);
      scene.environment = rt.texture; envRT?.dispose(); envRT = rt;
    }
    scene.environmentIntensity = 0.35 + 0.65 * (1 - night);
    renderer.toneMappingExposure = lerp(1.15, 0.82, smooth(-8, 10, el));
  }
  return { sky, sun, hemi, setHour, state, update(t, camPos) { U.uTime.value = t; sky.position.copy(camPos); } };
}
