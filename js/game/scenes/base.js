/* Helpers shared by enterable sub-scenes */
import { THREE, M, box, Colliders, makeEnv, videoScreen, Particles, signMesh, photoMat } from '../engine.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function baseScene(ctx, { name, half = 40, floor, fogFar = 260 }) {
  const scene = new THREE.Scene();
  const env = makeEnv(scene, { quality: ctx.quality, renderer: ctx.renderer, fogNear: 60, fogFar });
  const colliders = new Colliders(12);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 200, half * 2 + 200), floor); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  const S = {
    name, scene, env, colliders, interactables: [], screens: [], labels: [], animated: [], bounds: [-half, -half, half, half],
    particles: new Particles(scene, 900, 0.4),
    heightAt: () => 0, blocked: () => false, isWater: (x, z) => S.blocked(x, z),
    exit(x, z, label = 'Exit to Nepalgunj streets') {
      S.interactables.push({ x, z, r: 3.2, label, type: 'exit' });
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 32), new THREE.MeshBasicMaterial({ color: 0x7fd3ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.08, z); scene.add(ring);
      S.animated.push(t => ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.3);
      const s = signMesh('⟵ EXIT · बाहिर', 2.2, { bg: '#0d3b52', fg: '#ffffff', h: 96, font: 'bold 52px Inter, sans-serif' }); s.position.set(x, 4.6, z); scene.add(s);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), M(0x333333)); pole.position.set(x, 2.1, z); scene.add(pole);
      S.animated.push(() => { s.lookAt(ctx.camera.position.x, 4.6, ctx.camera.position.z); });
    },
    screen(src, poster, x, z, rotY, w = 8, aspect = 16 / 9, y = 1.2) {
      const sc = videoScreen(src, poster, w, aspect); sc.position.set(x, y, z); sc.rotation.y = rotY; scene.add(sc); S.screens.push(sc); return sc;
    },
    photo(img, x, y, z, w, aspect, rotY = 0) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / aspect), photoMat(img)); p.position.set(x, y, z); p.rotation.y = rotY; scene.add(p);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, w / aspect + 0.3, 0.15), M(0x2a1d14)); fr.position.copy(p.position); fr.rotation.y = rotY; fr.translateZ(-0.1); scene.add(fr);
      return p;
    },
    label(text, x, y, z, cls = '') {
      const el = document.createElement('div'); el.className = 'w-label ' + cls; el.innerHTML = text;
      const o = new CSS2DObject(el); o.position.set(x, y, z); scene.add(o); S.labels.push(o); return o;
    },
    info(id, x, z, label, r = 4) { S.interactables.push({ x, z, r, label, type: 'info', place: id }); },
    baseUpdate(dt, t, player) {
      S.animated.forEach(fn => fn(t, dt));
      S.particles.update(dt);
      S.screens.forEach(s => { s.position.distanceTo(player.pos) < 45 ? s.userData.play() : s.userData.pause(); });
    },
    dispose() { S.screens.forEach(s => s.userData.dispose()); S.labels.forEach(l => l.element.remove()); }
  };
  // invisible boundary walls
  [[0, -half, half, 0.5], [0, half, half, 0.5], [-half, 0, 0.5, half], [half, 0, 0.5, half]].forEach(([x, z, hx, hz]) => colliders.add(x, z, hx, hz));
  return S;
}
