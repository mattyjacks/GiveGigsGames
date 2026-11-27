// Neon Racer: Miami '86 — 3D Synthwave Highway Racer
// Powered by Three.js (r128) with graceful 2D Synthwave fallback.

// ===== Storage helpers (safe in private / sandboxed embeds) =====
function neonReadRecord(key) {
    try {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch (_) {
        return 0;
    }
}
function neonWriteRecord(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch (_) { /* In-memory record remains available. */ }
}
function neonReadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_) {
        return fallback;
    }
}
function neonWriteJson(key, obj) {
    try {
        localStorage.setItem(key, JSON.stringify(obj));
    } catch (_) {}
}

// ===== Fixed 60Hz simulation clock =====
function createNeonClock() {
    const step = 1000 / 60;
    let previous = null;
    let accumulator = 0;
    return {
        reset() { previous = null; accumulator = 0; },
        advance(timestamp, updateStep, isActive) {
            if (!Number.isFinite(timestamp)) return;
            if (previous === null) { previous = timestamp; return; }
            accumulator += Math.min(100, Math.max(0, timestamp - previous));
            previous = timestamp;
            let steps = 0;
            while (accumulator + 0.00001 >= step && steps < 5 && isActive()) {
                accumulator -= step;
                updateStep();
                steps++;
            }
            if (steps === 5) accumulator = Math.min(accumulator, step);
        }
    };
}
const neonClock = createNeonClock();

// ===== DOM & Global Contracts (preserved for tests & shell bridges) =====
const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const highScoreShim = document.getElementById('TEMPLATE-4weird-high-score');
const miamiHudEl = document.getElementById('miami-hud');
const flashEl = document.getElementById('miami-flash');
const calloutStackEl = document.getElementById('miami-callouts');

const startScreenEl = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreenEl = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreenEl = document.getElementById('TEMPLATE-4weird-game-over-screen');
const garageScreenEl = document.getElementById('miami-garage-screen');

const hudDistEl = document.getElementById('hud-distance');
const hudSpeedEl = document.getElementById('hud-speed');
const hudZoneEl = document.getElementById('hud-zone');
const hudCoinsEl = document.getElementById('hud-coins');
const hudBestEl = document.getElementById('hud-best');
const hudComboWrap = document.getElementById('hud-combo-wrap');
const hudComboMult = document.getElementById('hud-combo-mult');
const hudComboFill = document.getElementById('hud-combo-fill');

const buffShieldEl = document.getElementById('buff-shield');
const buffShieldFill = document.getElementById('buff-shield-fill');
const buffMagnetEl = document.getElementById('buff-magnet');
const buffMagnetFill = document.getElementById('buff-magnet-fill');
const buffTurboEl = document.getElementById('buff-turbo');
const buffTurboFill = document.getElementById('buff-turbo-fill');
const buffSlowEl = document.getElementById('buff-slow');
const buffSlowFill = document.getElementById('buff-slow-fill');

const btnCam = document.getElementById('btn-cam');
const btnMute = document.getElementById('btn-mute');
const btnPause = document.getElementById('btn-pause');
const pauseCamBtn = document.getElementById('pause-cam-btn');
const pauseAudioBtn = document.getElementById('pause-audio-btn');

// ===== Garage Catalog & Persistent Profile =====
const CAR_SKINS = [
    {
        id: 'testa_cyan',
        name: 'Testa Cyan',
        tagline: '1986 Miami Vice wedge coupe with electric aqua neon.',
        cost: 0,
        body: 0x00e5d4,
        accent: 0xff2a85,
        underglow: 0x00f5d4,
        tail: 0xff2a85,
        trail: 0x00f5d4,
        style: 'coupe',
        swatch: 'linear-gradient(90deg, #00f5d4, #ff2a85)'
    },
    {
        id: 'vice_white',
        name: 'Vice White',
        tagline: 'Pearl white Ocean Drive Testarossa with coral-aqua trim.',
        cost: 25,
        body: 0xf4f7ff,
        accent: 0x00f5d4,
        underglow: 0xff4fa3,
        tail: 0xff2a6d,
        trail: 0xff62b0,
        style: 'coupe',
        swatch: 'linear-gradient(90deg, #ffffff, #00f5d4, #ff4fa3)'
    },
    {
        id: 'outrun_crimson',
        name: 'OutRun Spyder',
        tagline: 'Sunset crimson open-top roadster built for twilight coasts.',
        cost: 50,
        body: 0xff1e56,
        accent: 0xffd166,
        underglow: 0xff7b00,
        tail: 0xffaa00,
        trail: 0xff9e00,
        style: 'spyder',
        swatch: 'linear-gradient(90deg, #ff1e56, #ffd166)'
    },
    {
        id: 'chrome_delorean',
        name: 'Flux DMC-86',
        tagline: 'Brushed stainless time cruiser with twin cobalt flux coils.',
        cost: 90,
        body: 0xcbd5e1,
        accent: 0x38bdf8,
        underglow: 0x38bdf8,
        tail: 0xff3b3b,
        trail: 0x38bdf8,
        style: 'flux',
        swatch: 'linear-gradient(90deg, #e2e8f0, #38bdf8, #818cf8)'
    },
    {
        id: 'solar_countach',
        name: 'Solar Countach',
        tagline: 'Championship sunset gold wedge with twin-tier aero wing.',
        cost: 150,
        body: 0xffc83d,
        accent: 0xff2a85,
        underglow: 0xff2a85,
        tail: 0xff2a85,
        trail: 0xffd166,
        style: 'countach',
        swatch: 'linear-gradient(90deg, #ffd166, #ff2a85, #7b2cbf)'
    }
];

const GARAGE_PERKS = [
    {
        id: 'starterShield',
        name: 'Starter Neon Shield',
        desc: 'Launch every run with a full Neon Shield ready to absorb a crash.',
        cost: 60
    },
    {
        id: 'hyperMagnet',
        name: 'Hyper Coin Magnet',
        desc: 'Magnet pickups pull coins from further ahead and last +3s longer.',
        cost: 80
    }
];

const garageState = (function loadGarage() {
    const saved = neonReadJson('neonRacerGarageV1', null);
    const base = {
        bank: 0,
        ownedCars: ['testa_cyan'],
        equippedCar: 'testa_cyan',
        perks: { starterShield: false, hyperMagnet: false }
    };
    if (!saved) return base;
    return {
        bank: Math.max(0, Math.floor(Number(saved.bank) || 0)),
        ownedCars: Array.isArray(saved.ownedCars) && saved.ownedCars.length ? saved.ownedCars : ['testa_cyan'],
        equippedCar: CAR_SKINS.some(c => c.id === saved.equippedCar) ? saved.equippedCar : 'testa_cyan',
        perks: {
            starterShield: !!(saved.perks && saved.perks.starterShield),
            hyperMagnet: !!(saved.perks && saved.perks.hyperMagnet)
        }
    };
})();
function saveGarage() {
    neonWriteJson('neonRacerGarageV1', garageState);
}
function getEquippedSkin() {
    return CAR_SKINS.find(c => c.id === garageState.equippedCar) || CAR_SKINS[0];
}

// ===== Core Game State (top-level globals kept intact) =====
const laneCount = 3;
const laneWidth = 3.2;
const ROAD_WIDTH = laneCount * laneWidth; // 9.6
const PLAYER_Z = 4.0;
const SPAWN_Z = -148;
const DESPAWN_Z = 22;

function laneToWorldX(lane) {
    return (lane - 1) * laneWidth;
}

let gameState = 'start';
let distance = 0;
let highScore = neonReadRecord('neonRacerHighScore');
let coins = 0;
let speed = 3.2;
let manualSpeedOffset = 0;
let topMph = 0;
let nearMissCount = 0;
let combo = 1;
let comboTimer = 0;
let animationId = null;
let lastFrameMs = 0;
let worldTime = 0;
let garageReturnTo = 'start';

// Timed Buffs & Status (in seconds)
let shieldActive = false;
let shieldPulse = 0;
let invulnTimer = 0;
let magnetTimer = 0;
let magnetMaxTime = 8.0;
let turboTimer = 0;
let turboMaxTime = 5.0;
let slowTimer = 0;
let slowMaxTime = 6.0;
let oilWobbleTimer = 0;
let shakeIntensity = 0;
let currentZoneIdx = 0;

// Camera mode: 0 = Chase, 1 = Hood, 2 = High Arcade
const CAMERA_MODES = ['Chase', 'Hood', 'Arcade'];
let cameraMode = 0;

const player = {
    lane: 1,
    x: 0,
    targetX: 0,
    y: 0,
    width: 1.75,
    height: 3.6,
    roll: 0,
    pitch: 0,
    color: '#00f5d4'
};

// Entities
let enemies = [];
let coinItems = [];
let powerUps = [];
let roadFeatures = []; // speed pads & oil slicks
let burstParticles = [];
let enemySpawnTimer = 0;
let coinSpawnTimer = 0;
let featureSpawnTimer = 0;
let powerUpCooldown = 180;

// Update high score shim immediately
if (highScoreShim) highScoreShim.textContent = highScore + 'm';

// ===== 80s Miami Synthwave Web Audio Engine =====
let audioCtx = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

function setMuted(m) {
    muted = !!m;
    if (muted) stopSynthMusic();
    else if (gameState === 'playing') startSynthMusic();
    syncAudioButtons();
    return muted;
}
function toggleMute() {
    return setMuted(!muted);
}
function syncAudioButtons() {
    if (btnMute) btnMute.textContent = muted ? '🔇' : '🔊';
    if (pauseAudioBtn) pauseAudioBtn.textContent = muted ? '🔇 Synth Audio: OFF' : '🔊 Synth Audio: ON';
}
function initAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
        if (!audioCtx) audioCtx = new AudioCtor();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch (_) {}
}

function playTone(freq, duration, type = 'sawtooth', volume = 0.06, endFreq = null, delay = 0) {
    if (!audioCtx || muted) return;
    try {
        const now = audioCtx.currentTime + delay;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(30, freq), now);
        if (endFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
        }
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.015, duration * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    } catch (_) {}
}

function playNoise(duration, volume = 0.05, highpass = 1200, delay = 0) {
    if (!audioCtx || muted) return;
    try {
        const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
        const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.45));
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = highpass;
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime + delay;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
    } catch (_) {}
}

function playSfx(kind, extra = 1) {
    if (muted) return;
    initAudio();
    if (!audioCtx) return;
    switch (kind) {
        case 'steer':
            playTone(320, 0.065, 'triangle', 0.05, 520);
            break;
        case 'coin':
            playTone(880, 0.07, 'sine', 0.065, 1175);
            playTone(1318, 0.09, 'triangle', 0.045, 1568, 0.045);
            break;
        case 'nearmiss': {
            const base = 520 + Math.min(extra, 5) * 95;
            playTone(base, 0.09, 'sawtooth', 0.045, base * 1.45);
            playTone(base * 1.25, 0.12, 'triangle', 0.045, base * 1.85, 0.04);
            break;
        }
        case 'powerup':
            playTone(440, 0.09, 'triangle', 0.06, 660);
            playTone(660, 0.11, 'triangle', 0.06, 880, 0.07);
            playTone(880, 0.15, 'sine', 0.065, 1320, 0.14);
            break;
        case 'speedpad':
            playTone(280, 0.18, 'sawtooth', 0.06, 980);
            playTone(560, 0.16, 'triangle', 0.05, 1240, 0.04);
            break;
        case 'oil':
            playTone(260, 0.16, 'sawtooth', 0.055, 110);
            playNoise(0.14, 0.04, 600);
            break;
        case 'shieldBreak':
            playTone(640, 0.18, 'sawtooth', 0.09, 140);
            playTone(980, 0.22, 'sine', 0.07, 220, 0.03);
            playNoise(0.22, 0.08, 700);
            break;
        case 'crash':
            playTone(170, 0.36, 'sawtooth', 0.11, 38);
            playTone(110, 0.42, 'square', 0.07, 32, 0.03);
            playNoise(0.38, 0.11, 320);
            break;
        case 'buy':
            playTone(523, 0.08, 'triangle', 0.06, 659);
            playTone(784, 0.12, 'triangle', 0.06, 1046, 0.07);
            break;
    }
}

// 118 BPM 80s OutRun Synthwave Bassline + Beat (D minor / F / C / G progression)
const SYNTH_BASS_NOTES = [
    73.42, 73.42, 146.83, 73.42, 73.42, 73.42, 130.81, 146.83, // Dm
    87.31, 87.31, 174.61, 87.31, 87.31, 87.31, 146.83, 174.61, // F
    65.41, 65.41, 130.81, 65.41, 65.41, 65.41, 116.54, 130.81, // C
    98.00, 98.00, 196.00, 98.00, 110.00, 110.00, 146.83, 164.81 // G -> A
];
const SYNTH_ARP_NOTES = [
    293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 329.63, 440.00,
    349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 392.00, 523.25,
    261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 392.00,
    392.00, 493.88, 587.33, 659.25, 587.33, 493.88, 440.00, 523.25
];

function startSynthMusic() {
    if (muted || musicTimer || gameState !== 'playing') return;
    initAudio();
    if (!audioCtx) return;
    musicStep = 0;
    const stepMs = 127; // ~118 BPM 16th-8th groove
    musicTimer = window.setInterval(() => {
        if (muted || gameState !== 'playing' || !audioCtx || document.hidden) return;
        const i = musicStep % 32;
        const bassHz = SYNTH_BASS_NOTES[i];
        const arpHz = SYNTH_ARP_NOTES[i];

        // Analog synth bass pulse
        playTone(bassHz, 0.11, 'sawtooth', 0.032, bassHz * 0.99);

        // Sparkling 80s arpeggio lead (subtle)
        if (i % 2 === 0 || turboTimer > 0) {
            playTone(arpHz, 0.09, 'triangle', turboTimer > 0 ? 0.026 : 0.017);
        }

        // 80s gated kick on 0, 4, 8...
        if (i % 4 === 0) {
            playTone(125, 0.11, 'sine', 0.065, 42);
        }
        // Gated snare on backbeats 2, 6, 10...
        if (i % 4 === 2) {
            playNoise(0.11, 0.032, 900);
            playTone(190, 0.06, 'triangle', 0.025, 105);
        }
        // Crisp 80s hi-hat
        if (i % 2 === 1) {
            playNoise(0.03, 0.012, 5200);
        }
        musicStep++;
    }, stepMs);
}

