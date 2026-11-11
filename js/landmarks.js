/* Landmarks for the 3D explorer. Positions are in scene units (x = east, z = south),
   on a STYLIZED, not-to-scale mini-map. `view` = camera position `p` and look-at `t`.
   media: { video, poster } or { img, credit }. Facts come from research notes. */
export const LANDMARKS = [
  {
    id: 'bageshwori', icon: '🛕', name: 'Bageshwori Mandir', dev: 'बागेश्वरी मन्दिर', tag: 'Heart of the city · Ward 2',
    pos: [0, -12], h: 24, view: { p: [20, 11, 16], t: [0, 8, -12] }, section: '#places',
    media: { video: 'assets/videos/bageshwori-day.mp4', poster: 'assets/videos/bageshwori-day-poster.webp', credit: 'Video: shared by the site owner' },
    facts: [
      'Principal Hindu shrine of Nepalgunj, often called the oldest temple in Banke District.',
      'Goddess Bageshwori — a form of Durga / Bhagwati associated with speech; tradition says Sati Devi\'s tongue fell here.',
      'Its image has appeared on Nepali one-rupee coins and postage stamps.',
      'Busiest on Tuesdays & Saturdays; Dashain brings the biggest crowds. Deep Utsav nights fill it with lamps.'
    ]
  },
  {
    id: 'junge', icon: '🔱', name: 'Junge Mahadev', dev: 'जुंगे महादेव', tag: 'In the Bageshwori pond',
    pos: [0, 22], h: 12, view: { p: [-24, 8, 48], t: [0, 3, 22] }, section: '#places',
    media: { img: 'assets/img/junge-mahadev-temple-23-sm.webp', credit: '© Ricky Partel · CC BY-SA 4.0 · Wikimedia Commons' },
    facts: [
      'A rare shrine of Shiva with a moustache — "Junge" Mahadev.',
      'It stands in the pond of the Bageshwori Temple complex, reached by a bright walkway.',
      'One of the most distinctive sights of the Nepalgunj skyline.'
    ]
  },
  {
    id: 'hanuman', icon: '🙏', name: '108-ft Hanuman', dev: 'हनुमानगढी', tag: 'Hanumangadhi · near Bageshwori · Ward 2',
    pos: [-60, 40], h: 28, view: { p: [-34, 16, 68], t: [-60, 13, 40] }, section: '#places',
    media: { video: 'assets/videos/hanuman.mp4', poster: 'assets/videos/hanuman-poster.webp', credit: 'Drone footage: shared by the site owner' },
    facts: [
      '108-foot statue at Hanumangadhi — reported as Nepal\'s tallest Hanuman statue (The Rising Nepal, 8 Nov 2026).',
      'Completed November 2026 at a cost of about Rs 140.46 million.',
      'Meant to strengthen religious ties with Ayodhya; Hanuman Jayanti already draws devotees from Nepal and India.'
    ]
  },
  {
    id: 'ranitalau', icon: '🚣', name: 'Rani Talau', dev: 'रानी तलाउ', tag: 'Ward 8 · east of Tribhuvan Chowk',
    pos: [120, 12], h: 10, view: { p: [146, 22, 48], t: [120, 0, 12] }, section: '#places',
    media: { img: 'assets/img/rani-talau-sm.webp', credit: '© Brmagar · CC BY-SA 4.0 · Wikimedia Commons (photographed dry, 2015)' },
    facts: [
      'A historic public pond, about 200 years old — separate from the Bageshwori temple pond.',
      'Renovations added boating, a playground and a flower garden; condition has varied over the years.',
      'Holika Dahan is traditionally held at a spot by the pond.'
    ]
  },
  {
    id: 'bpchowk', icon: '🔥', name: 'B.P. Chowk & Surkhet Road', dev: 'बीपी चोक', tag: 'Chowks · sekuwa evenings',
    pos: [46, -40], h: 12, view: { p: [66, 14, -12], t: [46, 3, -40] }, section: '#roads',
    media: { img: 'assets/img/nepalgunj-market-01-sm.webp', credit: '© Binod Basnet · CC BY-SA 4.0 · Wikimedia Commons' },
    facts: [
      'Surkhet Road runs ~24 km from Mahendra Chowk (Kohalpur) to the border, through Dhamboji, Pushpalal and B.P. Chowk.',
      'Dhamboji / Birendra Chowk is the "heart of the city" — banks, lodges and shops.',
      'By evening these chowks are Nepalgunj\'s sekuwa strip — smoky grilled meat with puffed rice and achar.'
    ]
  },
  {
    id: 'wonderland', icon: '🎢', name: 'Wonder Land', dev: 'वन्डर ल्यान्ड', tag: 'Water park & family fun',
    pos: [-104, 108], h: 16, view: { p: [-72, 26, 142], t: [-104, 4, 108] }, section: '#places',
    media: { video: 'assets/videos/wonderland.mp4', poster: 'assets/videos/wonderland-poster.webp', credit: 'Video: @BeautyofNepalgunj' },
    facts: [
      'A modern water and amusement park — twisting slides, splash zone, pools, sculptures and lawns.',
      'A favourite family cool-off on hot Terai days.',
      'Check current hours and tickets locally.'
    ]
  },
  {
    id: 'ravan', icon: '🎆', name: 'Ravan Dahan', dev: 'रावण दहन', tag: 'Dashain · Vijaya Dashami',
    pos: [-100, -80], h: 30, view: { p: [-64, 28, -44], t: [-100, 10, -80] }, section: '#culture',
    media: { video: 'assets/videos/ravan-dahan.mp4', poster: 'assets/videos/ravan-dahan-poster.webp', credit: 'Drone footage: shared by the site owner' },
    facts: [
      'During Dashain, Ramleela is staged nightly (about 7 p.m.–midnight) on open ground, from Ghatasthapana to Vijaya Dashami.',
      'Huge crowds gather to watch the Ravan effigy burn — good over evil.',
      'The Ramlila Ground (Ram Leela Ground, Ward 9) is the documented Ravan Dahan and historic Ramlila ground (The Rising Nepal; OpenStreetMap).',
      'Devotees and visitors come from the city, nearby villages and Indian border towns.'
    ]
  },
  {
    id: 'rapti', icon: '🌉', name: 'Rapti River Bridges', dev: 'राप्ती नदी', tag: 'Postal Highway · Sidhania Ghat',
    pos: [200, -48], h: 18, view: { p: [252, 26, 4], t: [200, 6, -48] }, section: '#roads',
    media: { video: 'assets/videos/rapti-bridges.mp4', poster: 'assets/videos/rapti-bridges-poster.webp', credit: 'Drone footage: shared by the site owner' },
    facts: [
      'The West Rapti drains much of Banke District.',
      'A new 700 m bridge (11 m wide, 1.75 m footpaths, ~Rs 1.19 billion) at Sidhania Ghat was contracted in Jan 2023, targeted for June 2027.',
      'Drone clip: an old steel truss bridge beside a new concrete bridge under construction.'
    ]
  },
  {
    id: 'tribhuvan', icon: '🥙', name: 'Tribhuvan Chowk', dev: 'त्रिभुवन चोक', tag: 'City junction · chaat & pani puri',
    pos: [84, 34], h: 10, view: { p: [104, 16, 62], t: [84, 2, 34] }, section: '#food',
    media: { img: 'assets/img/nepalgunj-market-02-sm.webp', credit: '© Binod Basnet · CC BY-SA 4.0 · Wikimedia Commons (Nepalgunj Bazar)' },
    facts: [
      'A city junction known in food writing for its chaat and pani puri stalls.',
      'Rani Talau, the city\'s ~200-year-old public pond, lies just to the east (Ward 8).',
      'Photo: Nepalgunj Bazar street scene.'
    ]
  },
  {
    id: 'dhamboji', icon: '🏦', name: 'Dhamboji Chowk', dev: 'धम्बोझी चोक', tag: 'Birendra Chowk · heart of the city',
    pos: [46, 80], h: 10, view: { p: [70, 16, 108], t: [46, 2, 80] }, section: '#roads',
    media: { img: 'assets/img/nepalgunj-market-03-sm.webp', credit: '© Binod Basnet · CC BY-SA 4.0 · Wikimedia Commons (Nepalgunj Bazar)' },
    facts: [
      'Also called Birendra Chowk — the municipality calls it the main business heart of Nepalgunj.',
      'Banks, lodges, motor-parts shops and an evening sekuwa strip.',
      'On the Surkhet Road axis with Pushpalal and B.P. Chowk.'
    ]
  },
  {
    id: 'airport', icon: '✈️', name: 'Nepalgunj Airport', dev: 'नेपालगञ्ज विमानस्थल', tag: 'KEP · Ranjha · 5–6 km north',
    pos: [30, -252], h: 14, view: { p: [90, 30, -200], t: [30, 2, -256] }, section: '#visit',
    media: { img: 'assets/img/nepalgunj-airport-tara-air-sm.webp', credit: '© Bruno Rijsman · CC BY 2.0 · Wikimedia Commons' },
    facts: [
      'Officially Mahendra Airport, commonly Ranjha Airport; opened 15 March 1961.',
      'About 50–60 minutes from Kathmandu; hub for small-plane flights to Jumla, Simikot, Rara and Dolpa.',
      'Runway 08/26, 1,505 m; a new passenger terminal was reported completed in November 2025.'
    ]
  },
  {
    id: 'border', icon: '🛂', name: 'Jamunaha Border', dev: 'जमुनाहा नाका', tag: 'Nepal–India · Rupaidiha',
    pos: [46, 158], h: 12, view: { p: [76, 18, 192], t: [46, 4, 156] }, section: '#roads',
    media: { img: 'assets/img/nepalgunj-skyline-sm.webp', credit: '© Rabin Karki · CC BY 3.0 · Wikimedia Commons (Nepalgunj skyline)' },
    facts: [
      'One of the busiest western Terai crossings, about 5 km south of the city.',
      'A major trade gateway for western Nepal and Karnali.',
      'Rupaidiha, on the Indian side, now has a broad-gauge railway station.'
    ]
  }
];
