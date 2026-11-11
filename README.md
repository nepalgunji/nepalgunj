# Nepalgunj · नेपालगञ्ज

A scroll-driven cinematic site about **Nepalgunj, Nepal**.

- Real drone and street footage from Nepalgunj creators is the main picture. It cross-fades chapter by chapter as you scroll.
- A dusk "architectural model" of the city, built from **OpenStreetMap** (13,000 building footprints, roads, ponds), links the places. It is the full-screen map in the *street plan* and *gateways* chapters and a small circular locator in the other chapters.

It is a static site with no build step. three.js 0.170, GSAP 3.12 + ScrollTrigger and Lenis load from jsDelivr through an import map. It works on GitHub Pages as is.

## Pages
- `index.html` is the scroll film. It has 13 chapters:
  - Intro and the street plan.
  - Bageshwori Mandir, the 108-ft Hanuman, Tribhuvan Chowk and Dhamboji Chowk.
  - Rani Talau, Jama Masjid and the shared city, and food.
  - The Rapti bridges, Ravan Dahan and festival lights.
  - Schools, hospitals and gateways, and the outro.
- The time of day moves from dawn to golden hour to night as you scroll: there is a clock top-right and a soft-light grade.
- The Dhamboji drone flight is **scrubbed by the scroll** on desktop and plays normally on phones.
- `game.html` is the older walkable 3D game. It is experimental and not linked from the film.
- `credits.html` is a **hidden, unlinked** credits page that renders `assets/data/credits.json`. Link it when the owner wants credits visible.
- No creator names appear on the public page. The only visible attribution is the required "© OpenStreetMap contributors" in the corner.

## Code
- `js/film/main.js` builds the chapters and stage, runs Lenis smooth scroll, the reveals and parallax, the active-scene cross-fade, the video lifecycle (lazy-load, play while visible, unload when far away), the time-of-day grade and the diya bokeh. Test hook: `window.__film`.
- `js/film/scenes.js` sets which footage or photo fills each chapter. The modes are `full`, `column` (blurred poster plus a sharp vertical clip), `photo`, `scrub` and `map`.
- `js/film/map.js` builds the OSM model (extruded footprints, road ribbons, water), the camera tween between places, the circular locator (scissored view offset) and the hotspots with info cards.
- `js/cine/chapters.js` holds the chapter text and the place facts, all from the project research notes.
- `js/cine/*` (other files) hold an experimental photoreal procedural 3D city. It is not used by the page.
- `assets/videos/c/` holds the creator clips: 720p backgrounds, 540p frames, H.264, no audio, burned-in text cropped.

## Local preview
```
python3 -m http.server 8765    # then open http://localhost:8765/
node ../tools/film-shoot.mjs   # headless screenshots of every chapter (desktop + mobile) → ../screens/
```

## Content rules
- Facts come only from the research notes. No invented prices or opening hours.
- The food photos are representative, and the page labels them that way.
- Far places (the airport, the Jamunaha border, Wonder Land, the Rapti) are only approximate on the map, with their real distance shown.
- Video permissions: @pcphotography2 and @beauty_of_nepalgunj were confirmed by the owner. Other public creators were approved by the owner, who will contact them and remove anything on request. Every source URL is in `credits.json`.