function stopSynthMusic() {
    if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
    }
}

// ===== Miami Zones =====
const MIAMI_ZONES = [
    { dist: 0,    name: 'OCEAN DR',     fog: 0x260942, bg: 0x16052c, gridTint: 0xff2a85, sunY: 16.5 },
    { dist: 500,  name: 'BISCAYNE BAY', fog: 0x300a4e, bg: 0x1a0636, gridTint: 0xff4fa3, sunY: 14.5 },
    { dist: 1200, name: 'VICE OVERDRV', fog: 0x1e0844, bg: 0x0f0428, gridTint: 0x00f5d4, sunY: 12.2 },
    { dist: 2200, name: 'MIDNIGHT 86',  fog: 0x12042e, bg: 0x08021a, gridTint: 0x9d4edd, sunY: 10.5 }
];

// ===== Three.js 3D Engine (with automatic 2D fallback) =====
let useWebGL = false;
let fallbackCtx = null;
let scene, camera, renderer;
let roadTex, gridTex, waterTex;
let playerCarGroup, playerWheels = [], playerFlames = [], playerShieldMesh, playerMagnetRing, playerUnderglow;
let playerTrailLeft, playerTrailRight;
let sunMesh, sunHalo, skylineGroup;
let palmPool = [];
let archPool = [];
let pylonPool = [];
let speedlinePool = [];

// Shared geometries & materials for zero-GC spawning
const sharedGeo = {};
const sharedMat = {};
const spriteTextures = {};

function makeCanvasTexture(width, height, drawFn) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const g = c.getContext('2d');
    drawFn(g, width, height);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
}

function buildSkyTexture() {
    return makeCanvasTexture(512, 512, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0.00, '#070217');
        grad.addColorStop(0.24, '#180638');
        grad.addColorStop(0.46, '#4d1066');
        grad.addColorStop(0.64, '#b81c74');
        grad.addColorStop(0.77, '#ff3f7f');
        grad.addColorStop(0.87, '#ff8e3c');
        grad.addColorStop(0.95, '#ffd166');
        grad.addColorStop(1.00, '#2a0944');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);

        // Twinkling upper-sky stars
        for (let i = 0; i < 160; i++) {
            const x = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
            const y = (Math.sin(i * 311.7) * 0.5 + 0.5) * h * 0.54;
            const r = (i % 7 === 0) ? 2.0 : 1.1;
            const alpha = 0.35 + (i % 5) * 0.14;
            g.fillStyle = i % 9 === 0 ? `rgba(0, 245, 212, ${alpha})` : `rgba(255, 245, 255, ${alpha})`;
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
        }
    });
}

function buildSunTexture() {
    return makeCanvasTexture(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, radius = w * 0.46;

        g.save();
        g.beginPath();
        g.arc(cx, cy, radius, 0, Math.PI * 2);
        g.clip();

        const grad = g.createLinearGradient(0, cy - radius, 0, cy + radius);
        grad.addColorStop(0.00, '#fff7a8');
        grad.addColorStop(0.28, '#ffd166');
        grad.addColorStop(0.54, '#ff7b00');
        grad.addColorStop(0.78, '#ff2a85');
        grad.addColorStop(1.00, '#c9186b');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);

        // Iconic 80s synthwave horizontal scanline slices across lower sun
        g.globalCompositeOperation = 'destination-out';
        const bands = [
            { y: 0.53, h: 0.016 },
            { y: 0.59, h: 0.022 },
            { y: 0.66, h: 0.028 },
            { y: 0.74, h: 0.036 },
            { y: 0.83, h: 0.044 },
            { y: 0.92, h: 0.055 }
        ];
        bands.forEach(b => {
            g.fillStyle = '#000';
            g.fillRect(0, cy - radius + b.y * radius * 2, w, b.h * radius * 2);
        });
        g.restore();
    });
}

function buildSunHaloTexture() {
    return makeCanvasTexture(256, 256, (g, w, h) => {
        const grad = g.createRadialGradient(w / 2, h / 2, w * 0.14, w / 2, h / 2, w * 0.5);
        grad.addColorStop(0.0, 'rgba(255, 196, 86, 0.72)');
        grad.addColorStop(0.38, 'rgba(255, 42, 133, 0.36)');
        grad.addColorStop(0.72, 'rgba(130, 30, 180, 0.12)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
    });
}

function buildRoadTexture() {
    const tex = makeCanvasTexture(512, 512, (g, w, h) => {
        // Dark midnight wet asphalt
        g.fillStyle = '#120b24';
        g.fillRect(0, 0, w, h);

        // Subtle sunset specular reflection band down center of wet road
        const sheen = g.createLinearGradient(0, 0, w, 0);
        sheen.addColorStop(0.00, 'rgba(0, 245, 212, 0.12)');
        sheen.addColorStop(0.18, 'rgba(255, 42, 133, 0.04)');
        sheen.addColorStop(0.50, 'rgba(255, 158, 0, 0.11)');
        sheen.addColorStop(0.82, 'rgba(255, 42, 133, 0.04)');
        sheen.addColorStop(1.00, 'rgba(0, 245, 212, 0.12)');
        g.fillStyle = sheen;
        g.fillRect(0, 0, w, h);

        // Subtle asphalt grain streaks
        for (let i = 0; i < 420; i++) {
            const rx = (Math.sin(i * 45.2) * 0.5 + 0.5) * w;
            const ry = (Math.cos(i * 91.7) * 0.5 + 0.5) * h;
            g.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.16)';
            g.fillRect(rx, ry, 2, 16);
        }

        // Bright turquoise outer shoulder neon stripes
        g.fillStyle = '#00f5d4';
        g.fillRect(10, 0, 10, h);
        g.fillRect(w - 20, 0, 10, h);
        g.fillStyle = 'rgba(0, 245, 212, 0.25)';
        g.fillRect(20, 0, 14, h);
        g.fillRect(w - 34, 0, 14, h);

        // Hot-pink + white dashed lane dividers (2 dividers for 3 lanes)
        const d1 = w / 3;
        const d2 = (w * 2) / 3;
        for (let y = 16; y < h; y += 128) {
            // Outer neon pink halo
            g.fillStyle = 'rgba(255, 42, 133, 0.55)';
            g.fillRect(d1 - 7, y - 4, 14, 72);
            g.fillRect(d2 - 7, y - 4, 14, 72);
            // Crisp white-pink core
            g.fillStyle = '#ffe5f4';
            g.fillRect(d1 - 3, y, 6, 64);
            g.fillRect(d2 - 3, y, 6, 64);
        }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    tex.anisotropy = 4;
    return tex;
}

function buildSynthGridTexture() {
    const tex = makeCanvasTexture(512, 512, (g, w, h) => {
        g.fillStyle = '#110428';
        g.fillRect(0, 0, w, h);

        // Glowing synthwave perspective grid lines
        const step = 64;
        g.strokeStyle = 'rgba(255, 42, 133, 0.25)';
        g.lineWidth = 7;
        for (let x = 0; x <= w; x += step) {
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
        }
        for (let y = 0; y <= h; y += step) {
            g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        }

        g.strokeStyle = '#ff2a85';
        g.lineWidth = 2.2;
        for (let x = 0; x <= w; x += step) {
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
        }
        g.strokeStyle = '#00f5d4';
        g.lineWidth = 2.0;
        for (let y = 0; y <= h; y += step) {
            g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 22);
    tex.anisotropy = 4;
    return tex;
}

function buildWaterTexture() {
    const tex = makeCanvasTexture(512, 512, (g, w, h) => {
        g.fillStyle = '#0e0728';
        g.fillRect(0, 0, w, h);
        // Horizontal sunset ocean ripples
        for (let y = 0; y < h; y += 8) {
            const shimmer = Math.sin(y * 0.23) * 0.5 + 0.5;
            g.fillStyle = shimmer > 0.55
                ? `rgba(255, 110, 150, ${0.12 + shimmer * 0.16})`
                : `rgba(0, 245, 212, ${0.08 + shimmer * 0.12})`;
            const sw = 80 + shimmer * 220;
            const sx = (Math.sin(y * 1.7) * 0.5 + 0.5) * (w - sw);
            g.fillRect(sx, y, sw, 3);
        }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 18);
    return tex;
}

function buildSkylineWindowTexture(accentHex) {
    return makeCanvasTexture(128, 256, (g, w, h) => {
        g.fillStyle = '#0c0520';
        g.fillRect(0, 0, w, h);
        for (let y = 14; y < h - 12; y += 16) {
            for (let x = 10; x < w - 10; x += 18) {
                if (((x * 7 + y * 13) % 11) > 3) {
                    g.fillStyle = ((x + y) % 5 === 0) ? '#ffd166' : accentHex;
                    g.fillRect(x, y, 10, 7);
                }
            }
        }
        // Top neon Art Deco cornice bar
        g.fillStyle = accentHex;
        g.fillRect(0, 0, w, 6);
    });
}

function buildUnderglowTexture(hexStr) {
    return makeCanvasTexture(128, 256, (g, w, h) => {
        const grad = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w * 0.5);
        grad.addColorStop(0.0, hexStr);
        grad.addColorStop(0.55, hexStr + '66');
        grad.addColorStop(1.0, hexStr + '00');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
    });
}

function buildBadgeTexture(symbol, borderColor, bgColor) {
    return makeCanvasTexture(128, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.beginPath();
        g.arc(w / 2, h / 2, 52, 0, Math.PI * 2);
        g.fillStyle = bgColor;
        g.fill();
        g.lineWidth = 7;
        g.strokeStyle = borderColor;
        g.stroke();

        g.fillStyle = '#ffffff';
        g.font = 'bold 54px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(symbol, w / 2, h / 2 + 3);
    });
}

function buildSpeedPadTexture() {
    return makeCanvasTexture(128, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(0, 245, 212, 0.22)';
        g.fillRect(8, 0, w - 16, h);
        // Three bright forward chevrons
        for (let i = 0; i < 3; i++) {
            const y = 44 + i * 74;
            g.strokeStyle = i === 1 ? '#ffd166' : '#00f5d4';
            g.lineWidth = 14;
            g.lineCap = 'round';
            g.lineJoin = 'round';
            g.beginPath();
            g.moveTo(22, y + 34);
            g.lineTo(w / 2, y);
            g.lineTo(w - 22, y + 34);
            g.stroke();
        }
    });
}

function buildOilSlickTexture() {
    return makeCanvasTexture(128, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const grad = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, 58);
        grad.addColorStop(0.0, 'rgba(35, 10, 50, 0.96)');
        grad.addColorStop(0.55, 'rgba(138, 43, 226, 0.78)');
        grad.addColorStop(0.80, 'rgba(255, 158, 0, 0.72)');
        grad.addColorStop(1.0, 'rgba(255, 42, 133, 0)');
        g.fillStyle = grad;
        g.beginPath();
        g.ellipse(w / 2, h / 2, 56, 44, 0.2, 0, Math.PI * 2);
        g.fill();
    });
}

function buildHeadlightBeamTexture() {
    return makeCanvasTexture(128, 256, (g, w, h) => {
        const grad = g.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0.0, 'rgba(207, 250, 254, 0.55)');
        grad.addColorStop(0.35, 'rgba(0, 245, 212, 0.22)');
        grad.addColorStop(1.0, 'rgba(0, 245, 212, 0.0)');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(w * 0.32, h);
        g.lineTo(w * 0.68, h);
        g.lineTo(w * 0.96, 0);
        g.lineTo(w * 0.04, 0);
        g.closePath();
        g.fill();
    });
}

// ===== 3D Car & Scenery Builders =====
function createPalmTreeMesh() {
    const group = new THREE.Group();
    const trunkMat = sharedMat.palmTrunk;
    const frondMat = sharedMat.palmFrond;

    // Smoothly connected curved 5-segment palm trunk
    const segCount = 5;
    const segLen = 1.65;
    let curX = 0;
    let curY = 0;
    for (let i = 0; i < segCount; i++) {
        const lean = 0.05 + i * 0.055; // radians tilt outward
        const topX = curX + Math.sin(lean) * segLen;
        const topY = curY + Math.cos(lean) * segLen;
        const seg = new THREE.Mesh(sharedGeo.palmSeg, trunkMat);
        seg.position.set((curX + topX) * 0.5, (curY + topY) * 0.5, 0);
        seg.rotation.z = -lean;
        const taper = 1 - i * 0.11;
        seg.scale.set(taper, 1.06, taper);
        group.add(seg);
        curX = topX;
        curY = topY;
    }

    // Lush crown of 8 seamlessly arched Miami palm fronds (3 connected segments each)
    const crown = new THREE.Group();
    crown.position.set(curX, curY - 0.08, 0);
    const crownCore = new THREE.Mesh(sharedGeo.palmCrown, trunkMat);
    crown.add(crownCore);

    for (let f = 0; f < 8; f++) {
        const angle = (f / 8) * Math.PI * 2 + (f % 2) * 0.12;
        const frondPivot = new THREE.Group();
        frondPivot.rotation.y = angle;
        const lift = (f % 2 === 0) ? 0.14 : -0.05;

        // Inner arched blade
        const seg1 = new THREE.Mesh(sharedGeo.palmLeaf1, frondMat);
        seg1.position.set(0.85, 0.34 + lift, 0);
        seg1.rotation.z = 0.34;
        frondPivot.add(seg1);

        // Mid drooping blade (connected cleanly to seg1 tip)
        const seg2 = new THREE.Mesh(sharedGeo.palmLeaf2, frondMat);
        seg2.position.set(2.35, 0.36 + lift, 0);
        seg2.rotation.z = -0.26;
        frondPivot.add(seg2);

        // Outer graceful drooping tip
        const seg3 = new THREE.Mesh(sharedGeo.palmLeaf3, frondMat);
        seg3.position.set(3.55, -0.25 + lift, 0);
        seg3.rotation.z = -0.78;
        frondPivot.add(seg3);

        crown.add(frondPivot);
    }
    group.add(crown);
    return group;
}

