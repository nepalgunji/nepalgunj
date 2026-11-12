// Screen-space cinematic + weather overlay shared by the aerial and panorama views:
// rain streaks, lens drops, drifting mist, film grain, letterbox bars, lightning flash.
const Q = new URLSearchParams(location.search); const SHOT = Q.has('shot');
export function createFX(canvas, mobile) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: SHOT });
  if (!gl) return { set() { }, render() { }, S: {} };
  const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }`;
  const fs = `precision highp float; varying vec2 uv;
  uniform vec2 uRes; uniform float uT, uRain, uFog, uGrain, uLetter, uFlash, uDrops, uNight, uPan, uWarm, uLayers;
  float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a*n2(p); p = p*2.03 + 17.1; a *= 0.5; } return s; }
  float rainLayer(vec2 q, float scale, float speed, float len, float seed){
    q *= vec2(scale, scale*0.18); q.x += q.y*0.06; q.y -= uT*speed; vec2 id = floor(q); vec2 f = fract(q);
    float r = h1(id + seed); if (r > 0.62) return 0.0;
    float x = abs(f.x - (0.2 + 0.6*h1(id+seed+3.1)));
    float y = fract(f.y + r*7.0);
    return smoothstep(0.035, 0.0, x) * smoothstep(0.0, 0.1, y) * smoothstep(len, len*0.4, y);
  }
  void main(){
    vec2 px = uv * uRes; float asp = uRes.x / uRes.y; vec2 q = vec2(uv.x*asp, uv.y);
    vec3 col = vec3(0.0); float a = 0.0;
    // mist: drifting fbm, denser low in frame
    if (uFog > 0.001) {
      float m = fbm(vec2(q.x*1.6 + uT*0.018 + uPan, q.y*2.4 - uT*0.006));
      float m2 = fbm(vec2(q.x*3.4 - uT*0.03 + uPan*1.6, q.y*4.0 + 3.0));
      float band = mix(0.55, 1.0, smoothstep(0.95, 0.15, uv.y));
      float fa = clamp(uFog * band * (m*0.75 + m2*0.35 - 0.12), 0.0, 0.8);
      vec3 fc = mix(vec3(0.86, 0.88, 0.9), vec3(0.24, 0.27, 0.32), uNight);
      col = col*(1.0-fa) + fc*fa; a = a + fa*(1.0-a);
    }
    // rain streaks (3 depth layers on desktop, 2 on mobile)
    if (uRain > 0.001) {
      vec2 rq = vec2(q.x, 1.0 - q.y);
      float r = rainLayer(rq, 34.0, 9.0, 0.55, 1.0)*0.55 + rainLayer(rq, 20.0, 7.0, 0.6, 7.0)*0.75;
      if (uLayers > 2.5) r += rainLayer(rq, 12.0, 5.2, 0.7, 13.0);
      r *= uRain; vec3 rc = mix(vec3(0.82, 0.86, 0.92), vec3(0.45, 0.5, 0.6), uNight);
      float ra = clamp(r*0.42, 0.0, 0.6); col = col*(1.0-ra) + rc*ra; a = a + ra*(1.0-a);
      // overall rain veil
      float veil = uRain*0.10; col = col*(1.0-veil) + vec3(0.55,0.6,0.66)*(1.0-uNight*0.7)*veil; a = a + veil*(1.0-a);
    }
    // lens drops
    if (uDrops > 0.001) {
      vec2 g = q*7.0; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float r = h1(id*1.7); float life = fract(uT*0.07 + r*9.0);
      vec2 c = vec2(h1(id+2.3), h1(id+5.1)) - 0.5; c *= 0.6;
      float d = length((f - c) * vec2(1.0, 0.8)); float rad = 0.05 + 0.08*h1(id+9.0);
      float drop = smoothstep(rad, rad*0.6, d) * step(r, 0.33) * smoothstep(1.0, 0.6, life) * smoothstep(0.0, 0.08, life);
      float ring = smoothstep(rad, rad*0.85, d) - smoothstep(rad*0.85, rad*0.6, d);
      float da = uDrops * (drop*0.07 + ring*0.09); col = col*(1.0-da) + vec3(0.92)*da; a = a + da*(1.0-a);
    }
    // film grain
    float g = h1(px + fract(uT*13.0)*vec2(91.0, 37.0)) - 0.5;
    float ga = abs(g) * uGrain; col = col*(1.0-ga) + vec3(step(0.0, g))*ga; a = a + ga*(1.0-a);
    // warm summer bloom wash from the top
    if (uWarm > 0.001) { float wa = uWarm*0.10*smoothstep(0.3, 1.0, uv.y); col = col*(1.0-wa) + vec3(1.0, 0.85, 0.6)*wa; a = a + wa*(1.0-a); }
    // lightning
    if (uFlash > 0.001) { float fa = uFlash*0.75; col = col*(1.0-fa) + vec3(0.9, 0.93, 1.0)*fa; a = a + fa*(1.0-a); }
    // letterbox
    float lb = uLetter * 0.115; if (uv.y < lb || uv.y > 1.0 - lb) { col = vec3(0.0); a = 1.0; }
    gl_FragColor = vec4(col, a);  // premultiplied
  }`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const L = {}; for (const n of ['uRes', 'uT', 'uRain', 'uFog', 'uGrain', 'uLetter', 'uFlash', 'uDrops', 'uNight', 'uPan', 'uWarm', 'uLayers']) L[n] = gl.getUniformLocation(pr, n);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const S = { rain: 0, fog: 0, grain: 0.05, letter: 0, flash: 0, drops: 0, night: 0, pan: 0, warm: 0 };
  const scale = mobile ? 0.5 : 0.75; // overlay resolution (soft effects don't need full res)
  let t0 = performance.now();
  function render() {
    const W = Math.round(innerWidth * scale), H = Math.round(innerHeight * scale);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const visible = S.rain > 0.002 || S.fog > 0.002 || S.grain > 0.002 || S.letter > 0.002 || S.flash > 0.002 || S.drops > 0.002 || S.warm > 0.002;
    if (!visible) return;
    gl.uniform2f(L.uRes, W, H); gl.uniform1f(L.uT, (performance.now() - t0) / 1000);
    gl.uniform1f(L.uRain, S.rain); gl.uniform1f(L.uFog, S.fog); gl.uniform1f(L.uGrain, S.grain); gl.uniform1f(L.uLetter, S.letter);
    gl.uniform1f(L.uFlash, S.flash); gl.uniform1f(L.uDrops, S.drops); gl.uniform1f(L.uNight, S.night); gl.uniform1f(L.uPan, S.pan); gl.uniform1f(L.uWarm, S.warm); gl.uniform1f(L.uLayers, mobile ? 2 : 3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { S, render };
}
