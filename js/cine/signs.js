/* Shop signboard atlas (canvas): generic Nepali/English shop-type boards, faded and weathered.
   Generic shop categories only — no invented business names. */
import * as THREE from 'three';
const BOARDS = [
  ['किराना पसल', 'KIRANA STORE', '#b8322a', '#f6efe0'], ['मेडिकल हल', 'MEDICAL HALL', '#1f6b4a', '#f4f1e6'], ['मोबाइल सेन्टर', 'MOBILE CENTER', '#1c4f8f', '#f8f4ea'],
  ['कपडा पसल', 'CLOTH HOUSE', '#7a2a5a', '#f8efe8'], ['मिठाई भण्डार', 'SWEETS', '#c87a12', '#2a1608'], ['होटल तथा खाजा घर', 'HOTEL & KHAJA', '#a82f1c', '#fbf2dc'],
  ['हार्डवेयर', 'HARDWARE', '#33414f', '#f2c230'], ['स्टेशनरी', 'STATIONERY', '#2f6f8f', '#ffffff'], ['ज्वेलर्स', 'JEWELLERS', '#5a1820', '#e8c46a'],
  ['फेन्सी स्टोर', 'FANCY STORE', '#8a3a8a', '#fff6f0'], ['चिया पसल', 'TEA SHOP', '#5f4630', '#f1e3c4'], ['इलेक्ट्रोनिक्स', 'ELECTRONICS', '#202a36', '#7fd0ff'],
  ['जुत्ता पसल', 'SHOE HOUSE', '#9a4a1a', '#fff2dc'], ['फोटो स्टुडियो', 'PHOTO STUDIO', '#262626', '#f0f0f0'], ['टेलर्स', 'TAILORS', '#3f5f2a', '#f4f0d8'], ['बैंक', 'BANK', '#0f3f7a', '#ffffff']
];
export function signAtlas() {
  const W = 1024, H = 1024, cols = 2, rows = 8, cw = W / cols, ch = H / rows;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  BOARDS.forEach(([dev, en, bg, fg], i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    const grd = g.createLinearGradient(0, y, 0, y + ch); grd.addColorStop(0, bg); grd.addColorStop(1, shade(bg, -0.25));
    g.fillStyle = grd; g.fillRect(x, y, cw, ch);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${ch * 0.42}px "Noto Sans Devanagari","Mukta","Mangal",sans-serif`; g.fillText(dev, x + cw / 2, y + ch * 0.4, cw * 0.92);
    g.font = `600 ${ch * 0.2}px Inter,Arial,sans-serif`; g.globalAlpha = 0.9; g.fillText(en, x + cw / 2, y + ch * 0.8, cw * 0.9); g.globalAlpha = 1;
    // weathering: dust, sun-fade and rust streaks
    for (let k = 0; k < 140; k++) { g.fillStyle = `rgba(${200 + Math.random() * 40},${180 + Math.random() * 30},${140},${Math.random() * 0.06})`; g.fillRect(x + Math.random() * cw, y + Math.random() * ch, 2 + Math.random() * 30, 1 + Math.random() * 6); }
    for (let k = 0; k < 6; k++) { const sx = x + Math.random() * cw; const gr = g.createLinearGradient(0, y, 0, y + ch); gr.addColorStop(0, 'rgba(90,50,20,0.25)'); gr.addColorStop(1, 'rgba(90,50,20,0)'); g.fillStyle = gr; g.fillRect(sx, y, 2 + Math.random() * 4, ch); }
    g.fillStyle = 'rgba(255,240,210,0.08)'; g.fillRect(x, y, cw, ch);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
  return { tex: t, cols, rows, count: BOARDS.length };
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255; r = Math.max(0, Math.min(255, r * (1 + k))); gg = Math.max(0, Math.min(255, gg * (1 + k))); b = Math.max(0, Math.min(255, b * (1 + k))); return `rgb(${r | 0},${gg | 0},${b | 0})`; }