function createHighwayArchMesh(index) {
    const group = new THREE.Group();
    const isCyan = index % 2 === 0;
    const neonMat = isCyan ? sharedMat.neonCyan : sharedMat.neonPink;
    const accentMat = isCyan ? sharedMat.neonPink : sharedMat.neonGold;
    const darkMat = sharedMat.archSteel;

    // Left & right angled Art Deco pillars
    const leftPost = new THREE.Mesh(sharedGeo.archPost, darkMat);
    leftPost.position.set(-5.7, 3.6, 0);
    leftPost.rotation.z = -0.12;
    group.add(leftPost);

    const rightPost = new THREE.Mesh(sharedGeo.archPost, darkMat);
    rightPost.position.set(5.7, 3.6, 0);
    rightPost.rotation.z = 0.12;
    group.add(rightPost);

    // Overhead span beam
    const topBeam = new THREE.Mesh(sharedGeo.archBeam, darkMat);
    topBeam.position.set(0, 7.1, 0);
    group.add(topBeam);

    // Glowing neon strips along pillars & top beam
    const leftStrip = new THREE.Mesh(sharedGeo.archPostStrip, neonMat);
    leftStrip.position.set(-5.45, 3.6, 0.24);
    leftStrip.rotation.z = -0.12;
    group.add(leftStrip);

    const rightStrip = new THREE.Mesh(sharedGeo.archPostStrip, neonMat);
    rightStrip.position.set(5.45, 3.6, 0.24);
    rightStrip.rotation.z = 0.12;
    group.add(rightStrip);

    const topStrip = new THREE.Mesh(sharedGeo.archBeamStrip, accentMat);
    topStrip.position.set(0, 6.82, 0.26);
    group.add(topStrip);

    return group;
}

function createWireframeMountainRange(side) {
    const group = new THREE.Group();
    const count = 9;
    for (let i = 0; i < count; i++) {
        const radius = 14 + (i % 3) * 6;
        const height = 16 + ((i * 11) % 18);
        const geo = new THREE.ConeGeometry(radius, height, 4);
        const fill = new THREE.Mesh(geo, sharedMat.mountainFill);
        fill.position.set(
            side * (24 + i * 16 + (i % 2) * 7),
            height * 0.5 - 1.2,
            -166 + (i % 3) * 14
        );
        fill.rotation.y = Math.PI * 0.25 + i * 0.3;
        group.add(fill);

        const edges = new THREE.EdgesGeometry(geo);
        const wire = new THREE.LineSegments(edges, side < 0 ? sharedMat.mountainWirePink : sharedMat.mountainWireCyan);
        wire.position.copy(fill.position);
        wire.rotation.copy(fill.rotation);
        wire.scale.set(1.006, 1.006, 1.006);
        group.add(wire);
    }
    return group;
}

function createMiamiSkyline() {
    const group = new THREE.Group();
    const texCyan = buildSkylineWindowTexture('#00f5d4');
    const texPink = buildSkylineWindowTexture('#ff2a85');
    const texGold = buildSkylineWindowTexture('#ffd166');
    const mats = [
        new THREE.MeshBasicMaterial({ map: texCyan, fog: true }),
        new THREE.MeshBasicMaterial({ map: texPink, fog: true }),
        new THREE.MeshBasicMaterial({ map: texGold, fog: true })
    ];

    for (let side of [-1, 1]) {
        for (let i = 0; i < 10; i++) {
            const w = 4.2 + (i % 3) * 2.2;
            const h = 10 + ((i * 17) % 24);
            const d = 4.5 + (i % 2) * 2.0;
            const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[(i + (side > 0 ? 1 : 0)) % mats.length]);
            tower.position.set(
                side * (16 + i * 5.6),
                h * 0.5 - 1.0,
                -132 - (i % 4) * 9
            );
            group.add(tower);

            // Art Deco stepped rooftop spire on every other building
            if (i % 2 === 0) {
                const cap = new THREE.Mesh(
                    new THREE.BoxGeometry(w * 0.55, 2.8, d * 0.55),
                    i % 4 === 0 ? sharedMat.neonCyan : sharedMat.neonPink
                );
                cap.position.set(tower.position.x, h + 0.4, tower.position.z);
                group.add(cap);
            }
        }
    }
    return group;
}

function buildPlayerCar(skin) {
    if (playerCarGroup) scene.remove(playerCarGroup);
    playerWheels = [];
    playerFlames = [];

    const root = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({
        color: skin.body,
        emissive: skin.body,
        emissiveIntensity: 0.14,
        specular: 0xffffff,
        shininess: 110
    });
    const trimMat = new THREE.MeshBasicMaterial({ color: skin.accent });
    const glassMat = new THREE.MeshPhongMaterial({
        color: 0x0b0724,
        emissive: 0x1e1b4b,
        emissiveIntensity: 0.45,
        specular: 0x00f5d4,
        shininess: 140
    });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x111020, shininess: 40 });
    const tailMat = new THREE.MeshBasicMaterial({ color: skin.tail });

    // Lower wide 80s wedge chassis
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.44, 3.85), bodyMat);
    lower.position.set(0, 0.46, 0);
    root.add(lower);

    // Sloped wedge nose hood
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.28, 1.5), bodyMat);
    nose.position.set(0, 0.64, -1.02);
    nose.rotation.x = 0.17;
    root.add(nose);

    // Cabin / cockpit
    if (skin.style === 'spyder') {
        // Open-top convertible cockpit + sleek windshield frame
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.36, 0.16), glassMat);
        windshield.position.set(0, 0.90, -0.45);
        windshield.rotation.x = -0.55;
        root.add(windshield);
        const seats = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.34, 0.95), darkMat);
        seats.position.set(0, 0.78, 0.25);
        root.add(seats);
    } else {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.44, 1.55), glassMat);
        cabin.position.set(0, 0.88, 0.05);
        root.add(cabin);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 1.0), bodyMat);
        roof.position.set(0, 1.11, 0.12);
        root.add(roof);
    }

    // Rear slatted 80s louvers
    for (let i = 0; i < 4; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.06, 0.16), darkMat);
        slat.position.set(0, 0.88 - i * 0.055, 0.92 + i * 0.22);
        root.add(slat);
    }

    // Side neon accent strips (Testarossa strakes)
    for (const side of [-1, 1]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 3.25), trimMat);
        stripe.position.set(side * 0.94, 0.48, 0.08);
        root.add(stripe);
    }

    // Iconic wide 80s rear spoiler wing
    const wingY = skin.style === 'countach' ? 1.18 : 1.05;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.09, 0.42), bodyMat);
    wing.position.set(0, wingY, 1.66);
    root.add(wing);
    const wingLip = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.05, 0.08), trimMat);
    wingLip.position.set(0, wingY + 0.05, 1.84);
    root.add(wingLip);
    for (const side of [-0.74, 0.74]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.26), darkMat);
        strut.position.set(side, 0.85, 1.66);
        root.add(strut);
    }
    if (skin.style === 'flux') {
        // DeLorean twin glowing rear flux vents
        for (const side of [-0.42, 0.42]) {
            const flux = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.56), trimMat);
            flux.position.set(side, 0.86, 1.68);
            root.add(flux);
        }
    }

    // Full-width 80s glowing LED taillight bar
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.16, 0.08), tailMat);
    tailBar.position.set(0, 0.52, 1.94);
    root.add(tailBar);

    // Pop-up headlights + soft tapered forward glow cones
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff8d6 });
    const beamMat = sharedMat.headlightBeam;
    for (const side of [-0.62, 0.62]) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.08), headMat);
        light.position.set(side, 0.56, -1.94);
        root.add(light);

        const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 9.5), beamMat);
        beam.rotation.x = -Math.PI / 2;
        beam.position.set(side * 0.85, 0.045, -6.55);
        root.add(beam);
    }

    // Twin exhaust nozzles + animated afterburner flames
    const flameMat = new THREE.MeshBasicMaterial({
        color: skin.trail,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    for (const side of [-0.46, 0.46]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8), darkMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(side, 0.30, 1.96);
        root.add(pipe);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.95, 8), flameMat);
        flame.rotation.x = Math.PI / 2;
        flame.position.set(side, 0.30, 2.48);
        root.add(flame);
        playerFlames.push(flame);
    }

    // 4 rotating wheels with neon rims
    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.30, 8);
    rimGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshPhongMaterial({ color: 0x161622, shininess: 20 });
    const wheelCoords = [
        [-0.96, 0.34, -1.18], [0.96, 0.34, -1.18],
        [-0.96, 0.34,  1.18], [0.96, 0.34,  1.18]
    ];
    wheelCoords.forEach(([wx, wy, wz]) => {
        const wg = new THREE.Group();
        wg.position.set(wx, wy, wz);
        wg.add(new THREE.Mesh(tireGeo, tireMat));
        wg.add(new THREE.Mesh(rimGeo, trimMat));
        root.add(wg);
        playerWheels.push(wg);
    });

    // Underglow pool beneath car
    const glowHex = '#' + skin.underglow.toString(16).padStart(6, '0');
    const underglowMat = new THREE.MeshBasicMaterial({
        map: buildUnderglowTexture(glowHex),
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    playerUnderglow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.4), underglowMat);
    playerUnderglow.rotation.x = -Math.PI / 2;
    playerUnderglow.position.set(0, 0.035, 0.1);
    root.add(playerUnderglow);

    // Dual neon tire light trails
    const trailMat = new THREE.MeshBasicMaterial({
        color: skin.trail,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    playerTrailLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 5.5), trailMat);
    playerTrailLeft.rotation.x = -Math.PI / 2;
    playerTrailLeft.position.set(-0.76, 0.04, 4.5);
    root.add(playerTrailLeft);

    playerTrailRight = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 5.5), trailMat);
    playerTrailRight.rotation.x = -Math.PI / 2;
    playerTrailRight.position.set(0.76, 0.04, 4.5);
    root.add(playerTrailRight);

    // Neon Shield energy bubble (shown when shieldActive)
    const shieldGroup = new THREE.Group();
    const shieldWire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(2.35, 1),
        new THREE.MeshBasicMaterial({
            color: 0x00f5d4,
            wireframe: true,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending
        })
    );
    const shieldShell = new THREE.Mesh(
        new THREE.SphereGeometry(2.26, 18, 12),
        new THREE.MeshBasicMaterial({
            color: 0x00f5d4,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    shieldGroup.add(shieldWire);
    shieldGroup.add(shieldShell);
    shieldGroup.position.set(0, 0.78, 0);
    shieldGroup.scale.set(0.95, 0.62, 1.18);
    shieldGroup.visible = shieldActive;
    root.add(shieldGroup);
    playerShieldMesh = shieldGroup;

    // Coin Magnet neon aura ring (shown when magnetTimer > 0)
    playerMagnetRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.07, 8, 32),
        new THREE.MeshBasicMaterial({
            color: 0xff2a85,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending
        })
    );
    playerMagnetRing.rotation.x = Math.PI / 2;
    playerMagnetRing.position.set(0, 0.24, 0);
    playerMagnetRing.visible = magnetTimer > 0;
    root.add(playerMagnetRing);

    root.position.set(player.x, 0, PLAYER_Z);
    scene.add(root);
    playerCarGroup = root;
}

function createEnemyMesh(type, colorHex) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.16,
        shininess: 90
    });

    if (type === 'van') {
        const body = new THREE.Mesh(sharedGeo.vanBody, bodyMat);
        body.position.set(0, 0.92, 0);
        group.add(body);
        const stripe = new THREE.Mesh(sharedGeo.vanStripe, sharedMat.neonGold);
        stripe.position.set(0, 0.74, 0);
        group.add(stripe);
        const windshield = new THREE.Mesh(sharedGeo.vanGlass, sharedMat.enemyGlass);
        windshield.position.set(0, 1.18, 0.05);
        group.add(windshield);
        const tail = new THREE.Mesh(sharedGeo.enemyTail, sharedMat.tailRed);
        tail.position.set(0, 0.56, 2.02);
        group.add(tail);
    } else {
        const lower = new THREE.Mesh(sharedGeo.enemyBody, bodyMat);
        lower.position.set(0, 0.48, 0);
        group.add(lower);
        const cabin = new THREE.Mesh(sharedGeo.enemyCabin, sharedMat.enemyGlass);
        cabin.position.set(0, 0.92, 0.06);
        group.add(cabin);
        const tail = new THREE.Mesh(sharedGeo.enemyTail, type === 'swapper' ? sharedMat.neonGold : sharedMat.tailRed);
        tail.position.set(0, 0.54, 1.84);
        group.add(tail);
        if (type === 'swapper') {
            // Telegraphing side turn-signal pods + floating warning arrow sprite
            const leftBlinker = new THREE.Mesh(sharedGeo.blinker, sharedMat.blinkerMat.clone());
            leftBlinker.position.set(-0.95, 0.58, 1.55);
            leftBlinker.visible = false;
            group.add(leftBlinker);

            const rightBlinker = new THREE.Mesh(sharedGeo.blinker, sharedMat.blinkerMat.clone());
            rightBlinker.position.set(0.95, 0.58, 1.55);
            rightBlinker.visible = false;
            group.add(rightBlinker);

            const warnSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: spriteTextures.warnLeft,
                transparent: true,
                depthWrite: false
            }));
            warnSprite.position.set(0, 2.35, 0);
            warnSprite.scale.set(1.5, 1.5, 1);
            warnSprite.visible = false;
            group.add(warnSprite);

            group.userData = { leftBlinker, rightBlinker, warnSprite };
        }
    }

    // Simple dark tires
    const wheelOffsets = [[-0.92, 0.30, -1.12], [0.92, 0.30, -1.12], [-0.92, 0.30, 1.12], [0.92, 0.30, 1.12]];
    wheelOffsets.forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(sharedGeo.enemyWheel, sharedMat.tireDark);
        w.position.set(wx, wy, wz);
        group.add(w);
    });

    return group;
}

