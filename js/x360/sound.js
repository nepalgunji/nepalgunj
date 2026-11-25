// Optional ambience (off by default). Procedural, so nothing to download: a low city rumble,
// wind, and rain whose mix follows the climate (rain ↑ in monsoon, wind in winter fog).
export function createSound() {
  let ctx = null, nodes = null, on = false;
  const mix = { rain: 0, wind: 0.2, city: 0.6, inside: 0 };
  function noiseBuf(c, sec, brown) {
    const b = c.createBuffer(2, c.sampleRate * sec, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } }
    return b;
  }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const src = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    const white = noiseBuf(ctx, 4, false), brown = noiseBuf(ctx, 6, true);
    // city: brown noise, low-passed rumble with slow swell (traffic)
    const city = ctx.createGain(); const cLP = ctx.createBiquadFilter(); cLP.type = 'lowpass'; cLP.frequency.value = 380;
    src(brown).connect(cLP).connect(city).connect(master);
    // wind: band-passed white noise with an LFO on the band
    const wind = ctx.createGain(); const wBP = ctx.createBiquadFilter(); wBP.type = 'bandpass'; wBP.frequency.value = 500; wBP.Q.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(wBP.frequency); lfo.start();
    src(white).connect(wBP).connect(wind).connect(master);
    // rain: high-passed white noise + a softer low layer
    const rain = ctx.createGain(); const rHP = ctx.createBiquadFilter(); rHP.type = 'highpass'; rHP.frequency.value = 1400; const rLP = ctx.createBiquadFilter(); rLP.type = 'lowpass'; rLP.frequency.value = 9000;
    src(white).connect(rHP).connect(rLP).connect(rain).connect(master);
    nodes = { master, city, wind, rain, cLP };
  }
  function apply() {
    if (!nodes) return; const t = ctx.currentTime, k = 1.2;
    nodes.master.gain.setTargetAtTime(on ? 0.55 : 0, t, 0.4);
    nodes.city.gain.setTargetAtTime(mix.city * (1 - 0.4 * mix.rain) * (mix.inside ? 1.25 : 0.7), t, k);
    nodes.cLP.frequency.setTargetAtTime(mix.inside ? 650 : 320, t, k);
    nodes.wind.gain.setTargetAtTime(0.05 + mix.wind * 0.22, t, k);
    nodes.rain.gain.setTargetAtTime(mix.rain * 0.32, t, k);
  }
  return {
    get on() { return on; },
    toggle() { if (!ctx) build(); on = !on; if (on && ctx.state === 'suspended') ctx.resume(); apply(); return on; },
    set(m) { Object.assign(mix, m); apply(); },
  };
}
