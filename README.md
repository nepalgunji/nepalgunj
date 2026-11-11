# Namaste Nepalgunj · नमस्ते नेपालगञ्ज

A walkable **3D game world of Nepalgunj, Nepal**, built on real OpenStreetMap street data. It comes with a separate cinematic **scroll story**.

- `index.html`: **the game**. Walk the real streets of the city centre (about 2.8 × 3 km at true scale): Bageshwori Mandir, Junge Mahadev in the Bageshwori Pond, the 108-ft Hanuman at Hanumangadhi, Rani Talau, Tribhuvan, B.P., Dhamboji and Pushpalal Chowk, Jama Masjid, Bheri Hospital, the bus parks, Mubarak Biryani, and more than 400 mapped schools, hospitals, temples and mosques.
- `story.html`: **the story**. A scroll-driven chapter page (intro, history, places, food, roads & bridges, culture, how to reach, credits) with the drone clips and licensed photos.

It is a static site with no build step: plain HTML, CSS and ES modules. three.js 0.170 loads from jsDelivr through an import map, and GSAP is used on the story page. It works on GitHub Pages as is.

## Play

| | Desktop | Mobile |
|---|---|---|
| Walk / run | `W A S D` or arrows, `Shift` to run | left-thumb joystick, 🏃 to toggle running |
| Look | mouse (click to lock the pointer), wheel to zoom | drag with the right thumb |
| Interact | `E`: enter, buy & eat, sit & order, read info | ✋ button |
| Jump | `Space` | ⤒ |
| Map & fast travel | `M` | 🗺️ |
| Day / night | `N` (the clock also runs on its own) | 🌓 |
| First / third person | `V` | 👁️ |
| Food Passport | `P` | 🍛 |
| Menu | `Esc` | ☰ |

**Places you can enter.** Each one is a separate scene module, lazy-loaded with a fade:

- Bageshwori Mandir: courtyard, pagoda, the pond with Junge Mahadev and its walkway, bells you can ring, diyas, real photo backdrops and the pond video.
- Hanumangadhi: the 108-ft (≈33 m) statue on its plinth, with the drone clip.
- Wonder Land: pools, slides, the elephant splash bucket, the peacock pool, and the @BeautyofNepalgunj clip.
- Ramlila Ground: press E to light the Ravan effigy and set off fireworks; the Ravan Dahan drone clip plays here.
- Biryani Corner: a generic restaurant made for the game. Sit at a table and order.
- Golden ABC Academy and Hope International Academy: the two featured schools.
- Rapti River: outside the city. Walk the steel truss bridge, see the new bridge under construction, and watch the Rapti drone clips.

**Food gameplay.**

- Stalls stand at Dhamboji, B.P., Pushpalal, Tribhuvan and Chaulika Chowk: sekuwa, kebab, pani puri, chaat, jalebi, halwa paratha, ghamanja, the Tharu dishes dhikri and ghonghi, rawadi and lassi.
- Eat a dish to see an eating animation and a fact card. Each new dish adds a stamp to the **Food Passport** (saved in localStorage). Collect every dish to earn the 🏅 badge.
- No prices are shown.
- The food photos are *representative*, not shot in Nepalgunj.

**Graphics tiers** (Auto / High / Low; change them on the start screen or in the menu):

- High (laptop): PBR textures, HDRI sky lighting, soft shadows, bloom, ACES tone mapping, a 600 m view and more traffic.
- Low (mobile): no shadows or bloom, pixel ratio 1, a 320 m view and fewer trees.

## Map data pipeline

```
/workspace/nepalgunj/{landmarks.json, roads.geojson, buildings.geojson, water.geojson, landuse.geojson}
        └── tools/build_world.py  (pip install shapely)
              ├── site/assets/data/world.json         roads, ponds, canals, green areas, featured places, 400+ POIs, trees (~200 KB)
              └── site/assets/data/tiles/b_i_j.json   13k building footprints in 200 m tiles (~1.3 MB total)
```

- **Projection.** Positions are in metres: x = east, z = south, measured from Bageshwori Temple (28.0617 N, 81.6238 E), using an equirectangular projection.
- **Streaming.** The browser streams the building tiles near the player. Buildings are extruded by `building:levels`, or 1–5 floors by default (taller on main roads). Each one is merged per tile, with roof water tanks and night-lit windows.
- **Collisions** use the real footprints. Ponds and canals block you, except where a road crosses.
- **Featured places** (temple, Hanumangadhi, chowks, schools, Ramlila Ground and so on) use their OSM coordinates, with two adjustments:
  - Compounds are slid up to about 30 m so their gate faces the nearest road.
  - Places outside the dense core are pulled to the edge of the map along their true bearing and labelled "≈ N km away · not to scale": the airport (≈5.7 km), the Jamunaha border (≈5 km), Wonder Land (≈6.4 km), Chaulika Chowk and the road to the Rapti.
- **Fallback.** If `world.json` is missing, the game falls back to a small stylized layout (`js/game/world-data.js`).

Map data © OpenStreetMap contributors, ODbL 1.0. Boundary: geoBoundaries / Open Data Nepal.

## Files

```
index.html            game page (HUD, start screen, panels)
story.html            scroll story (generated from tools/index.template.html by tools/build_html.py)
css/game.css          game UI          css/style.css   story styles
js/game/main.js       scene manager, HUD, interactions, food passport, minimap / big map, pause menu
js/game/engine.js     renderer, quality tiers, PBR/HDRI, day/night (real sun position), colliders, video screens, particles
js/game/player.js     third/first-person character, physics, camera collision
js/game/input.js      keyboard / mouse / touch joystick
js/game/scenes/       city.js (overworld) + temple, hanuman, wonderland, ravan, restaurant, school, rapti
js/game/prefabs.js    pagoda, statue, effigy, stalls, food models, institutions…
js/game/food.js       dishes, stalls, passport          js/game/info.js   extra info cards
js/landmarks.js       facts and media for the main places    js/media-config.js   story-page video slots
assets/videos/        text-free, compressed clips + posters (mp4/webm)
assets/img/           licensed photos as webp (+ -sm)      assets/tex/   Poly Haven CC0 textures + HDRI
assets/data/          world.json, tiles/, credits.json
```

## Run locally

```bash
cd site && python3 -m http.server 8765    # then open http://localhost:8765/
node ../tools/shoot.mjs                    # headless screenshots → /workspace/nepalgunj/screens (needs playwright)
```

## Credits

- **Videos**: Rapti River, Bageshwori pond, Hanuman and Ravan Dahan drone clips were shared by the site owner. The golden-hour drone footage is by **@nepalgunjiya**, and the Wonder Land clip by **@BeautyofNepalgunj**. All burned-in text was cropped out.
- **Photos**: Wikimedia Commons contributors under CC BY / CC BY-SA. The full list is in the game (Menu → Credits) and at the bottom of the story page.
- **Textures & HDRI**: [Poly Haven](https://polyhaven.com), CC0. Water normal map: three.js examples (MIT). Engine: three.js (MIT); GSAP on the story page.
- **Map**: © OpenStreetMap contributors (ODbL).
- TikTok posts on the story page appear only as official click-to-load embeds; no TikTok media is downloaded or re-hosted.
- Biryani Corner is a fictional, generic name. School cards show only the name and address facts from research.
