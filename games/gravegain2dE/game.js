/* GraveGain2DE: Smash Slash Bash Mash — Main Controller, Character Select & Input */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const SAVE_KEY = 'gravegain2dE:stats';
  const W = 960, H = 540;

  const { ROSTER, RACES, CLASSES } = window.GG2DE_ROSTER;
  const { STAGES } = window.GG2DE_STAGES;
  const Engine = window.GG2DE_ENGINE;
  const Render = window.GG2DE_RENDER;
  const Audio = window.GG2DE_AUDIO;

  // --- Persistent Stats ---
  function loadStats() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return {
        wins: raw.wins || 0,
        kos: raw.kos || 0,
        arcadeClears: raw.arcadeClears || 0,
        charWins: raw.charWins || {}
      };
    } catch (_) {
      return { wins: 0, kos: 0, arcadeClears: 0, charWins: {} };
    }
  }
  function saveStats(st) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (_) {}
  }
  let career = loadStats();

  // --- Lobby State ---
  let gameMode = 'brawl'; // 'brawl' | 'arcade' | 'training'
  let matchRule = 'stock'; // 'stock' | 'timed'
  let stocksCount = 3;
  let timeLimitSec = 120;
  let itemsEnabled = true;
  let selectedStageId = STAGES[0].id;
  let activeSlotIndex = 0;

  let teamBattle = false;
  let trainingOverlay = false;
  let slots = [
    { enabled: true, isCpu: false, playerNum: 1, charId: 'human-warrior', cpuLevel: 'veteran', team: 0 },
    { enabled: true, isCpu: true,  playerNum: 2, charId: 'orc-warrior',   cpuLevel: 'veteran', team: 1 },
    { enabled: false, isCpu: true, playerNum: 3, charId: 'elf-warrior',   cpuLevel: 'veteran', team: 2 },
    { enabled: false, isCpu: true, playerNum: 4, charId: 'dwarf-tank',    cpuLevel: 'veteran', team: 3 }
  ];

  // Arcade state
  let arcadeRound = 0;
  const ARCADE_PATH = [
    { stageId: 'luckystarship-hull', charId: 'elf-warrior', cpuLevel: 'rookie' },
    { stageId: 'whisper-grove',      charId: 'elf-mage',    cpuLevel: 'veteran' },
    { stageId: 'deep-forge',         charId: 'dwarf-tank',  cpuLevel: 'veteran' },
    { stageId: 'compact-spire',      charId: 'orc-warrior', cpuLevel: 'veteran' },
    { stageId: 'necromatic-array',   charId: 'orc-mage',    cpuLevel: 'legend' }
  ];

  // --- Match Runtime ---
  let match = null;
  let running = false;
  let paused = false;
  let rafId = 0;
  let lastTs = 0;
  const keysDown = new Set();
  const touchState = { x: 0, y: 0, jump: false, attack: false, special: false, shield: false, smash: false };

  function isTouchUiPreferred() {
    try {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none) and (pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0) return true;
      if (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0) {
        return Math.min(window.innerWidth, window.innerHeight) <= 920;
      }
    } catch (_) {}
    return false;
  }

  function syncTouchChrome() {
    const touchOn = isTouchUiPreferred();
    document.body.classList.toggle('is-touch-play', touchOn && running);
    gameEl?.classList.toggle('is-touch-ui', touchOn);
    const touchRoot = $('#touchControls');
    if (touchRoot) touchRoot.hidden = !touchOn;
    const kbHelp = document.querySelector('.controls-help-kb');
    const touchHelp = document.querySelector('.controls-help-touch');
    if (kbHelp) kbHelp.hidden = touchOn;
    if (touchHelp) touchHelp.hidden = !touchOn;
  }

  window.gameState = {
    title: 'gravegain2dE',
    get active() { return running; },
    getTouchState() { return { ...touchState }; },
    getP1Pose() {
      const f = match?.fighters?.find((x) => x.playerNum === 1 && !x.isCpu);
      return f ? { x: f.x, y: f.y, vy: f.vy, onGround: !!f.onGround } : null;
    }
  };
  window.game = window.gameState;

  // --- DOM Refs ---
  const menuEl = $('#menuScreen');
  const gameEl = $('#gameScreen');
  const resultsEl = $('#resultsModal');
  const pauseEl = $('#pauseModal');
  const rosterGridEl = $('#rosterGrid');
  const stageRowEl = $('#stageRow');
  const slotsRowEl = $('#slotsRow');
  const previewCanvas = $('#previewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  const arenaCanvas = $('#arenaCanvas');
  const arenaCtx = arenaCanvas.getContext('2d');
  const fighterCardsEl = $('#fighterCards');
  const hudTimerEl = $('#hudTimer');
  const hudModeEl = $('#hudMode');

  // --- UI Construction ---
  function renderModeTabs() {
    document.querySelectorAll('[data-gmode]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.gmode === gameMode);
    });
    const ruleBar = $('#rulesBar');
    if (ruleBar) ruleBar.hidden = gameMode !== 'brawl';
    updateStartLabel();
  }

  function updateStartLabel() {
    const btn = $('#deployBtn');
    if (!btn) return;
    const teamMode = gameMode === 'brawl' && teamBattle;
    const teamCount = new Set(slots.filter(slot => slot.enabled).map(slot => slot.team)).size;
    btn.disabled = teamMode && teamCount < 2;
    if (btn.disabled) btn.textContent = 'ASSIGN TWO OPPOSING TEAMS';
    else if (teamMode) btn.textContent = 'START TEAM BATTLE';
    else if (gameMode === 'arcade') btn.textContent = '⚔️ START ARCADE GAUNTLET';
    else if (gameMode === 'training') btn.textContent = '🎯 ENTER TRAINING ARENA';
    else btn.textContent = '💥 MASH! START BRAWL';
  }

  function renderRosterGrid() {
    rosterGridEl.replaceChildren();
    const raceOrder = ['human', 'elf', 'dwarf', 'orc'];
    const clsOrder = ['warrior', 'tank', 'support', 'mage'];

    for (const r of raceOrder) {
      for (const c of clsOrder) {
        const ch = ROSTER.find((x) => x.race === r && x.cls === c);
        if (!ch) continue;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'char-cell';
        btn.dataset.charId = ch.id;
        btn.style.setProperty('--char-accent', ch.palette.accent);

        const badge = document.createElement('span');
        badge.className = 'char-badges';
        // Show which active slots have this character selected
        slots.forEach((s, idx) => {
          if (s.enabled && s.charId === ch.id) {
            const p = document.createElement('i');
            p.style.background = Engine.TEAM_COLORS[idx];
            p.textContent = s.isCpu ? `C${idx + 1}` : `P${s.playerNum}`;
            badge.append(p);
          }
        });

        const ico = document.createElement('span');
        ico.className = 'char-ico';
        ico.textContent = ch.emoji;

        const name = document.createElement('strong');
        name.textContent = ch.title;

        const sub = document.createElement('small');
        sub.textContent = `${ch.raceName} ${ch.className}`;

        btn.append(badge, ico, name, sub);
        if (slots[activeSlotIndex]?.charId === ch.id) btn.classList.add('is-selected');
        btn.addEventListener('click', () => {
          Audio.unlock();
          Audio.play('select');
          if (!slots[activeSlotIndex].enabled) slots[activeSlotIndex].enabled = true;
          slots[activeSlotIndex].charId = ch.id;
          renderRosterGrid();
          renderSlots();
          renderInspector();
        });
        rosterGridEl.append(btn);
      }
    }
  }

  function renderSlots() {
    slotsRowEl.replaceChildren();
    slots.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'slot-card' + (idx === activeSlotIndex ? ' is-focused' : '') + (!s.enabled ? ' is-off' : '');
      card.style.setProperty('--slot-col', Engine.TEAM_COLORS[gameMode === 'brawl' && teamBattle ? s.team : idx]);

      const head = document.createElement('div');
      head.className = 'slot-head';

      const roleBtn = document.createElement('button');
      roleBtn.type = 'button';
      roleBtn.className = 'slot-role';
      roleBtn.textContent = !s.enabled ? `+ JOIN SLOT ${idx + 1}` : (s.isCpu ? `🤖 CPU ${idx + 1} (${s.cpuLevel})` : `🎮 P${s.playerNum} ${idx > 1 ? "GAMEPAD" : "HUMAN"}`);
      roleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Audio.unlock();
        Audio.play('select');
        if (idx === 0) {
          // P1 stays active
          activeSlotIndex = 0;
        } else if (!s.enabled) {
          s.enabled = true;
          s.isCpu = true;
          activeSlotIndex = idx;
        } else if (s.isCpu) {
          s.isCpu = false;
        } else if (idx > 1) {
          s.enabled = false;
          s.isCpu = true;
          if (activeSlotIndex === idx) activeSlotIndex = 0;
        } else {
          s.isCpu = true;
        }
        renderSlots();
        renderRosterGrid();
        renderInspector();
      });

      head.append(roleBtn);

      if (s.enabled && s.isCpu) {
        const diffBtn = document.createElement('button');
        diffBtn.type = 'button';
        diffBtn.className = 'slot-diff';
        diffBtn.title = 'Cycle CPU difficulty';
        diffBtn.textContent = s.cpuLevel.toUpperCase();
        diffBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const lvls = ['rookie', 'veteran', 'legend'];
          s.cpuLevel = lvls[(lvls.indexOf(s.cpuLevel) + 1) % lvls.length];
          Audio.play('select');
          renderSlots();
        });
        head.append(diffBtn);
      }

      const ch = ROSTER.find((x) => x.id === s.charId) || ROSTER[0];
      const body = document.createElement('div');
      body.className = 'slot-body';
      body.textContent = s.enabled ? `${ch.emoji} ${ch.fullName}` : 'Tap to add fighter';

      card.append(head, body);
      if (s.enabled && gameMode === 'brawl' && teamBattle) {
        const team = document.createElement('select');
        team.className = 'slot-team';
        team.setAttribute('aria-label', `Team for fighter slot ${idx + 1}`);
        Engine.TEAM_COLORS.forEach((_, index) => team.add(new Option(`Team ${index + 1}`, index)));
        team.value = String(s.team);
        team.addEventListener('click', e => e.stopPropagation());
        team.addEventListener('change', () => {
          s.team = Number(team.value);
          card.style.setProperty('--slot-col', Engine.TEAM_COLORS[s.team]);
          updateStartLabel();
        });
        card.append(team);
      }
      card.addEventListener('click', () => {
        Audio.unlock();
        if (!s.enabled) s.enabled = true;
        activeSlotIndex = idx;
        renderSlots();
        renderRosterGrid();
        renderInspector();
      });
      slotsRowEl.append(card);
    });
    updateStartLabel();
  }

  function renderStageRow() {
    stageRowEl.replaceChildren();
    STAGES.forEach((st) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-pill' + (st.id === selectedStageId ? ' is-active' : '');
      btn.style.setProperty('--stage-col', st.theme.accent);
      btn.innerHTML = `<strong>${st.name}</strong><small>${st.subtitle}</small>`;
      btn.addEventListener('click', () => {
        Audio.unlock();
        Audio.play('select');
        selectedStageId = st.id;
        renderStageRow();
      });
      stageRowEl.append(btn);
    });
  }

  function renderInspector() {
    const s = slots[activeSlotIndex] || slots[0];
    const ch = ROSTER.find((x) => x.id === s.charId) || ROSTER[0];
    const wins = career.charWins[ch.id] || 0;
    $('#inspectTitle').textContent = `${ch.emoji} ${ch.fullName}`;
    $('#inspectSub').textContent = `${ch.role} · ${ch.raceTrait} · ${wins} Wins`;
    $('#inspectBlurb').textContent = ch.blurb;

    const movesList = $('#inspectMoves');
    movesList.innerHTML = `
      <div><b>Neutral B:</b> ${ch.moves.neutral.name} — <span>${ch.moves.neutral.desc}</span></div>
      <div><b>Side B:</b> ${ch.moves.side.name} — <span>${ch.moves.side.desc}</span></div>
      <div><b>Up B:</b> ${ch.moves.up.name} — <span>${ch.moves.up.desc}</span></div>
      <div><b>Down B:</b> ${ch.moves.down.name} — <span>${ch.moves.down.desc}</span></div>
      <div class="ult-line"><b>Ley Surge:</b> ${ch.ultimateName} — <span>${ch.ultimateDesc}</span></div>
    `;

    // Stat bars
    const st = ch.stats;
    $('#statBars').innerHTML = `
      <div class="sbar"><span>Weight</span><div><i style="width:${Math.min(100, (st.weight / 145) * 100)}%"></i></div></div>
      <div class="sbar"><span>Speed</span><div><i style="width:${Math.min(100, (st.speed / 430) * 100)}%"></i></div></div>
      <div class="sbar"><span>Power</span><div><i style="width:${Math.min(100, (st.power / 1.28) * 100)}%"></i></div></div>
      <div class="sbar"><span>Jump</span><div><i style="width:${Math.min(100, (st.jump / 720) * 100)}%"></i></div></div>
    `;
  }

  function renderPreviewLoop(ts) {
    if (running) return;
    const t = ts * 0.001;
    const s = slots[activeSlotIndex] || slots[0];
    const ch = ROSTER.find((x) => x.id === s.charId) || ROSTER[0];
    const ctx = previewCtx;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const g = ctx.createRadialGradient(85, 76, 8, 85, 76, 80);
    g.addColorStop(0, ch.palette.accent + '44');
    g.addColorStop(1, 'rgba(10,15,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(85, 118, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const dummy = {
      def: ch, x: 85, y: 116, vx: 0, vy: 0, face: 1,
      onGround: true, invuln: 0, chargeTime: 0, counterTimer: 0,
      reflectTimer: 0, hitstun: 0, crouching: false,
      attackTimer: 0, attackDur: 0, shielding: false,
      dizzyTimer: 0, hasUltimate: false, tag: s.isCpu ? 'CPU' : `P${s.playerNum}`,
      color: Engine.TEAM_COLORS[activeSlotIndex]
    };
    ctx.save();
    ctx.translate(85, 116);
    ctx.scale(1.45, 1.45);
    ctx.translate(-85, -116);
    Render.drawFighter(ctx, dummy, t);
    ctx.restore();
    requestAnimationFrame(renderPreviewLoop);
  }

  function refreshCareerSummary() {
    $('#careerSummary').textContent = `Career: ${career.wins} Wins · ${career.kos} KOs · ${career.arcadeClears} Arcade Clears`;
  }

  // --- Controls Polling ---
  function readGamepad(playerNum) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[playerNum - 1];
    if (!pad) return null;
    const ax = Math.abs(pad.axes[0] || 0) > 0.22 ? pad.axes[0] : 0;
    const ay = Math.abs(pad.axes[1] || 0) > 0.22 ? pad.axes[1] : 0;
    const dl = pad.buttons[14]?.pressed ? -1 : 0;
    const dr = pad.buttons[15]?.pressed ? 1 : 0;
    const du = pad.buttons[12]?.pressed ? -1 : 0;
    const dd = pad.buttons[13]?.pressed ? 1 : 0;
    return {
      x: ax || (dl + dr),
      y: ay || (du + dd),
      jump: !!(pad.buttons[2]?.pressed || pad.buttons[12]?.pressed),
      attack: !!pad.buttons[0]?.pressed,
      special: !!pad.buttons[1]?.pressed,
      shield: !!(pad.buttons[4]?.pressed || pad.buttons[5]?.pressed || pad.buttons[6]?.pressed || pad.buttons[7]?.pressed),
      smash: !!pad.buttons[3]?.pressed
    };
  }

  function gatherInputs() {
    const hasP2Human = match.fighters.some((f) => !f.isCpu && f.playerNum === 2);
    const out = {};

    // P1 — touch stick + buttons merge with keyboard/gamepad (stick-up jumps like ArrowUp)
    const gp1 = readGamepad(1);
    const stickJump = touchState.y < -0.45;
    const p1 = {
      x: touchState.x,
      y: touchState.y,
      jump: touchState.jump || stickJump,
      attack: touchState.attack,
      special: touchState.special,
      shield: touchState.shield,
      smash: touchState.smash
    };

    if (hasP2Human) {
      if (keysDown.has('KeyA')) p1.x -= 1;
      if (keysDown.has('KeyD')) p1.x += 1;
      if (keysDown.has('KeyW')) p1.y -= 1;
      if (keysDown.has('KeyS')) p1.y += 1;
      if (keysDown.has('KeyW') || keysDown.has('Space')) p1.jump = true;
      if (keysDown.has('KeyF')) p1.attack = true;
      if (keysDown.has('KeyG')) p1.special = true;
      if (keysDown.has('KeyH')) p1.shield = true;
      if (keysDown.has('KeyR')) p1.smash = true;
    } else {
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) p1.x -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) p1.x += 1;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) p1.y -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) p1.y += 1;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp') || keysDown.has('Space')) p1.jump = true;
      if (keysDown.has('KeyJ') || keysDown.has('KeyZ')) p1.attack = true;
      if (keysDown.has('KeyK') || keysDown.has('KeyX')) p1.special = true;
      if (keysDown.has('KeyL') || keysDown.has('KeyC') || keysDown.has('ShiftLeft')) p1.shield = true;
      if (keysDown.has('KeyU') || keysDown.has('KeyV')) p1.smash = true;
    }
    if (gp1) {
      p1.x = gp1.x || p1.x;
      p1.y = gp1.y || p1.y;
      p1.jump = p1.jump || gp1.jump;
      p1.attack = p1.attack || gp1.attack;
      p1.special = p1.special || gp1.special;
      p1.shield = p1.shield || gp1.shield;
      p1.smash = p1.smash || gp1.smash;
    }
    p1.x = Math.max(-1, Math.min(1, p1.x));
    p1.y = Math.max(-1, Math.min(1, p1.y));
    out[1] = p1;

    // P2
    if (hasP2Human) {
      const gp2 = readGamepad(2);
      const p2 = { x: 0, y: 0, jump: false, attack: false, special: false, shield: false, smash: false };
      if (keysDown.has('ArrowLeft')) p2.x -= 1;
      if (keysDown.has('ArrowRight')) p2.x += 1;
      if (keysDown.has('ArrowUp')) { p2.y -= 1; p2.jump = true; }
      if (keysDown.has('ArrowDown')) p2.y += 1;
      if (keysDown.has('Numpad1') || keysDown.has('Slash')) p2.attack = true;
      if (keysDown.has('Numpad2') || keysDown.has('Period')) p2.special = true;
      if (keysDown.has('Numpad3') || keysDown.has('Comma')) p2.shield = true;
      if (keysDown.has('Numpad0') || keysDown.has('ShiftRight')) p2.smash = true;
      if (gp2) {
        p2.x = gp2.x || p2.x;
        p2.y = gp2.y || p2.y;
        p2.jump = p2.jump || gp2.jump;
        p2.attack = p2.attack || gp2.attack;
        p2.special = p2.special || gp2.special;
        p2.shield = p2.shield || gp2.shield;
        p2.smash = p2.smash || gp2.smash;
      }
      out[2] = p2;
    }

    for (const fighter of match.fighters) {
      if (fighter.isCpu || fighter.playerNum < 3) continue;
      const pad = readGamepad(fighter.playerNum);
      if (pad) out[fighter.playerNum] = pad;
    }

    return out;
  }

  // --- Match Start & Loop ---
  function startMatch() {
    if ($('#deployBtn').disabled) return;
    Audio.unlock();
    Audio.play('start');
    cancelAnimationFrame(rafId);

    let config;
    if (gameMode === 'arcade') {
      const opp = ARCADE_PATH[arcadeRound] || ARCADE_PATH[0];
      config = {
        stageId: opp.stageId,
        mode: 'stock',
        stocks: 2,
        itemsEnabled: true,
        slots: [
          { ...slots[0], enabled: true, isCpu: false, playerNum: 1, team: 0 },
          { enabled: true, isCpu: true, playerNum: 2, charId: opp.charId, cpuLevel: opp.cpuLevel, team: 1 }
        ]
      };
      hudModeEl.textContent = `ARCADE STAGE ${arcadeRound + 1}/${ARCADE_PATH.length}`;
    } else if (gameMode === 'training') {
      config = {
        stageId: selectedStageId,
        mode: 'training',
        stocks: 99,
        itemsEnabled: true,
        slots: [
          { ...slots[0], enabled: true, isCpu: false, playerNum: 1, team: 0 },
          { enabled: true, isCpu: true, playerNum: 2, charId: slots[1].charId, cpuLevel: 'rookie', team: 1 }
        ]
      };
      hudModeEl.textContent = 'TRAINING ARENA';
    } else {
      const activeSlots = slots.filter((s) => s.enabled);
      if (activeSlots.length < 2) {
        slots[1].enabled = true;
        activeSlots.push(slots[1]);
      }
      config = {
        stageId: selectedStageId,
        mode: matchRule,
        stocks: stocksCount,
        timeLimit: timeLimitSec,
        itemsEnabled,
        teamBattle,
        slots: activeSlots.map((s, idx) => ({ ...s, team: teamBattle ? s.team : idx }))
      };
      hudModeEl.textContent = (teamBattle ? 'TEAM · ' : '') + (matchRule === 'stock' ? `${stocksCount} STOCK` : 'TIMED');
    }

    match = Engine.createMatch(config);
    $('#trainingOverlayBtn').hidden = config.mode !== 'training';
    running = true;
    paused = false;
    menuEl.hidden = true;
    gameEl.hidden = false;
    resultsEl.hidden = true;
    pauseEl.hidden = true;
    syncTouchChrome();
    fitCanvas();
    buildFighterHud();
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function buildFighterHud() {
    fighterCardsEl.replaceChildren();
    match.fighters.forEach((f) => {
      const card = document.createElement('div');
      card.className = 'f-hud';
      card.id = `fhud-${f.index}`;
      card.style.setProperty('--fcol', f.color);
      card.innerHTML = `
        <div class="f-hud-top">
          <span class="f-tag">${f.tag}</span>
          <span class="f-name">${f.def.emoji} ${f.def.title}</span>
          <span class="f-stocks"></span>
        </div>
        <div class="f-pct">0%</div>
      `;
      fighterCardsEl.append(card);
    });
  }

  function updateFighterHud() {
    if (!match) return;
    if (match.mode === 'timed' && !match.suddenDeath) {
      const s = Math.ceil(match.matchTimeLeft);
      const m = Math.floor(s / 60);
      const rem = String(s % 60).padStart(2, '0');
      hudTimerEl.textContent = `${m}:${rem}`;
    } else {
      hudTimerEl.textContent = match.suddenDeath ? 'SUDDEN DEATH' : match.stage.name;
    }

    for (const f of match.fighters) {
      const card = $(`#fhud-${f.index}`);
      if (!card) continue;
      card.classList.toggle('is-ko', f.eliminated);
      card.classList.toggle('is-ult', f.hasUltimate);
      const pctEl = card.querySelector('.f-pct');
      const stEl = card.querySelector('.f-stocks');
      const p = Math.floor(f.pct);
      pctEl.textContent = `${p}%`;
      pctEl.style.color = p >= 140 ? '#ef4444' : p >= 90 ? '#fb923c' : p >= 45 ? '#fde047' : '#f8fafc';
      if (match.mode === 'stock') {
        stEl.textContent = '●'.repeat(Math.max(0, f.stocks));
      } else {
        stEl.textContent = `KOs: ${f.kos}`;
      }
    }
  }

  function showResults() {
    const p1 = match.fighters[0];
    const p1Won = match.winner && match.winner.team === p1.team;

    career.kos += p1.kos;
    if (p1Won) {
      career.wins += 1;
      career.charWins[p1.def.id] = (career.charWins[p1.def.id] || 0) + 1;
    }

    if (gameMode === 'arcade' && p1Won) {
      if (arcadeRound + 1 < ARCADE_PATH.length) {
        arcadeRound += 1;
        saveStats(career);
        $('#resultsTitle').textContent = `STAGE ${arcadeRound} CLEARED!`;
        $('#resultsSummary').textContent = `${p1.def.fullName} advances! Next challenger awaits.`;
        $('#nextRoundBtn').hidden = false;
        $('#rematchBtn').hidden = true;
      } else {
        career.arcadeClears += 1;
        arcadeRound = 0;
        saveStats(career);
        $('#resultsTitle').textContent = '🏆 MOONROCK CHAMPION!';
        $('#resultsSummary').textContent = `${p1.def.fullName} conquered the entire Arcade Gauntlet!`;
        $('#nextRoundBtn').hidden = true;
        $('#rematchBtn').hidden = false;
      }
    } else {
      if (gameMode === 'arcade') arcadeRound = 0;
      saveStats(career);
      const winner = match.winner;
      const victor = winner && (match.teamBattle ? `TEAM ${winner.team + 1}` : winner.tag);
      $('#resultsTitle').textContent = victor ? `${victor} VICTORY!` : 'DRAW';
      $('#resultsSummary').textContent = winner && match.teamBattle ? match.fighters.filter(f => f.team === winner.team).map(f => f.def.title).join(' · ') : match.winner ? `${match.winner.def.emoji} ${match.winner.def.fullName} takes the match!` : 'Match complete.';
      $('#nextRoundBtn').hidden = true;
      $('#rematchBtn').hidden = false;
    }

    const table = $('#resultsTable');
    table.replaceChildren();
    match.fighters.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'res-row' + (match.winner && match.winner.team === f.team ? ' is-win' : '');
      row.innerHTML = `<span style="color:${f.color}">${f.tag} · ${f.def.emoji} ${f.def.fullName}</span><span>${f.kos} KOs · ${f.falls} Falls · ${Math.round(f.damageDealt)}% Dmg</span>`;
      table.append(row);
    });
    resultsEl.hidden = false;
    refreshCareerSummary();
  }

  function renderMatch() {
    const ctx = arenaCtx;
    const m = match;
    ctx.save();
    ctx.setTransform(arenaCanvas.width / W, 0, 0, arenaCanvas.height / H, 0, 0);

    Render.drawStageBackground(ctx, m.stage, W, H, m.time, m.cam);

    // Camera transform + shake
    const sx = m.shake > 0 ? (Math.random() - 0.5) * m.shake : 0;
    const sy = m.shake > 0 ? (Math.random() - 0.5) * m.shake : 0;
    ctx.save();
    ctx.translate(W * 0.5 + sx, H * 0.5 + sy);
    ctx.scale(m.cam.scale, m.cam.scale);
    ctx.translate(-m.cam.x, -m.cam.y);

    Render.drawStageGeometry(ctx, m.stage, m.platforms, m.time);

    for (const it of m.items) Render.drawItem(ctx, it, m.time);
    for (const tr of m.turrets) Render.drawTurret(ctx, tr);
    if (m.leyCore) Render.drawLeyCore(ctx, m.leyCore, m.time);

    for (const f of m.fighters) {
      if (!f.eliminated && f.respawnTimer <= 0) Render.drawFighter(ctx, f, m.time);
    }

    for (const p of m.projectiles) Render.drawProjectile(ctx, p, m.time);

    if (m.mode === 'training' && trainingOverlay) Render.drawTrainingOverlay(ctx, m);

    // Particles
    for (const pt of m.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // KO Beams
    for (const b of m.koBeams) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);
      ctx.globalAlpha = Math.max(0, b.life / 0.6);
      ctx.fillStyle = b.color;
      ctx.fillRect(0, -48 * (b.life / 0.6), 460, 96 * (b.life / 0.6));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -18 * (b.life / 0.6), 460, 36 * (b.life / 0.6));
      ctx.restore();
    }

    // Floating Popups
    ctx.font = '900 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const pop of m.popups) {
      ctx.globalAlpha = Math.min(1, pop.life * 1.4);
      ctx.fillStyle = '#000';
      ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Offscreen indicators
    Render.drawOffscreenIndicators(ctx, m.fighters, m.cam, W, H, m.cam.scale);

    // Center Banner (Countdown / MASH! / VICTORY)
    if (m.bannerTimer > 0 && m.bannerText) {
      ctx.save();
      ctx.font = '900 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(m.bannerText, W * 0.5 + 3, H * 0.42 + 3);
      ctx.fillStyle = '#fde047';
      ctx.fillText(m.bannerText, W * 0.5, H * 0.42);
      ctx.restore();
    }

    ctx.restore();
  }

  function loop(ts) {
    if (!running) return;
    if (!paused) {
      const dt = Math.min(0.033, Math.max(0.001, (ts - lastTs) / 1000));
      lastTs = ts;
      const inputs = gatherInputs();
      Engine.stepMatch(match, inputs, dt);
      renderMatch();
      updateFighterHud();
      if (match.over && resultsEl.hidden) {
        showResults();
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function exitToMenu() {
    running = false;
    paused = false;
    cancelAnimationFrame(rafId);
    keysDown.clear();
    touchState.x = 0;
    touchState.y = 0;
    touchState.jump = touchState.attack = touchState.special = touchState.shield = touchState.smash = false;
    gameEl.hidden = true;
    resultsEl.hidden = true;
    pauseEl.hidden = true;
    menuEl.hidden = false;
    syncTouchChrome();
    renderRosterGrid();
    renderInspector();
    requestAnimationFrame(renderPreviewLoop);
  }

  function togglePause() {
    if (!running || match?.over) return;
    paused = !paused;
    pauseEl.hidden = !paused;
    if (!paused) lastTs = performance.now();
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(W * dpr);
    const bh = Math.round(H * dpr);
    if (arenaCanvas.width !== bw || arenaCanvas.height !== bh) {
      arenaCanvas.width = bw;
      arenaCanvas.height = bh;
    }
    arenaCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function onViewportChange() {
    syncTouchChrome();
    fitCanvas();
  }
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
  }

  // --- Keyboard & Touch Listeners ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (running) { e.preventDefault(); togglePause(); }
      return;
    }
    if (running && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    keysDown.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
  });
  window.addEventListener('blur', () => keysDown.clear());

  // Touch Virtual Joystick & Action Buttons
  const stickZone = $('#touchStickZone');
  const stickKnob = $('#touchStickKnob');
  let stickPtr = null;
  function updateStick(e) {
    const r = stickZone.getBoundingClientRect();
    const cx = r.left + r.width * 0.5;
    const cy = r.top + r.height * 0.5;
    const maxR = r.width * 0.36;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const clampD = Math.min(maxR, dist);
    const nx = (dx / dist) * (clampD / maxR);
    const ny = (dy / dist) * (clampD / maxR);
    touchState.x = Math.abs(nx) < 0.2 ? 0 : nx;
    touchState.y = Math.abs(ny) < 0.2 ? 0 : ny;
    stickKnob.style.transform = `translate(${nx * maxR}px, ${ny * maxR}px)`;
  }
  if (stickZone) {
    stickZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Audio.unlock();
      stickPtr = e.pointerId;
      try { stickZone.setPointerCapture(e.pointerId); } catch (_) {}
      updateStick(e);
    });
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId === stickPtr) {
        e.preventDefault();
        updateStick(e);
      }
    });
    const resetStick = (e) => {
      if (e.pointerId !== stickPtr) return;
      stickPtr = null;
      touchState.x = 0;
      touchState.y = 0;
      stickKnob.style.transform = 'translate(0px, 0px)';
    };
    stickZone.addEventListener('pointerup', resetStick);
    stickZone.addEventListener('pointercancel', resetStick);
  }

  document.querySelectorAll('[data-tact]').forEach((btn) => {
    const act = btn.dataset.tact;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Audio.unlock();
      touchState[act] = true;
      btn.classList.add('is-held');
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const rel = () => {
      touchState[act] = false;
      btn.classList.remove('is-held');
    };
    btn.addEventListener('pointerup', rel);
    btn.addEventListener('pointercancel', rel);
    btn.addEventListener('lostpointercapture', rel);
  });

  // --- Wire Menu Controls ---
  document.querySelectorAll('[data-gmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Audio.unlock();
      Audio.play('select');
      gameMode = btn.dataset.gmode;
      if (gameMode === 'arcade') arcadeRound = 0;
      renderModeTabs();
      renderSlots();
    });
  });

  $('#ruleTypeSelect')?.addEventListener('change', (e) => { matchRule = e.target.value; });
  $('#stocksSelect')?.addEventListener('change', (e) => { stocksCount = Number(e.target.value) || 3; });
  $('#teamsToggle')?.addEventListener('change', (e) => {
    teamBattle = e.target.checked;
    renderSlots();
  });
  $('#itemsToggle')?.addEventListener('change', (e) => { itemsEnabled = e.target.checked; });

  $('#deployBtn')?.addEventListener('click', startMatch);
  $('#trainingOverlayBtn')?.addEventListener('click', (e) => {
    trainingOverlay = !trainingOverlay;
    e.currentTarget.setAttribute('aria-pressed', String(trainingOverlay));
  });
  $('#pauseBtn')?.addEventListener('click', togglePause);
  $('#resumeBtn')?.addEventListener('click', togglePause);
  $('#quitMatchBtn')?.addEventListener('click', exitToMenu);
  $('#rematchBtn')?.addEventListener('click', startMatch);
  $('#nextRoundBtn')?.addEventListener('click', startMatch);
  $('#resultsMenuBtn')?.addEventListener('click', exitToMenu);

  const muteBtn = $('#muteBtn');
  const syncMute = () => {
    const m = Audio.isMuted();
    if (muteBtn) muteBtn.textContent = m ? '🔇' : '🔊';
  };
  syncMute();
  muteBtn?.addEventListener('click', () => {
    Audio.toggleMute();
    syncMute();
  });

  // --- Init ---
  renderModeTabs();
  renderRosterGrid();
  renderSlots();
  renderStageRow();
  renderInspector();
  refreshCareerSummary();
  syncTouchChrome();
  fitCanvas();
  requestAnimationFrame(renderPreviewLoop);
})();
