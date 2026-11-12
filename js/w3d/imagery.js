// Runtime-streamed aerial imagery (Esri World Imagery). Tiles are fetched by the visitor's
// browser from Esri (not re-hosted) and composited into one canvas texture per zoom tier.
import * as THREE from 'three';
export const LAT0 = 28.0617, LON0 = 81.6238;
export const MX = 111320 * Math.cos(LAT0 * Math.PI / 180), MY = 110574;
const lon2tx = (lon, z) => (lon + 180) / 360 * 2 ** z;
const lat2ty = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.asinh(Math.tan(r)) / Math.PI) / 2 * 2 ** z; };
const tx2lon = (x, z) => x / 2 ** z * 360 - 180;
const ty2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / 2 ** z; return 180 / Math.PI * Math.atan(Math.sinh(n)); };
export const toX = lon => (lon - LON0) * MX, toZ = lat => -(lat - LAT0) * MY;
export const toLon = x => x / MX + LON0, toLat = z => -z / MY + LAT0;
const URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

export function makeTier(z, cx, cz, nx, ny, fill) {
  const tx0 = Math.floor(lon2tx(toLon(cx), z) - nx / 2), ty0 = Math.floor(lat2ty(toLat(cz), z) - ny / 2);
  const canvas = document.createElement('canvas'); canvas.width = nx * 256; canvas.height = ny * 256;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  ctx.fillStyle = fill; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const bounds = new THREE.Vector4(toX(tx2lon(tx0, z)), toZ(ty2lat(ty0, z)), toX(tx2lon(tx0 + nx, z)), toZ(ty2lat(ty0 + ny, z)));
  const jobs = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) jobs.push([i, j]);
  // load centre tiles first
  jobs.sort((a, b) => Math.hypot(a[0] - nx / 2, a[1] - ny / 2) - Math.hypot(b[0] - nx / 2, b[1] - ny / 2));
  const tier = { z, canvas, ctx, tex, bounds, total: jobs.length, done: 0, ok: 0 };
  tier.load = (onTile, conc = 10) => new Promise(res => {
    let k = 0, active = 0, dirty = 0;
    const next = () => {
      if (k >= jobs.length && active === 0) { tex.needsUpdate = true; return res(tier); }
      while (active < conc && k < jobs.length) {
        const [i, j] = jobs[k++]; active++;
        const img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async';
        img.onload = () => { ctx.drawImage(img, i * 256, j * 256); tier.ok++; fin(); };
        img.onerror = () => fin();
        img.src = URL(z, tx0 + i, ty0 + j);
      }
    };
    const fin = () => { active--; tier.done++; if (++dirty >= 12) { dirty = 0; tex.needsUpdate = true; } onTile && onTile(tier); next(); };
    next();
  });
  return tier;
}
// GLSL shared by ground + roofs: sample far/mid/near tiers by world xz
export const IMAGERY_GLSL = /* glsl */`
uniform sampler2D tFar; uniform sampler2D tMid; uniform sampler2D tNear;
uniform vec4 bFar; uniform vec4 bMid; uniform vec4 bNear;
uniform vec3 uFieldCol; uniform sampler2D tFocus; uniform vec4 bFocus; uniform float uFocusOK;
vec2 tUV(vec4 b, vec2 p){ vec2 uv=(p-b.xy)/(b.zw-b.xy); return vec2(uv.x,1.0-uv.y); }
float tIn(vec4 b, vec2 p, float m){ vec2 uv=(p-b.xy)/(b.zw-b.xy); vec2 e=smoothstep(0.0,m,uv)*smoothstep(0.0,m,1.0-uv); return e.x*e.y; }
vec3 imagery(vec2 p){
  vec3 c = mix(uFieldCol, texture2D(tFar, tUV(bFar,p), -0.5).rgb, tIn(bFar,p,0.08));
  c = mix(c, texture2D(tMid, tUV(bMid,p), -0.7).rgb, tIn(bMid,p,0.06));
  c = mix(c, texture2D(tNear, tUV(bNear,p), -0.8).rgb, tIn(bNear,p,0.04));
  c = mix(c, texture2D(tFocus, tUV(bFocus,p), -0.6).rgb, tIn(bFocus,p,0.12)*uFocusOK);
  // grade: the raw imagery is hazy/blue — lift contrast, warm it slightly
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  c = mix(vec3(l), c, 1.12);
  c = pow(max(c,0.0), vec3(1.06)) * vec3(1.05,1.0,0.93);
  return c;
}`;
