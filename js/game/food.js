/* Food Passport — dishes from research notes. Photos are REPRESENTATIVE (not shot in Nepalgunj). No prices. */
export const DISHES = {
  biryani:   { name: 'Mutton Biryani', dev: 'बिरयानी', icon: '🍛', model: 'rice', color: 0xe0a93a,
    fact: 'Nepalgunj\'s signature savoury dish — spiced rice and meat with raita. Mubarak Biryani, a long-running family kitchen, is repeatedly named as the iconic stop and often sells out by early afternoon.',
    photo: 'assets/img/mutton-biryani-sm.webp', credit: '© Gaurav Dhwaj Khadka · CC BY-SA 4.0 · representative photo' },
  korma:     { name: 'Mutton Korma', dev: 'कोरमा', icon: '🍲', model: 'bowl', color: 0x9a4a1e,
    fact: 'A rich Awadhi-style curry, recommended alongside biryani in Nepalgunj food writing.' },
  kebab:     { name: 'Mutton Kebab', dev: 'कबाब', icon: '🍢', model: 'skewer', color: 0x6b3416,
    fact: 'Awadhi-style kebab — one famous version is minced mutton with chickpea dal and spices.' },
  sekuwa:    { name: 'Sekuwa', dev: 'सेकुवा', icon: '🔥', model: 'skewer', color: 0x8a3b12,
    fact: 'Smoky, spice-marinated grilled meat. Evening crowds gather at Dhamboji, B.P. and Pushpalal Chowk; it comes with puffed rice and achar.',
    photo: 'assets/img/sekuwa-buff-puff-rice-sm.webp', credit: '© Gaurav Dhwaj Khadka · CC BY-SA 4.0 · representative photo' },
  panipuri:  { name: 'Pani Puri', dev: 'पानीपुरी', icon: '🥟', model: 'puri', color: 0xd9a24a,
    fact: 'Found city-wide — food writing notes a well-known stall at Tribhuvan Chowk.' },
  chaat:     { name: 'Chaat', dev: 'चाट', icon: '🥙', model: 'bowl', color: 0xc9772a,
    fact: 'Classic stall food with samosa, kachori and puri with chickpea gravy — the cross-border influence is obvious.' },
  jalebi:    { name: 'Jalebi (Jeri)', dev: 'जेरी', icon: '🌀', model: 'spiral', color: 0xf09a1a,
    fact: 'Listed among Nepalgunj\'s classic stall sweets, alongside chaat, samosa and kachori.',
    photo: 'assets/img/jeri-jalebi-sm.webp', credit: '© Bijaya2043 · CC BY-SA 4.0 · representative photo (Kalaiya, not Nepalgunj)' },
  halwa:     { name: 'Halwa Paratha', dev: 'हलुवा पराठा', icon: '🫓', model: 'flat', color: 0xe3b65a,
    fact: 'A breakfast-to-dinner favourite; a well-known shop at Chaulika Chowk is busy from about 5 a.m. to 8 p.m.' },
  ghamanja:  { name: 'Ghamanja', dev: 'घमन्जा', icon: '🍽️', model: 'plate', color: 0xb5822f,
    fact: 'A filling worker\'s breakfast plate: bread tikia, chillies, potato, pea curry and cauliflower tikia — often finished with lassi.' },
  dhikri:    { name: 'Dhikri', dev: 'ढिक्री', icon: '🍙', model: 'dumpling', color: 0xf1eadb,
    fact: 'Steamed rice-flour dumplings — a core Tharu staple, now also sold in Nepalgunj.',
    photo: 'assets/img/dhikri-tharu-food-sm.webp', credit: '© Janak Bhatta · CC BY-SA 4.0 · representative photo' },
  ghonghi:   { name: 'Ghonghi', dev: 'घुँगी', icon: '🐌', model: 'bowl', color: 0x4a3b2a,
    fact: 'Snail curry — a distinctive Tharu delicacy now found in the city food scene.',
    photo: 'assets/img/ghonghi-sm.webp', credit: '© Gaurav Dhwaj Khadka · CC BY-SA 4.0 · representative photo' },
  rawadi:    { name: 'Rawadi', dev: 'रबाडी', icon: '🍮', model: 'cup', color: 0xf3e3c0,
    fact: 'The local favourite sweet — residents are said to send it to relatives living elsewhere.' },
  lassi:     { name: 'Lassi', dev: 'लस्सी', icon: '🥛', model: 'glass', color: 0xfaf6ea,
    fact: 'The common closer after a heavy Nepalgunj breakfast.' }
};

/* Stalls placed in the city at chowks (keys must match world place ids) */
export const STALLS = [
  { at: 'dhamboji', name: 'Sekuwa Grill', dishes: ['sekuwa'], type: 'grill', off: [7, 5] },
  { at: 'dhamboji', name: 'Kebab Stall', dishes: ['kebab'], type: 'grill', off: [-7, 6] },
  { at: 'dhamboji', name: 'Tharu Kitchen', dishes: ['dhikri', 'ghonghi'], type: 'cart', off: [8, -7] },
  { at: 'bpchowk', name: 'Sekuwa Corner', dishes: ['sekuwa'], type: 'grill', off: [8, 6] },
  { at: 'tribhuvan', name: 'Pani Puri Thela', dishes: ['panipuri'], type: 'thela', off: [6, -6] },
  { at: 'tribhuvan', name: 'Chaat Thela', dishes: ['chaat'], type: 'thela', off: [-6, -6] },
  { at: 'pushpalal', name: 'Jalebi Stall', dishes: ['jalebi'], type: 'cart', off: [7, 5] },
  { at: 'pushpalal', name: 'Sweets & Lassi', dishes: ['rawadi', 'lassi'], type: 'cart', off: [-7, 5] },
  { at: 'chaulika', name: 'Halwa Paratha Shop', dishes: ['halwa', 'ghamanja'], type: 'cart', off: [6, 6] }
];

const KEY = 'nepalgunj-food-passport-v1';
export const passport = {
  tried: new Set(JSON.parse(localStorage.getItem(KEY) || '[]')),
  add(id) { const isNew = !this.tried.has(id); this.tried.add(id); localStorage.setItem(KEY, JSON.stringify([...this.tried])); return isNew; },
  get total() { return Object.keys(DISHES).length; },
  get complete() { return this.tried.size >= this.total; }
};