function createCoinMesh() {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(sharedGeo.coinDisc, sharedMat.coinGold);
    const rim = new THREE.Mesh(sharedGeo.coinRim, sharedMat.neonGold);
    group.add(disc);
    group.add(rim);
    return group;
}

function createPowerUpMesh(type) {
    const group = new THREE.Group();
    const palette = {
        speed:  { color: 0xffd166, tex: spriteTextures.puSpeed },
        slow:   { color: 0x38bdf8, tex: spriteTextures.puSlow },
        shield: { color: 0x00f5d4, tex: spriteTextures.puShield },
        magnet: { color: 0xff2a85, tex: spriteTextures.puMagnet }
    }[type];

    const core = new THREE.Mesh(
        sharedGeo.puCore,
        new THREE.MeshPhongMaterial({
            color: palette.color,
            emissive: palette.color,
            emissiveIntensity: 0.65,
            shininess: 120
        })
    );
    const ring = new THREE.Mesh(
        sharedGeo.puRing,
        new THREE.MeshBasicMaterial({ color: palette.color, transparent: true, opacity: 0.85 })
    );
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({
        map: palette.tex,
        transparent: true,
        depthWrite: false
    }));
    badge.position.set(0, 1.35, 0);
    badge.scale.set(1.35, 1.35, 1);

    group.add(core);
    group.add(ring);
    group.add(badge);
    group.userData = { core, ring };
    return group;
}

function init3D() {
    if (typeof window.THREE === 'undefined') {
        initFallback2D();
        return;
    }
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (_) {
        initFallback2D();
        return;
    }

    useWebGL = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(MIAMI_ZONES[0].bg);
    scene.fog = new THREE.FogExp2(MIAMI_ZONES[0].fog, 0.0085);

    camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.2, 260);
    camera.position.set(0, 3.3, 10.6);

    // Rich 80s Sunset & Miami Neon Lighting
    const hemi = new THREE.HemisphereLight(0xff8fab, 0x1e1142, 1.05);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xffb703, 1.25);
    sunLight.position.set(0, 22, -65);
    scene.add(sunLight);

    const cyanRim = new THREE.DirectionalLight(0x00f5d4, 0.72);
    cyanRim.position.set(-14, 10, 12);
    scene.add(cyanRim);

    const pinkRim = new THREE.DirectionalLight(0xff2a85, 0.65);
    pinkRim.position.set(14, 8, 12);
    scene.add(pinkRim);

    // Shared geometries & materials
    sharedGeo.palmSeg = new THREE.CylinderGeometry(0.18, 0.24, 1.72, 7);
    sharedGeo.palmCrown = new THREE.SphereGeometry(0.32, 7, 6);
    sharedGeo.palmLeaf1 = new THREE.BoxGeometry(1.75, 0.08, 0.68);
    sharedGeo.palmLeaf2 = new THREE.BoxGeometry(1.65, 0.06, 0.54);
    sharedGeo.palmLeaf3 = new THREE.BoxGeometry(1.35, 0.04, 0.34);
    sharedGeo.archPost = new THREE.BoxGeometry(0.45, 7.6, 0.45);
    sharedGeo.archBeam = new THREE.BoxGeometry(11.6, 0.55, 0.52);
    sharedGeo.archPostStrip = new THREE.BoxGeometry(0.14, 7.2, 0.12);
    sharedGeo.archBeamStrip = new THREE.BoxGeometry(10.8, 0.16, 0.14);
    sharedGeo.pylon = new THREE.BoxGeometry(0.16, 1.15, 0.16);
    sharedGeo.enemyBody = new THREE.BoxGeometry(1.78, 0.52, 3.6);
    sharedGeo.enemyCabin = new THREE.BoxGeometry(1.42, 0.46, 1.7);
    sharedGeo.enemyTail = new THREE.BoxGeometry(1.62, 0.18, 0.08);
    sharedGeo.vanBody = new THREE.BoxGeometry(1.88, 1.24, 3.96);
    sharedGeo.vanStripe = new THREE.BoxGeometry(1.92, 0.14, 3.8);
    sharedGeo.vanGlass = new THREE.BoxGeometry(1.78, 0.42, 1.4);
    sharedGeo.enemyWheel = new THREE.CylinderGeometry(0.30, 0.30, 0.24, 10);
    sharedGeo.enemyWheel.rotateZ(Math.PI / 2);
    sharedGeo.blinker = new THREE.SphereGeometry(0.16, 8, 8);
    sharedGeo.coinDisc = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16);
    sharedGeo.coinDisc.rotateX(Math.PI / 2);
    sharedGeo.coinRim = new THREE.TorusGeometry(0.56, 0.07, 8, 18);
    sharedGeo.puCore = new THREE.OctahedronGeometry(0.58, 0);
    sharedGeo.puRing = new THREE.TorusGeometry(0.82, 0.06, 8, 20);
    sharedGeo.spark = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    sharedGeo.speedPad = new THREE.PlaneGeometry(2.4, 5.2);
    sharedGeo.oilSlick = new THREE.PlaneGeometry(2.5, 3.4);
    sharedGeo.speedline = new THREE.BoxGeometry(0.05, 0.05, 5.5);

    sharedMat.palmTrunk = new THREE.MeshPhongMaterial({ color: 0x261233, emissive: 0x160624, shininess: 10 });
    sharedMat.palmFrond = new THREE.MeshPhongMaterial({ color: 0x102838, emissive: 0x1f0a3a, specular: 0xff2a85, shininess: 32 });
    sharedMat.archSteel = new THREE.MeshPhongMaterial({ color: 0x170c2e, shininess: 40 });
    sharedMat.neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    sharedMat.neonPink = new THREE.MeshBasicMaterial({ color: 0xff2a85 });
    sharedMat.neonGold = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    sharedMat.mountainFill = new THREE.MeshBasicMaterial({ color: 0x14062b, fog: false });
    sharedMat.mountainWirePink = new THREE.LineBasicMaterial({ color: 0xff2a85, fog: false });
    sharedMat.mountainWireCyan = new THREE.LineBasicMaterial({ color: 0x00f5d4, fog: false });
    sharedMat.enemyGlass = new THREE.MeshPhongMaterial({ color: 0x0b0a1c, emissive: 0x1e1b4b, emissiveIntensity: 0.35, shininess: 100 });
    sharedMat.tailRed = new THREE.MeshBasicMaterial({ color: 0xff1e42 });
    sharedMat.tireDark = new THREE.MeshBasicMaterial({ color: 0x14141f });
    sharedMat.blinkerMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    sharedMat.coinGold = new THREE.MeshPhongMaterial({ color: 0xffd166, emissive: 0xff9e00, emissiveIntensity: 0.55, shininess: 130 });
    sharedMat.headlightBeam = new THREE.MeshBasicMaterial({
        map: buildHeadlightBeamTexture(),
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    sharedMat.speedPad = new THREE.MeshBasicMaterial({
        map: buildSpeedPadTexture(),
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    sharedMat.oilSlick = new THREE.MeshBasicMaterial({
        map: buildOilSlickTexture(),
        transparent: true,
        opacity: 0.9,
        depthWrite: false
    });

    spriteTextures.puSpeed  = buildBadgeTexture('⚡', '#ffd166', 'rgba(30, 14, 0, 0.85)');
    spriteTextures.puSlow   = buildBadgeTexture('🐢', '#38bdf8', 'rgba(5, 22, 42, 0.85)');
    spriteTextures.puShield = buildBadgeTexture('🛡️', '#00f5d4', 'rgba(4, 34, 34, 0.85)');
    spriteTextures.puMagnet = buildBadgeTexture('🧲', '#ff2a85', 'rgba(40, 6, 30, 0.85)');
    spriteTextures.warnLeft  = buildBadgeTexture('◀', '#ffd166', 'rgba(45, 18, 0, 0.9)');
    spriteTextures.warnRight = buildBadgeTexture('▶', '#ffd166', 'rgba(45, 18, 0, 0.9)');

    // 1. Twilight Synthwave Sky Backdrop Plane
    const skyTex = buildSkyTexture();
    const skyPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 170),
        new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false })
    );
    skyPlane.position.set(0, 52, -205);
    scene.add(skyPlane);

    // 2. Giant Striped Synthwave Sun + Warm Glow Halo
    const sunHaloTex = buildSunHaloTexture();
    sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sunHaloTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        fog: false,
        depthWrite: false
    }));
    sunHalo.scale.set(92, 92, 1);
    sunHalo.position.set(0, MIAMI_ZONES[0].sunY, -192);
    scene.add(sunHalo);

    const sunTex = buildSunTexture();
    sunMesh = new THREE.Mesh(
        new THREE.CircleGeometry(23.5, 48),
        new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false })
    );
    sunMesh.position.set(0, MIAMI_ZONES[0].sunY, -188);
    scene.add(sunMesh);

    // 3. OutRun Wireframe Mountains + Miami Art Deco Skyline
    scene.add(createWireframeMountainRange(-1));
    scene.add(createWireframeMountainRange(1));
    skylineGroup = createMiamiSkyline();
    scene.add(skylineGroup);

    // 4. Flanking Synthwave Perspective Grid (Left) + Shimmering Biscayne Bay Ocean (Right)
    gridTex = buildSynthGridTexture();
    const leftGrid = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 260),
        new THREE.MeshBasicMaterial({ map: gridTex })
    );
    leftGrid.rotation.x = -Math.PI / 2;
    leftGrid.position.set(-95.5, -0.35, -90);
    scene.add(leftGrid);

    waterTex = buildWaterTexture();
    const rightBay = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 260),
        new THREE.MeshBasicMaterial({ map: waterTex })
    );
    rightBay.rotation.x = -Math.PI / 2;
    rightBay.position.set(95.5, -0.35, -90);
    scene.add(rightBay);

    // Overlay thin cyan grid shimmer on right bay too for cohesive synthwave horizon
    const rightGridOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 260),
        new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending })
    );
    rightGridOverlay.rotation.x = -Math.PI / 2;
    rightGridOverlay.position.set(95.5, -0.31, -90);
    scene.add(rightGridOverlay);

    // 5. 3-Lane Reflective Wet Asphalt Causeway + Neon Guardrails
    roadTex = buildRoadTexture();
    const roadMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, 240),
        new THREE.MeshPhongMaterial({ map: roadTex, specular: 0x3b1c5a, shininess: 35 })
    );
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -90);
    scene.add(roadMesh);

    // Raised curb borders & continuous neon guardrail tubes
    const curbGeo = new THREE.BoxGeometry(0.45, 0.36, 240);
    const railGeo = new THREE.BoxGeometry(0.14, 0.14, 240);
    for (const side of [-1, 1]) {
        const curb = new THREE.Mesh(curbGeo, sharedMat.archSteel);
        curb.position.set(side * (ROAD_WIDTH / 2 + 0.28), 0.18, -90);
        scene.add(curb);

        const rail = new THREE.Mesh(railGeo, side < 0 ? sharedMat.neonCyan : sharedMat.neonPink);
        rail.position.set(side * (ROAD_WIDTH / 2 + 0.28), 0.72, -90);
        scene.add(rail);
    }

    // 6. Pooled Roadside Neon Light Pylons
    pylonPool = [];
    for (let i = 0; i < 24; i++) {
        const z = 14 - i * 8.2;
        for (const side of [-1, 1]) {
            const p = new THREE.Mesh(sharedGeo.pylon, (i % 2 === 0) ? sharedMat.neonCyan : sharedMat.neonPink);
            p.position.set(side * (ROAD_WIDTH / 2 + 0.28), 0.56, z);
            scene.add(p);
            pylonPool.push(p);
        }
    }

    // 7. Pooled 3D Miami Palm Trees lining both sides of the causeway
    palmPool = [];
    for (let i = 0; i < 16; i++) {
        const z = 12 - i * 12.2;
        for (const side of [-1, 1]) {
            const palm = createPalmTreeMesh();
            const scale = 0.88 + ((i * 7 + (side > 0 ? 3 : 0)) % 5) * 0.08;
            palm.scale.set(side * scale, scale, scale);
            palm.position.set(side * (7.1 + (i % 2) * 1.1), -0.15, z - (side > 0 ? 5.5 : 0));
            palm.rotation.y = (i * 0.9) % (Math.PI * 2);
            scene.add(palm);
            palmPool.push(palm);
        }
    }

    // 8. Pooled Overhead Neon Highway Arches
    archPool = [];
    for (let i = 0; i < 5; i++) {
        const arch = createHighwayArchMesh(i);
        arch.position.set(0, 0, -18 - i * 38);
        scene.add(arch);
        archPool.push(arch);
    }

    // 9. Peripheral Speedlines (visible during fast driving & Turbo)
    speedlinePool = [];
    const slMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.45 });
    const slMatPink = new THREE.MeshBasicMaterial({ color: 0xff2a85, transparent: true, opacity: 0.45 });
    for (let i = 0; i < 28; i++) {
        const sl = new THREE.Mesh(sharedGeo.speedline, i % 2 === 0 ? slMatCyan : slMatPink);
        const side = i % 2 === 0 ? -1 : 1;
        sl.position.set(side * (6.2 + Math.random() * 8), 1.0 + Math.random() * 6.5, -Math.random() * 110);
        sl.visible = false;
        scene.add(sl);
        speedlinePool.push(sl);
    }

    // 10. Player Supercar
    buildPlayerCar(getEquippedSkin());

    handleResize();
}

