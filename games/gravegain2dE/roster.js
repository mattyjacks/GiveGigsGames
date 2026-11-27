/* GraveGain2DE: Smash Slash Bash Mash — 16-Character Roster (4 Races x 4 Classes)
 * Grounded in MoonRock / GraveGain lore: Human, Elf, Dwarf, Orc x Warrior, Tank, Support, Mage.
 */
(function () {
  'use strict';

  const RACES = {
    human: {
      id: 'human',
      name: 'Human',
      emoji: '👩‍🚀',
      trait: 'EVA Thrusters & Shield-Wall Core',
      lore: 'LuckyStarShip MoonRock colonists in sealed EVA suits with pulse tech.',
      ultimateName: 'Orbital SafeSpace Strike',
      ultimateDesc: 'Locks a targeting beacon and calls a devastating orbital laser beam across the arena.',
      color: '#38bdf8',
      base: { weight: 100, speed: 340, airSpeed: 280, jump: 620, fall: 1320, power: 1.0, reach: 1.0 }
    },
    elf: {
      id: 'elf',
      name: 'Elf',
      emoji: '🧝‍♀️',
      trait: 'BrightEyes Agility & Spirit Hover',
      lore: 'Bioluminescent Northern Grove defenders channeling the MoonRock magical field.',
      ultimateName: 'Mother Tree Tempest',
      ultimateDesc: 'Summons swirling Light Spirits and emerald ley-bolts that sweep enemies skyward.',
      color: '#34d399',
      base: { weight: 84, speed: 395, airSpeed: 330, jump: 675, fall: 1180, power: 0.96, reach: 1.06 }
    },
    dwarf: {
      id: 'dwarf',
      name: 'Dwarf',
      emoji: '🧔🏻',
      trait: 'Sparkite Iron & Stone Form Poise',
      lore: 'Deep Forge subterranean smiths and brewers hardened by sparkite and ale.',
      ultimateName: 'Sparkite Magma Eruption',
      ultimateDesc: 'Slams the forge floor to erupt twin geysers of molten sparkite and shockwaves.',
      color: '#fbbf24',
      base: { weight: 124, speed: 290, airSpeed: 240, jump: 565, fall: 1480, power: 1.12, reach: 0.98 }
    },
    orc: {
      id: 'orc',
      name: 'Orc',
      emoji: '👹',
      trait: 'Berserkonin Rage & Division Fury',
      lore: 'Southern Wastes warriors whose power surges as damage % climbs.',
      ultimateName: 'First Orc Cataclysm',
      ultimateDesc: 'Unleashes a crimson berserkonin meteor stomp and shockwave slam.',
      color: '#f87171',
      base: { weight: 114, speed: 325, airSpeed: 265, jump: 600, fall: 1400, power: 1.14, reach: 1.1 }
    }
  };

  const CLASSES = {
    warrior: { id: 'warrior', name: 'Warrior', icon: '⚔️', role: 'Rushdown Striker', delta: { weight: 0, speed: 18, airSpeed: 16, jump: 14, power: 0.08, reach: 0.06 } },
    tank:    { id: 'tank',    name: 'Tank',    icon: '🛡️', role: 'Heavy Anchor',     delta: { weight: 16, speed: -22, airSpeed: -18, jump: -22, power: 0.1, reach: 0.04 } },
    support: { id: 'support', name: 'Support', icon: '🌿', role: 'Sustain & Zoning', delta: { weight: -4, speed: 10, airSpeed: 12, jump: 16, power: -0.04, reach: 0.0 } },
    mage:    { id: 'mage',    name: 'Mage',    icon: '🔮', role: 'Arcane Trickster', delta: { weight: -8, speed: 6, airSpeed: 18, jump: 10, power: 0.06, reach: 0.1 } }
  };

  const CHARACTER_DEFS = [
    // --- HUMAN ---
    {
      id: 'human-warrior', race: 'human', cls: 'warrior', title: 'Soldier', emoji: '👩‍🚀',
      weapon: 'carbine',
      palette: { primary: '#1d4ed8', secondary: '#f8fafc', accent: '#f97316', skin: '#f1c27d', glow: '#38bdf8', weapon: '#64748b' },
      blurb: 'Balanced MoonRock EVA vanguard with crisp pulse fire and thruster kicks.',
      moves: {
        neutral: { name: 'Pulse Carbine', kind: 'proj', projType: 'pulse', dmg: 6, kb: 160, kbg: 0.7, speed: 780, cd: 0.34, desc: 'Rapid blue plasma shot.' },
        side:    { name: 'Thruster Kick', kind: 'dash', dmg: 12, kb: 320, kbg: 1.05, dashVx: 660, dur: 0.24, desc: 'Jet-propelled flying side kick.' },
        up:      { name: 'EVA Jetpack',   kind: 'recover', dmg: 8, kb: 260, kbg: 0.9, vy: -760, vxBoost: 240, desc: 'Dual-thruster vertical boost.' },
        down:    { name: 'Frag Grenade',  kind: 'toss', projType: 'grenade', dmg: 15, kb: 380, kbg: 1.15, desc: 'Arcing timed explosive.' }
      }
    },
    {
      id: 'human-tank', race: 'human', cls: 'tank', title: 'Warden', emoji: '🛡️',
      weapon: 'riotshield',
      palette: { primary: '#0f766e', secondary: '#94a3b8', accent: '#22d3ee', skin: '#e0ac69', glow: '#67e8f9', weapon: '#0ea5e9' },
      blurb: 'Armored EVA juggernaut carrying a deployable hex-shield and stun baton.',
      moves: {
        neutral: { name: 'Shock Baton',   kind: 'burst', dmg: 11, kb: 300, kbg: 1.0, range: 64, desc: 'Electrified forward riot slam.' },
        side:    { name: 'Shield Ram',    kind: 'dash', dmg: 14, kb: 390, kbg: 1.12, dashVx: 590, dur: 0.28, armor: true, desc: 'Armored hex-shield bull rush.' },
        up:      { name: 'Booster Slam',  kind: 'recover', dmg: 11, kb: 310, kbg: 1.0, vy: -710, vxBoost: 200, desc: 'Rocket-assisted rising uppercut.' },
        down:    { name: 'Hex Reflector', kind: 'reflect', dmg: 7, kb: 260, kbg: 0.85, dur: 0.48, desc: 'Reflects projectiles and pulses.' }
      }
    },
    {
      id: 'human-support', race: 'human', cls: 'support', title: 'Medic', emoji: '⚕️',
      weapon: 'medgun',
      palette: { primary: '#ecfdf5', secondary: '#86efac', accent: '#16a34a', skin: '#f5cfa0', glow: '#4ade80', weapon: '#22c55e' },
      blurb: 'Agile colony responder who heals damage % and zaps foes with bio-darts.',
      moves: {
        neutral: { name: 'Bio-Dart',      kind: 'proj', projType: 'needle', dmg: 5, kb: 140, kbg: 0.65, speed: 840, cd: 0.28, desc: 'Fast piercing dart.' },
        side:    { name: 'Defib Dash',    kind: 'dash', dmg: 10, kb: 300, kbg: 1.0, dashVx: 640, dur: 0.22, desc: 'Shock-paddle lunge.' },
        up:      { name: 'Med-Drone Lift',kind: 'recover', dmg: 6, kb: 220, kbg: 0.8, vy: -780, vxBoost: 250, desc: 'High drone-assisted recovery.' },
        down:    { name: 'Nano Med-Pod',  kind: 'heal', heal: 12, dmg: 8, kb: 280, kbg: 0.9, cd: 3.5, desc: 'Restores 12% damage and pulses.' }
      }
    },
    {
      id: 'human-mage', race: 'human', cls: 'mage', title: 'Engineer', emoji: '🔧',
      weapon: 'wrench',
      palette: { primary: '#854d0e', secondary: '#fde047', accent: '#facc15', skin: '#d99b66', glow: '#fbbf24', weapon: '#94a3b8' },
      blurb: 'Gadgeteer deploying magnet mines, arc bolts, and automated sentry turrets.',
      moves: {
        neutral: { name: 'Arc Bolt',      kind: 'proj', projType: 'arc', dmg: 8, kb: 210, kbg: 0.85, speed: 700, cd: 0.4, desc: 'Crackling spark projectile.' },
        side:    { name: 'Magnet Saw',    kind: 'proj', projType: 'saw', dmg: 11, kb: 270, kbg: 0.95, speed: 540, cd: 0.55, desc: 'Spinning gyro disc.' },
        up:      { name: 'Repulsor Jet',  kind: 'recover', dmg: 9, kb: 250, kbg: 0.88, vy: -770, vxBoost: 260, desc: 'Explosive downward blast boost.' },
        down:    { name: 'Sentry Turret', kind: 'turret', dmg: 5, kb: 150, kbg: 0.6, cd: 4.0, desc: 'Drops an auto-firing mini turret.' }
      }
    },

    // --- ELF ---
    {
      id: 'elf-warrior', race: 'elf', cls: 'warrior', title: 'Assassin', emoji: '🗡️',
      weapon: 'daggers',
      palette: { primary: '#064e3b', secondary: '#6ee7b7', accent: '#f43f5e', skin: '#e2e8f0', glow: '#34d399', weapon: '#5eead4' },
      blurb: 'Blazingly fast Northern Grove duelist with shadow blinks and sharp kunai.',
      moves: {
        neutral: { name: 'Moon Kunai',    kind: 'proj', projType: 'kunai', dmg: 5, kb: 130, kbg: 0.65, speed: 920, cd: 0.24, desc: 'Razor-fast moonstone needle.' },
        side:    { name: 'Shadow Blink',  kind: 'dash', dmg: 13, kb: 330, kbg: 1.08, dashVx: 760, dur: 0.18, desc: 'High-speed phase slash.' },
        up:      { name: 'Crescent Spin', kind: 'recover', dmg: 10, kb: 280, kbg: 0.96, vy: -810, vxBoost: 270, desc: 'Spiral blade ascent.' },
        down:    { name: 'Mist Counter',  kind: 'counter', dmg: 16, kb: 410, kbg: 1.2, dur: 0.42, desc: 'Parries an attack for a lethal riposte.' }
      }
    },
    {
      id: 'elf-tank', race: 'elf', cls: 'tank', title: 'Paladin', emoji: '✨',
      weapon: 'lance',
      palette: { primary: '#1e3a8a', secondary: '#fde68a', accent: '#fbbf24', skin: '#f1f5f9', glow: '#fcd34d', weapon: '#fcd34d' },
      blurb: 'Radiant spellblade knight combining gilded armor with long moonstone reach.',
      moves: {
        neutral: { name: 'Spirit Lance',  kind: 'proj', projType: 'lance', dmg: 9, kb: 230, kbg: 0.88, speed: 740, cd: 0.44, desc: 'Piercing golden light spear.' },
        side:    { name: 'Radiant Charge',kind: 'dash', dmg: 14, kb: 360, kbg: 1.1, dashVx: 630, dur: 0.25, armor: true, desc: 'Gleaming lance rush.' },
        up:      { name: 'Wings of Dawn', kind: 'recover', dmg: 9, kb: 270, kbg: 0.92, vy: -760, vxBoost: 230, desc: 'Luminous upward wing surge.' },
        down:    { name: 'Aegis Ward',    kind: 'counter', dmg: 15, kb: 380, kbg: 1.15, dur: 0.46, desc: 'Holy ward that counters strikes.' }
      }
    },
    {
      id: 'elf-support', race: 'elf', cls: 'support', title: 'Brewer', emoji: '🧪',
      weapon: 'flask',
      palette: { primary: '#7c3aed', secondary: '#ddd6fe', accent: '#c4b5fd', skin: '#e2e8f0', glow: '#a78bfa', weapon: '#c084fc' },
      blurb: 'Mischievous alchemist tossing volatile potions and soothing elven mead.',
      moves: {
        neutral: { name: 'Acid Flask',    kind: 'toss', projType: 'flask', dmg: 10, kb: 240, kbg: 0.9, cd: 0.45, desc: 'Shattering alchemical splash.' },
        side:    { name: 'Fizz Jet',      kind: 'dash', dmg: 11, kb: 300, kbg: 0.98, dashVx: 680, dur: 0.22, desc: 'Pressurized potion dash.' },
        up:      { name: 'Bubble Geyser', kind: 'recover', dmg: 8, kb: 260, kbg: 0.9, vy: -790, vxBoost: 240, desc: 'Erupting foam launch.' },
        down:    { name: 'Elven Mead',    kind: 'heal', heal: 14, dmg: 7, kb: 250, kbg: 0.85, cd: 3.8, desc: 'Sips mead (-14%) & splashes foes.' }
      }
    },
    {
      id: 'elf-mage', race: 'elf', cls: 'mage', title: 'Tinkerer', emoji: '⚙️',
      weapon: 'staff',
      palette: { primary: '#0e7490', secondary: '#fef08a', accent: '#22d3ee', skin: '#f1f5f9', glow: '#67e8f9', weapon: '#38bdf8' },
      blurb: 'Arcane artisan weaving orbiting Light Spirits and clockwork ley-saws.',
      moves: {
        neutral: { name: 'Light Spirit',  kind: 'proj', projType: 'homing', dmg: 7, kb: 190, kbg: 0.82, speed: 520, cd: 0.45, desc: 'Gently curving spirit orb.' },
        side:    { name: 'Ley Sawblade',  kind: 'proj', projType: 'saw', dmg: 12, kb: 290, kbg: 1.0, speed: 600, cd: 0.5, desc: 'Fast spinning mana disc.' },
        up:      { name: 'Spirit Warp',   kind: 'recover', dmg: 7, kb: 230, kbg: 0.85, vy: -820, vxBoost: 280, desc: 'Instant teleport-like wind lift.' },
        down:    { name: 'BrightEyes Nova',kind: 'burst', dmg: 13, kb: 350, kbg: 1.08, range: 92, desc: '360° bioluminescent shockwave.' }
      }
    },

    // --- DWARF ---
    {
      id: 'dwarf-warrior', race: 'dwarf', cls: 'warrior', title: 'Slayer', emoji: '🪓',
      weapon: 'axes',
      palette: { primary: '#9a3412', secondary: '#fde68a', accent: '#ef4444', skin: '#f1c27d', glow: '#fbbf24', weapon: '#cbd5e1' },
      blurb: 'Relentless Deep Forge axe-master with brutal spinning cleaves and hatchets.',
      moves: {
        neutral: { name: 'Forge Hatchet', kind: 'proj', projType: 'hatchet', dmg: 9, kb: 240, kbg: 0.92, speed: 620, cd: 0.42, desc: 'Spinning iron throwing axe.' },
        side:    { name: 'Whirlwind Axe', kind: 'dash', dmg: 15, kb: 370, kbg: 1.12, dashVx: 600, dur: 0.26, desc: 'Tornado twin-axe advance.' },
        up:      { name: 'Anvil Upper',   kind: 'recover', dmg: 12, kb: 330, kbg: 1.04, vy: -700, vxBoost: 210, desc: 'Heavy rising axe slash.' },
        down:    { name: 'Stone Form',    kind: 'counter', dmg: 17, kb: 430, kbg: 1.22, dur: 0.48, desc: 'Turns to iron-stone and retaliates.' }
      }
    },
    {
      id: 'dwarf-tank', race: 'dwarf', cls: 'tank', title: 'Brute', emoji: '🔨',
      weapon: 'hammer',
      palette: { primary: '#44403c', secondary: '#a8a29e', accent: '#f97316', skin: '#eab38c', glow: '#fb923c', weapon: '#94a3b8' },
      blurb: 'The heaviest powerhouse on MoonRock. Slow to launch, lethal with his great-hammer.',
      moves: {
        neutral: { name: 'Boulder Toss',  kind: 'toss', projType: 'boulder', dmg: 14, kb: 340, kbg: 1.12, cd: 0.65, desc: 'Crushing heavy stone heave.' },
        side:    { name: 'Forge Tackle',  kind: 'dash', dmg: 17, kb: 420, kbg: 1.2, dashVx: 540, dur: 0.3, armor: true, desc: 'Unstoppable armored shoulder.' },
        up:      { name: 'Cannon Vault',  kind: 'recover', dmg: 12, kb: 320, kbg: 1.02, vy: -690, vxBoost: 190, desc: 'Explosive sparkite leap.' },
        down:    { name: 'Quake Slam',    kind: 'burst', dmg: 16, kb: 410, kbg: 1.18, range: 105, desc: 'Ground-shattering hammer shockwave.' }
      }
    },
    {
      id: 'dwarf-support', race: 'dwarf', cls: 'support', title: 'Shaman', emoji: '🪨',
      weapon: 'totem',
      palette: { primary: '#155e75', secondary: '#a5f3fc', accent: '#22d3ee', skin: '#eab38c', glow: '#67e8f9', weapon: '#a8a29e' },
      blurb: 'Runic stone-seer calling sparkite lightning and restorative hearth totems.',
      moves: {
        neutral: { name: 'Rune Spark',    kind: 'proj', projType: 'arc', dmg: 8, kb: 220, kbg: 0.86, speed: 680, cd: 0.42, desc: 'Charged sparkite rune bolt.' },
        side:    { name: 'Totem Surge',   kind: 'dash', dmg: 12, kb: 320, kbg: 1.0, dashVx: 580, dur: 0.24, desc: 'Earth-shielded forward bash.' },
        up:      { name: 'Crystal Pillar',kind: 'recover', dmg: 10, kb: 290, kbg: 0.96, vy: -740, vxBoost: 220, desc: 'Rises atop a stone geyser.' },
        down:    { name: 'Hearth Ale',    kind: 'heal', heal: 13, dmg: 9, kb: 290, kbg: 0.95, cd: 3.6, desc: 'Restores 13% and blasts nearby foes.' }
      }
    },
    {
      id: 'dwarf-mage', race: 'dwarf', cls: 'mage', title: 'Warlock', emoji: '🔥',
      weapon: 'orb',
      palette: { primary: '#7f1d1d', secondary: '#fecaca', accent: '#fb7185', skin: '#e0ac69', glow: '#f43f5e', weapon: '#ef4444' },
      blurb: 'Magma-forge pyromancer hurling molten sparkite orbs and cursed fire.',
      moves: {
        neutral: { name: 'Magma Orb',     kind: 'proj', projType: 'fireball', dmg: 11, kb: 280, kbg: 1.0, speed: 560, cd: 0.5, desc: 'Heavy explosive fireball.' },
        side:    { name: 'Hellfire Dash', kind: 'dash', dmg: 14, kb: 350, kbg: 1.08, dashVx: 620, dur: 0.24, desc: 'Blazing ember charge.' },
        up:      { name: 'Ember Rocket',  kind: 'recover', dmg: 11, kb: 300, kbg: 0.98, vy: -750, vxBoost: 230, desc: 'Fiery vertical eruption.' },
        down:    { name: 'Cursed Nova',   kind: 'burst', dmg: 14, kb: 380, kbg: 1.12, range: 96, desc: 'Detonates a ring of forge fire.' }
      }
    },

    // --- ORC ---
    {
      id: 'orc-warrior', race: 'orc', cls: 'warrior', title: 'Berserker', emoji: '⚔️',
      weapon: 'cleaver',
      palette: { primary: '#14532d', secondary: '#fecaca', accent: '#ef4444', skin: '#4ade80', glow: '#f87171', weapon: '#94a3b8' },
      blurb: 'Ferocious Southern Wastes brawler whose berserkonin rage boosts damage at high %.',
      moves: {
        neutral: { name: 'Cleaver Wave',  kind: 'proj', projType: 'wave', dmg: 10, kb: 260, kbg: 0.96, speed: 650, cd: 0.45, desc: 'Crescent crimson shockwave.' },
        side:    { name: 'Rage Lunge',    kind: 'dash', dmg: 15, kb: 380, kbg: 1.15, dashVx: 660, dur: 0.24, desc: 'Savage forward cleaver lunge.' },
        up:      { name: 'Savage Leap',   kind: 'recover', dmg: 12, kb: 330, kbg: 1.05, vy: -745, vxBoost: 240, desc: 'Spinning upward slash leap.' },
        down:    { name: 'Warcry Stomp',  kind: 'burst', dmg: 14, kb: 390, kbg: 1.14, range: 100, desc: 'Crushing stomp shockwave.' }
      }
    },
    {
      id: 'orc-tank', race: 'orc', cls: 'tank', title: 'Guardian', emoji: '🛡️',
      weapon: 'towershield',
      palette: { primary: '#1c1917', secondary: '#d6d3d1', accent: '#f59e0b', skin: '#22c55e', glow: '#fbbf24', weapon: '#64748b' },
      blurb: 'Towering iron-plated warlord who absorbs punishment and launches foes offstage.',
      moves: {
        neutral: { name: 'Iron Spike',    kind: 'proj', projType: 'hatchet', dmg: 10, kb: 270, kbg: 0.98, speed: 600, cd: 0.48, desc: 'Heavy hurled scrap spike.' },
        side:    { name: 'Bull Rush',     kind: 'dash', dmg: 16, kb: 410, kbg: 1.18, dashVx: 570, dur: 0.28, armor: true, desc: 'Armored unstoppable charge.' },
        up:      { name: 'Earth-Breaker', kind: 'recover', dmg: 12, kb: 320, kbg: 1.0, vy: -710, vxBoost: 210, desc: 'Skyward iron fist rise.' },
        down:    { name: 'Ironclad Brace',kind: 'counter', dmg: 16, kb: 420, kbg: 1.2, dur: 0.46, desc: 'Absorbs blow and slams back.' }
      }
    },
    {
      id: 'orc-support', race: 'orc', cls: 'support', title: 'Druid', emoji: '🌿',
      weapon: 'hawkstaff',
      palette: { primary: '#3f6212', secondary: '#d9f99d', accent: '#84cc16', skin: '#4ade80', glow: '#a3e635', weapon: '#78350f' },
      blurb: 'Spirit-caller channeling Earth DNA hawks, vampire bats, and healing spores.',
      moves: {
        neutral: { name: 'Spirit Hawk',   kind: 'proj', projType: 'hawk', dmg: 8, kb: 210, kbg: 0.85, speed: 780, cd: 0.38, desc: 'Fast diving spirit hawk.' },
        side:    { name: 'Bat Swarm',     kind: 'dash', dmg: 11, kb: 300, kbg: 0.98, dashVx: 630, dur: 0.23, healOnHit: 5, desc: 'Vampire bat dash that steals 5%.' },
        up:      { name: 'Canopy Gust',   kind: 'recover', dmg: 8, kb: 250, kbg: 0.88, vy: -780, vxBoost: 250, desc: 'Updraft wing launch.' },
        down:    { name: 'Spore Bloom',   kind: 'heal', heal: 12, dmg: 9, kb: 280, kbg: 0.92, cd: 3.6, desc: 'Restores 12% and bursts spores.' }
      }
    },
    {
      id: 'orc-mage', race: 'orc', cls: 'mage', title: 'Witch', emoji: '🔮',
      weapon: 'hexstaff',
      palette: { primary: '#581c87', secondary: '#e9d5ff', accent: '#c084fc', skin: '#4ade80', glow: '#e879f9', weapon: '#a855f7' },
      blurb: 'Ley-hex mystic bending gravity fields and launching eerie phantom skulls.',
      moves: {
        neutral: { name: 'Hex Skull',     kind: 'proj', projType: 'homing', dmg: 9, kb: 240, kbg: 0.92, speed: 560, cd: 0.45, desc: 'Tracking violet spirit skull.' },
        side:    { name: 'Soul Tether',   kind: 'dash', dmg: 12, kb: 330, kbg: 1.05, dashVx: 650, dur: 0.22, healOnHit: 4, desc: 'Spectral blink-drain strike.' },
        up:      { name: 'Ghost Levitate',kind: 'recover', dmg: 8, kb: 250, kbg: 0.9, vy: -800, vxBoost: 265, desc: 'Eerie floating ascent.' },
        down:    { name: 'Gravity Hex',   kind: 'reflect', dmg: 10, kb: 320, kbg: 1.02, dur: 0.46, desc: 'Deflects shots & warps nearby foes.' }
      }
    }
  ];

  const ROSTER = CHARACTER_DEFS.map((c) => {
    const r = RACES[c.race];
    const cl = CLASSES[c.cls];
    return {
      ...c,
      raceName: r.name,
      className: cl.name,
      fullName: `${r.name} ${c.title}`,
      raceTrait: r.trait,
      role: cl.role,
      ultimateName: r.ultimateName,
      ultimateDesc: r.ultimateDesc,
      stats: {
        weight: r.base.weight + cl.delta.weight,
        speed: r.base.speed + cl.delta.speed,
        airSpeed: r.base.airSpeed + cl.delta.airSpeed,
        jump: r.base.jump + cl.delta.jump,
        fall: r.base.fall,
        power: Number((r.base.power + cl.delta.power).toFixed(2)),
        reach: Number((r.base.reach + cl.delta.reach).toFixed(2))
      }
    };
  });

  const BY_ID = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

  window.GG2DE_ROSTER = {
    RACES,
    CLASSES,
    ROSTER,
    get: (id) => BY_ID[id] || ROSTER[0]
  };
})();
