/* =====================================================================
   DRONE / VIDEO CONFIG  —  edit this file to add or swap clips.
   ---------------------------------------------------------------------
   All files live in  assets/videos/  (relative paths → works on GitHub Pages).
   Recommended encode (vertical reel):
     ffmpeg -i in.mp4 -an -vf "scale=720:1280,fps=30" -c:v libx264 -crf 26 \
            -preset slow -pix_fmt yuv420p -movflags +faststart assets/videos/droneN.mp4
     ffmpeg -ss 5 -i in.mp4 -frames:v 1 -vf scale=720:1280 assets/videos/droneN-poster.webp
   Always credit the creator (TikTok / Instagram handle) in `credit`.
   ===================================================================== */

/* Full-bleed hero background (landscape 16:9, no burned-in text). */
export const HERO_VIDEO = {
  enabled: true,
  mp4: 'assets/videos/rapti-hero.mp4',          // 1280×720 H.264
  mp4Small: 'assets/videos/rapti-hero-480.mp4', // 854×480 for phones / slow links
  webm: 'assets/videos/rapti-hero.webm',        // VP9 (optional)
  poster: 'assets/videos/rapti-hero-poster.webp',
  caption: 'Rapti river, Nepalgunj — drone footage',
  credit: 'Rapti drone footage: shared by the site owner'   // TODO: add creator handle if known
};

/* "Nepalgunj from the sky" — cinematic clip gallery (no burned-in text: crop it out first).
   The first entry is shown large; the rest sit beside/below it.
   `aspect` = CSS aspect-ratio of the clip ('16/9', '1/1', '4/5', '9/16').
   Entries with `src: ''` render as a "coming soon" slot using the poster image.
   Encode tip (crop out captions, landscape):
     ffmpeg -i in.mp4 -an -vf "crop=1080:608:0:680,scale=1280:720,fps=30" -c:v libx264 -crf 24 \
            -preset slow -pix_fmt yuv420p -movflags +faststart assets/videos/droneN.mp4 */
export const SKY_CLIPS = [
  {
    src: 'assets/videos/drone1.mp4',
    poster: 'assets/videos/drone1-poster.webp',
    aspect: '16/9',
    title: 'Golden hour over Nepalgunj',
    chapters: 'Pond embankment · city rooftops · pink sky · Rapti steel truss bridge · fields',
    credit: 'Drone footage: @nepalgunjiya'
  },
  {
    src: 'assets/videos/rapti-bridges.mp4',
    poster: 'assets/videos/rapti-bridges-poster.webp',
    aspect: '4/5',
    title: 'Rapti river bridges',
    chapters: 'Old steel truss bridge beside a new concrete bridge under construction',
    credit: 'Rapti drone footage: shared by the site owner'
  },
  {
    src: '',                                   // ← add assets/videos/drone3.mp4 here
    poster: 'assets/img/nepalgunj-skyline-sm.webp',
    aspect: '4/5',
    title: 'Next drone clip',
    chapters: 'Slot ready — add a clip + poster in js/media-config.js',
    credit: ''
  }
];

/* Videos used inside content cards (Famous Places etc.). */
export const PLACE_VIDEOS = {
  hanuman: {
    src: 'assets/videos/hanuman.mp4',
    poster: 'assets/videos/hanuman-poster.webp',
    title: '108-foot Hanuman at Hanumangadhi',
    location: 'Hanumangadhi · near Bageshwori Temple · Ward 2',   // ← edit here if needed
    credit: 'Drone footage: shared by the site owner'   // TODO: add creator handle if known
  },
  ravan: {
    src: 'assets/videos/ravan-dahan.mp4',
    poster: 'assets/videos/ravan-dahan-poster.webp',
    title: 'Ravan Dahan · Vijaya Dashami',
    location: 'Dashain in Nepalgunj',     // ← add the ground's name here once confirmed
    credit: 'Ravan Dahan drone footage: shared by the site owner'   // TODO: add creator handle if known
  },
  wonderland: {
    src: 'assets/videos/wonderland.mp4',
    poster: 'assets/videos/wonderland-poster.webp',
    title: 'Wonder Land',
    location: 'Water park & family fun · Nepalgunj',
    credit: 'Video: @BeautyofNepalgunj'
  }
};

/* Bageshwori Temple feature — Day/Night ready.
   To enable the toggle later, fill in `night` with { src, poster } (same 1:1 crop, 720×720). */
PLACE_VIDEOS.bageshwori = {
  day:   { src: 'assets/videos/bageshwori-day.mp4', poster: 'assets/videos/bageshwori-day-poster.webp',
           alt: 'Geese and koi in the Bageshwori Temple pond on a sunny day, palms along the bank' },
  night: null,   // e.g. { src: 'assets/videos/bageshwori-night.mp4', poster: 'assets/videos/bageshwori-night-poster.webp', alt: '...' }
  credit: 'Bageshwori pond drone/phone footage: shared by the site owner'   // TODO: add creator handle if known
};