function initFallback2D() {
    useWebGL = false;
    fallbackCtx = canvas.getContext('2d');
    handleResize();
}

let lastViewportW = 0;
let lastViewportH = 0;
function handleResize() {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame') || document.body;
    const w = Math.max(240, Math.floor(frame.clientWidth || window.innerWidth || 800));
    const h = Math.max(240, Math.floor(frame.clientHeight || window.innerHeight || 600));
    if (w === lastViewportW && h === lastViewportH) return;
    lastViewportW = w;
    lastViewportH = h;
    if (useWebGL && renderer && camera) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    } else if (fallbackCtx) {
        canvas.width = w;
        canvas.height = h;
    }
}

// ===== Floating Callouts & Screen Flash =====
function showCallout(text, color = '#00f5d4') {
    if (!calloutStackEl) return;
    const item = document.createElement('div');
    item.className = 'callout-item';
    item.style.color = color;
    item.textContent = text;
    calloutStackEl.appendChild(item);
    while (calloutStackEl.children.length > 3) {
        calloutStackEl.removeChild(calloutStackEl.firstChild);
    }
    window.setTimeout(() => {
        if (item.parentNode) item.parentNode.removeChild(item);
    }, 1060);
}

let flashTimeout = null;
function triggerFlash(kind) {
    if (!flashEl) return;
    flashEl.className = 'damage-flash ' + kind;
    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = window.setTimeout(() => {
        flashEl.className = 'damage-flash';
    }, 240);
}

// ===== 3D Particle Bursts =====
function spawnBurst(x, y, z, colorHex, count = 12, spread = 0.25) {
    if (!useWebGL) return;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });
    for (let i = 0; i < count; i++) {
        if (burstParticles.length >= 90) {
            const oldest = burstParticles.shift();
            scene.remove(oldest.mesh);
        }
        const mesh = new THREE.Mesh(sharedGeo.spark, mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        burstParticles.push({
            mesh,
            vx: (Math.random() - 0.5) * spread * 2,
            vy: Math.random() * spread * 1.4 + 0.04,
            vz: (Math.random() - 0.5) * spread * 2,
            life: 24 + Math.floor(Math.random() * 14),
            maxLife: 38
        });
    }
}

// ===== HUD Sync (only writes DOM when values change) =====
const hudCache = { dist: '', speed: '', zone: '', coins: '', best: '', combo: '' };
function updateHudDOM() {
    const dStr = Math.floor(distance) + 'm';
    if (hudCache.dist !== dStr && hudDistEl) {
        hudCache.dist = dStr;
        hudDistEl.textContent = dStr;
    }

    const effSpeed = getEffectiveSpeed();
    const mph = Math.round(78 + effSpeed * 18.5);
    if (mph > topMph) topMph = mph;
    const sStr = String(mph);
    if (hudCache.speed !== sStr && hudSpeedEl) {
        hudCache.speed = sStr;
        hudSpeedEl.innerHTML = `${mph} <small>MPH</small>`;
    }

    const zName = MIAMI_ZONES[currentZoneIdx].name;
    if (hudCache.zone !== zName && hudZoneEl) {
        hudCache.zone = zName;
        hudZoneEl.textContent = zName;
    }

    const cStr = String(coins);
    if (hudCache.coins !== cStr && hudCoinsEl) {
        hudCache.coins = cStr;
        hudCoinsEl.textContent = cStr;
    }

    const bestVal = Math.max(highScore, Math.floor(distance));
    const bStr = bestVal + 'm';
    if (hudCache.best !== bStr && hudBestEl) {
        hudCache.best = bStr;
        hudBestEl.textContent = bStr;
    }

    // Combo badge
    if (hudComboWrap) {
        if (combo > 1 && comboTimer > 0) {
            hudComboWrap.classList.remove('hidden');
            const cm = 'x' + combo;
            if (hudCache.combo !== cm) {
                hudCache.combo = cm;
                hudComboMult.textContent = cm;
            }
            hudComboFill.style.width = Math.max(0, Math.min(100, (comboTimer / 4.2) * 100)).toFixed(1) + '%';
        } else {
            hudComboWrap.classList.add('hidden');
        }
    }

    // Active Buff Bars
    if (buffShieldEl) {
        buffShieldEl.classList.toggle('hidden', !shieldActive);
        if (shieldActive) buffShieldFill.style.width = '100%';
    }
    if (buffMagnetEl) {
        buffMagnetEl.classList.toggle('hidden', magnetTimer <= 0);
        if (magnetTimer > 0) buffMagnetFill.style.width = Math.min(100, (magnetTimer / magnetMaxTime) * 100).toFixed(1) + '%';
    }
    if (buffTurboEl) {
        buffTurboEl.classList.toggle('hidden', turboTimer <= 0);
        if (turboTimer > 0) buffTurboFill.style.width = Math.min(100, (turboTimer / turboMaxTime) * 100).toFixed(1) + '%';
    }
    if (buffSlowEl) {
        buffSlowEl.classList.toggle('hidden', slowTimer <= 0);
        if (slowTimer > 0) buffSlowFill.style.width = Math.min(100, (slowTimer / slowMaxTime) * 100).toFixed(1) + '%';
    }
}

function refreshOverlayStats() {
    const bestText = highScore + 'm';
    const bankText = '🪙 ' + garageState.bank;
    const skin = getEquippedSkin();
    const elStartBest = document.getElementById('start-best-score');
    const elStartBank = document.getElementById('start-coin-bank');
    const elStartCar = document.getElementById('start-active-car');
    const elOverBank = document.getElementById('gameover-coin-bank');
    const elGarageBank = document.getElementById('garage-coin-bank');
    if (elStartBest) elStartBest.textContent = bestText;
    if (elStartBank) elStartBank.textContent = bankText;
    if (elStartCar) elStartCar.textContent = skin.name;
    if (elOverBank) elOverBank.textContent = bankText;
    if (elGarageBank) elGarageBank.textContent = bankText;
    if (highScoreShim) highScoreShim.textContent = bestText;
}

// ===== Miami Coin Garage UI =====
function renderGarage() {
    refreshOverlayStats();
    const carsGrid = document.getElementById('garage-cars-grid');
    const perksGrid = document.getElementById('garage-perks-grid');
    if (!carsGrid || !perksGrid) return;

    carsGrid.innerHTML = '';
    CAR_SKINS.forEach(car => {
        const owned = garageState.ownedCars.includes(car.id);
        const equipped = garageState.equippedCar === car.id;
        const canAfford = garageState.bank >= car.cost;

        const card = document.createElement('div');
        card.className = 'garage-item' + (equipped ? ' equipped' : '');
        card.innerHTML = `
            <div class="garage-swatch-row">
                <h3>${car.name}</h3>
                <span class="car-swatch" style="background:${car.swatch}"></span>
            </div>
            <p>${car.tagline}</p>
        `;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'garage-action-btn' + (equipped ? ' active' : owned ? ' owned' : '');
        if (equipped) {
            btn.textContent = '★ EQUIPPED';
        } else if (owned) {
            btn.textContent = 'SELECT RIDE';
        } else {
            btn.textContent = `🪙 UNLOCK (${car.cost})`;
            btn.disabled = !canAfford;
        }
        btn.addEventListener('click', () => {
            if (owned) {
                garageState.equippedCar = car.id;
                saveGarage();
                playSfx('steer');
                if (useWebGL) buildPlayerCar(getEquippedSkin());
                renderGarage();
            } else if (garageState.bank >= car.cost) {
                garageState.bank -= car.cost;
                garageState.ownedCars.push(car.id);
                garageState.equippedCar = car.id;
                saveGarage();
                playSfx('buy');
                if (useWebGL) buildPlayerCar(getEquippedSkin());
                renderGarage();
            }
        });
        card.appendChild(btn);
        carsGrid.appendChild(card);
    });

    perksGrid.innerHTML = '';
    GARAGE_PERKS.forEach(perk => {
        const owned = !!garageState.perks[perk.id];
        const canAfford = garageState.bank >= perk.cost;
        const card = document.createElement('div');
        card.className = 'garage-item' + (owned ? ' equipped' : '');
        card.innerHTML = `<h3>${perk.name}</h3><p>${perk.desc}</p>`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'garage-action-btn' + (owned ? ' active' : '');
        if (owned) {
            btn.textContent = '✓ INSTALLED';
            btn.disabled = true;
        } else {
            btn.textContent = `🪙 INSTALL (${perk.cost})`;
            btn.disabled = !canAfford;
            btn.addEventListener('click', () => {
                if (garageState.bank >= perk.cost) {
                    garageState.bank -= perk.cost;
                    garageState.perks[perk.id] = true;
                    saveGarage();
                    playSfx('buy');
                    renderGarage();
                }
            });
        }
        card.appendChild(btn);
        perksGrid.appendChild(card);
    });
}

function openGarage(returnTo) {
    garageReturnTo = returnTo;
    startScreenEl.classList.add('hidden');
    gameOverScreenEl.classList.add('hidden');
    garageScreenEl.classList.remove('hidden');
    renderGarage();
}
function closeGarage() {
    garageScreenEl.classList.add('hidden');
    refreshOverlayStats();
    if (garageReturnTo === 'gameOver') gameOverScreenEl.classList.remove('hidden');
    else startScreenEl.classList.remove('hidden');
}

// ===== Speed & Steering Helpers =====
function getEffectiveSpeed() {
    const extMult = (typeof window.speedMultiplier === 'number' && window.speedMultiplier > 0) ? window.speedMultiplier : 1;
    let s = Math.max(2.0, Math.min(9.5, speed + manualSpeedOffset));
    if (turboTimer > 0) s *= 1.38;
    if (slowTimer > 0) s *= 0.64;
    if (oilWobbleTimer > 0) s *= 0.78;
    return s * extMult;
}

function steerLane(dir) {
    if (gameState !== 'playing') return;
    if (dir < 0 && player.lane > 0) {
        player.lane--;
    } else if (dir > 0 && player.lane < laneCount - 1) {
        player.lane++;
    } else {
        return;
    }
    player.targetX = laneToWorldX(player.lane);
    playSfx('steer');
}

function cycleCamera() {
    cameraMode = (cameraMode + 1) % CAMERA_MODES.length;
    const label = CAMERA_MODES[cameraMode];
    if (pauseCamBtn) pauseCamBtn.textContent = '🎥 Cam: ' + label;
    if (gameState === 'playing') showCallout('CAM: ' + label.toUpperCase(), '#00f5d4');
}

// ===== Input Handling (Keyboard + Touch + Mobile Pedals + Gyro Tilt with Calibration) =====
const keys = {};
let raceTouchSX = 0;
let steeringTouch = null;
let steeringDragged = false;
let tiltEnabled = false;
let tiltZeroGamma = 0;
let latestGamma = 0;
let gasHeld = false;
let brakeHeld = false;

document.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Space', 'KeyP', 'Escape', 'KeyM', 'KeyC'].includes(e.code)) return;
    keys[e.code] = true;

    if (e.code === 'Space') {
        if (!garageScreenEl.classList.contains('hidden')) {
            closeGarage();
        } else if (gameState === 'start') {
            startGame();
        } else if (gameState === 'gameOver') {
            restartGame();
        }
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (!garageScreenEl.classList.contains('hidden')) closeGarage();
        else if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
    }
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyC') cycleCamera();

    if (gameState === 'playing') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') steerLane(-1);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') steerLane(1);
        if (e.code === 'ArrowUp' || e.code === 'KeyW') manualSpeedOffset = Math.min(manualSpeedOffset + 0.5, 3.0);
        if (e.code === 'ArrowDown' || e.code === 'KeyS') manualSpeedOffset = Math.max(manualSpeedOffset - 0.5, -2.0);
    }

    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});

document.addEventListener('keyup', (e) => { keys[e.code] = false; });

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (steeringTouch !== null) return;
    initAudio();
    const touch = e.changedTouches[0];
    steeringTouch = touch.identifier;
    steeringDragged = gameState !== 'playing';
    const rect = canvas.getBoundingClientRect();
    raceTouchSX = touch.clientX - rect.left;

    if (gameState === 'start' && garageScreenEl.classList.contains('hidden')) startGame();
    else if (gameState === 'gameOver' && garageScreenEl.classList.contains('hidden')) restartGame();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const touch = Array.from(e.changedTouches).find(contact => contact.identifier === steeringTouch);
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const dx = x - raceTouchSX;
    const laneCss = rect.width / laneCount;
    if (Math.abs(dx) > laneCss * 0.35) {
        steeringDragged = true;
        steerLane(dx > 0 ? 1 : -1);
        raceTouchSX = x;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(contact => contact.identifier === steeringTouch);
    if (!touch) return;
    steeringTouch = null;
    if (gameState !== 'playing' || steeringDragged) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    if (Math.abs(x - raceTouchSX) < 12) steerLane(x < rect.width / 2 ? -1 : 1);
}, { passive: false });

