# Semester Survival: The University Run

A standalone 2D/2.5D endless runner. Jay auto-runs through three lanes; change lanes, jump and slide to avoid academic and campus obstacles, collect coins and progress through eight semesters.

## Controls
- Keyboard: Left/Right or A/D to change lanes; Up/W/Space to jump; Down/S to slide; Escape to pause.
- Touch: swipe left/right to change lanes, up to jump, down to slide.

## Jay animation assets
Gameplay uses the approved blue rear-view run and running-jump sheets plus the approved rear-view slide sheet from `assets/characters/`. The portrait and locker use the local atlas in `assets/processed/jay-runtime/`. Animation preparation and state mapping live in `src/animation/`.

Original Jay uploads and review material are preserved outside the downloadable game folder in `artwork/semester-survival-runner/jay-source/`. The atlas builder and read-only source audit use that archive; runtime gameplay loads only the three selected local sheets.

## Offline and external resources
The game logic and character art are local. DM Sans and Space Grotesk are optional Google Fonts; if the network is unavailable, the game falls back to system sans-serif fonts and remains playable.

## Project boundaries
Only runner gameplay is active here. The original `games/semester-survival/` directory remains untouched. No NPC schedules, dialogue, student phone, service interactions or open-world simulation systems are included in this runtime.

## Validation
Run `npm run test:runner-modules` from this folder for runner catalogs, save storage and animation runtime tests.
