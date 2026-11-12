// Places on the aerial map. Coordinates: lat/lon (converted to scene metres at runtime).
// kind: 'pano' = real 360° photospheres (equirect frames from 360° camera footage)
//       'film' = real footage of the place (no 360° source exists)
//       'aerial' = no street media: the camera flies down over the place
// yaw0 = compass bearing (deg) at the left edge (u=0) of the equirect; null = unknown.
export const PLACES = [
  { id: 'bp', name: 'BP Chowk', dev: 'बीपी चोक', line: 'Surkhet Road from the sky', lat: 28.0606, lon: 81.6193, h: 60, kind: 'pano',
    nodes: [
      { id: 'bp-sky', label: 'Sky', yaw0: 184, alt: 140, start: [24, -12],
        links: [{ to: 'bageshwori' }, { to: 'hanuman' }, { to: 'tribhuvan' }, { to: 'dhamboji' }, { to: 'ranitalau' }, { to: 'bheri' }, { to: 'qfx' }] },
      { id: 'bp-roof', label: 'Rooftops', yaw0: null, start: [180, -14] },
      { id: 'bp-low', label: 'Low', yaw0: null, start: [180, -10] },
      { id: 'bp-lane', label: 'Lane', yaw0: null, start: [180, -6] },
    ] },
  { id: 'bageshwori', name: 'Bageshwori', dev: 'बागेश्वरी मन्दिर', line: 'Shakti Peeth at the heart of the city', lat: 28.06166, lon: 81.62357, h: 30, kind: 'film',
    clips: ['pc-bageshwori-2026', '../bageshwori-day'], lm: [-21.8, 4.8] },
  { id: 'hanuman', name: 'Hanuman', dev: 'हनुमान · १०८ फिट', line: '108 feet tall', lat: 28.06107, lon: 81.62249, h: 46, kind: 'film',
    clips: ['pc-hanuman-mandir', '../hanuman'], lm: [-128.7, 66.3] },
  { id: 'tribhuvan', name: 'Tribhuvan Chowk', dev: 'त्रिभुवन चोक', line: 'Where every road meets', lat: 28.057813, lon: 81.623504, h: 14, kind: 'film',
    clips: ['yt-tribhuvan-street-walk', 'pc-tribhuvan-chowk-2026', 'pc-tribhuvan-chowk-tihar'] },
  { id: 'dhamboji', name: 'Dhamboji Chowk', dev: 'धम्बोजी चोक', line: 'The bazaar that never sleeps', lat: 28.066889, lon: 81.626325, h: 14, kind: 'film',
    clips: ['yt-pradip-dhamboji-bp-drone', 'bon-dhamboji-chowk'] },
  { id: 'qfx', name: 'QFX Cinemas', dev: 'क्यूएफएक्स', line: 'Step inside', lat: 28.065644, lon: 81.628453, h: 22, kind: 'pano',
    nodes: [
      { id: 'qfx-lobby', label: 'Lobby', yaw0: null, start: [180, 0], links: [{ node: 'qfx-stairs', u: 0.205, v: 0.47 }] },
      { id: 'qfx-stairs', label: 'Stairs', yaw0: null, start: [180, 0] },
      { id: 'qfx-hall', label: 'Hall', yaw0: null, start: [180, 0] },
    ] },
  { id: 'ranitalau', name: 'Rani Talau', dev: 'रानी तलाउ', line: 'The queen’s pond', lat: 28.056361, lon: 81.626365, h: 10, kind: 'film',
    clips: ['bon-rani-talau'] },
  { id: 'food', name: 'Food Street', dev: 'नेपालगञ्जको स्वाद', line: 'Biryani · Sekuwa · Jeri', lat: 28.0595, lon: 81.6255, h: 10, kind: 'film',
    clips: ['yt-mubarak-biryani', 'bon-chat-corner', 'bon-foodfest-tribhuvan'] },
  { id: 'bheri', name: 'Bheri Hospital', dev: 'भेरी अस्पताल', line: 'Caring for the Mid-West', lat: 28.052903, lon: 81.620083, h: 18, kind: 'aerial' },
  { id: 'goldenabc', name: 'Golden ABC Academy', dev: 'गोल्डेन एबीसी', line: 'Learning in the heart of Banke', lat: 28.060331, lon: 81.630978, h: 16, kind: 'aerial' },
  { id: 'hope', name: 'Hope International', dev: 'होप इन्टरनेशनल', line: 'North Nepalgunj', lat: 28.070819, lon: 81.633901, h: 16, kind: 'aerial' },
  { id: 'rapti', name: 'Rapti Bridge', dev: 'राप्ती पुल', line: 'The river beyond the city', lat: null, lon: null, kind: 'film',
    clips: ['yt-rapti-bridge-truss', 'pc-rapti-bridge', '../rapti-bridges'] },
];