canvas.addEventListener('touchcancel', (e) => {
    if (Array.from(e.changedTouches).some(contact => contact.identifier === steeringTouch)) {
        steeringTouch = null;
    }
});

// Mobile buttons & Gyro Tilt with Calibration
(function installTouchControls() {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!frame) return;
    frame.addEventListener('touchmove', (ev) => { if (gameState === 'playing') ev.preventDefault(); }, { passive: false });

    const wrap = document.createElement('div');
    wrap.className = 'neon-racer-btns';

    const steer = document.createElement('div');
    steer.className = 'steer';
    const bl = document.createElement('button'); bl.type = 'button'; bl.textContent = '◀'; bl.setAttribute('aria-label', 'Steer left');
    const br = document.createElement('button'); br.type = 'button'; br.textContent = '▶'; br.setAttribute('aria-label', 'Steer right');

    const pedals = document.createElement('div');
    pedals.className = 'pedals';
    const brake = document.createElement('button'); brake.type = 'button'; brake.textContent = '▼'; brake.className = 'brake'; brake.setAttribute('aria-label', 'Brake');
    const gas = document.createElement('button'); gas.type = 'button'; gas.textContent = '▲ GAS'; gas.className = 'gas'; gas.setAttribute('aria-label', 'Accelerate');

    const tapSteer = (btn, dir) => {
        btn.addEventListener('touchstart', (ev) => {
            ev.preventDefault(); ev.stopPropagation(); initAudio();
            if (gameState === 'playing') steerLane(dir);
            else if (gameState === 'start') startGame();
            else if (gameState === 'gameOver') restartGame();
        }, { passive: false });
        btn.addEventListener('mousedown', (ev) => { ev.stopPropagation(); if (gameState === 'playing') steerLane(dir); });
    };
    tapSteer(bl, -1);
    tapSteer(br, 1);

    const hold = (btn, set) => {
        btn.addEventListener('touchstart', (ev) => { ev.preventDefault(); ev.stopPropagation(); initAudio(); set(true); }, { passive: false });
        const off = (ev) => { ev.preventDefault(); set(false); };
        btn.addEventListener('touchend', off, { passive: false });
        btn.addEventListener('touchcancel', off, { passive: false });
        btn.addEventListener('mousedown', () => set(true));
        btn.addEventListener('mouseup', () => set(false));
        btn.addEventListener('mouseleave', () => set(false));
    };
    hold(gas, (v) => { gasHeld = v; });
    hold(brake, (v) => { brakeHeld = v; });

    steer.appendChild(bl);
    steer.appendChild(br);
    pedals.appendChild(brake);
    pedals.appendChild(gas);
    wrap.appendChild(steer);
    wrap.appendChild(pedals);
    frame.appendChild(wrap);

    // Tilt dock + ZERO calibrate button
    const tiltDock = document.createElement('div');
    tiltDock.className = 'tilt-dock';
    const tiltBtn = document.createElement('button');
    tiltBtn.type = 'button';
    tiltBtn.id = 'neon-racer-tilt';
    tiltBtn.textContent = 'TILT: OFF';
    const zeroBtn = document.createElement('button');
    zeroBtn.type = 'button';
    zeroBtn.id = 'neon-racer-tilt-zero';
    zeroBtn.textContent = 'ZERO';
    zeroBtn.className = 'hidden';

    const setTilt = (v) => {
        tiltEnabled = v;
        if (v) tiltZeroGamma = latestGamma;
        tiltBtn.textContent = v ? 'TILT: ON' : 'TILT: OFF';
        tiltBtn.classList.toggle('on', v);
        zeroBtn.classList.toggle('hidden', !v);
    };
    const handleTiltToggle = async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        try {
            if (!tiltEnabled && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                const res = await DeviceOrientationEvent.requestPermission();
                if (res !== 'granted') return;
            }
        } catch (_) {}
        setTilt(!tiltEnabled);
    };
    tiltBtn.addEventListener('touchstart', handleTiltToggle, { passive: false });
    tiltBtn.addEventListener('click', (ev) => { ev.stopPropagation(); setTilt(!tiltEnabled); });

    const calibrateZero = (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        tiltZeroGamma = latestGamma;
        showCallout('TILT ZEROED', '#00f5d4');
    };
    zeroBtn.addEventListener('touchstart', calibrateZero, { passive: false });
    zeroBtn.addEventListener('click', calibrateZero);

    tiltDock.appendChild(tiltBtn);
    tiltDock.appendChild(zeroBtn);
    frame.appendChild(tiltDock);

    let lastTiltLane = 0;
    window.addEventListener('deviceorientation', (ev) => {
        if (ev.gamma == null) return;
        latestGamma = ev.gamma;
        if (!tiltEnabled || gameState !== 'playing') return;
        const rel = ev.gamma - tiltZeroGamma;
        if (rel > 14 && lastTiltLane <= 0) { steerLane(1); lastTiltLane = 1; }
        else if (rel < -14 && lastTiltLane >= 0) { steerLane(-1); lastTiltLane = -1; }
        else if (Math.abs(rel) < 6) { lastTiltLane = 0; }
    });
})();

// ===== Button Bindings =====
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);
document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', resumeGame);
document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', restartGame);
document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', restartGame);
document.getElementById('open-garage-start-btn').addEventListener('click', () => openGarage('start'));
document.getElementById('open-garage-over-btn').addEventListener('click', () => openGarage('gameOver'));
document.getElementById('close-garage-btn').addEventListener('click', closeGarage);

if (btnCam) btnCam.addEventListener('click', (e) => { e.stopPropagation(); cycleCamera(); });
if (btnMute) btnMute.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
if (btnPause) btnPause.addEventListener('click', (e) => { e.stopPropagation(); if (gameState === 'playing') pauseGame(); else if (gameState === 'paused') resumeGame(); });
if (pauseCamBtn) pauseCamBtn.addEventListener('click', cycleCamera);
if (pauseAudioBtn) pauseAudioBtn.addEventListener('click', toggleMute);

// ===== Entity Cleanup =====
function clearWorldEntities() {
    if (useWebGL) {
        enemies.forEach(e => { if (e.mesh) scene.remove(e.mesh); });
        coinItems.forEach(c => { if (c.mesh) scene.remove(c.mesh); });
        powerUps.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
        roadFeatures.forEach(f => { if (f.mesh) scene.remove(f.mesh); });
        burstParticles.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
    }
    enemies = [];
    coinItems = [];
    powerUps = [];
    roadFeatures = [];
    burstParticles = [];
}

// ===== Game Session Lifecycle =====
function startGame() {
    neonClock.reset();
    initAudio();
    clearWorldEntities();

    gameState = 'playing';
    distance = 0;
    coins = 0;
    speed = 3.2;
    manualSpeedOffset = 0;
    topMph = 110;
    nearMissCount = 0;
    combo = 1;
    comboTimer = 0;
    currentZoneIdx = 0;

    shieldActive = !!garageState.perks.starterShield;
    invulnTimer = 0;
    magnetTimer = 0;
    turboTimer = 0;
    slowTimer = 0;
    oilWobbleTimer = 0;
    shakeIntensity = 0;

    player.lane = 1;
    player.x = laneToWorldX(1);
    player.targetX = player.x;
    player.roll = 0;
    player.pitch = 0;

    enemySpawnTimer = 15;
    coinSpawnTimer = 25;
    featureSpawnTimer = 140;
    powerUpCooldown = 190;

    if (useWebGL) {
        buildPlayerCar(getEquippedSkin());
        applyZoneAtmosphere(0);
    }

    startScreenEl.classList.add('hidden');
    pauseScreenEl.classList.add('hidden');
    gameOverScreenEl.classList.add('hidden');
    garageScreenEl.classList.add('hidden');
    miamiHudEl.classList.remove('hidden');

    if (calloutStackEl) calloutStackEl.innerHTML = '';
    if (shieldActive) showCallout('STARTER SHIELD READY!', '#00f5d4');
    else showCallout('MIAMI 1986 • GO!', '#ff2a85');

    updateHudDOM();
    startSynthMusic();
    ensureLoopRunning();
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    stopSynthMusic();
    pauseScreenEl.classList.remove('hidden');
}

function resumeGame() {
    if (gameState !== 'paused') return;
    neonClock.reset();
    gameState = 'playing';
    pauseScreenEl.classList.add('hidden');
    startSynthMusic();
    ensureLoopRunning();
}

function gameOver() {
    if (gameState === 'gameOver') return;
    gameState = 'gameOver';
    stopSynthMusic();
    triggerFlash('crash');
    shakeIntensity = 0.85;

    const finalDist = Math.floor(distance);
    const isNewRecord = finalDist > highScore;
    if (isNewRecord) {
        highScore = finalDist;
        neonWriteRecord('neonRacerHighScore', highScore);
    }

    // Bank run coins into persistent Miami Garage wallet
    if (coins > 0) {
        garageState.bank += coins;
        saveGarage();
    }

    document.getElementById('TEMPLATE-4weird-final-score').textContent = String(finalDist);
    document.getElementById('TEMPLATE-4weird-final-coins').textContent = String(coins);
    const nmEl = document.getElementById('final-near-misses');
    const tsEl = document.getElementById('final-top-speed');
    const nrBanner = document.getElementById('new-record-banner');
    if (nmEl) nmEl.textContent = String(nearMissCount);
    if (tsEl) tsEl.textContent = topMph + ' MPH';
    if (nrBanner) nrBanner.classList.toggle('hidden', !isNewRecord);

    refreshOverlayStats();
    miamiHudEl.classList.add('hidden');
    gameOverScreenEl.classList.remove('hidden');
}

function restartGame() {
    startGame();
}

// ===== Spawners (Fair Traffic Guaranteed!) =====
function isLaneBlockedNearZ(lane, zCenter, halfWindow) {
    for (const e of enemies) {
        if (e.blasted) continue;
        if (Math.abs(e.z - zCenter) < halfWindow) {
            if (e.lane === lane || e.targetLane === lane) return true;
        }
    }
    return false;
}

function spawnEnemy() {
    const effSpeed = getEffectiveSpeed();
    const trafficWindow = Math.max(24, effSpeed * 4.4);
    const occupied = new Set();
    for (let l = 0; l < laneCount; l++) {
        if (isLaneBlockedNearZ(l, SPAWN_Z, trafficWindow)) occupied.add(l);
    }
    if (occupied.size >= laneCount - 1) return;

    const openLanes = [];
    for (let l = 0; l < laneCount; l++) if (!occupied.has(l)) openLanes.push(l);
    const lane = openLanes[Math.floor(Math.random() * openLanes.length)];

    // Introduce telegraphing lane-swappers past 350m
    let type = 'coupe';
    const roll = Math.random();
    if (distance >= 350 && roll < 0.24) {
        type = 'swapper';
    } else if (roll > 0.72) {
        type = 'van';
    }

    const palette = type === 'swapper'
        ? [0x9d4edd, 0xff2a85]
        : [0xff2a85, 0xff6b35, 0xffd166, 0x7b2cbf, 0xff4d6d, 0x00bbf9];
    const colorHex = palette[Math.floor(Math.random() * palette.length)];

    const enemy = {
        lane,
        targetLane: lane,
        x: laneToWorldX(lane),
        z: SPAWN_Z,
        width: type === 'van' ? 1.88 : 1.78,
        length: type === 'van' ? 3.96 : 3.6,
        type,
        colorHex,
        speedRatio: type === 'van' ? 0.56 : (0.64 + Math.random() * 0.22),
        nearMissed: false,
        blasted: false,
        blastVx: 0,
        blastVy: 0,
        blastVz: 0,
        swapState: 'idle', // idle -> telegraph -> shifting -> done
        swapDir: 0,
        telegraphTimer: 0,
        mesh: useWebGL ? createEnemyMesh(type, colorHex) : null
    };

    if (enemy.mesh) {
        enemy.mesh.position.set(enemy.x, 0, enemy.z);
        scene.add(enemy.mesh);
    }
    enemies.push(enemy);
}

function spawnCoinLine() {
    const lane = Math.floor(Math.random() * laneCount);
    const count = Math.random() < 0.55 ? 3 : 1;
    for (let i = 0; i < count; i++) {
        const z = SPAWN_Z - i * 4.4;
        const coin = {
            lane,
            x: laneToWorldX(lane),
            y: 0.95,
            z,
            rot: i * 0.6,
            mesh: useWebGL ? createCoinMesh() : null
        };
        if (coin.mesh) {
            coin.mesh.position.set(coin.x, coin.y, coin.z);
            scene.add(coin.mesh);
        }
        coinItems.push(coin);
    }
}

function spawnPowerUp() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['speed', 'slow', 'shield', 'magnet'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pu = {
        lane,
        x: laneToWorldX(lane),
        y: 1.05,
        z: SPAWN_Z,
        type,
        mesh: useWebGL ? createPowerUpMesh(type) : null
    };
    if (pu.mesh) {
        pu.mesh.position.set(pu.x, pu.y, pu.z);
        scene.add(pu.mesh);
    }
    powerUps.push(pu);
}

