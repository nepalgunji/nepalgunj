/* People (CC0 Quaternius UAL mannequin baked into poses, clothed procedurally) and vehicles
   (CC0 Grab3D models, repainted with realistic colours), instanced; parked + moving traffic. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hazy } from './atmos.js';

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---- bake skinned mannequin into static pose geometries ---- */
export async function bakeHuman() {
  const gltf = await load('assets/models/human.glb');
  const root = gltf.scene; root.updateMatrixWorld(true);
  const meshes = []; root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  const mixer = new THREE.AnimationMixer(root);
  const clip = n => gltf.animations.find(a => a.name === n);
  const v = new THREE.Vector3(), rest = new THREE.Vector3();
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  function bake(name, t, tweak) {
    mixer.stopAllAction(); const c = clip(name); if (c) { const a = mixer.clipAction(c); a.play(); mixer.setTime(t * c.duration); }
    root.updateMatrixWorld(true);
    if (tweak) { tweak(bones); root.updateMatrixWorld(true); }
    const joints = {}; for (const k of ['hand_l', 'hand_r', 'head', 'Head', 'pelvis', 'spine_03', 'neck_01']) if (bones[k]) joints[k] = bones[k].getWorldPosition(new THREE.Vector3());
    const parts = meshes.map(m => {
      const src = m.geometry, n = src.attributes.position.count, pos = new Float32Array(n * 3), bind = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); pos.set([v.x, v.y, v.z], i * 3);
        rest.fromBufferAttribute(src.attributes.position, i).applyMatrix4(m.matrixWorld); bind[i * 2] = rest.x; bind[i * 2 + 1] = rest.y;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aBind', new THREE.BufferAttribute(bind, 2)); g.setIndex(src.index.clone());
      return g;
    });
    const g = mergeGeometries(parts); g.computeVertexNormals();
    // normalise height to 1 m units (scaled per instance)
    g.computeBoundingBox(); const bb = g.boundingBox; const ys = bb.max.y - bb.min.y || 1;
    return { g, minY: bb.min.y, h: ys, joints };
  }
  // bind-space height for normalising clothing zones
  const restBB = new THREE.Box3(); meshes.forEach(m => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) { rest.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); restBB.expandByPoint(rest); } });
  const poses = {
    idle: bake('Idle_Loop', 0.1), talk: bake('Idle_Talking_Loop', 0.4), sit: bake('Sitting_Idle_Loop', 0.2), ride: bake('Driving_Loop', 0.2),
    walk: [0, 1, 2, 3, 4, 5].map(k => bake('Walk_Loop', k / 6))
  };
  return { poses, bake, bones, restMinY: restBB.min.y, restH: restBB.max.y - restBB.min.y };
}

