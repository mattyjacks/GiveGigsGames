# Standalone runner architecture

The active entrypoint is `index.html`. It is a compact Canvas runner and imports only the systems required by this game.

- `assets/processed/jay-runtime/`: runtime atlas PNG and matching clip metadata.
- `assets/source/characters/jay/`: original Jay source sheets and asset intake notes.
- `src/animation/character-animation.js`: atlas validation, clip playback, transitions and canvas rendering.
- `src/obstacles/obstacle-catalog.js`: weighted runner obstacle definitions.
- `src/powerups/powerup-catalog.js`: runner pickup definitions.
- `src/save/save-store.js`: versioned local save adapter.
- `src/tools/`: Jay asset validation and atlas build utilities.
- `tests/`: runner and animation tests.

No university-life simulation runtime is active or bundled in this folder. NPC, phone, dialogue, campus-service and open-world modules were removed from this runner package. The original `games/semester-survival/` directory was not modified.

## Animation coverage

The local atlas currently includes idle, walk, jog, sprint, standing jump, running jump, fall recovery and other authored action clips. Sprint and running-jump are wired into gameplay. Slide mechanics work, but a dedicated slide animation cannot be bound until its actual source frames are included in the local atlas; no unrelated clip is substituted.