function spawnRoadFeature() {
    if (distance < 380) return;
    const lane = Math.floor(Math.random() * laneCount);
    const isPad = Math.random() < 0.56;
    const kind = isPad ? 'speedpad' : 'oil';
    let mesh = null;
    if (useWebGL) {
        mesh = new THREE.Mesh(
            isPad ? sharedGeo.speedPad : sharedGeo.oilSlick,
            isPad ? sharedMat.speedPad : sharedMat.oilSlick
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(laneToWorldX(lane), 0.03, SPAWN_Z);
        scene.add(mesh);
    }
    roadFeatures.push({
        lane,
        x: laneToWorldX(lane),
        z: SPAWN_Z,
        kind,
        triggered: false,
        mesh
    });
}

function applyPowerUp(type) {
    playSfx('powerup');
    switch (type) {
        case 'speed':
            turboTimer = turboMaxTime;
            triggerFlash('boost');
            showCallout('⚡ TURBO OVERDRIVE!', '#ffd166');
            break;
        case 'slow':
            slowTimer = slowMaxTime;
            showCallout('🐢 CHILL WAVE SLOW-MO', '#38bdf8');
            break;
        case 'shield':
            if (shieldActive) {
                distance += 100;
                showCallout('🛡️ SHIELD OVERCHARGE +100m', '#00f5d4');
            } else {
                shieldActive = true;
                showCallout('🛡️ NEON SHIELD ONLINE', '#00f5d4');
            }
            break;
        case 'magnet':
            magnetMaxTime = garageState.perks.hyperMagnet ? 11.0 : 8.0;
            magnetTimer = magnetMaxTime;
            showCallout('🧲 COIN MAGNET ACTIVE', '#ff7ac6');
            break;
    }
}

function applyZoneAtmosphere(zoneIdx) {
    if (!useWebGL || !scene) return;
    const z = MIAMI_ZONES[zoneIdx];
    scene.background.setHex(z.bg);
    scene.fog.color.setHex(z.fog);
}

// ===== Fixed-Step Simulation (60Hz) =====
function update() {
    const dt = 1 / 60;
    worldTime += dt;

    // Sync targetX in case test harness mutated player.lane directly
    player.targetX = laneToWorldX(player.lane);

    // Smooth lateral steering & realistic car banking
    const dxSteer = player.targetX - player.x;
    player.x += dxSteer * 0.22;
    const wobble = oilWobbleTimer > 0 ? Math.sin(worldTime * 34) * 0.22 : 0;
    const desiredRoll = Math.max(-0.24, Math.min(0.24, -dxSteer * 0.11 + wobble));
    player.roll += (desiredRoll - player.roll) * 0.24;

    // Continuous gas/brake holds (keyboard or mobile buttons)
    const gasDown = gasHeld || keys['ArrowUp'] || keys['KeyW'];
    const brakeDown = brakeHeld || keys['ArrowDown'] || keys['KeyS'];
    if (gasDown) manualSpeedOffset = Math.min(manualSpeedOffset + 0.055, 3.0);
    else if (brakeDown) manualSpeedOffset = Math.max(manualSpeedOffset - 0.065, -2.0);
    else manualSpeedOffset *= 0.985;

    const desiredPitch = gasDown || turboTimer > 0 ? 0.055 : (brakeDown ? -0.055 : 0);
    player.pitch += (desiredPitch - player.pitch) * 0.16;

    // Timers
    if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
    if (magnetTimer > 0) magnetTimer = Math.max(0, magnetTimer - dt);
    if (turboTimer > 0) turboTimer = Math.max(0, turboTimer - dt);
    if (slowTimer > 0) slowTimer = Math.max(0, slowTimer - dt);
    if (oilWobbleTimer > 0) oilWobbleTimer = Math.max(0, oilWobbleTimer - dt);
    if (shakeIntensity > 0) shakeIntensity = Math.max(0, shakeIntensity - dt * 2.4);

    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) {
            combo = 1;
            comboTimer = 0;
        }
    }

    // Natural speed progression
    speed = Math.min(8.4, speed + 0.0012);
    const effSpeed = getEffectiveSpeed();
    const worldAdvance = effSpeed * 0.34; // world Z units per 60Hz tick

    // Distance gain (Turbo grants 1.5x distance flow)
    distance += effSpeed * (turboTimer > 0 ? 0.145 : 0.10);

    // Zone progression check
    let nextZone = 0;
    for (let i = MIAMI_ZONES.length - 1; i >= 0; i--) {
        if (distance >= MIAMI_ZONES[i].dist) { nextZone = i; break; }
    }
    if (nextZone !== currentZoneIdx) {
        currentZoneIdx = nextZone;
        applyZoneAtmosphere(currentZoneIdx);
        showCallout('ENTERING ' + MIAMI_ZONES[currentZoneIdx].name, '#ffd166');
    }

    // Spawners
    enemySpawnTimer++;
    const spawnRate = Math.max(30, 82 - distance * 0.022);
    if (enemySpawnTimer >= spawnRate) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }

    coinSpawnTimer++;
    if (coinSpawnTimer >= 66) {
        spawnCoinLine();
        coinSpawnTimer = 0;
    }

    powerUpCooldown--;
    if (powerUpCooldown <= 0) {
        spawnPowerUp();
        powerUpCooldown = 260 + Math.floor(Math.random() * 190);
    }

    featureSpawnTimer--;
    if (featureSpawnTimer <= 0) {
        spawnRoadFeature();
        featureSpawnTimer = 175 + Math.floor(Math.random() * 130);
    }

    // Update enemies (including lane-swappers & blasted cars)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.blasted) {
            e.x += e.blastVx;
            e.z += e.blastVz;
            e.blastVy -= 0.022;
            if (e.mesh) {
                e.mesh.position.x = e.x;
                e.mesh.position.y = Math.max(0, e.mesh.position.y + e.blastVy);
                e.mesh.position.z = e.z;
                e.mesh.rotation.x += 0.18;
                e.mesh.rotation.z += 0.24;
            }
            if (e.z > DESPAWN_Z + 12 || (e.mesh && e.mesh.position.y > 35)) {
                if (e.mesh) scene.remove(e.mesh);
                enemies.splice(i, 1);
            }
            continue;
        }

        e.z += worldAdvance * e.speedRatio;

        // Telegraphing lane-swapper logic
        if (e.type === 'swapper' && e.swapState === 'idle' && e.z > -76 && e.z < -42) {
            const candidates = [];
            if (e.lane > 0) candidates.push(e.lane - 1);
            if (e.lane < laneCount - 1) candidates.push(e.lane + 1);
            const safeTargets = candidates.filter(tl => {
                if (isLaneBlockedNearZ(tl, e.z, 18)) return false;
                // Ensure the 3rd remaining lane isn't also blocked nearby (never create a wall!)
                const thirdLane = [0, 1, 2].find(l => l !== e.lane && l !== tl);
                if (thirdLane !== undefined && isLaneBlockedNearZ(thirdLane, e.z, 20)) return false;
                return true;
            });
            if (safeTargets.length > 0) {
                e.targetLane = safeTargets[Math.floor(Math.random() * safeTargets.length)];
                e.swapDir = e.targetLane > e.lane ? 1 : -1;
                e.swapState = 'telegraph';
                e.telegraphTimer = 1.05;
                if (e.mesh && e.mesh.userData && e.mesh.userData.warnSprite) {
                    e.mesh.userData.warnSprite.material.map = e.swapDir < 0 ? spriteTextures.warnLeft : spriteTextures.warnRight;
                    e.mesh.userData.warnSprite.visible = true;
                }
            } else {
                e.swapState = 'done';
            }
        } else if (e.swapState === 'telegraph') {
            e.telegraphTimer -= dt;
            const blinkOn = Math.floor(worldTime * 12) % 2 === 0;
            if (e.mesh && e.mesh.userData) {
                e.mesh.userData.leftBlinker.visible = e.swapDir < 0 && blinkOn;
                e.mesh.userData.rightBlinker.visible = e.swapDir > 0 && blinkOn;
                e.mesh.userData.warnSprite.visible = blinkOn;
            }
            if (e.telegraphTimer <= 0) {
                e.swapState = 'shifting';
                e.lane = e.targetLane;
            }
        } else if (e.swapState === 'shifting') {
            const destX = laneToWorldX(e.targetLane);
            e.x += (destX - e.x) * 0.14;
            if (Math.abs(destX - e.x) < 0.05) {
                e.x = destX;
                e.swapState = 'done';
                if (e.mesh && e.mesh.userData) {
                    e.mesh.userData.leftBlinker.visible = false;
                    e.mesh.userData.rightBlinker.visible = false;
                    e.mesh.userData.warnSprite.visible = false;
                }
            }
        }

        if (e.mesh) {
            e.mesh.position.set(e.x, 0, e.z);
        }

        // Collision & Near-Miss Check
        const dz = Math.abs(e.z - PLAYER_Z);
        const dx = Math.abs(e.x - player.x);
        const hitZ = (e.length + player.height) * 0.43;
        const hitX = (e.width + player.width) * 0.43;

        if (dz < hitZ && dx < hitX) {
            if (window.gameDebug && window.gameDebug.godMode) {
                // God mode ignores collision
            } else if (invulnTimer > 0) {
                // Post-shield grace window
            } else if (shieldActive) {
                // Shield absorbs collision & blasts rival car away!
                shieldActive = false;
                invulnTimer = 1.35;
                distance += 100;
                shakeIntensity = 0.55;
                e.blasted = true;
                e.blastVx = (e.x >= player.x ? 1 : -1) * 0.32;
                e.blastVy = 0.42;
                e.blastVz = -0.38;
                triggerFlash('shield');
                playSfx('shieldBreak');
                spawnBurst(e.x, 1.0, e.z, 0x00f5d4, 22, 0.42);
                showCallout('🛡️ SHIELD SAVED +100m!', '#00f5d4');
            } else {
                playSfx('crash');
                spawnBurst(player.x, 0.9, PLAYER_Z, 0xff2a85, 28, 0.48);
                spawnBurst(player.x, 0.9, PLAYER_Z, 0xffd166, 16, 0.35);
                gameOver();
                return;
            }
        } else if (!e.nearMissed && e.z > PLAYER_Z + 0.6 && e.z < PLAYER_Z + 5.2 && dx >= hitX && dx < laneWidth * 1.18) {
            // Crisp Near-Miss Combo!
            e.nearMissed = true;
            nearMissCount++;
            combo = Math.min(5, combo + 1);
            comboTimer = 4.2;
            const bonus = 15 * combo;
            distance += bonus;
            shakeIntensity = Math.max(shakeIntensity, 0.14);
            playSfx('nearmiss', combo);
            spawnBurst(player.x + (e.x > player.x ? 1.0 : -1.0), 0.7, PLAYER_Z, 0x00f5d4, 10, 0.22);
            showCallout(combo > 1 ? `NEAR MISS x${combo}! +${bonus}m` : `NEAR MISS! +${bonus}m`, combo >= 4 ? '#ffd166' : '#00f5d4');
        }

        if (e.z > DESPAWN_Z) {
            if (e.mesh) scene.remove(e.mesh);
            enemies.splice(i, 1);
        }
    }

    // Update Coins (with true 3D Magnet attraction!)
    const magnetRangeZ = garageState.perks.hyperMagnet ? 34 : 23;
    for (let i = coinItems.length - 1; i >= 0; i--) {
        const c = coinItems[i];
        c.z += worldAdvance * 0.92;
        c.rot += 0.08;

        if (magnetTimer > 0 && c.z > PLAYER_Z - magnetRangeZ && c.z < PLAYER_Z + 4) {
            c.x += (player.x - c.x) * 0.18;
            c.z += (PLAYER_Z - c.z) * 0.11;
        }

        if (c.mesh) {
            c.mesh.position.set(c.x, c.y + Math.sin(worldTime * 5 + c.rot) * 0.14, c.z);
            c.mesh.rotation.y = c.rot;
        }

        const dx = Math.abs(c.x - player.x);
        const dz = Math.abs(c.z - PLAYER_Z);
        if (dx < 1.45 && dz < 2.2) {
            const value = combo >= 4 ? 2 : 1;
            coins += value;
            playSfx('coin');
            spawnBurst(c.x, c.y, c.z, 0xffd166, 7, 0.18);
            if (c.mesh) scene.remove(c.mesh);
            coinItems.splice(i, 1);
            continue;
        }

        if (c.z > DESPAWN_Z) {
            if (c.mesh) scene.remove(c.mesh);
            coinItems.splice(i, 1);
        }
    }

    // Update Power-Ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.z += worldAdvance * 0.92;
        if (pu.mesh) {
            pu.mesh.position.set(pu.x, pu.y + Math.sin(worldTime * 4 + i) * 0.18, pu.z);
            if (pu.mesh.userData) {
                pu.mesh.userData.core.rotation.y += 0.06;
                pu.mesh.userData.core.rotation.x += 0.03;
                pu.mesh.userData.ring.rotation.z -= 0.05;
            }
        }
        const dx = Math.abs(pu.x - player.x);
        const dz = Math.abs(pu.z - PLAYER_Z);
        if (dx < 1.55 && dz < 2.4) {
            applyPowerUp(pu.type);
            spawnBurst(pu.x, pu.y, pu.z, 0x00f5d4, 14, 0.28);
            if (pu.mesh) scene.remove(pu.mesh);
            powerUps.splice(i, 1);
            continue;
        }
        if (pu.z > DESPAWN_Z) {
            if (pu.mesh) scene.remove(pu.mesh);
            powerUps.splice(i, 1);
        }
    }

    // Update Road Features (Speed Pads & Oil Slicks)
    for (let i = roadFeatures.length - 1; i >= 0; i--) {
        const f = roadFeatures[i];
        f.z += worldAdvance;
        if (f.mesh) f.mesh.position.z = f.z;

        if (!f.triggered && Math.abs(f.x - player.x) < 1.5 && Math.abs(f.z - PLAYER_Z) < 2.8) {
            f.triggered = true;
            if (f.kind === 'speedpad') {
                distance += 25;
                turboTimer = Math.max(turboTimer, 1.8);
                triggerFlash('boost');
                playSfx('speedpad');
                spawnBurst(player.x, 0.3, PLAYER_Z, 0x00f5d4, 12, 0.25);
                showCallout('>>> BOOST PAD +25m', '#00f5d4');
            } else if (!shieldActive && invulnTimer <= 0) {
                oilWobbleTimer = 1.25;
                shakeIntensity = Math.max(shakeIntensity, 0.25);
                playSfx('oil');
                spawnBurst(player.x, 0.25, PLAYER_Z, 0xff9e00, 10, 0.22);
                showCallout('OIL SLICK!', '#ff9e00');
            }
        }
        if (f.z > DESPAWN_Z) {
            if (f.mesh) scene.remove(f.mesh);
            roadFeatures.splice(i, 1);
        }
    }

    // Update Burst Particles
    for (let i = burstParticles.length - 1; i >= 0; i--) {
        const p = burstParticles[i];
        p.life--;
        p.mesh.position.x += p.vx;
        p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy);
        p.mesh.position.z += p.vz + worldAdvance * 0.2;
        p.vy -= 0.015;
        const s = Math.max(0.05, p.life / p.maxLife);
        p.mesh.scale.set(s, s, s);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            burstParticles.splice(i, 1);
        }
    }

    // Scroll 3D Environment
    scrollScenery(worldAdvance, effSpeed);
    updateHudDOM();
}

