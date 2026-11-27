# Semester Survival 3D — Playable Version

A separately listed, playable 3D campus runner preview built with Three.js.

## What this release is
- A playable 3D runner with Jay rendered as a skinned character from the compressed GLB asset.
- Keyboard and touch controls, campus scenery, traffic, obstacles, pickups, scoring, energy, saves, upgrades, and run results.
- Gameplay sound effects and ambience; background music is intentionally disabled.
- A standalone catalogue entry so this preview can be tested without replacing the original 2D runner or the existing Semester Survival adventure.

## What is not complete yet
This is a playable development release, not the final game. The campaign structure, fully balanced semester-by-semester difficulty curve, proper level endings, and final victory sequence are still planned. Do not describe this build as the complete edition.

## Controls
- Keyboard: Left/Right or A/D to change lanes; Up/W/Space to jump; Down/S to slide; Escape to pause.
- Touch: swipe left/right to change lanes, swipe up to jump, and swipe down to slide.
- The in-game interface also provides the available touch controls and pause actions.

## Technical notes
- Rendering: Three.js WebGL.
- Character: `assets/3d/jay/jay-unified.glb`, including the retained animation clips.
- Entry point: `index.html`.
- The original 2D game remains separate and untouched at `games/semester-survival-runner/`.

## Roadmap
1. Complete a finite eight-semester campaign.
2. Extend and balance difficulty progression across the campaign.
3. Add a proper ending for each level and a final graduation/victory sequence.
4. Complete mobile performance and visual QA before a stable release.