/* clothing material: zones from the bind (T-pose) position; per-instance shirt/lower colours + skin tone */
export function clothMat(restMinY, restH) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aBind; attribute vec3 aLow; attribute vec2 aSkin; varying vec2 vBind; varying vec3 vLow; varying vec2 vSkin;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvBind = vec2(aBind.x, (aBind.y - (${restMinY.toFixed(4)})) / ${restH.toFixed(4)}); vLow = aLow; vSkin = aSkin;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vBind; varying vec3 vLow; varying vec2 vSkin;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float y = vBind.y; float ax = abs(vBind.x) / ${restH.toFixed(4)};
        vec3 skin = mix(vec3(0.33, 0.20, 0.13), vec3(0.18, 0.10, 0.06), vSkin.x);
        vec3 shirt = diffuseColor.rgb; vec3 low = vLow;
        float kurta = vSkin.y; // 0 shirt, 1 long kurta / saree top
        vec3 c = shirt;
        if (y < 0.53 - kurta*0.22) c = low;
        if (y < 0.045) c = vec3(0.05, 0.04, 0.035);
        float sleeve = 0.17 + 0.2*step(0.5, kurta);
        if (ax > sleeve) c = skin;                             // forearms / hands
        if (y > 0.835) c = skin;                               // neck + head
        if (y > 0.93) c = mix(c, vec3(0.025, 0.02, 0.018), 0.92); // hair
        diffuseColor.rgb = c; }`);
  };
  m.customProgramCacheKey = () => 'cloth';
  return hazy(m, { key: 'cloth' });
}
const SHIRTS = [0xd8d4cc, 0xeeeeea, 0x8fa3b8, 0x3b4a63, 0x7a2e2e, 0xb8862e, 0x5e6b4a, 0xc9b28c, 0x9e3a4a, 0x2d2d33, 0xb24a2a, 0xdcc6a0, 0x6a4a8a, 0xc23a3a, 0xe0b040];
const LOWS = [0x2a2c33, 0x3a3f4d, 0x1d1f24, 0x5a5048, 0x6b6560, 0xd8d2c4, 0x2f3a52];

export function makePeople(scene, human, spots, quality) {
  const mat = clothMat(human.restMinY, human.restH);
  const groups = {};
  const mk = (geo, list) => {
    const im = new THREE.InstancedMesh(geo.g, mat, Math.max(1, list.length)); im.count = list.length;
    const low = new Float32Array(im.count * 3), skin = new Float32Array(im.count * 2), c = new THREE.Color(), o = new THREE.Object3D();
    list.forEach((p, i) => {
      const s = (p.s || 1.68 + hash(i, 7) * 0.16) / geo.h; o.position.set(p.x, (p.y || 0) - geo.minY * s, p.z); o.rotation.set(0, p.a, 0); o.scale.setScalar(s); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      const female = hash(i, 11) < 0.45;
      c.setHex(female ? [0xa8232d, 0x7a1f3a, 0xd9a321, 0xc2552d, 0x2f5f8a, 0x8a3a8a, 0xe07a5a][Math.floor(hash(i, 3) * 7)] : SHIRTS[Math.floor(hash(i, 3) * SHIRTS.length)]).convertSRGBToLinear().multiplyScalar(0.8);
      im.setColorAt(i, c);
      const lc = female ? c.clone() : new THREE.Color(LOWS[Math.floor(hash(i, 5) * LOWS.length)]).convertSRGBToLinear();
      low.set([lc.r, lc.g, lc.b], i * 3); skin.set([hash(i, 9), female ? 1 : (hash(i, 13) < 0.25 ? 0.7 : 0)], i * 2);
    });
    geo.g.setAttribute('aLow', new THREE.InstancedBufferAttribute(low, 3)); geo.g.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 2));
    im.castShadow = quality.shadows; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im;
  };
  // static groups (geometry attributes per instance → clone geometry per group)
  const clone = p => ({ g: p.g.clone(), minY: p.minY, h: p.h });
  groups.idle = mk(clone(human.poses.idle), spots.idle);
  groups.talk = mk(clone(human.poses.talk), spots.talk);
  groups.sit = mk(clone(human.poses.sit), spots.sit);
  // walkers: 6 frame meshes, re-binned each frame
  const W = spots.walk;
  const frames = human.poses.walk.map(p => { const g = clone(p); const im = mk(g, W); return { im, g, low: g.g.attributes.aLow, skin: g.g.attributes.aSkin }; });
  const wCol = W.map((_, i) => { const c = new THREE.Color(); frames[0].im.getColorAt(i, c); return c; });
  const wLow = frames[0].low.array.slice(), wSkin = frames[0].skin.array.slice();
  const o = new THREE.Object3D();
  return {
    update(t) {
      frames.forEach(f => f.im.count = 0);
      W.forEach((w, i) => {
        const ph = t * 0.9 + w.ph, k = Math.floor((ph * 6) % 6), f = frames[k];
        const d = ((t * 1.25 + w.ph * 7) % (2 * w.len)); const fwd = d < w.len; const s = fwd ? d : 2 * w.len - d;
        const ang = w.a + (fwd ? 0 : Math.PI);
        const x = w.x + Math.sin(w.a) * (s - w.len / 2), z = w.z + Math.cos(w.a) * (s - w.len / 2);
        const sc = (1.66 + hash(i, 7) * 0.16) / f.g.h; o.position.set(x, -f.g.minY * sc, z); o.rotation.set(0, ang, 0); o.scale.setScalar(sc); o.updateMatrix();
        const j = f.im.count++; f.im.setMatrixAt(j, o.matrix); f.im.setColorAt(j, wCol[i]);
        f.low.array[j * 3] = wLow[i * 3]; f.low.array[j * 3 + 1] = wLow[i * 3 + 1]; f.low.array[j * 3 + 2] = wLow[i * 3 + 2];
        f.skin.array[j * 2] = wSkin[i * 2]; f.skin.array[j * 2 + 1] = wSkin[i * 2 + 1];
      });
      frames.forEach(f => { f.im.instanceMatrix.needsUpdate = true; if (f.im.instanceColor) f.im.instanceColor.needsUpdate = true; f.low.needsUpdate = true; f.skin.needsUpdate = true; });
    }
  };
}

/* ---- vehicles ---- */
const PAINTS = {
  car: [0xe8e8e6, 0xc0c2c4, 0x1c1d20, 0x7a1e22, 0x2a3f66, 0x8c8f93, 0xd9d6cf, 0x4a1820],
  tempo: [0x2e6b4a, 0x1f4f7a, 0xd8d2c0, 0x3a7a5a, 0x2a5a8a],
  bike: [0x151515, 0x8a1a1a, 0x1a2a6a, 0x202020, 0xb02020, 0x3a3a3a],
  bus: [0xd8d0c0, 0x2a5a8a, 0xb8322a, 0xe0b040],
  truck: [0xb8322a, 0x2a5a3a, 0xd0a020, 0x3a4a6a]
};
function vehicleMat(src) {
  const m = src.clone(); m.vertexColors = false;
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    #ifdef USE_INSTANCING_COLOR
    { vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float sat = (mx - mn) / max(mx, 1e-3);
      float l = dot(c, vec3(0.3, 0.55, 0.15));
      diffuseColor.rgb = mix(vec3(l)*0.92, vInstanceColorP * (0.45 + 1.1*l), smoothstep(0.12, 0.35, sat)); }
    #endif`).replace('#include <color_fragment>', '').replace('#include <common>', '#include <common>\n#ifdef USE_INSTANCING_COLOR\nvarying vec3 vInstanceColorP;\n#endif');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n#ifdef USE_INSTANCING_COLOR\nvarying vec3 vInstanceColorP;\n#endif')
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\nvInstanceColorP = instanceColor;\n#endif');
  };
  m.customProgramCacheKey = () => 'veh' + src.uuid;
  m.roughness = Math.min(m.roughness ?? 0.5, 0.55);
  return hazy(m, { key: 'veh' });
}
export async function loadVehicles() {
  const names = { tempo: 'tuk-tuk', moto: 'motorcycle', scooter: 'scooter', cycle: 'bicycle', sedan: 'sedan', suv: 'suv', bus: 'minibus', truck: 'delivery-truck' };
  const out = {};
  await Promise.all(Object.entries(names).map(async ([k, f]) => {
    const g = await load(`assets/models/${f}.glb`); g.scene.updateMatrixWorld(true);
    const parts = []; g.scene.traverse(o => { if (o.isMesh) { const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); parts.push({ geo, mat: vehicleMat(o.material) }); } });
    const bb = new THREE.Box3(); parts.forEach(p => { p.geo.computeBoundingBox(); bb.union(p.geo.boundingBox); });
    const c = bb.getCenter(new THREE.Vector3()); parts.forEach(p => p.geo.translate(-c.x, -bb.min.y, -c.z));
    const size = bb.getSize(new THREE.Vector3()); const long = size.z >= size.x;
    if (!long) parts.forEach(p => p.geo.rotateY(Math.PI / 2));
    out[k] = { parts, len: Math.max(size.x, size.z) };
  }));
  return out;
}
const PAL_OF = { tempo: 'tempo', moto: 'bike', scooter: 'bike', cycle: 'bike', sedan: 'car', suv: 'car', bus: 'bus', truck: 'truck' };
export function makeTraffic(scene, V, parked, movers, riderPose, human, quality) {
  const o = new THREE.Object3D(), c = new THREE.Color();
  const byType = {};
  for (const v of [...parked, ...movers]) (byType[v.t] ||= []).push(v);
  const meshes = {};
  Object.entries(byType).forEach(([t, list]) => {
    const def = V[t]; if (!def) return;
    meshes[t] = def.parts.map(p => {
      const im = new THREE.InstancedMesh(p.geo, p.mat, list.length); im.castShadow = quality.shadows; im.receiveShadow = true; im.frustumCulled = false;
      list.forEach((v, i) => { const pal = PAINTS[PAL_OF[t]]; c.setHex(pal[Math.floor(hash(i, t.length) * pal.length)]).convertSRGBToLinear(); im.setColorAt(i, c); });
      scene.add(im); return im;
    });
    list.forEach((v, i) => { v.i = i; });
  });
  // riders on two-wheelers
  const riders = [...parked, ...movers].filter(v => (v.t === 'moto' || v.t === 'scooter') && v.rider);
  let riderIM = null;
  if (riders.length && riderPose) {
    const g = riderPose.g.clone(); const n = riders.length;
    const low = new Float32Array(n * 3), skin = new Float32Array(n * 2);
    riders.forEach((r, i) => { const lc = new THREE.Color(LOWS[Math.floor(hash(i, 5) * LOWS.length)]).convertSRGBToLinear(); low.set([lc.r, lc.g, lc.b], i * 3); skin.set([hash(i, 9), 0], i * 2); });
    g.setAttribute('aLow', new THREE.InstancedBufferAttribute(low, 3)); g.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 2));
    riderIM = new THREE.InstancedMesh(g, clothMat(human.restMinY, human.restH), n); riderIM.castShadow = quality.shadows; riderIM.frustumCulled = false;
    riders.forEach((r, i) => { c.setHex(SHIRTS[Math.floor(hash(i, 3) * SHIRTS.length)]).convertSRGBToLinear(); riderIM.setColorAt(i, c); });
    scene.add(riderIM);
  }
  const place = (v, x, z, a) => {
    o.position.set(x, 0, z); o.rotation.set(0, a, 0); o.scale.setScalar(1); o.updateMatrix();
    meshes[v.t]?.forEach(im => im.setMatrixAt(v.i, o.matrix));
    if (riderIM && v.ri !== undefined) { const s = 1.62 / riderPose.h; o.position.set(x - Math.sin(a) * 0.15, 0.25 - riderPose.minY * s, z - Math.cos(a) * 0.15); o.scale.setScalar(s); o.updateMatrix(); riderIM.setMatrixAt(v.ri, o.matrix); }
  };
  riders.forEach((r, i) => r.ri = i);
  parked.forEach(v => place(v, v.x, v.z, v.a));
  const flag = () => { Object.values(meshes).forEach(a => a.forEach(im => im.instanceMatrix.needsUpdate = true)); if (riderIM) riderIM.instanceMatrix.needsUpdate = true; };
  flag();
  return {
    update(t) {
      movers.forEach(v => {
        const L = v.path.len; let d = (v.off + t * v.speed) % (2 * L); const back = d > L; if (back) d = 2 * L - d;
        // walk the polyline
        let acc = 0, P = v.path.pts, x = P[0][0], z = P[0][1], a = 0;
        for (let i = 0; i < P.length - 1; i++) { const sl = v.path.seg[i]; if (acc + sl >= d) { const tt = (d - acc) / sl; const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1]; a = Math.atan2(dx, dz); x = P[i][0] + dx * tt; z = P[i][1] + dz * tt; const lane = v.lane * (back ? -1 : 1); x += Math.cos(a) * lane; z -= Math.sin(a) * lane; break; } acc += sl; }
        place(v, x, z, back ? a + Math.PI : a);
      });
      flag();
    }
  };
}
