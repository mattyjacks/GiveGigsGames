/* Tailored per-game roadmap proposals for /ggg/roadmap/<slug> (roadmap.js). */
window.GIVEGIGSGAMES_ROADMAPS = {
  gravegain2dD: [
    { title: "Finish mobile joystick & safe-area QA", text: "Complete the remaining browser verification checks in IMPLEMENTATION-PLAN.md across portrait phones, safe-area insets, and one-finger joystick release deadzones." },
    { title: "Add keyboard shortcuts for Shop, Mute, and Drafts", text: "Bind M to toggle audio mute and add arrow/enter keyboard navigation for the between-run Sigil Shop and Pause menu alongside the existing 1–3 draft hotkeys." },
    { title: "Expand Crypt Warden & pursuit encounters", text: "Give the 1,000m Crypt Warden additional attack patterns beyond bolt barrages and introduce mini-boss or biome-specific warden variants in Emerald Mire, Violet Crypt, and Blood Moon." },
    { title: "Add new parkour route themes", text: "Expand beyond the 3 current castle/cave route templates with vertical bell-tower climbs, crumble-ledge chains, and reward challenges for Master-tier Vault and Climb capstones." },
    { title: "Add a standard game.json manifest", text: "Create games/gravegain2dD/game.json so local metadata, controls, and credits stay aligned with the rest of the catalog." }
  ],
  gravegain2dE: [
    { title: "Expose Smash attacks on Touch and Gamepad", text: "Add a Charge Smash trigger (e.g., dedicated button or stick-flick gesture) to #touchControls and wire readGamepad() so smash is no longer hardcoded false on controllers." },
    { title: "Enable Team Battle selection in Brawl lobby", text: "Let players assign fighter teams in the Brawl lobby UI instead of hardcoding each slot to its own index." },
    { title: "Add per-stage music & 3–4P gamepad assignment", text: "Compose distinct background tracks for each of the 5 MoonRock stages and support 3–4 simultaneous gamepads before promoting from preview status." },
    { title: "Add an interactive Training Mode hitbox & frame overlay", text: "Show knockback vectors, damage %, and invulnerability windows in Training Mode so players can practice meteor spikes and ledge tech." },
    { title: "Add featured gameplay screenshots", text: "Capture and link 3 screenshots in games/images/screenshots/ showing 16-hero select, 4-fighter Brawl action, and a Ley Core ultimate." }
  ],
  "ecosystemic-evolver": [
    { title: "Mirror a self-contained static build under games/", text: "Bundle an offline-friendly static package under games/ecosystemic-evolver/ (under 10 MB) so players do not require an external redirect to mattyjacks.com." },
    { title: "Integrate shared gamepad & mobile touch overlays", text: "Load games/_shared/game-select.js once locally hosted so controller users and mobile players get consistent back-to-arcade and touch support." },
    { title: "Add biome progress & save export compatibility", text: "Use catalog-slugged localStorage keys so tutorial completion and biome unlocks work with the arcade's Save Backup & Restore tool." },
    { title: "Profile WebGL draw calls on mobile GPUs", text: "Audit shadow resolution and entity counts across all 5 biomes per GRAPHICS-PERFORMANCE.md to keep frame times smooth on phones." },
    { title: "Capture featured screenshots & authored guide", text: "Add local screenshots and an embedded games/ecosystemic-evolver/guide.html food-web reference once source files are hosted in-repo." }
  ],
  "platform-wars": [
    { title: "Wire the platform-ping mechanic", text: "Connect the existing pings array in game.js to pointer clicks/taps so the 'tap a platform to ping' hint shown in #touchHint works live." },
    { title: "Add a Down / Stomp button to the touch pad", text: "Expose a down/drop input on #touchPad so mobile players can trigger Aerial Stomps and drop through upper platforms just like keyboard S/Down." },
    { title: "Add Pause shortcut and audio mute persistence", text: "Bind P/Esc to pause/resume active matches and save mute preference across sessions." },
    { title: "Expand arena hazards & AI counterplay", text: "Add bounce pads or shrinking sudden-death boundaries in Sky Decks, Neon Pit, and Twin Towers to keep matches brisk." },
    { title: "Add round-end breakdown & native gamepad bindings", text: "Show KOs, stomps, and max damage % on the victory screen, and map 2-controller local versus directly via navigator.getGamepads()." }
  ],
  lastwordszombies: [
    { title: "Persist map and difficulty selection", text: "Save selectedLevel (Fantasy/Cyberpunk) and difficulty (Easy/Normal/Hard) in localStorage so players do not reset to defaults every session." },
    { title: "Add a Speed-Typing toggle for Wave Glossary", text: "Let players opt into auto-advancing past the Wave Cleared Glossary between waves to keep high-WPM arcade momentum flowing." },
    { title: "Expand gamepad menu & Black Market navigation", text: "Extend native gamepad polling in game.js to navigate the Black Market store, map picker, and difficulty toggles." },
    { title: "Improve touch virtual keyboard ergonomics", text: "Highlight the next required character on #lwz-mobile-deck when locked onto a zombie to reduce mis-taps on phones." },
    { title: "Add boss-specific word mechanics", text: "Give every 5th-wave Boss multi-stage shield words or decoy suffixes that reward rapid powerup timing." }
  ],
  venturemechanically: [
    { title: "Save Waterfall Challenge progress locally", text: "Persist completed Exit Waterfall challenges and custom sandbox term-sheet configurations in localStorage under venturemechanically:* keys." },
    { title: "Replace browser alert() popups with in-DOM modals", text: "Convert alert() calls in triggerLoss and btn-take-secondary (game.js) into styled in-game modals so they never block mobile or iframe layouts." },
    { title: "Add guided challenges to Simulators 2–6", text: "Bring structured founder scenarios (matching Exit Waterfall's 4 challenges) to Entity Choice, Down Round, Boardroom, SAFE Stack, and Vesting & 83(b)." },
    { title: "Add scenario preset import/export", text: "Let founders and educators copy a shareable query string or JSON snapshot of a cap table and exit waterfall." },
    { title: "Add keyboard focus & slider step accessibility", text: "Ensure every term-sheet tooltip, collapsible group, and waterfall bar supports clean keyboard navigation and screen-reader labels." }
  ],
  financialfreedom: [
    { title: "Add localStorage save/resume & personal bests", text: "Save active household runs and fastest Financial Independence completion years under financialfreedom:* localStorage keys." },
    { title: "Wire rental real estate & 529 college savings UI", text: "Expose UI controls for investmentsProperties and kids529 already modeled in gameState, plus additional side hustles." },
    { title: "Fix the window.gameState debug shim", text: "Update the global window.gameState check (line 1188 of game.js) to reference gameState instead of undefined state." },
    { title: "Verify annualExpenses vs FI Number math", text: "Review the FI target formula in updateUI() to ensure annualExpenses * 25 uses consistent monthly-to-annual scaling." },
    { title: "Add multi-year net-worth & cashflow charts", text: "Render a lightweight history sparkline on the Dashboard tab showing net worth, debt payoff, and passive income vs. expenses over time." }
  ],
  serversavershield: [
    { title: "Expose autosave restore prompt in the UI", text: "Build a clean Resume Saved Run dialog wired to restoreGameState() and getSaveInfo() in js/autosave.js instead of logging only to console." },
    { title: "Persist standalone high scores across runs", text: "Save best score, highest wave, and peak compute outside the active run autosave so the start screen displays career records." },
    { title: "Clean up legacy backup & worker stubs", text: "Remove or archive unused game-backup.js and commented Web Worker stubs in game.controller.js to shrink package size." },
    { title: "Add keyboard shortcuts for Shop & Staff hiring", text: "Map 1–4 number keys to quick-buy Emergency Repair, Weapon Upgrade, Firewall Tech, and Incident Responder during hectic waves." },
    { title: "Add an Endless Overtime mode past Wave 10", text: "Offer an optional post-Wave-10 Endless Security mode for players who want to stress-test late-game staff and weapon synergies." }
  ],
  overtake: [
    { title: "Bundle offline audio fallbacks inside games/overtake/", text: "Ship compact synthesized or local audio fallbacks alongside optional https://overtake-assets.vercel.app/ tracks so sound works cleanly offline." },
    { title: "Sync overtake/README.md with src/main.ts", text: "Update the local README to reflect all 6 tracks, 6 cars, Babylon.js hybrid rendering, 12 kart items, and 10 Career Achievements." },
    { title: "Add Time Trial ghost-car replays", text: "Record best-lap spline timestamps in localStorage so players can race against their own translucent ghost in Time Trial mode." },
    { title: "Add split-screen or async daily seeded races", text: "Let players compete on deterministic traffic seeds per route and compare overtake-chain times." },
    { title: "Tune AI rival rubber-banding on Ace difficulty", text: "Refine opponent overtaking lanes and item usage in Knockout and Race modes so Ace feels fair through tunnels and curves." }
  ],
  assassinanimals: [
    { title: "Add touch buttons for gadgets 4 and 5", text: "Render on-screen touch slots for Noise Decoy (4) and Adrenal Surge (5) alongside slots 1–3 so mobile operatives can access all 5 gadgets." },
    { title: "Bind native gamepad controls for stealth & gadgets", text: "Add direct navigator.getGamepads() bindings for silent takedowns, coin aim/toss, body dragging, and quick-swapping gadgets 1–5." },
    { title: "Add a main-menu Operative & Mutation Codex", text: "Let players inspect all 9 animal operatives, 6 DNA mutations, and 13 Contract medals without starting a floor first." },
    { title: "Add crouch/cone preview & sound-ring visualization", text: "Show footstep noise radius rings when sprinting or tossing coins so players can gauge guard hearing cleanly." },
    { title: "Add daily seeded Contract challenges", text: "Generate rotating modifier contracts (e.g., No Gadgets, All Enforcers) using a date seed." }
  ],
  battlesharks: [
    { title: "Unify coin and shop persistence across modes", text: "Merge localStorage battlesharks_coins/battlesharks_shop with BSState.data.coins so in-run arena earnings spend directly in Aquarium, Base Builder, and Bionics." },
    { title: "Turn Atlantis Colosseum into playable 3D duels", text: "Upgrade Colosseum battles from RNG probability rolls (colosseum.js) into live 3D arena boss fights." },
    { title: "Expand mobile touch buttons for Bite, Sonar, and Sub mode", text: "Add touch controls for Bite Lunge (B), Sonar Pulse (C), and Human Sub weapon switching (1/2) + turret heat venting (R)." },
    { title: "Capture 3 featured gameplay screenshots", text: "Save shark arena, Upgrade Lab, and Mecha-Boss screenshots to games/images/screenshots/battlesharks-1..3.jpg." },
    { title: "Finish the 7-stage BSOceanHunter rail campaign", text: "Expose Ocean Hunter rail stages directly from the main mode selector with stage-clear star ratings." }
  ],
  battlesharks2: [
    { title: "Bind Tab and Ctrl to match in-game hints", text: "Wire Tab to toggle the R&D Lab and Ctrl to fire lasers in battlesharks2/game.js so every documented key works." },
    { title: "Add post-Kraken boss milestones", text: "Introduce escalating bosses (such as Mecha-Leviathan at 15,000+ pts) after bossDefeated becomes true so endless runs stay tense." },
    { title: "Add native gamepad steering and dash/fire bindings", text: "Map Left Stick to swim direction, A to Jet Dash, X/RT to fire lasers, and Y to toggle the R&D Lab." },
    { title: "Add visible R&D Lab affordability badges on the HUD", text: "Pulse the Lab button when the player collects enough Cyber-Debris or Mutagens to afford a new mutation." },
    { title: "Add a quick-mute & pause button on touch HUD", text: "Provide dedicated Pause and Mute touch controls in the corner HUD during mobile runs." }
  ],
  gravegain2dA: [
    { title: "Disambiguate Space and F keybindings", text: "Separate Dodge Roll vs. Race Jump (Space vs. J) and Race Ability vs. Climb (F vs. C) consistently between game.js and src/core/game-engine.js." },
    { title: "Add native gamepad support matching GraveGain2DC", text: "Port InputCompat.pollGamepad() so controllers can navigate menus, aim twin-stick style, and play Turn-Based/Chrono-Lock." },
    { title: "Add keyboard hotkeys for LuckyStarShip & potions", text: "Bind a quick-heal potion key and clear tab shortcuts inside the LuckyStarShip hub." },
    { title: "Document legacy vs. 2DC progression differences", text: "Clarify shared story progress keys and offer a one-click import from GraveGain2D_Save." },
    { title: "Highlight active temporal mode indicators", text: "Make Chrono-Lock slow-motion vs. Turn-Based step costs visually clearer on the HUD." }
  ],
  gravegain2dC: [
    { title: "Add custom keybinding remapping in Settings", text: "Let desktop players rebind melee (V), dodge (Space), block (RMB), and explosive (G) to match personal ARPG preferences." },
    { title: "Expose Speedrun splits export & PB history", text: "Allow exporting GraveGain2DC_Speedrun_v1 floor splits as JSON/text alongside the in-game timer." },
    { title: "Surface weapon unlock hints in the Armory", text: "Show which campaign mission, secret vault, or endless depth unlocks each of the 20 collectible weapons." },
    { title: "Add visual telegraph colorblind options", text: "Provide distinct patterns/shapes alongside orange elite and red boss warning rings." },
    { title: "Add 3 featured gameplay screenshots to catalog", text: "Verify and refresh featured screenshots highlighting secret vaults, 20-weapon swaps, and Lucifer Hades' conduit phase." }
  ],
  gravegain2dB: [
    { title: "Wire Gamepad Pause and D-pad weapon swap", text: "Poll button 9 (Pause) and D-pad weapon switching from player/input-map.js inside game.js readPad()." },
    { title: "Surface Campaign, MMO, and Seed Share in the main menu", text: "Connect the existing campaign/, mmo.js, and net-client.js modules cleanly to the main index.html mode selector." },
    { title: "Display scavenged weapon ammo warnings clearly", text: "Add a low-ammo flash and automatic fallback indicator when the limited-ammo 2nd slot runs dry." },
    { title: "Add touch aim-assist toggle for 360° shooting", text: "Offer an optional twin-stick right-pad aim mode alongside auto-facing for touch players." },
    { title: "Show rescued crew build roster on the HUD", text: "Display small icons for your LIFO rescued crew queue so players know which Race × Class build deploys next." }
  ],
  gravegain3dA: [
    { title: "Resolve KeyQ and KeyF input collisions", text: "Separate Potion vs. Weapon Cycle (currently both trigger on KeyQ) and Quick-Eat Food vs. Race Ability (both trigger on KeyF) across input-manager.js and game-runtime.js." },
    { title: "Add native gamepad support for 3D exploration", text: "Bind dual-stick movement/look, triggers for melee/block, and face buttons for jump, potion, and race ability." },
    { title: "Improve 3D doorway & boss room readability", text: "Add clearer minimap markers for the safespace descent portal and locked boss arenas." },
    { title: "Verify AI Spectator (V) navigation around obstacles", text: "Tune AI Spectator pathing in narrow procedural corridors so bot showcase runs do not snag on props." },
    { title: "Unify HUD controls legend with active keymap", text: "Ensure pause and settings screens list the exact separated keys for potions, food, weapons, and abilities." }
  ],
  gravegain1dA: [
    { title: "Add a defensive Parry or Brace action", text: "Give Turn-Based players a timed Guard/Brace option on Wait (W/0) to mitigate Brute slams and Swarm detonations along the 1D line." },
    { title: "Unlock direct Echo Drift launch from the menu", text: "Allow players who have cleared Sector 5 to launch straight into endless Echo Drift from the title screen without re-clearing Sector 5." },
    { title: "Expose Ley-Line Race & Horde lobbies in-UI", text: "Add an optional multiplayer room-code modal instead of requiring ?match= or ?mmorpg= URL query parameters." },
    { title: "Add enemy telegraph icons on the 1D track", text: "Display countdown pips above Brutes (4-tick slam) and Necromancers (5-tick summon) for clearer tactical planning." },
    { title: "Support gamepad D-pad & A/B/X/Y mapping", text: "Bind D-pad Right to Step East and face buttons to Attack, Ritual, Potion, and Wait." }
  ],
  demolichdom: [
    { title: "Fix S key conflict between Move Down and Summon", text: "Either move Summon Skeleton to Q/E or Space-tap and restore S for south movement, or add a clear WASD/Arrows prompt." },
    { title: "Add Phase 4+ Endless City Demolition", text: "Continue after destroying the Skyscraper with procedural fortified towers, faster defender squads, and escalating score multipliers." },
    { title: "Add new Necromancer spells & skeleton variants", text: "Introduce specialized summons (Bone Archer, Shield Skeleton) alongside Skull Spell and Blink." },
    { title: "Add visual cooldown indicators on HUD", text: "Show radial or bar timers for Summon Skeleton (180 frames) and Spectral Dash Blink (180 frames)." },
    { title: "Keep guide.html synced with actual upgrades", text: "Maintain accurate documentation of all 5 real upgrades (Mana Mastery, Lich Lord, Void Bolt, Spectral Dash, Death Ward) as new perks are added." }
  ],
  fridgesimulator: [
    { title: "Fix Charity & Dumpster 0.0x price multiplier bug", text: "Change `shop.multiplier || 0.5` to `shop.multiplier ?? 0.5` in source/economy.js:39 so Charity and Dumpster items are genuinely free ($0)." },
    { title: "Implement item freshness & spoilage mechanics", text: "Add per-item freshness decay (e.g., Dumpster food starting at 50% freshness) and optional fridge cooling upgrades." },
    { title: "Add Endless Survival mode past Day 30", text: "Let players keep managing all 5 countries beyond Day 30 with escalating inflation or supply-chain challenge days." },
    { title: "Add one-tap 'Feed Preferred' smart stocking", text: "Enhance Auto-Stock so it prioritizes each country's favorite foods and plugs the lowest Pro/Carb/Vit bar first." },
    { title: "Expand keyboard navigation across shop & fridges", text: "Allow number keys 1–5 to switch country fridges and shop tabs without mouse movement." }
  ],
  discoveramerica: [
    { title: "Add an accuracy bonus & port Almanac modal", text: "Reward zero-mistake port sorts with bonus score (perfectSorts) and let players review unlocked port trivia in an in-game Almanac." },
    { title: "Add keyboard shortcuts for sorting & map travel", text: "Bind 1/2/3 to assign the selected fragment to a bin, Tab to cycle fragments, and Enter to confirm the sort." },
    { title: "Add optional Storm Challenge bonus rounds", text: "Introduce timed optional bonus sorting legs between ports for players seeking higher replayability." },
    { title: "Add narrated audio cues & accessibility captions", text: "Provide optional Web Speech or chime feedback when fragments snap into the right cargo hold." },
    { title: "Keep guide.html aligned with all 5 ports", text: "Ensure any new ports or challenge mechanics are immediately reflected in discoveramerica/guide.html." }
  ],
  orbitaldrift: [
    { title: "Rebuild game.js from orbitaldrift/source/", text: "Compile the newer source/ modules so the live build ships the 4 selectable planetary LEVELS (Earth, Earth-Moon, Earth-Mars, Saturn) with gravitational slingshots and V/C camera modes." },
    { title: "Add a desktop keyboard Dash keybinding", text: "Bind Shift or E to trigger Dash on desktop so keyboard-only players do not have to tap with a mouse." },
    { title: "Display ship stats & unlock requirements in Hangar", text: "Show exact HP, pickup radius, and score multipliers for CubeSat, Dart, and Station before launching." },
    { title: "Add audio/visual warning before Surge waves", text: "Show a clear 3-second trajectory indicator before Phase 4 Solar Storms and Darter debris lunges." },
    { title: "Add native gamepad analog thrust & dash", text: "Map analog trigger/A button to smooth orbital thrust and B/RB to Dash." }
  ],
  aiwhackamole: [
    { title: "Add 1–9 / Numpad hole hotkeys", text: "Map number keys 1–9 (matching the 3×3 terminal grid) so keyboard players can whack holes directly without mouse movement." },
    { title: "Add end-of-round accuracy & alignment stats", text: "Display Rogue AIs Caught, Helpful AIs Spared, Accuracy %, and Peak Combo on the Game Over summary." },
    { title: "Introduce armored Boss Rogue AIs", text: "Add occasional golden/boss AIs that require two quick whacks or spawn mid-round to mix up the 60-second pacing." },
    { title: "Improve bubble legibility at high speeds", text: "Add subtle color/icon cues alongside text on long quotes and clamp speech cards cleanly on narrow portrait screens." },
    { title: "Add Endless Survival & Hardcore difficulty modes", text: "Offer an untimed endless shift alongside the standard 60-second timed round." }
  ],
  soundpainter2: [
    { title: "Add Undo / Redo history stack", text: "Bring multi-step Undo/Redo (already in Sound Painter 1) to Sound Painter 2 for note toggles, velocity drags, and Clear Track." },
    { title: "Allow per-track waveform & envelope overrides", text: "Let players choose waveforms and filter/decay settings independently for Bass and Chords instead of fixed triangle/sine voices." },
    { title: "Add pattern copy/paste & 32-step chaining", text: "Support copying a 16-step bar or chaining Bar A -> Bar B for fuller song arrangements." },
    { title: "Add WAV / WebM audio export", text: "Use MediaRecorder or OfflineAudioContext to render and download the active loop as a local audio file." },
    { title: "Add keyboard step-entry navigation", text: "Allow Arrow keys + Enter/Space + +/- velocity adjustments across the 16×8 grid for accessible composition." }
  ],
  soundpainter: [
    { title: "Give Soft and Drive rows distinct Web Audio DSP", text: "Wire a warm lowpass envelope for row 4 (Soft) and a WaveShaperNode saturation curve for row 5 (Drive) instead of reusing plain sine/square." },
    { title: "Add a BPM slider and live playhead column highlight", text: "Let players adjust playback speed (currently fixed at 800ms loop / 100ms per column) and highlight the active column while looping." },
    { title: "Add musical scale presets", text: "Offer Pentatonic, Minor, Dorian, and Chromatic column mappings so beginners and experienced players can explore new moods." },
    { title: "Add local save slots & URL export", text: "Let players save/recall favorite 8×6 paintings in localStorage or share via query string like Sound Painter 2." },
    { title: "Highlight multi-touch octave shimmer feedback", text: "Show a subtle sparkle ring on canvas when two-finger painting triggers the 2× octave shimmer." }
  ],
  friendslop: [
    { title: "Use dailySeed in a deterministic PRNG", text: "Feed this.dailySeed into a seeded random generator for spawnSlop() and spawnHazards() so everyone shares the same Daily Seed layout." },
    { title: "Give Player 2 a keyboard Yeet spread key", text: "Bind a key (e.g., E or F) for P2 (🦊) to fire a 3-way YEET spread in Co-op Mode, matching the mobile #friendslop-yeet-btn." },
    { title: "Add distinct effects per food & hazard type", text: "Give specific slop emojis bonus Vibe, temporary Slow-Mo, or Friend cravings that award double combo when matched." },
    { title: "Add a local 2P score comparison & Co-op revive", text: "Track P1 vs. P2 feeds at Game Over and let co-op players recover Vibe together during frantic waves." },
    { title: "Add Pause touch button to the top HUD", text: "Ensure mobile players always have a one-tap Pause control alongside the Slop-Stick and Yeet buttons." }
  ],
  "semester-survival": [
    { title: "Replace district-blockout.svg with final parallax art", text: "Deliver finished multi-layer backgrounds for Residence, Township, Campus, and City, plus approved sprite sheets for Amina, Sumeya, Einstein, and Ernest." },
    { title: "Add academic probation & financial consequence states", text: "Make prolonged zero-cash or failing consecutive CATs/exams trigger meaningful probation/retake events rather than allowing any GPA to graduate." },
    { title: "Add district ambience & weather soundscapes", text: "Wire weather-runtime.js states (rain, sunny, evening) to subtle procedural Web Audio ambience and visual lighting." },
    { title: "Expand Student Phone map fast-travel", text: "Allow quick-jumping to unlocked campus buildings from the Phone Map app once discovered." },
    { title: "Add controller/gamepad support for exploration & phone", text: "Map D-pad/Left Stick to movement, A to jump, X to interact, and Y/Select to open the Student Phone." }
  ],
  gravegain5dA: [
    { title: "Reconcile game.json, game.js keys, and touch labels", text: "Sync keyboard bindings (e.g., bind Esc/P to savebridge pause, support 1/2/3 alongside H/U/T) and align #gg5dTouch button labels." },
    { title: "Expose the 4 Races in the character menu", text: "Add Race selection (Human, Elf, Dwarf, Orc) to #gg5dMenu so already-implemented race stat modifiers are selectable." },
    { title: "Fix mmorpg-5d.js HUD snapshot scraping", text: "Update readSnapshot() in mmorpg-5d.js so it reads combat floor progress instead of expecting golf stroke counts." },
    { title: "Add visual universe-collapse warnings", text: "Show clear countdown pulses and Arroyo modifier tooltips (gravity/drift/collapse ticks) before hopping." },
    { title: "Add a quick-start Combat Glossary overlay", text: "Summarize Paradox venting, chain hop caps (8×), and enemy behaviors inside the pause screen." }
  ],
  gravegain4dA: [
    { title: "Keep guide.html & game.json synced to R/E W-shift", text: "Ensure all documentation, tooltips, and #controlsHint consistently reflect R/E for W-axis shifting, Space for jump/putt, and T for Chrono-Sand rewind." },
    { title: "Complete KeyF, Block, and Mode wiring in main4d.js", text: "Un-ignore KeyF in input4d.js and wire GG4D_Abilities.pollCombatInput(), GG4D_Block, and GG4D_Modes.gate() into _tick()." },
    { title: "Decouple Jump from Putt charging on Space", text: "Keep Space dedicated to Jump (with Left-Click for Putt, or an optional toggle) so jumping over hazard lips never fires an unintended putt." },
    { title: "Add Arrow-key movement & Esc/P pause binding", text: "Bind Arrow keys alongside WASD and Esc/P to toggle the pause overlay directly." },
    { title: "Show 4D slice & echo preview line clearly", text: "Add a translucent W-slice indicator on the HUD showing how far Ana/Kata shifted relative to the target hole." }
  ],
  "starship-simulator": [
    { title: "Add a standard games/spaceships/game.json manifest", text: "Create game.json inside games/spaceships/ documenting all flight/rover controls, credits, and WebGL requirements." },
    { title: "Bind native gamepad buttons alongside axes", text: "Map controller triggers and face buttons in flight-dynamics.js / core.js for fire, missile, boost, target lock, and weapon cycling." },
    { title: "Expand Station-to-Station trade commodities", text: "Add cargo commodities with dynamic prices across Starfleet Outpost Alpha, Vulcan Mining Refinery, and Aurelia Trade Citadel." },
    { title: "Add Rover sample-scanner minigame & terrain landmarks", text: "Deepen planetary surface landings (L) with scan targets, mineral veins, and surface hazards." },
    { title: "Optimize asteroid/starfield worker budgets on mobile", text: "Expose a quick Low/High FX toggle on the launch screen to maintain smooth 60 FPS on entry-level phones." }
  ],
  neonbreaker: [
    { title: "Implement actual paddle lasers for the Laser drop", text: "Upgrade the 'L' Laser power-up from an instant +100 score bonus into timed dual paddle laser cannons." },
    { title: "Add varied brick patterns per level", text: "Introduce staggered fortresses, indestructible chrome barriers, and explosive chain-reaction bricks across levels 2+." },
    { title: "Reset combo cleanly on paddle bounce or life loss", text: "Ensure consecutive-brick combo multipliers reset when the ball returns to the paddle or falls out of bounds." },
    { title: "Add ball-angle preview & catch-magnet perk", text: "Give players visual launch-angle control before pressing Space or tapping to release." },
    { title: "Add touch Pause & Mute buttons to the HUD", text: "Allow mobile players to pause or mute audio without needing a physical P/M/Esc key." }
  ],
  neoninvaders: [
    { title: "Activate the unused Speedy invader & add Boss UFOs", text: "Wire the speedy invader type defined in game.js and spawn bonus Mothership/UFO waves every 5th wave." },
    { title: "Add destructible neon shield bunkers", text: "Place 3–4 segmented neon cover barriers above the player's defense line to enable classic peek-and-shoot tactics." },
    { title: "Add on-screen Pause & Mute buttons for mobile", text: "Add touch-friendly Pause and Audio toggles so phone players do not rely on P/Esc/M keys." },
    { title: "Add graze or streak score multipliers", text: "Reward accurate consecutive shots or close bullet grazes with rising score multipliers." },
    { title: "Support controller D-pad/trigger mapping natively", text: "Bind smooth analog horizontal movement and trigger autofire for gamepads." }
  ],
  neonracer: [
    { title: "Add curved coastal highway bends & elevation hills", text: "Introduce sweeping OutRun-style banking curves and Biscayne bridge crests to complement the straightaway causeway." },
    { title: "Add 80s Synthwave Radio Station selector", text: "Let players switch between multiple procedural 80s synthwave tracks (Sunset Cruise, Vice Pursuit, Midnight Outrun) live during a run." },
    { title: "Add Weather & Rain Reflections toggle", text: "Add optional Miami tropical midnight rain streaks and wet windshield droplets in Hood Cam mode." },
    { title: "Add Time-Attack Checkpoint Gates mode", text: "Introduce classic arcade OutRun checkpoint arches where clearing gates extends a countdown clock." },
    { title: "Add Local Ghost Replay silhouette", text: "Save your best-distance pacing curve so a translucent neon ghost car races alongside your personal record." }
  ],
  neonsnake: [
    { title: "Add a proper Victory screen for filling the 30×30 grid", text: "Celebrate a full 900-tile clear with a Victory overlay instead of routing through gameOver() in spawnFood()." },
    { title: "Add optional game modes on the start screen", text: "Include Wrap-Around Walls, Neon Obstacles, and 60-Second Blitz alongside Classic mode." },
    { title: "Add an on-screen touch Pause button", text: "Give swipe-only mobile players a dedicated tap target to pause and resume runs." },
    { title: "Add visual decay timers on Bonus & Speed orbs", text: "Pulse special food orbs so players know how much time remains before a bonus spawn shifts." },
    { title: "Support D-pad swipe-buffer preview", text: "Display a subtle direction arrow indicator for queued 2-turn inputs at high speeds." }
  ],
  neonvoidrunner: [
    { title: "Fix speed calculation overwriting Slow-Mo & Boost", text: "Store baseSpeed separately from timed Slow-Mo and W/S boost-brake modifiers so update() does not overwrite them on the next frame." },
    { title: "Fix right-half tap clamp & impossible 3-lane walls", text: "Make moveLane right-clamp symmetric (laneWidth / 2) and guarantee at least 1 open lane in spawnObstacle()." },
    { title: "Wire window.gameDebug.godMode properly", text: "Respect the declared godMode debug flag in collision checks for automated testing." },
    { title: "Add a Void Shield visual timer bar", text: "Show the remaining seconds of the 5-second Shield pickup on the HUD." },
    { title: "Add touch Pause & Mute controls", text: "Add corner HUD buttons so mobile players can pause or mute mid-run." }
  ],
  "temple-of-lost-revenue": [
    { title: "Sync game.json & source/ with multi-floor Decipher Pulse", text: "Update local game.json and source/ prototype files so they reflect the multi-floor maze, 5 Leads, and stun-based Decipher Pulse." },
    { title: "Add Audit Golem patrol pathfinding on deep floors", text: "Give golems smarter intersection pursuit or alert states on Floor 3+ alongside visual stun stars." },
    { title: "Add a 3D range ring & cooldown meter for Decipher Pulse", text: "Display the 9.2-unit pulse radius and 5-second cooldown clearly around the Blue Cat." },
    { title: "Add occasional Heart pickups or floor-clear heals", text: "Allow recovering 1 heart every few floors so single early mistakes do not doom deep runs." },
    { title: "Expand corner minimap with Golem pings", text: "Pulse Audit Golem positions on templeMapCanvas when within Decipher Pulse range." }
  ],
  "the-ai-expedition": [
    { title: "Hide selectorRing during stageClearPause", text: "Hide the keyboard highlight ring during stage transitions and display hovered/selected node role names." },
    { title: "Add ordered dependency chains in later stages", text: "Introduce Data Lake → AI Agent → Automation sequence bonuses in Stage 4+ for deeper routing strategy." },
    { title: "Add a Red Firewall telegraph pulse", text: "Flash a brief amber warning before a Ready or Surge node flips to a Red Firewall so players aren't penalized mid-click." },
    { title: "Add 3D particle data packets flowing along linked lines", text: "Animate glowing packets traveling down completed pipelines to reward network completion." },
    { title: "Support quick keyboard number shortcuts for inner ring", text: "Let players press 1–9 or tab faster between inner and outer rings on 12-node stages." }
  ],
  "the-cave-of-bottlenecks": [
    { title: "Expose a dedicated Overdrive tap button on touch", text: "Show a glowing mobile Overdrive button whenever Overdrive reaches 100% instead of hiding #btn-overdrive under madi-superseded." },
    { title: "Add HP bars & fracture effects on stalactites", text: "Show melt progress and glowing crack lines on high-HP Purple Spikes and Wave 3+ Red Bottlenecks." },
    { title: "Add armored Boss Bottlenecks every 5 waves", text: "Introduce multi-core cave formations that drop bonus shields or instant Overdrive charges when dissolved." },
    { title: "Add beam reflection or dual-cat upgrade pickups", text: "Drop temporary twin-beam or auto-turret bonuses during dense wave clusters." },
    { title: "Smooth touch beam-aiming sensitivity", text: "Allow dragging directly across the lower cavern to aim the searchlight smoothly without occluding targets." }
  ],
  "the-lost-city-of-customers": [
    { title: "Show distance hints on scanned 8×8 tiles", text: "Render a small numeric distance or directional ring on scanned tiles so players can triangulate targets visually." },
    { title: "Carry over partial battery or add recharge tiles", text: "Carry over 25% of unused scans into the next sector or hide bonus +2 battery cache tiles." },
    { title: "Add a keyboard/gamepad coordinate readout", text: "Show the active cursor's grid coordinates (e.g., C4) and last scan result right beside the HUD." },
    { title: "Vary Sector themes & decoy telegraphing", text: "Add subtle terrain shimmer cues around Sector 2+ Purple Static Decoys." },
    { title: "Add a Time-Attack puzzle mode", text: "Offer an optional timed sprint mode alongside standard scan-budget sectors." }
  ],
  "the-madi-ai-universe": [
    { title: "Show EMP cooldown & Mode toggle in the main HUD", text: "Display the 2.6s EMP Pulse readiness bar and a one-click Explore / Defense switcher directly inside .universe-hud." },
    { title: "Show saved high scores on the 6 Sector Islands", text: "Read each linked MADI AI game's localStorage best score and show it when hovering or orbiting that Sector Island." },
    { title: "Improve auto-pause focus recovery", text: "Move keyboard focus cleanly to #resumeBtn whenever suspend() triggers pause." },
    { title: "Add a Space-bar turret/shield upgrade between waves", text: "Let Orbital Defense players spend wave points on faster probe orbit speed or wider EMP radius." },
    { title: "Allow launching Sector Islands with keyboard Enter", text: "Let players cycle the 6 floating worlds with Left/Right arrows in Explore mode and warp with Enter." }
  ],
  "the-pipeline-mountain": [
    { title: "Sync game.json & bind optional Space mid-air boost", text: "Remove stale Space: Jump text from game.json or bind Space to a cooldown air-dash/double-hop." },
    { title: "Reset medalStreak on missed medals & add summit milestones", text: "Make medalStreak reward consecutive medal grabs and add milestone banners at 50m, 120m, and 200m+ Orbit Peak." },
    { title: "Add cloud/wind gusts in Stratosphere & Orbit Peak", text: "Introduce subtle lateral wind zones or breakable asteroid platforms above 120m." },
    { title: "Show Bug Drone altitude warnings", text: "Display a brief top-edge alert marker before diving Bug Drones enter from above 40m." },
    { title: "Add playable cat skins unlocked by altitude", text: "Unlock cosmic helmet or jetpack trail colors when reaching Orbit Peak." }
  ],
  "the-revenue-dragon": [
    { title: "Give each Boss Tier unique attack patterns", text: "Differentiate Dragon of Delay, Hydra of Silos, and Emperor of Legacy with distinct multi-head spreads, sweeping lasers, or minion drops." },
    { title: "Support hold-to-fire on mobile touch rig", text: "Update madi-touch-rig.js fire button handling so holding touch fires continuously just like holding Space." },
    { title: "Add Twin-Cat formation toggle", text: "Let players press Shift/Tab to switch between tight twin-beam focus fire and wide spread coverage." },
    { title: "Add shield-hit invulnerability frames & telegraph glow", text: "Flash a clearer floor lane warning 1 second before the Dragon's Flame Breath sweep activates." },
    { title: "Track highest Boss Tier reached alongside score", text: "Display Best Tier on the Game Over and HUD summary." }
  ],
  "the-revenue-jungle": [
    { title: "Prevent duplicate touch controls with #madi-rig", text: "Give .mobile-controls the #mobile-controls ID (or hide it when #madi-rig is active) so mobile players do not see duplicate Jump/Slide buttons." },
    { title: "Validate obstacle spacing at MAX_SPEED (0.44)", text: "Enforce minimum safe landing gaps between Vines and Fog Drones at top speed so impossible combinations never spawn." },
    { title: "Add a Zone-transition speed-burst fanfare", text: "Display celebratory banners and particle bursts when crossing into Golden Ruins (450+), Twilight Shrine (1,100+), and Neon Apex (2,000+)." },
    { title: "Add magnet pickup for Gold Coin trails", text: "Introduce an occasional Emerald Magnet orb alongside Shields to pull multi-coin arcs." },
    { title: "Add Double-Jump & Slide tutorial prompt on first run", text: "Show a quick 1-line cue on first Vine and first Fog Drone so new players discover fast-fall sliding immediately." }
  ],
  "the-speed-portal": [
    { title: "Sync game.json with the endless 4-zone build", text: "Update the speed portal's local game.json so it describes the 4 endless zones (Warmup to Singularity) instead of the older 810m finish." },
    { title: "Reset ringCombo to 0 when the Energy Shield breaks", text: "Clear ringCombo on shield break so the HUD accurately displays 0/3 rings needed to recharge." },
    { title: "Add a subtle barrel-roll dash on Space", text: "Give players a short cooldown phase-shift or snap-rotation burst to escape tight dual-barrier patterns." },
    { title: "Add speed-ring streak audio pitch escalation", text: "Raise chime pitch across 1/3, 2/3, and 3/3 rings for clearer non-visual shield-recharge feedback." },
    { title: "Add colorblind-friendly barrier patterns", text: "Add hazard stripes to Red Arc Barriers so they pop distinctly against glowing tunnel grids." }
  ],
  "treasure-hunters": [
    { title: "Add 1/2/3 keyboard shortcuts for between-stage upgrades", text: "Allow pressing 1, 2, or 3 to buy Winch Turbo, Value Scanner, or Shift Extension without reaching for the mouse, plus an early Finish Shift button after hitting quota." },
    { title: "Color-code the laserGuide aim line on target lock", text: "Turn the cyan laserGuide gold when aimed over Gold/Diamonds and red when aimed directly at an explosive Mine." },
    { title: "Add swinging-speed & deeper-tier mineral variety", text: "Introduce rare Sparkite crystals or magnetized crates on Stage 4+." },
    { title: "Display exact dollar values hovering over hauled items", text: "Show floating payout popups (+$2,000!) as soon as the claw starts reeling in a prize." },
    { title: "Add a practice free-aim preview toggle", text: "Show an optional dotted trajectory preview in Stage 1 to help new players time claw angles." }
  ],
  "global-fashion-model-life": [
    { title: "Fix ReferenceError on Challenge submission", text: "Replace the undefined notice(...) call at game.js:633 with say(...) so submitting themed Fashion Challenges completes cleanly." },
    { title: "Clamp energy deduction on flights", text: "Guard or clamp state.energy -= 12 at game.js:483 so booking international flights never drops energy below 0." },
    { title: "Animate the Three.js model during Runway & Shoot gigs", text: "Drive live walking and posing keyframes on the 3D avatar during Runway beats instead of only oscillating the CSS timing needle." },
    { title: "Add keyboard shortcuts for tabs & pose cues", text: "Support Left/Right arrow tab switching and 1–4 quick-booking selection alongside Space runway cues." },
    { title: "Add filter/search inside the 55-garment wardrobe", text: "Let players filter owned and shop garments by Style (Minimal, Casual, Tailored, Evening, Craft, Editorial) and Trend match." }
  ],
  gravegain1d: [
    { title: "Fix 'March again' button on defeat", text: "Make the death-screen 'March again' action restart a fresh run with the chosen race/class instead of routing back to toMenu()." },
    { title: "Add a timed Guard / Brace option on Wait", text: "Allow W/0 Wait to reduce incoming Brute slam and Swarm burst damage for deeper 1D turn-based tactics." },
    { title: "Expose Echo Drift & MP lobbies from the title menu", text: "Let Sector 5 veterans launch straight into Echo Drift and share Ley-Line Race/Horde room codes directly in-UI." },
    { title: "Show enemy ability cooldown pips on the track", text: "Render clear 4-tick Brute and 5-tick Necro countdown pips above approaching enemies." },
    { title: "Add native gamepad D-pad & button bindings", text: "Bind D-pad Right to Step and face buttons to Attack, Ritual, Potion, and Wait." }
  ],
  gravegain1dB: [
    { title: "Wire mp-1d.js and mmorpg-1d.js in index.html", text: "Load the existing multiplayer scripts (already present in games/gravegain1dB/) so Ley-Line Race and Horde work in the 3D-road edition too." },
    { title: "Fix 'March again' death button to restart directly", text: "Restart the run immediately instead of returning to the main build menu on defeat." },
    { title: "Add camera tilt/FOV options for the 3D winding road", text: "Let players adjust camera height and road curve intensity in settings." },
    { title: "Add a Brace/Guard action for Brute & Swarm counterplay", text: "Pair Wait (W/0) with temporary damage mitigation in Turn-Based mode." },
    { title: "Capture 3 featured gameplay screenshots", text: "Save screenshots showing the Three.js winding road, projected 2D slash HUD, and boss encounter to games/images/screenshots/." }
  ],
  gravegain2d: [
    { title: "Wire Lab hazard tiles 3–6 in updateTopDownMovement()", text: "Enable the already-rendered Poison (3), Fire (4), Ice (5), and Breakable Wall (6) tiles alongside Water (2)." },
    { title: "Differentiate all 4 Classes & add desktop Potion key", text: "Give Warrior, Tank, Support, and Mage distinct attack damage/range scaling (currently flat 8 melee dmg) and bind Q/H to drink potions on desktop." },
    { title: "Award rewards for the Starship Repair minigame & prune dead code", text: "Grant Gold or ship buffs upon completing the Repair microcircuit puzzle and either hook up or remove unused updatePlatformerMovement()." },
    { title: "Add native gamepad support", text: "Port twin-stick gamepad controls from GraveGain2DC for smooth controller play." },
    { title: "Add featured screenshots to the catalog", text: "Capture 3 screenshots showing 2.5D lighting, LuckyStarShip Botany, and boss fights." }
  ],
  gravegain3d: [
    { title: "Sync game.json & implement Parry + Elf Glide", text: "Update game.json to document actual FPS controls, trigger parryWindow on Right-Click rising edge, and implement the Elf air-glide described in RaceData." },
    { title: "Implement advertised secondary class skills", text: "Wire Frost Nova, Meteor Storm, Whirlwind, Ground Stomp, and Mist Flask triggers onto Right-Click or secondary hotkeys." },
    { title: "Load dormant mmorpg-3d.js in index.html", text: "Include mmorpg-3d.js alongside mp-3d.js so Spire Raid (?mmorpg=) works out of the box." },
    { title: "Add native gamepad dual-stick controls", text: "Bind Left Stick move, Right Stick look, and triggers for melee/block." },
    { title: "Add featured gameplay screenshots", text: "Capture 3 FPS dungeon and LuckyStarShip screenshots in games/images/screenshots/." }
  ],
  gravegain3dB: [
    { title: "Fix runtime-bridge slug & update game.json", text: "Change data-slug=\"gravegain3d\" at index.html:884 to \"gravegain3dB\" so cloud saves never collide, and update game.json to match starting Service Pistol and KeyB behavior." },
    { title: "Enable active Block on KeyB in Realtime & Chrono modes", text: "Let melee/shield builds block with B during Realtime and Chrono-Lock runs instead of restricting KeyB to Turn-Based wait." },
    { title: "Wire dormant mmorpg-3d.js in index.html", text: "Load mmorpg-3d.js so 8-player Spire Raid sessions launch cleanly alongside Spire Siege." },
    { title: "Add a quick comparison tooltip for procedural gun drops", text: "Show DPS, reload, and rarity deltas when aiming at a dropped weapon before swapping with U." },
    { title: "Add native gamepad bindings for parkour & 4-slot swaps", text: "Map slide-hop, mantle, drone petting, and weapon wheel cycling cleanly to controllers." }
  ],
  gravegain3dC: [
    { title: "Route squads across every arena", text: "Give companions clean navigation around long walls, across jump-pad chains, and between decks across all 4 arenas (Neon Courtyard, Void Spires, Magma Foundry, Cargo Shipment)." },
    { title: "Add match win conditions & end-of-round summaries", text: "Give Player Control and RTS Squad optional frag limits, wave caps, or timers with victory/defeat summaries." },
    { title: "Include _shared/game-select.js & Arrow-key fallback", text: "Load ../_shared/game-select.js for universal arcade navigation and gamepad adapter support, add Arrow-key movement, and add Cargo Shipment to game.json." },
    { title: "Gate RTS + ADD BOT spawning with scrap or unit caps", text: "Prevent unbounded bot spawning in RTS Squad mode so frame rates stay locked on mid-range hardware." },
    { title: "Add individual squad orders & articulated bot animations", text: "Let players command each companion individually (flank, defend, focus) with clearer locomotion and melee telegraphs." }
  ],
  gravegain4d: [
    { title: "Wire combat, enemy, and mode modules into Main4D._tick()", text: "Connect GG4D_Keymap, desktop GG4D_Melee, GG4D_Block, GG4D_Abilities (un-swallowing KeyF), GraveGainEnemies4D spawns, and GG4D_Modes.dtForFrame()." },
    { title: "Decouple Space Jump from Putt charging", text: "Stop Space from triggering startPuttCharge() in input4d.js so jumping never fires accidental putts." },
    { title: "Keep guide.html, game.json, and input4d.js aligned", text: "Maintain consistent R/E W-shift, portal-based Brane Breach, and Chrono-Sand rewind documentation across every screen." },
    { title: "Display 4D XW/YW/ZW slice telemetry on the HUD", text: "Show the active W-coordinate and nearby portal distance clearly while lining up putts." },
    { title: "Capture 3 featured 4D screenshots", text: "Save hyperdungeon tesseract slice and LuckyStarShip screenshots in games/images/screenshots/." }
  ],
  gravegain5d: [
    { title: "Expose the 4 Races in #gg5dMenu", text: "Add a race selector (#gg5dRacePick) to index.html so the already-implemented Human, Elf, Dwarf, and Orc modifiers are playable." },
    { title: "Add desktop power-putt charge & backward universe hop", text: "Let keyboard players vary putt power (matching touch's 0.5–3× push) and hop backward as well as forward." },
    { title: "Wire 3D/4D model helpers into the multiverse view", text: "Connect the feature-detected GraveGain3DModels / GraveGain4DMath modules to enrich the 2D multiverse arena." },
    { title: "Add keyboard bindings for Esc/P pause", text: "Ensure Pause/Resume works via Esc or P alongside the UI button." },
    { title: "Capture 3 featured gameplay screenshots", text: "Add screenshots of the 6 Arroyos, radial Summon Wheel, and boss combat to games/images/screenshots/." }
  ],
  "template-demo": [
    { title: "Add an optional playable mini-game objective", text: "Include timed target-color pickups or hazard orbs so endGame() can be reached naturally outside window.gameDebug." },
    { title: "Add a touch tap-vs-drag threshold", text: "Require finger displacement under 10px on touchend so dragging the orb does not accidentally trigger color cycling." },
    { title: "Add a clean Web Audio chime example", text: "Demonstrate safe user-gesture AudioContext.resume() and mute toggling inside the starter template." },
    { title: "Document _shared/game-select.js integration in template comments", text: "Keep inline comments aligned with CONTRIBUTING.md's offline-asset and save-key conventions." },
    { title: "Capture featured screenshots for the demo entry", text: "Add template-demo-1..3.jpg screenshots showing desktop and mobile template layouts." }
  ],
  "semester-survival-runner": [
    { title: "Wire dead score/coffee upgrades & 16 shop items", text: "Apply save.upgrades.score and save.upgrades.coffee inside tick() and display purchased save.shop badges/titles in the HUD and profile." },
    { title: "Include _shared/game-select.js & bind KeyP to Pause", text: "Add ../_shared/game-select.js for arcade return & gamepad adapter support, and bind P alongside Escape for pausing." },
    { title: "Give all 10 purchasable characters unique perks", text: "Add distinct starter bonuses (e.g., +10% energy recovery, longer coffee boost, wider magnet) so unlocking characters changes strategy." },
    { title: "Add a Boss attack pattern indicator in the HUD", text: "Show clear lane telegraph icons before each Semester Boss (1,800m+) launches its 3 attacks." },
    { title: "Capture 3 featured gameplay screenshots", text: "Add portrait action, Semester Boss, and Graduation screen captures to games/images/screenshots/." }
  ]
  "semester-survival-3d-playable": [
    { title: "Complete the eight-semester campaign", text: "Build the full progression from first semester through graduation, with distinct academic and campus challenges that make each semester feel meaningfully different." },
    { title: "Add proper semester endings and a graduation finale", text: "Replace the current preview-style run progression with clear semester completion screens, milestone summaries, and a satisfying final graduation sequence." },
    { title: "Balance difficulty across the full university journey", text: "Tune traffic, obstacles, pickups, upgrades, and challenge pacing so difficulty rises fairly from early semesters to the final campaign." },
    { title: "Expand campus locations and semester-specific events", text: "Give the eight-semester journey stronger visual and gameplay variety through recognizable university locations, events, and changing campus conditions." },
    { title: "Polish mobile performance, controls, and progression saves", text: "Test on mid-range Android devices, refine touch gestures and frame pacing, and make campaign progress and unlocked upgrades persist reliably." }
  ]
};
