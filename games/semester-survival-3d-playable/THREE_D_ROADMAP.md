# Semester Survival 3D — active conversion roadmap

This is the separate, playable Three.js conversion of the original Semester Survival Runner. The original 2D game remains untouched and independently playable.

## Current implementation

- Original runner simulation and progression are connected to the Three.js entry: semester progression, collisions, scoring, saves, shop, upgrades, bosses, pickups, power-ups, HUD, keyboard and touch controls.
- Three.js renders the road, campus gate, lecture blocks, sidewalks, lane markings, traffic, obstacles, coins and power-ups.
- Campus blocks have procedural architectural detailing: recessed framed glazing, floor bands, entrance doors and side lights, canopies, columns, steps, roof parapets, water tanks and solar panels.
- Asphalt has a procedural grain texture; directional lighting and soft shadows are enabled.
- Jay currently uses the approved runtime animation atlas as a 3D-world billboard. Jog, sprint, running jump, fall and three-part slide clips are mapped to the original runner state, with short crossfades and smooth lane movement.
- Focused animation state/frame-timing tests are included in `tests/three-character-animation.test.mjs`.

## Remaining production gates

1. **True 3D Jay:** create a high-quality stylised 3D model based on the approved turnaround, rig it, and author/retarget idle, jog, sprint, jump, slide, fall and recovery clips. The 2D atlas remains a temporary compatibility bridge.
2. **Authored campus environment:** replace procedural lecture-block geometry with optimised reusable building modules, believable campus signage, residence/shop variations, drainage, curbs, landscaping and a distant Nairobi skyline.
3. **Vehicles:** replace traffic blockouts with detailed reusable cars, university shuttle and Kenyan matatu models, including wheels, lights, windows and animation.
4. **Gameplay art:** build recognisable 3D obstacles, pickups, semester-boss set pieces and power-up effects while preserving the original simulation and collision rules.
5. **Production polish:** add graphics quality tiers, asset loading/fallbacks, accessibility checks, save migration tests, and desktop/Android browser performance and visual QA.

## Development and validation

- Entry: `index.html`
- Renderer: `src/three/runner-three-renderer.js`
- Jay loader: `src/three/jay-character.js`
- Original 2D reference: `legacy-2d-reference.html`
- Run focused tests: `npm run test:runner-modules`
- Do not change the public 2D entrypoint or mark the 3D edition stable until regression and device testing passes and the owner approves.
