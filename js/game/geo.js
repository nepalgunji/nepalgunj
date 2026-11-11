/* small 2D geometry helpers (x,z) */
export function distToSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
  const L = vx * vx + vz * vz; let t = L ? (wx * vx + wz * vz) / L : 0; t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + t * vx), dz = pz - (az + t * vz); return { d: Math.hypot(dx, dz), t };
}
export function distToLine(px, pz, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) { const r = distToSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (r.d < best) best = r.d; }
  return best;
}
/* ribbon geometry along a polyline: returns {positions, uvs, indices} */
export function ribbon(pts, width, y = 0, uScale = 0.1) {
  const pos = [], uv = [], idx = []; let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx, h = width / 2;
    if (i > 0) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    pos.push(p[0] + nx * h, y, p[1] + nz * h, p[0] - nx * h, y, p[1] - nz * h);
    uv.push(0, acc * uScale, 1, acc * uScale);
    if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  return { pos, uv, idx };
}
