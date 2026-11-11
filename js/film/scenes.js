/* What fills the screen in each chapter — real footage first.
   bg: { v: video, m: mobile video, p: poster, mode: 'full' | 'column' | 'photo' | 'map' | 'scrub' }
   frames: framed clips / photos that scroll with the text. map: view for the 3D OSM map (full in 'map' mode, small locator otherwise). */
const V = 'assets/videos/', C = V + 'c/', I = 'assets/img/';
const clip = (n, o = {}) => ({ v: C + n + '.mp4', p: C + n + '-poster.webp', ...o });
const own = (n, o = {}) => ({ v: V + n + '.mp4', p: V + n + '-poster.webp', ...o });
export const SCENES = {
  intro:      { bg: own('drone1', { mode: 'full' }), map: { at: [40, 180] } },
  plan:       { bg: { mode: 'map' }, map: { at: [40, 120], dist: 3300, az: 195, el: 52 } },
  bageshwori: { bg: own('bageshwori-day', { mode: 'full' }), frames: [{ img: I + 'bageshwori-temple-dhungana-1.webp' }, { img: I + 'jungeshwor-mahadev-on-pond.webp' }], map: { at: 'bageshwori', az: 215 } },
  hanuman:    { bg: own('hanuman', { mode: 'column' }), frames: [{ img: I + 'c/hanuman-108.webp', tall: true }, clip('pc-hanuman-mandir')], map: { at: 'hanuman', az: 140 } },
  tribhuvan:  { bg: clip('yt-tribhuvan-street-walk', { mode: 'full' }), frames: [clip('pc-tribhuvan-chowk-2026'), { img: I + 'nepalgunj-market-01.webp' }], map: { at: 'tribhuvan', az: 160 } },
  dhamboji:   { bg: { v: V + 'dhamboji-scrub-720.mp4', p: V + 'dhamboji-poster.webp', mode: 'scrub' }, frames: [clip('bon-dhamboji-chowk', { wide: true }), clip('yt-pradip-dhamboji-bp-drone', { wide: true })], map: { at: 'dhamboji', az: 200 } },
  ranitalau:  { bg: { img: I + 'rani-talau.webp', mode: 'photo' }, frames: [clip('bon-rani-talau')], map: { at: 'ranitalau', az: 235 } },
  culture:    { bg: clip('bon-random-city', { mode: 'column' }), frames: [{ img: I + 'c/masjid-green.webp' }, { img: I + 'tharu-maghe-celebration.webp' }], map: { at: 'masjid', az: 150 } },
  food:       { bg: clip('yt-mubarak-biryani', { mode: 'full' }), frames: [clip('bon-chat-corner'), clip('bon-foodfest-tribhuvan')], map: { at: 'bpchowk', az: 120 } },
  rapti:      { bg: own('rapti-hero', { mode: 'full', m: V + 'rapti-hero-480.mp4' }), frames: [clip('pc-rapti-bridge'), clip('yt-rapti-bridge-truss', { wide: true })], map: { at: [1150, -40], az: 255 } },
  festivals:  { bg: own('ravan-dahan', { mode: 'full' }), frames: [clip('pc-ravan-dahan'), { img: I + 'c/bageshwori-diyas.webp' }, clip('pc-tribhuvan-chowk-tihar')], diyas: true, map: { at: 'ravan', az: 200 } },
  city:       { bg: { mode: 'map' }, map: { at: [150, -200], dist: 4200, az: 190, el: 50 } },
  outro:      { bg: clip('pc-bageshwori-2026', { mode: 'column' }), map: { at: 'bageshwori', az: 120 } }
};
