/* World layout. Loads assets/data/world.json (generated from real OSM data by
   tools/build_world.py: landmarks.json + roads.geojson → local metres) if present,
   otherwise uses this STYLIZED default layout (positions approximate, not to scale).

   Schema:
   { source, origin:{lat,lon}, scale, bounds:[minX,minZ,maxX,maxZ],
     roads:[{name,type,width,pts:[[x,z],...]}], rivers:[{name,width,pts}],
     bridges:[{name,kind:'truss'|'construction',a:[x,z],b:[x,z],width,deck}],
     places:[{id,name,dev,kind,category,x,z,rot}] }
   x = east, z = south (metres). */

export const ORIGIN = { lat: 28.0617, lon: 81.6238 };   // Bageshwori Temple
export function project(lat, lon, scale = 1, origin = ORIGIN) {
  const x = (lon - origin.lon) * Math.cos(origin.lat * Math.PI / 180) * 111320 * scale;
  const z = -(lat - origin.lat) * 110540 * scale;
  return [x, z];
}

export const DEFAULT_WORLD = {
  source: 'default (stylized)',
  bounds: [-230, -330, 300, 200],
  roads: [
    { name: 'Surkhet Road', type: 'primary', width: 14, pts: [[46, -320], [46, 190]] },
    { name: 'Postal Highway', type: 'primary', width: 12, pts: [[-220, -40], [300, -40]] },
    { name: 'Tribhuvan Chowk Road', type: 'secondary', width: 9, pts: [[46, 34], [170, 34]] },
    { name: 'Dhamboji Road', type: 'secondary', width: 9, pts: [[-160, 80], [160, 80]] },
    { name: 'Temple Lane', type: 'residential', width: 7, pts: [[46, -2], [30, -2]] },
    { name: 'Hanumangadhi Road', type: 'secondary', width: 8, pts: [[-60, -100], [-60, 140]] },
    { name: 'Wonder Land Road', type: 'residential', width: 7, pts: [[-60, 128], [-82, 128]] },
    { name: 'School Lane', type: 'residential', width: 6, pts: [[-60, 10], [-104, 10]] },
    { name: 'Hospital Lane', type: 'residential', width: 6, pts: [[140, -40], [140, -96]] },
    { name: 'Airport Road', type: 'secondary', width: 8, pts: [[46, -238], [-20, -238]] },
    { name: 'Muslim Bazar Lane', type: 'residential', width: 6, pts: [[110, 80], [110, 120]] },
    { name: 'Sadar Line', type: 'residential', width: 6, pts: [[-110, 80], [-110, 40]] }
  ],
  rivers: [{ name: 'Rapti River', width: 46, pts: [[205, -420], [196, -140], [204, 60], [194, 260]] }],
  bridges: [
    { name: 'Rapti steel truss bridge', kind: 'truss', a: [170, -40], b: [232, -40], width: 9, deck: 4 },
    { name: 'New Rapti bridge (under construction)', kind: 'construction', a: [170, -62], b: [232, -62], width: 11, deck: 6 }
  ],
  places: [
    { id: 'bageshwori', name: 'Bageshwori Mandir', dev: 'बागेश्वरी मन्दिर', kind: 'bageshwori', x: 0, z: -2 },
    { id: 'hanuman', name: '108-ft Hanuman · Hanumangadhi', dev: 'हनुमानगढी', kind: 'hanuman', x: -84, z: 40 },
    { id: 'ranitalau', name: 'Rani Talau', dev: 'रानी तलाउ', kind: 'ranitalau', x: 120, z: 8 },
    { id: 'tribhuvan', name: 'Tribhuvan Chowk', dev: 'त्रिभुवन चोक', kind: 'chowk', x: 84, z: 34 },
    { id: 'bpchowk', name: 'B.P. Chowk', dev: 'बीपी चोक', kind: 'chowk', x: 46, z: -40 },
    { id: 'pushpalal', name: 'Pushpalal Chowk', dev: 'पुष्पलाल चोक', kind: 'chowk', x: 46, z: 34 },
    { id: 'dhamboji', name: 'Dhamboji (Birendra) Chowk', dev: 'धम्बोझी चोक', kind: 'chowk', x: 46, z: 80 },
    { id: 'chaulika', name: 'Chaulika Chowk', dev: 'चौलिका चोक', kind: 'chowk', x: -60, z: 80 },
    { id: 'charbahini', name: 'Charbahini Chowk · Post Office', kind: 'chowk', x: -60, z: -40 },
    { id: 'wonderland', name: 'Wonder Land', dev: 'वन्डर ल्यान्ड', kind: 'wonderland', x: -110, z: 128 },
    { id: 'ravan', name: 'Ravan Dahan Ground', dev: 'रावण दहन', kind: 'ravan', x: -104, z: -88 },
    { id: 'biryani', name: 'Biryani Corner', kind: 'biryani', x: 92, z: 50, rot: 0 },
    { id: 'golden-abc', name: 'Golden ABC Academy', kind: 'school', x: -100, z: -4 },
    { id: 'hope-intl', name: 'Hope International', kind: 'school', x: 160, z: -96, rot: Math.PI / 2 },
    { id: 'bheri', name: 'Bheri Hospital', kind: 'hospital', x: 120, z: -78 },
    { id: 'campus', name: 'College campus', kind: 'college', x: -150, z: -64 },
    { id: 'masjid', name: 'Jama Masjid', kind: 'mosque', x: 110, z: 132 },
    { id: 'muslimbazar', name: 'Muslim Bazar', kind: 'bazaar', x: 132, z: 100 },
    { id: 'sadarline', name: 'Sadar Line Bazaar', kind: 'bazaar', x: -128, z: 58 },
    { id: 'mahendrapark', name: 'Mahendra Park', kind: 'park', x: -10, z: 120 },
    { id: 'cinema', name: 'QFX Bageshwori', kind: 'cinema', x: 20, z: -60 },
    { id: 'buspark', name: 'Bus Park', kind: 'buspark', x: 74, z: -150 },
    { id: 'ramjanaki', name: 'Ram Janaki Temple', kind: 'temple', x: -20, z: 60 },
    { id: 'airport', name: 'Nepalgunj Airport (KEP)', dev: 'नेपालगञ्ज विमानस्थल', kind: 'airport', x: -20, z: -262 },
    { id: 'border', name: 'Jamunaha Border', dev: 'जमुनाहा नाका', kind: 'border', x: 46, z: 182 },
    { id: 'rapti', name: 'Rapti River Bridges', dev: 'राप्ती नदी', kind: 'rapti', x: 200, z: -50 }
  ]
};

export async function loadWorld() {
  try {
    const r = await fetch('assets/data/world.json', { cache: 'no-cache' });
    if (r.ok) {
      const w = await r.json();
      if (w?.roads?.length && w?.places?.length) {
        // make sure featured places exist; fall back to default positions for missing ones
        const have = new Set(w.places.map(p => p.id));
        DEFAULT_WORLD.places.forEach(p => { if (!have.has(p.id) && ['ravan', 'wonderland', 'biryani', 'golden-abc', 'hope-intl', 'rapti'].includes(p.id)) w.places.push({ ...p, approx: true }); });
        w.rivers ||= []; w.bridges ||= [];
        return w;
      }
    }
  } catch (e) { /* no world.json yet */ }
  return DEFAULT_WORLD;
}
