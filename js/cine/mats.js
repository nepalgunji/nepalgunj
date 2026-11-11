/* Photo-based PBR materials (Poly Haven CC0) + procedural breakup, all hazed */
import * as THREE from 'three';
import { hazy, noiseTex } from './atmos.js';

const loader = new THREE.TextureLoader();
const cache = new Map();
export function T(name, srgb = true) {
  if (cache.has(name)) return cache.get(name);
  const t = loader.load(`assets/tex2/${name}.webp`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(name, t); return t;
}
/* standard PBR set: diff + nor_gl + arm (ao/rough/metal) */
export function pbrSet(name, o = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: T(name + '_diff'), normalMap: T(name + '_nor_gl', false), aoMap: T(name + '_arm', false), roughnessMap: T(name + '_arm', false),
    roughness: 1, metalness: 0, ...o
  });
  return m;
}
/* world-space triplanar-free planar mapping + macro colour breakup for ground-like surfaces */
export function worldMapped(mat, scale = 0.25, { breakup = 0.35, tint2 = null } = {}) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uNoiseB = { value: noiseTex }; sh.uniforms.uScale = { value: scale }; sh.uniforms.uBreak = { value: breakup };
    sh.uniforms.uTint2 = { value: new THREE.Color(tint2 ?? 0xffffff) };
    const uvChunk = THREE.ShaderChunk.uv_vertex.replace(/\(\s*\w+Transform\s*\*\s*vec3\(\s*\w+_UV,\s*1\s*\)\s*\)\.xy/g, `(vWxz * ${scale.toFixed(4)})`);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;')
      .replace('#include <uv_vertex>', `
      #ifdef USE_INSTANCING
        vWxz = (modelMatrix * instanceMatrix * vec4(position,1.0)).xz;
      #else
        vWxz = (modelMatrix * vec4(position,1.0)).xz;
      #endif
      ${uvChunk}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz; uniform sampler2D uNoiseB; uniform float uBreak; uniform vec3 uTint2;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      { vec4 n1 = texture2D(uNoiseB, vWxz*0.0021); vec4 n2 = texture2D(uNoiseB, vWxz*0.019 + 0.37); vec4 n3 = texture2D(uNoiseB, vWxz*0.11);
        float k = (n1.r - 0.5)*1.2 + (n2.g - 0.5)*0.8 + (n3.b - 0.5)*0.4;
        diffuseColor.rgb *= 1.0 + k*uBreak;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*uTint2, smoothstep(0.45, 0.75, n1.a*0.7 + n2.r*0.3)); }`);
  };
  mat.customProgramCacheKey = () => 'wm' + scale + breakup;
  return hazy(mat, { key: 'wm' });
}
