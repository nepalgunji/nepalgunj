/* Keyboard + mouse look + touch joystick/look + action buttons */
export class Input {
  constructor(canvas, hud) {
    this.keys = new Set(); this.move = { x: 0, y: 0 }; this.look = { dx: 0, dy: 0 }; this.zoom = 0;
    this.sprint = false; this.jump = false; this.actions = []; this.enabled = false; this.canvas = canvas;
    this.touch = matchMedia('(pointer: coarse)').matches;
    addEventListener('keydown', e => {
      if (!this.enabled || /input|textarea|select/i.test(e.target.tagName)) return;
      this.keys.add(e.code);
      if (['KeyE', 'KeyF', 'Enter'].includes(e.code)) this.actions.push('use');
      if (e.code === 'KeyM') this.actions.push('map');
      if (e.code === 'KeyN') this.actions.push('daynight');
      if (e.code === 'KeyV') this.actions.push('view');
      if (e.code === 'KeyP') this.actions.push('passport');
      if (e.code === 'Space') { this.jump = true; e.preventDefault(); }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    // mouse look: pointer lock on desktop, drag fallback
    canvas.addEventListener('click', () => { if (this.enabled && !this.touch && document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); });
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', e => { dragging = true; lx = e.clientX; ly = e.clientY; });
    addEventListener('mouseup', () => dragging = false);
    addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (document.pointerLockElement === canvas) { this.look.dx += e.movementX; this.look.dy += e.movementY; }
      else if (dragging && !this.touch) { this.look.dx += e.clientX - lx; this.look.dy += e.clientY - ly; lx = e.clientX; ly = e.clientY; }
    });
    canvas.addEventListener('wheel', e => { if (this.enabled) { this.zoom += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
    // touch: left joystick, right drag look
    const joy = hud.querySelector('.joystick'), knob = joy?.querySelector('i');
    let joyId = null, jx = 0, jy = 0, lookId = null, tlx = 0, tly = 0;
    canvas.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && joyId === null) {
          joyId = t.identifier; jx = t.clientX; jy = t.clientY;
          if (joy) { joy.style.left = jx - 55 + 'px'; joy.style.top = jy - 55 + 'px'; joy.classList.add('on'); }
        } else if (lookId === null) { lookId = t.identifier; tlx = t.clientX; tly = t.clientY; }
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - jx, dy = t.clientY - jy; const d = Math.hypot(dx, dy), m = 50;
          if (d > m) { dx *= m / d; dy *= m / d; }
          this.move.x = dx / m; this.move.y = -dy / m;
          if (knob) knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.sprint = d > 46 && this.sprintToggle !== false ? this.sprint : this.sprint;
        } else if (t.identifier === lookId) { this.look.dx += (t.clientX - tlx) * 1.6; this.look.dy += (t.clientY - tly) * 1.6; tlx = t.clientX; tly = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; this.move.x = this.move.y = 0; if (knob) knob.style.transform = ''; joy?.classList.remove('on'); }
        if (t.identifier === lookId) lookId = null;
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  }
  axes() {
    const k = this.keys; let x = this.move.x, y = this.move.y;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1; if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD')) x += 1; if (k.has('KeyA')) x -= 1;
    let turn = 0; if (k.has('ArrowLeft') || k.has('KeyQ')) turn -= 1; if (k.has('ArrowRight')) turn += 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y, turn, sprint: this.sprint || k.has('ShiftLeft') || k.has('ShiftRight') };
  }
  consumeLook() { const l = { ...this.look }; this.look.dx = this.look.dy = 0; return l; }
  consumeZoom() { const z = this.zoom; this.zoom = 0; return z; }
  consumeJump() { const j = this.jump; this.jump = false; return j; }
  popAction() { return this.actions.shift(); }
}
