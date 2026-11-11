/* Generic, parameterized school campus. Only the name is shown — no invented details. */
import { THREE, M, box, cyl, pbr, signMesh, tree } from '../engine.js';
import { baseScene } from './base.js';

export async function create(ctx, params = {}) {
  const name = params.name || 'School';
  const accent = params.accent ?? 0x1d4f91;
  const S = baseScene(ctx, { name, half: 40, floor: pbr('concrete_floor_02', 16, { color: 0xcfc6b4 }), fogFar: 260 });
  const { scene, colliders } = S;
  const wall = pbr('plastered_wall_04', 4, { color: params.color ?? 0xf3ead8 });
  // U-shaped 2-storey block with open corridors
  const block = (x, z, w, d, rot = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    box(w, 6.8, d, wall, 0, 0, -1, g); box(w, 0.3, 2.4, M(0xdedad2), 0, 3.3, d / 2 + 0.2, g); box(w + 0.4, 0.4, d + 3, M(accent), 0, 6.8, 0.4, g);
    for (let i = -w / 2 + 2; i <= w / 2 - 2; i += 4) { box(0.35, 6.8, 0.35, M(0xffffff), i, 0, d / 2 + 1.3, g); for (const y of [1, 4.4]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), M(0x3a5a78, { roughness: 0.2, metalness: 0.4 })); win.position.set(i + 2, y + 0.4, d / 2 - 0.99); g.add(win); } }
    return g; };
  block(0, -28, 50, 8); colliders.add(0, -29, 25, 4.5);
  block(-28, -4, 30, 8, Math.PI / 2); colliders.add(-29, -4, 4.5, 15);
  block(28, -4, 30, 8, -Math.PI / 2); colliders.add(29, -4, 4.5, 15);
  const sg = signMesh(name.toUpperCase(), 18, { bg: '#ffffff', fg: '#' + accent.toString(16).padStart(6, '0'), font: 'bold 56px Inter, sans-serif' }); sg.position.set(0, 8.4, -23.9); scene.add(sg);
  // open classroom (walk in): desks + blackboard
  const room = new THREE.Group(); room.position.set(0, 0, -10); scene.add(room);
  box(16, 0.1, 10, pbr('marble_01', 2, { color: 0xe8e2d6 }), 0, 0, 0, room);
  const bb = document.createElement('canvas'); bb.width = 1024; bb.height = 384; const g = bb.getContext('2d');
  g.fillStyle = '#1f3a2c'; g.fillRect(0, 0, 1024, 384); g.strokeStyle = '#8a6a4a'; g.lineWidth = 18; g.strokeRect(0, 0, 1024, 384);
  g.fillStyle = '#f4f4ec'; g.textAlign = 'center'; g.font = 'bold 70px "Comic Sans MS", cursive'; g.fillText('Welcome to', 512, 130); g.fillText(name, 512, 220);
  g.font = '44px "Comic Sans MS", cursive'; g.fillText('नमस्ते नेपालगञ्ज 🙏', 512, 310);
  const bt = new THREE.CanvasTexture(bb); bt.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false })); board.position.set(0, 2.4, -4.8); room.add(board);
  box(8.6, 3.6, 0.2, M(0x6a4a2a), 0, 0.6, -4.95, room);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = -5.4 + c * 3.6, z = -1.8 + r * 2.2; box(1.6, 0.06, 0.7, M(0x9a6a3a), x, 0.75, z, room); box(1.6, 0.75, 0.06, M(0x6a4a2a), x, 0, z + 0.35, room); box(1.6, 0.06, 0.4, M(0x6a4a2a), x, 0.45, z + 0.75, room); colliders.add(x, -10 + z + 0.3, 0.8, 0.5); }
  const roof = box(16.6, 0.3, 10.6, M(accent), 0, 3.8, 0, room);
  for (const [x, z] of [[-8, -5], [8, -5], [-8, 5], [8, 5]]) { box(0.3, 3.8, 0.3, M(0xffffff), x, 0, z, room); colliders.add(x, -10 + z, 0.2, 0.2); }
  // flag pole + national flag shape (simple)
  cyl(0.08, 0.1, 9, 8, M(0xdddddd, { metalness: 0.8 }), -10, 0, 12, scene); colliders.addCircle(-10, 12, 0.3);
  const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0, 2.4); fs.lineTo(1.7, 1.45); fs.lineTo(0.7, 1.45); fs.lineTo(1.7, 0); fs.lineTo(0, 0);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(fs), M(0xdc143c, { side: THREE.DoubleSide })); flag.position.set(-9.9, 6.4, 12); scene.add(flag);
  // playground: football goals + swings + trees
  const goal = (x) => { const gg = new THREE.Group(); gg.position.set(x, 0, 18); scene.add(gg); box(0.12, 2.2, 0.12, M(0xffffff), 0, 0, -3, gg); box(0.12, 2.2, 0.12, M(0xffffff), 0, 0, 3, gg); box(0.12, 0.12, 6.1, M(0xffffff), 0, 2.2, 0, gg); };
  goal(-30); goal(30);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), M(0xffffff)); ball.position.set(4, 0.22, 18); scene.add(ball);
  for (let i = 0; i < 8; i++) { tree(scene, -36 + i * 10, 36, 1); colliders.addCircle(-36 + i * 10, 36, 0.5); }
  S.info(params.id || 'school', -6, 22, `About ${name}`, 3);
  S.label(`${name}<small>featured school</small>`, 0, 11, -24, 'big');
  S.interactables.push({ x: 0, z: -6, r: 3, label: 'Read the blackboard', type: 'info', place: params.id || 'school', params: { name } });
  let bv = new THREE.Vector2();
  S.exit(0, 34, `Leave ${name}`);
  return {
    ...S, spawn: { x: 0, z: 25, yaw: 0 },
    update(dt, t, p) {
      S.baseUpdate(dt, t, p);
      flag.rotation.y = Math.sin(t * 2) * 0.15;
      const d = Math.hypot(p.pos.x - ball.position.x, p.pos.z - ball.position.z);
      if (d < 0.8) { bv.set(ball.position.x - p.pos.x, ball.position.z - p.pos.z).normalize().multiplyScalar(9); }
      ball.position.x += bv.x * dt; ball.position.z += bv.y * dt; bv.multiplyScalar(Math.pow(0.4, dt));
      ball.position.x = Math.max(-38, Math.min(38, ball.position.x)); ball.position.z = Math.max(4, Math.min(38, ball.position.z));
      ball.rotation.x += bv.y * dt * 4; ball.rotation.z -= bv.x * dt * 4;
    }
  };
}