function scrollScenery(worldAdvance, effSpeed) {
    if (!useWebGL) return;

    if (roadTex) roadTex.offset.y = (roadTex.offset.y + worldAdvance * 0.058) % 1;
    if (gridTex) gridTex.offset.y = (gridTex.offset.y + worldAdvance * 0.084) % 1;
    if (waterTex) waterTex.offset.y = (waterTex.offset.y + worldAdvance * 0.055) % 1;

    // Recycle roadside light pylons
    for (const p of pylonPool) {
        p.position.z += worldAdvance;
        if (p.position.z > 20) p.position.z -= 24 * 8.2;
    }
    // Recycle Miami palms
    for (const palm of palmPool) {
        palm.position.z += worldAdvance;
        if (palm.position.z > 22) palm.position.z -= 16 * 12.2;
    }
    // Recycle overhead highway arches
    for (const arch of archPool) {
        arch.position.z += worldAdvance;
        if (arch.position.z > 22) arch.position.z -= 5 * 38;
    }
    // Peripheral speedlines
    const showLines = effSpeed > 4.6 || turboTimer > 0;
    for (const sl of speedlinePool) {
        sl.visible = showLines;
        if (showLines) {
            sl.position.z += worldAdvance * (turboTimer > 0 ? 2.4 : 1.7);
            if (sl.position.z > 16) sl.position.z = -95 - Math.random() * 30;
        }
    }
}

// ===== 3D Render Frame =====
function renderScene(dtSec) {
    if (!useWebGL) {
        renderFallback2D();
        return;
    }

    const effSpeed = gameState === 'playing' ? getEffectiveSpeed() : 2.8;

    // Attract-mode gentle highway cruise when on start/gameover/garage
    if (gameState !== 'playing' && gameState !== 'paused') {
        worldTime += dtSec;
        scrollScenery(0.55, 2.8);
        player.x = Math.sin(worldTime * 0.65) * 1.4;
        player.roll = -Math.cos(worldTime * 0.65) * 0.06;
    }

    // Update player car transform & FX
    if (playerCarGroup) {
        const hover = Math.sin(worldTime * 18) * 0.014;
        playerCarGroup.position.set(player.x, hover, PLAYER_Z);
        playerCarGroup.rotation.z = player.roll;
        playerCarGroup.rotation.x = player.pitch;
        playerCarGroup.rotation.y = -player.roll * 0.25;

        // Blink car subtly during post-shield invulnerability
        playerCarGroup.visible = invulnTimer <= 0 || Math.floor(worldTime * 20) % 2 === 0;

        // Spin wheels
        const wheelSpin = effSpeed * 0.095;
        for (const w of playerWheels) w.rotation.x -= wheelSpin;

        // Animate twin afterburner flames
        const flameBoost = turboTimer > 0 ? 1.85 : (effSpeed / 4.2);
        for (const f of playerFlames) {
            const jitter = 0.78 + Math.random() * 0.45;
            f.scale.set(1, flameBoost * jitter, 1);
        }

        // Light-trails flare on Turbo or hard lane carving
        const trailAlpha = Math.min(0.85, 0.22 + Math.abs(player.roll) * 1.8 + (turboTimer > 0 ? 0.35 : 0));
        if (playerTrailLeft) {
            playerTrailLeft.material.opacity = trailAlpha;
            playerTrailRight.material.opacity = trailAlpha;
            const trailScaleZ = turboTimer > 0 ? 1.9 : 1.0;
            playerTrailLeft.scale.y = trailScaleZ;
            playerTrailRight.scale.y = trailScaleZ;
        }

        // Shield & Magnet meshes
        if (playerShieldMesh) {
            playerShieldMesh.visible = shieldActive;
            if (shieldActive) {
                shieldPulse += dtSec * 3.5;
                playerShieldMesh.rotation.y += dtSec * 1.1;
                const s = 1 + Math.sin(shieldPulse) * 0.04;
                playerShieldMesh.scale.set(0.95 * s, 0.62 * s, 1.18 * s);
            }
        }
        if (playerMagnetRing) {
            playerMagnetRing.visible = magnetTimer > 0;
            if (magnetTimer > 0) {
                const ms = 0.9 + (Math.sin(worldTime * 9) * 0.5 + 0.5) * 0.42;
                playerMagnetRing.scale.set(ms, ms, 1);
                playerMagnetRing.rotation.z += dtSec * 2.4;
            }
        }
    }

    // Subtle synthwave sun breathing
    if (sunMesh && sunHalo) {
        const targetSunY = MIAMI_ZONES[currentZoneIdx].sunY;
        sunMesh.position.y += (targetSunY - sunMesh.position.y) * 0.03;
        sunHalo.position.y = sunMesh.position.y;
        const haloPulse = 92 + Math.sin(worldTime * 1.8) * 4;
        sunHalo.scale.set(haloPulse, haloPulse, 1);
    }

    // Dynamic Camera & FOV Warp (portrait-adaptive so phone screens show all 3 lanes above touch pedals)
    const isPortrait = camera.aspect < 1;
    const portraitPull = isPortrait ? Math.min(5.2, (1 - camera.aspect) * 9.5) : 0;
    const shakeX = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity * 0.85 : 0;
    const shakeY = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity * 0.55 : 0;
    let camTargetX = player.x * (isPortrait ? 0.42 : 0.62);
    let camTargetY = 3.25 + portraitPull * 0.34;
    let camTargetZ = PLAYER_Z + 6.4 + portraitPull * 0.95;
    let lookZ = PLAYER_Z - 26;
    let lookY = 1.45 - portraitPull * 0.14;
    let targetFov = (isPortrait ? 72 : 62) + Math.min(18, (effSpeed - 3.0) * 2.5) + (turboTimer > 0 ? 10 : 0);

    if (gameState === 'start') {
        camTargetX = Math.sin(worldTime * 0.4) * 2.2;
        camTargetY = 3.6 + portraitPull * 0.25;
        camTargetZ = PLAYER_Z + 7.2 + portraitPull * 0.7;
        lookY = 3.0;
        targetFov = isPortrait ? 72 : 64;
    } else if (cameraMode === 1) {
        // Hood / Bumper Cam
        camTargetX = player.x;
        camTargetY = 1.42;
        camTargetZ = PLAYER_Z - 0.45;
        lookZ = PLAYER_Z - 38;
        lookY = 1.1;
        targetFov += 8;
    } else if (cameraMode === 2) {
        // High Arcade Cam
        camTargetX = player.x * 0.48;
        camTargetY = 6.2 + portraitPull * 0.4;
        camTargetZ = PLAYER_Z + 9.2 + portraitPull * 0.9;
        lookZ = PLAYER_Z - 20;
        lookY = 0.8;
    }

    camera.position.x += (camTargetX - camera.position.x) * 0.14;
    camera.position.y += (camTargetY - camera.position.y) * 0.14;
    camera.position.z += (camTargetZ - camera.position.z) * 0.14;
    camera.position.x += shakeX;
    camera.position.y += shakeY;
    camera.lookAt(player.x * 0.35, lookY, lookZ);
    camera.rotation.z += player.roll * 0.22;

    if (Math.abs(camera.fov - targetFov) > 0.15) {
        camera.fov += (targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
}

// ===== Graceful 2D Synthwave Perspective Fallback (only if WebGL unavailable) =====
function renderFallback2D() {
    if (!fallbackCtx) return;
    const g = fallbackCtx;
    const w = canvas.width, h = canvas.height;
    const horizon = h * 0.42;

    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#09031c');
    sky.addColorStop(0.55, '#6b146b');
    sky.addColorStop(1, '#ff5d73');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, horizon);

    // Striped sun
    const sr = Math.min(w, h) * 0.14;
    g.fillStyle = '#ffd166';
    g.beginPath();
    g.arc(w / 2, horizon - sr * 0.3, sr, 0, Math.PI * 2);
    g.fill();

    // Ground
    g.fillStyle = '#14062b';
    g.fillRect(0, horizon, w, h - horizon);

    // Perspective trapezoid road
    const topW = w * 0.14;
    const botW = w * 0.72;
    g.fillStyle = '#18102e';
    g.beginPath();
    g.moveTo(w / 2 - topW / 2, horizon);
    g.lineTo(w / 2 + topW / 2, horizon);
    g.lineTo(w / 2 + botW / 2, h);
    g.lineTo(w / 2 - botW / 2, h);
    g.closePath();
    g.fill();
    g.strokeStyle = '#00f5d4';
    g.lineWidth = 3;
    g.stroke();

    // Project Z helper
    const proj = (wx, wz) => {
        const t = Math.max(0.02, Math.min(1.2, (wz - SPAWN_Z) / (PLAYER_Z + 6 - SPAWN_Z)));
        const p = Math.pow(t, 2.2);
        const roadW = topW + (botW - topW) * p;
        return {
            x: w / 2 + (wx / ROAD_WIDTH) * roadW,
            y: horizon + (h - horizon) * p,
            scale: 0.15 + p * 0.95
        };
    };

    enemies.forEach(e => {
        const pt = proj(e.x, e.z);
        g.fillStyle = '#' + e.colorHex.toString(16).padStart(6, '0');
        const cw = 54 * pt.scale, ch = 36 * pt.scale;
        g.fillRect(pt.x - cw / 2, pt.y - ch, cw, ch);
    });
    const pp = proj(player.x, PLAYER_Z);
    g.fillStyle = '#00f5d4';
    g.fillRect(pp.x - 32, pp.y - 24, 64, 28);
}

// ===== Main Animation Loop =====
function frameLoop(timestamp) {
    if (document.hidden) {
        animationId = null;
        return;
    }
    const dtSec = lastFrameMs ? Math.min(0.05, Math.max(0.001, (timestamp - lastFrameMs) / 1000)) : 1 / 60;
    lastFrameMs = timestamp;

    if (gameState === 'playing') {
        neonClock.advance(timestamp, update, () => gameState === 'playing');
    }
    renderScene(dtSec);

    if (gameState !== 'paused') {
        animationId = requestAnimationFrame(frameLoop);
    } else {
        animationId = null;
    }
}

function ensureLoopRunning() {
    if (!animationId) {
        lastFrameMs = 0;
        animationId = requestAnimationFrame(frameLoop);
    }
}

// ===== Fullscreen & Bridge Integrations =====
(function installFullscreenAndShellHooks() {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame') || document.body;
    function toggleFS() {
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const el = document.documentElement;
                if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            } else if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        } catch (_) {}
    }

    const legacyFsBtn = document.getElementById('TEMPLATE-4weird-fullscreen-btn');
    if (legacyFsBtn) legacyFsBtn.addEventListener('click', toggleFS);

    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'neon-fs-racer';
    b.textContent = '⛶';
    b.title = 'Toggle fullscreen (F)';
    b.setAttribute('aria-label', 'Toggle fullscreen');
    b.addEventListener('click', (e) => { e.stopPropagation(); toggleFS(); });
    frame.appendChild(b);

    document.addEventListener('keydown', (e) => {
        if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
        if (e.code === 'KeyF') toggleFS();
    });
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);
    window.addEventListener('resize', handleResize);
})();

window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SET_GAME_SPEED') {
        const s = parseFloat(event.data.speed);
        if (!isNaN(s) && s > 0) window.speedMultiplier = s;
    }
    if (event.data.type === 'SET_MUTED') {
        setMuted(!!event.data.muted);
    }
});

// ===== Developer Debugging API =====
window.gameDebug = {
    name: 'Neon Racer: Miami 86',
    getScore: () => Math.floor(distance),
    setScore: (s) => { distance = Number(s) || 0; },
    getHealth: () => (shieldActive ? 200 : 100),
    setHealth: (h) => { shieldActive = h > 100; },
    addCoins: (n) => { garageState.bank += Math.max(0, Math.floor(n || 50)); saveGarage(); refreshOverlayStats(); },
    win: () => { distance += 500; },
    lose: () => { gameOver(); },
    godMode: false,
    toggleGodMode: function () {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};

// ===== Session Lifecycle (pause cleanly & release controls on blur/hide) =====
(function installSessionLifecycle() {
    function releaseControls() {
        Object.keys(keys).forEach(key => { keys[key] = false; });
        gasHeld = false;
        brakeHeld = false;
        steeringTouch = null;
    }
    function suspend() {
        releaseControls();
        stopSynthMusic();
        if (gameState === 'playing') {
            pauseGame();
            const resume = document.getElementById('TEMPLATE-4weird-resume-btn');
            if (resume) resume.focus({ preventScroll: true });
        }
    }
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) suspend();
        else if (gameState !== 'paused') ensureLoopRunning();
    });
    window.addEventListener('pagehide', suspend);
})();

// ===== Boot =====
init3D();
refreshOverlayStats();
syncAudioButtons();
ensureLoopRunning();
