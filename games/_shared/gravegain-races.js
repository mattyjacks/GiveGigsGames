// GraveGain 3D & 2D Playable Race Models — High-Detail Edition (Human, Elf, Dwarf, Orc)
// Requires /games/_shared/gravegain-kit.js (window.GGG_GRAVEGAIN_KIT)
// Every model returns outer `root` wrapping inner `rig` so animations never break normalizeModel() centering.

(function () {
  'use strict';

  const K = window.GGG_GRAVEGAIN_KIT;
  if (!K) return;
  const loadouts = new WeakMap();

  // Shared helper to construct articulated base leg + boot
  function buildLeg(THREE, rig, x, hipY, thighLen, shinLen, mats, opts) {
    const o = opts || {};
    const side = x < 0 ? -1 : 1;
    const leg = K.joint(THREE, rig, x, hipY, 0);
    const r = o.radius || 0.082;

    K.add(THREE, leg, new THREE.CylinderGeometry(r * 1.1, r * 0.9, thighLen, 10), mats.thigh, [0, -thighLen * 0.5, 0]);
    // Thigh armor strap / plate
    K.add(THREE, leg, new THREE.BoxGeometry(r * 2.15, thighLen * 0.42, r * 2.1), mats.trim, [side * 0.01, -thighLen * 0.48, 0.01]);
    // Knee joint & cop
    K.add(THREE, leg, new THREE.SphereGeometry(r * 0.95, 8, 6), mats.dark, [0, -thighLen, 0]);
    const knee = K.add(THREE, leg, new THREE.OctahedronGeometry(r * 0.72, 0), mats.trim, [0, -thighLen, r * 0.85]);
    knee.scale.set(1.1, 1.2, 0.6);

    const shin = K.joint(THREE, leg, 0, -thighLen, 0);
    K.add(THREE, shin, new THREE.CylinderGeometry(r * 0.88, r * 0.72, shinLen, 10), mats.shin, [0, -shinLen * 0.5, 0]);
    // Shin greave plate
    K.add(THREE, shin, new THREE.BoxGeometry(r * 1.65, shinLen * 0.65, r * 0.9), mats.trim, [0, -shinLen * 0.45, r * 0.55]);
    if (o.spikeKnee) {
      K.add(THREE, leg, new THREE.ConeGeometry(0.032, 0.1, 5), mats.trim, [0, -thighLen + 0.02, r * 1.25], [Math.PI / 2.3, 0, 0]);
    }

    const foot = K.joint(THREE, shin, 0, -shinLen, 0);
    const boot = K.makeBoot(THREE, mats.bootUpper || mats.shin, mats.trim, mats.dark, o.bootScale || 1);
    foot.add(boot);
    return { leg, shin, foot };
  }

  // Shared helper to construct articulated arm + pauldron + forearm + hand
  function buildArm(THREE, chest, x, shoulderY, upperLen, foreLen, mats, opts) {
    const o = opts || {};
    const side = x < 0 ? -1 : 1;
    const arm = K.joint(THREE, chest, x, shoulderY, 0);
    const r = o.radius || 0.068;

    arm.add(K.makePauldron(THREE, mats.pauldron, mats.trim, {
      side,
      scale: o.pauldronScale || 1.0,
      spikes: !!o.spikes
    }));

    K.add(THREE, arm, new THREE.CylinderGeometry(r * 1.05, r * 0.88, upperLen, 9), mats.upper, [0, -upperLen * 0.5, 0]);
    if (o.armBand) {
      K.add(THREE, arm, new THREE.TorusGeometry(r * 1.02, 0.015, 6, 12), mats.trim, [0, -upperLen * 0.5, 0], [Math.PI / 2, 0, 0]);
    }
    K.add(THREE, arm, new THREE.SphereGeometry(r * 0.88, 8, 6), mats.dark, [0, -upperLen, 0]);

    const forearm = K.joint(THREE, arm, 0, -upperLen, 0);
    K.add(THREE, forearm, new THREE.CylinderGeometry(r * 0.85, r * 0.72, foreLen, 9), mats.fore, [0, -foreLen * 0.5, 0]);
    // Bracer cuff
    K.add(THREE, forearm, new THREE.CylinderGeometry(r * 0.98, r * 0.86, foreLen * 0.62, 8), mats.trim, [0, -foreLen * 0.58, 0]);

    const hand = K.makeHand(THREE, mats.hand || mats.fore, mats.trim, side, {
      scale: o.handScale || 1,
      claws: !!o.claws
    });
    hand.position.set(0, -foreLen - 0.04, 0);
    forearm.add(hand);
    return { arm, forearm, hand };
  }

  window.GGG_MODEL_CATALOG = window.GGG_MODEL_CATALOG || [];

  window.GGG_MODEL_CATALOG.push(
    // ================================================================
    // 1. HUMAN VANGUARD (MoonRock EVA)
    // ================================================================
    {
      id: 'gg-race-human',
      name: 'Human Vanguard (MoonRock EVA)',
      game: 'GraveGain 3D / 2D',
      category: 'Characters',
      tags: ['human', 'player', 'race', 'astronaut', 'eva', 'jetpack', 'shield', 'animated'],
      description: 'Highly detailed sealed MoonRock EVA Vanguard with HUD visor, dual oxygen hoses, Shield-Wall core, deployable hex shield, pulse carbine, and dual-thruster jetpack (23 animations).',
      build: function createHumanVanguard(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const suitMat = K.mat(THREE, { color: 0x2b5a94, accent: 0x93c5fd, texKind: 'armor', bumpKind: 'armor', roughness: 0.42, metalness: 0.35 });
        const plateMat = K.mat(THREE, { color: 0xe2e8f0, accent: 0x64748b, texKind: 'metal', bumpKind: 'metal', roughness: 0.28, metalness: 0.58 });
        const darkMat = K.mat(THREE, { color: 0x1e293b, accent: 0x475569, texKind: 'leather', roughness: 0.65, metalness: 0.35 });
        const visorMat = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.85, roughness: 0.1, metalness: 0.9 });
        const amberMat = K.mat(THREE, { color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.7 });
        const gunMat = K.mat(THREE, { color: 0x334155, texKind: 'metal', roughness: 0.35, metalness: 0.75 });
        const shieldMat = K.mat(THREE, { color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.9, transparent: true, opacity: 0.42, side: THREE.DoubleSide });

        // Pelvis & Tactical Belt
        const pelvis = K.joint(THREE, rig, 0, 0.78, 0);
        K.add(THREE, pelvis, new THREE.CylinderGeometry(0.22, 0.19, 0.18, 10), darkMat);
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.24, 0.16, 0.28), plateMat, [0, -0.04, 0.04]);
        K.add(THREE, pelvis, new THREE.CylinderGeometry(0.235, 0.235, 0.075, 12), darkMat, [0, 0.07, 0]);
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.11, 0.08, 0.05), amberMat, [0, 0.07, 0.23]); // buckle
        [[-0.22, 0.04, 0.14], [0.22, 0.04, 0.14], [-0.23, 0.04, -0.08], [0.23, 0.04, -0.08]].forEach(p => {
          K.add(THREE, pelvis, new THREE.BoxGeometry(0.08, 0.1, 0.09), darkMat, p);
        });

        // Torso & Chest
        const torso = K.joint(THREE, pelvis, 0, 0.14, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.24, 0.2, 0.26, 10), darkMat, [0, 0.11, 0]);
        // Segmented ab plates
        for (let ab = 0; ab < 3; ab++) {
          K.add(THREE, torso, new THREE.BoxGeometry(0.26 - ab * 0.015, 0.055, 0.25), suitMat, [0, 0.04 + ab * 0.075, 0.02]);
        }

        const chest = K.joint(THREE, torso, 0, 0.34, 0);
        K.add(THREE, chest, new THREE.BoxGeometry(0.5, 0.34, 0.3), suitMat);
        // Sculpted beveled breastplate
        const breast = K.extrude(THREE, [[-0.22, -0.14], [0.22, -0.14], [0.25, 0.06], [0.16, 0.17], [-0.16, 0.17], [-0.25, 0.06]], 0.09, 0.015, plateMat);
        breast.position.set(0, 0.02, 0.14);
        chest.add(breast);
        // Shield-Wall Chest Reactor Core + Spin Ring
        K.add(THREE, chest, new THREE.CylinderGeometry(0.095, 0.105, 0.04, 12), darkMat, [0, 0.03, 0.195], [Math.PI / 2, 0, 0]);
        K.add(THREE, chest, new THREE.CylinderGeometry(0.065, 0.065, 0.048, 8), visorMat, [0, 0.03, 0.2], [Math.PI / 2, 0, 0]);
        const coreRing = K.add(THREE, chest, new THREE.TorusGeometry(0.08, 0.012, 6, 16), amberMat, [0, 0.03, 0.215]);
        // Clavicle shoulder bridges
        [-1, 1].forEach(s => {
          K.add(THREE, chest, new THREE.BoxGeometry(0.16, 0.07, 0.24), plateMat, [s * 0.2, 0.17, 0], [0, 0, -s * 0.18]);
        });

        // Dual-Thruster EVA Jetpack
        const pack = K.joint(THREE, chest, 0, 0.02, -0.22);
        K.add(THREE, pack, new THREE.BoxGeometry(0.38, 0.4, 0.18), plateMat);
        K.add(THREE, pack, new THREE.BoxGeometry(0.24, 0.28, 0.22), darkMat);
        K.add(THREE, pack, new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), visorMat, [0, 0.05, -0.11], [Math.PI / 2, 0, 0]);
        const jetpackFlames = [];
        [-1, 1].forEach(s => {
          // Fuel canister + cap
          K.add(THREE, pack, new THREE.CylinderGeometry(0.075, 0.075, 0.36, 10), suitMat, [s * 0.14, 0.02, -0.06]);
          K.add(THREE, pack, new THREE.SphereGeometry(0.075, 8, 6), amberMat, [s * 0.14, 0.2, -0.06]);
          // Stabilizer winglet
          K.add(THREE, pack, new THREE.BoxGeometry(0.14, 0.18, 0.03), plateMat, [s * 0.24, 0.08, -0.05], [0, -s * 0.3, s * 0.35]);
          // Thruster Lathe bell nozzle
          const noz = K.lathe(THREE, [[0.03, 0.08], [0.05, 0.04], [0.078, -0.06], [0.09, -0.1]], 10, gunMat);
          noz.position.set(s * 0.14, -0.2, -0.06);
          pack.add(noz);
          // Exhaust Flame
          const flame = K.makeFlameCluster(THREE, 0x38bdf8, 0xe0f2fe, 0.85);
          flame.rotation.x = Math.PI;
          flame.position.set(s * 0.14, -0.28, -0.06);
          pack.add(flame);
          jetpackFlames.push(flame);
        });

        // Neck & Sealed EVA Helmet
        const neck = K.joint(THREE, chest, 0, 0.2, 0);
        K.add(THREE, neck, new THREE.CylinderGeometry(0.11, 0.13, 0.09, 10), darkMat, [0, 0.03, 0]);
        K.add(THREE, neck, new THREE.TorusGeometry(0.145, 0.028, 8, 16), plateMat, [0, 0.05, 0], [Math.PI / 2, 0, 0]);

        const head = K.joint(THREE, neck, 0, 0.18, 0);
        // Helmet outer shell & visor frame
        K.add(THREE, head, new THREE.SphereGeometry(0.225, 16, 14), plateMat, [0, 0.02, -0.01], [0, 0, 0], [0.98, 1.04, 1.06]);
        K.add(THREE, head, new THREE.BoxGeometry(0.32, 0.16, 0.14), darkMat, [0, 0.02, 0.13]);
        // Curved glowing HUD Visor
        const visor = K.add(THREE, head, new THREE.SphereGeometry(0.205, 16, 12, -1.0, 2.0, 0.72, 1.15), visorMat, [0, 0.02, 0.038]);
        visor.scale.set(0.95, 0.92, 1.02);
        // Brow crest + headlamp
        K.add(THREE, head, new THREE.BoxGeometry(0.22, 0.055, 0.18), suitMat, [0, 0.19, 0.08]);
        K.add(THREE, head, new THREE.CylinderGeometry(0.032, 0.035, 0.04, 8), amberMat, [0, 0.2, 0.18], [Math.PI / 2, 0, 0]);
        // Chin respirator + side ear comms + oxygen hoses
        K.add(THREE, head, new THREE.BoxGeometry(0.16, 0.09, 0.12), darkMat, [0, -0.1, 0.17]);
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), suitMat, [s * 0.21, 0.01, 0], [0, 0, Math.PI / 2]);
          K.add(THREE, head, new THREE.CylinderGeometry(0.03, 0.035, 0.07, 8), darkMat, [s * 0.12, -0.1, 0.15], [0.4, 0, s * 0.3]);
          // Corrugated oxygen hose to chest
          const hose = K.tube(THREE, [
            [s * 0.12, 0.34, 0.14],
            [s * 0.2, 0.24, 0.18],
            [s * 0.16, 0.12, 0.18]
          ], 0.018, 12, 6, darkMat);
          chest.add(hose);
        });
        // Comms whip antenna + tip beacon
        K.add(THREE, head, new THREE.CylinderGeometry(0.008, 0.014, 0.28, 6), darkMat, [0.22, 0.17, -0.04]);
        K.add(THREE, head, new THREE.SphereGeometry(0.022, 6, 6), visorMat, [0.22, 0.32, -0.04]);

        // Arms + Pulse Carbine + Deployable Shield Dome
        const left = buildArm(THREE, chest, -0.34, 0.12, 0.28, 0.27, {
          pauldron: plateMat, upper: suitMat, fore: plateMat, dark: darkMat, trim: suitMat, hand: darkMat
        }, { pauldronScale: 1.02 });
        // Wrist Shield Emitter + Hex Shield Dome
        K.add(THREE, left.forearm, new THREE.BoxGeometry(0.08, 0.12, 0.11), darkMat, [-0.05, -0.15, 0.02]);
        K.add(THREE, left.forearm, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 6), visorMat, [-0.09, -0.15, 0.02], [0, 0, Math.PI / 2]);
        const shieldDome = K.joint(THREE, left.forearm, -0.14, -0.15, 0.05);
        K.add(THREE, shieldDome, new THREE.CylinderGeometry(0.48, 0.48, 0.04, 6), shieldMat, [0, 0, 0], [0, 0, Math.PI / 2]);
        K.add(THREE, shieldDome, new THREE.TorusGeometry(0.46, 0.018, 6, 6), visorMat, [0, 0, 0], [0, Math.PI / 2, 0]);
        shieldDome.scale.setScalar(0.001);

        const right = buildArm(THREE, chest, 0.34, 0.12, 0.28, 0.27, {
          pauldron: plateMat, upper: suitMat, fore: plateMat, dark: darkMat, trim: suitMat, hand: darkMat
        }, { pauldronScale: 1.02 });
        // Pulse Carbine held in right hand
        const gun = K.joint(THREE, right.forearm, 0, -0.32, 0.12);
        gun.rotation.x = Math.PI / 2;
        K.add(THREE, gun, new THREE.BoxGeometry(0.08, 0.13, 0.56), gunMat, [0, 0.03, 0.12]);
        K.add(THREE, gun, new THREE.CylinderGeometry(0.022, 0.024, 0.32, 8), plateMat, [0, 0.05, 0.48], [Math.PI / 2, 0, 0]);
        K.add(THREE, gun, new THREE.BoxGeometry(0.04, 0.03, 0.38), visorMat, [0, 0.075, 0.16]); // energy rail
        K.add(THREE, gun, new THREE.BoxGeometry(0.045, 0.05, 0.16), darkMat, [0, 0.12, 0.04]); // holo scope
        K.add(THREE, gun, new THREE.BoxGeometry(0.05, 0.14, 0.06), amberMat, [0, -0.07, 0.18]); // magazine

        // Legs
        const leftLeg = buildLeg(THREE, rig, -0.145, 0.72, 0.34, 0.34, {
          thigh: suitMat, shin: plateMat, dark: darkMat, trim: suitMat, bootUpper: plateMat
        }, { radius: 0.084, bootScale: 1.02 });
        const rightLeg = buildLeg(THREE, rig, 0.145, 0.72, 0.34, 0.34, {
          thigh: suitMat, shin: plateMat, dark: darkMat, trim: suitMat, bootUpper: plateMat
        }, { radius: 0.084, bootScale: 1.02 });

        const parts = {
          rig, pelvis, torso, chest, neck, head,
          leftArm: left.arm, leftForearm: left.forearm,
          rightArm: right.arm, rightForearm: right.forearm,
          leftLeg: leftLeg.leg, leftShin: leftLeg.shin, leftFoot: leftLeg.foot,
          rightLeg: rightLeg.leg, rightShin: rightLeg.shin, rightFoot: rightLeg.foot
        };
        loadouts.set(root, { right: right.hand, left: left.hand, chest, head, pelvis, original: [gun] });
        root.userData.animations = K.RACE_ANIMATIONS;
        root.userData.animate = K.createHumanoidAnimator(parts, {
          race: 'human',
          jetpackFlames,
          shieldDome,
          auraRings: [coreRing]
        });
        return root;
      }
    },

    // ================================================================
    // 2. ELVEN SPELLBLADE (MoonRock Grove)
    // ================================================================
    {
      id: 'gg-race-elf',
      name: 'Elven Spellblade (MoonRock Grove)',
      game: 'GraveGain 3D / 2D',
      category: 'Characters',
      tags: ['elf', 'player', 'race', 'mage', 'bioluminescent', 'light-spirits', 'animated'],
      description: 'Tall bioluminescent Northern Grove Spellblade with glowing BrightEyes, braided silver-jade hair, 3 orbiting Light Spirits, filigree battle-skirt, and Moonstone Staff-Glaive (23 animations).',
      build: function createElvenSpellblade(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const robeMat = K.mat(THREE, { color: 0x0f766e, accent: 0x5eead4, texKind: 'cloth', bumpKind: 'cloth', roughness: 0.55, metalness: 0.15 });
        const goldMat = K.mat(THREE, { color: 0xfbbf24, accent: 0xfef08a, texKind: 'metal', roughness: 0.25, metalness: 0.85 });
        const skinMat = K.mat(THREE, { color: 0xe2e8f0, accent: 0xcbd5e1, texKind: 'skin', roughness: 0.58, metalness: 0.05 });
        const hairMat = K.mat(THREE, { color: 0xa7f3d0, accent: 0x34d399, texKind: 'cloth', roughness: 0.5, metalness: 0.15 });
        const glowMat = K.mat(THREE, { color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.0, roughness: 0.15 });
        const moonMat = K.mat(THREE, { color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0.35 });
        const woodMat = K.mat(THREE, { color: 0x3f2e21, texKind: 'wood', roughness: 0.75 });

        // Pelvis & Layered Tasset Battle-Skirt
        const pelvis = K.joint(THREE, rig, 0, 0.84, 0);
        K.add(THREE, pelvis, new THREE.CylinderGeometry(0.17, 0.2, 0.16, 10), robeMat);
        K.add(THREE, pelvis, new THREE.TorusGeometry(0.185, 0.025, 6, 16), goldMat, [0, 0.06, 0], [Math.PI / 2, 0, 0]);
        K.add(THREE, pelvis, new THREE.OctahedronGeometry(0.05, 0), moonMat, [0, 0.06, 0.2]);

        const tassets = [];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + Math.PI * 0.2;
          const piv = K.joint(THREE, pelvis, Math.sin(a) * 0.18, 0.02, Math.cos(a) * 0.18);
          piv.rotation.y = a;
          const panel = K.extrude(THREE, [[-0.08, 0], [0.08, 0], [0.11, -0.44], [0, -0.52], [-0.11, -0.44]], 0.02, 0.005, i % 2 === 0 ? robeMat : goldMat);
          panel.rotation.x = -0.15;
          piv.add(panel);
          K.add(THREE, piv, new THREE.BoxGeometry(0.02, 0.32, 0.026), glowMat, [0, -0.24, 0.015]);
          tassets.push(piv);
        }

        // Torso & High-Collared Filigree Chest
        const torso = K.joint(THREE, pelvis, 0, 0.12, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.19, 0.155, 0.28, 10), robeMat, [0, 0.12, 0]);
        const chest = K.joint(THREE, torso, 0, 0.34, 0);
        K.add(THREE, chest, new THREE.CylinderGeometry(0.22, 0.185, 0.3, 10), robeMat);
        // Sculpted golden leaf corset filigree
        const corset = K.extrude(THREE, [[-0.16, -0.14], [0.16, -0.14], [0.21, 0.1], [0, 0.16], [-0.21, 0.1]], 0.05, 0.01, goldMat);
        corset.position.set(0, 0.0, 0.13);
        chest.add(corset);
        K.add(THREE, chest, new THREE.OctahedronGeometry(0.055, 0), glowMat, [0, 0.05, 0.17]);
        // Winged Arcane High Collar
        [-1, 1].forEach(s => {
          const wing = K.extrude(THREE, [[0, 0], [0.14, 0.02], [0.18, 0.24], [0.04, 0.2]], 0.025, 0.006, goldMat);
          wing.position.set(s * 0.12, 0.12, -0.12);
          wing.rotation.set(-0.22, s * 0.45, -s * 0.2);
          chest.add(wing);
        });

        // Graceful Neck & Head with BrightEyes, Pointed Ears & Braids
        const neck = K.joint(THREE, chest, 0, 0.18, 0);
        K.add(THREE, neck, new THREE.CylinderGeometry(0.068, 0.082, 0.11, 10), skinMat, [0, 0.04, 0]);
        const head = K.joint(THREE, neck, 0, 0.18, 0);
        K.add(THREE, head, new THREE.SphereGeometry(0.18, 16, 14), skinMat, [0, 0.01, 0], [0, 0, 0], [0.9, 1.08, 0.96]);
        // Sculpted nose & chin
        K.add(THREE, head, new THREE.ConeGeometry(0.02, 0.055, 4), skinMat, [0, 0.0, 0.175], [Math.PI / 2.2, 0, 0]);
        // Luminous BrightEyes
        [-1, 1].forEach(s => {
          const eye = K.add(THREE, head, new THREE.SphereGeometry(0.026, 8, 6), glowMat, [s * 0.064, 0.025, 0.155]);
          eye.scale.set(1.25, 0.72, 0.6);
          // Pointed Elf Ears + Triple Gold Ear Cuffs
          const ear = K.add(THREE, head, new THREE.ConeGeometry(0.042, 0.24, 5), skinMat, [s * 0.22, 0.04, -0.02], [0, -s * 0.28, -s * 1.12]);
          [0.02, 0.06, 0.1].forEach(off => {
            const cuff = K.add(THREE, head, new THREE.TorusGeometry(0.026, 0.006, 5, 10), goldMat, [s * (0.19 + off * 0.6), 0.03 + off * 0.35, -0.02]);
            cuff.rotation.y = Math.PI / 2;
          });
          void ear;
        });
        // Hair Crown & Crescent Moon Tiara
        K.add(THREE, head, new THREE.SphereGeometry(0.195, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat, [0, 0.03, -0.015], [-0.22, 0, 0]);
        K.add(THREE, head, new THREE.TorusGeometry(0.185, 0.016, 6, 20), goldMat, [0, 0.08, 0], [Math.PI / 2 - 0.15, 0, 0]);
        K.add(THREE, head, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI * 1.3), goldMat, [0, 0.13, 0.17], [0, 0, 0.9]);
        K.add(THREE, head, new THREE.OctahedronGeometry(0.032, 0), moonMat, [0, 0.14, 0.185]);

        const braids = [];
        [-1, 1].forEach(s => {
          const b = K.tube(THREE, [
            [s * 0.14, 0.04, -0.08],
            [s * 0.19, -0.14, -0.14],
            [s * 0.15, -0.36, -0.18]
          ], 0.03, 12, 6, hairMat);
          head.add(b);
          braids.push(b);
        });
        const backBraid = K.tube(THREE, [[0, 0.04, -0.17], [0, -0.22, -0.26], [0, -0.52, -0.28]], 0.042, 14, 7, hairMat);
        head.add(backBraid);
        braids.push(backBraid);

        // Arms + Moonstone Crescent Staff-Glaive + Nature Burst Spell-Sigil
        const left = buildArm(THREE, chest, -0.27, 0.12, 0.3, 0.28, {
          pauldron: goldMat, upper: robeMat, fore: skinMat, dark: goldMat, trim: goldMat, hand: skinMat
        }, { radius: 0.056, pauldronScale: 0.85, handScale: 0.9 });
        const spellRing = K.add(THREE, left.forearm, new THREE.TorusGeometry(0.14, 0.012, 6, 16), glowMat, [0, -0.36, 0.08], [Math.PI / 2, 0, 0]);
        K.add(THREE, left.forearm, new THREE.OctahedronGeometry(0.065, 0), moonMat, [0, -0.36, 0.08]);

        const right = buildArm(THREE, chest, 0.27, 0.12, 0.3, 0.28, {
          pauldron: goldMat, upper: robeMat, fore: skinMat, dark: goldMat, trim: goldMat, hand: skinMat
        }, { radius: 0.056, pauldronScale: 0.85, handScale: 0.9 });
        const staff = K.joint(THREE, right.forearm, 0, -0.32, 0.08);
        staff.rotation.x = Math.PI / 2.2;
        K.add(THREE, staff, new THREE.CylinderGeometry(0.022, 0.026, 1.55, 8), woodMat, [0, 0.25, 0]);
        K.add(THREE, staff, new THREE.TorusGeometry(0.12, 0.018, 6, 14, Math.PI * 1.45), goldMat, [0, 1.1, 0], [0, 0, -0.7]);
        const glaiveBlade = K.extrude(THREE, [[0, 0], [0.12, 0.16], [0.04, 0.44], [-0.04, 0.22]], 0.02, 0.005, moonMat);
        glaiveBlade.position.set(0.06, 1.05, 0);
        staff.add(glaiveBlade);
        const staffGem = K.add(THREE, staff, new THREE.OctahedronGeometry(0.075, 0), glowMat, [0, 1.12, 0]);
        const staffRing = K.add(THREE, staff, new THREE.TorusGeometry(0.15, 0.01, 6, 16), moonMat, [0, 1.12, 0], [Math.PI / 3, 0, 0]);

        // 3 Orbiting Light Spirits
        const orbitOrbs = [];
        for (let i = 0; i < 3; i++) {
          const orb = K.joint(THREE, rig, 0, 1.35, 0);
          K.add(THREE, orb, new THREE.OctahedronGeometry(0.048, 0), i % 2 === 0 ? glowMat : moonMat);
          K.add(THREE, orb, new THREE.TorusGeometry(0.08, 0.007, 5, 12), goldMat, [0, 0, 0], [Math.PI / 3, i, 0]);
          orbitOrbs.push(orb);
        }

        // Slender Articulated Legs
        const leftLeg = buildLeg(THREE, rig, -0.115, 0.78, 0.38, 0.38, {
          thigh: robeMat, shin: robeMat, dark: goldMat, trim: goldMat, bootUpper: robeMat
        }, { radius: 0.066, bootScale: 0.9 });
        const rightLeg = buildLeg(THREE, rig, 0.115, 0.78, 0.38, 0.38, {
          thigh: robeMat, shin: robeMat, dark: goldMat, trim: goldMat, bootUpper: robeMat
        }, { radius: 0.066, bootScale: 0.9 });

        const parts = {
          rig, pelvis, torso, chest, neck, head,
          leftArm: left.arm, leftForearm: left.forearm,
          rightArm: right.arm, rightForearm: right.forearm,
          leftLeg: leftLeg.leg, leftShin: leftLeg.shin, leftFoot: leftLeg.foot,
          rightLeg: rightLeg.leg, rightShin: rightLeg.shin, rightFoot: rightLeg.foot
        };
        loadouts.set(root, { right: right.hand, left: left.hand, chest, head, pelvis, original: [staff] });
        root.userData.animations = K.RACE_ANIMATIONS;
        root.userData.animate = K.createHumanoidAnimator(parts, {
          race: 'elf',
          armSwing: 0.85,
          legSwing: 0.78,
          tassets,
          braids,
          orbitOrbs,
          auraRings: [spellRing, staffRing, staffGem]
        });
        return root;
      }
    },

    // ================================================================
    // 3. DWARVEN IRONBREAKER (Highlands)
    // ================================================================
    {
      id: 'gg-race-dwarf',
      name: 'Dwarven Ironbreaker (Highlands)',
      game: 'GraveGain 3D / 2D',
      category: 'Characters',
      tags: ['dwarf', 'player', 'race', 'tank', 'hammer', 'shield', 'sparkite', 'animated'],
      description: 'Stout Central Highlands Ironbreaker in horned runic plate with braided ringed beard, glowing Sparkite chest furnace, alchemical brew flasks, steam tanks, tower shield, and Warhammer (23 animations).',
      build: function createDwarvenIronbreaker(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const plateMat = K.mat(THREE, { color: 0x475569, accent: 0xcbd5e1, texKind: 'armor', bumpKind: 'armor', roughness: 0.38, metalness: 0.72 });
        const bronzeMat = K.mat(THREE, { color: 0xd97706, accent: 0xfef08a, texKind: 'metal', roughness: 0.28, metalness: 0.82 });
        const beardMat = K.mat(THREE, { color: 0x9a3412, accent: 0xea580c, texKind: 'leather', roughness: 0.85 });
        const skinMat = K.mat(THREE, { color: 0xe7b99b, texKind: 'skin', roughness: 0.7 });
        const sparkMat = K.mat(THREE, { color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.0, roughness: 0.15 });
        const brewMat = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.75, transparent: true, opacity: 0.85 });
        const darkMat = K.mat(THREE, { color: 0x1e293b, texKind: 'leather', roughness: 0.75 });

        // Stout Pelvis & Studded Anvil War-Belt + Hanging Alchemical Flasks
        const pelvis = K.joint(THREE, rig, 0, 0.54, 0);
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.54, 0.2, 0.38), plateMat);
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.58, 0.11, 0.42), darkMat, [0, 0.08, 0]);
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.18, 0.13, 0.06), bronzeMat, [0, 0.08, 0.22]); // anvil buckle
        K.add(THREE, pelvis, new THREE.OctahedronGeometry(0.04, 0), sparkMat, [0, 0.08, 0.255]);
        // Two LatheGeometry Alchemical Brew Flasks hanging from belt
        [-1, 1].forEach(s => {
          const flask = K.lathe(THREE, [[0, 0], [0.055, 0.01], [0.062, 0.06], [0.025, 0.1], [0.032, 0.13]], 10, brewMat);
          flask.position.set(s * 0.27, -0.06, 0.12);
          pelvis.add(flask);
          K.add(THREE, pelvis, new THREE.CylinderGeometry(0.024, 0.024, 0.025, 6), bronzeMat, [s * 0.27, 0.08, 0.12]);
        });

        // Broad Barrel Torso & Sparkite Furnace Chest
        const torso = K.joint(THREE, pelvis, 0, 0.14, 0);
        K.add(THREE, torso, new THREE.BoxGeometry(0.56, 0.2, 0.36), darkMat, [0, 0.08, 0]);
        const chest = K.joint(THREE, torso, 0, 0.28, 0);
        K.add(THREE, chest, new THREE.BoxGeometry(0.68, 0.38, 0.44), plateMat);
        const breast = K.extrude(THREE, [[-0.28, -0.16], [0.28, -0.16], [0.33, 0.12], [0, 0.2], [-0.33, 0.12]], 0.1, 0.02, plateMat);
        breast.position.set(0, 0.02, 0.2);
        chest.add(breast);
        // Glowing Sparkite Furnace Core behind iron grate bars
        K.add(THREE, chest, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), sparkMat, [0, 0.02, 0.255], [Math.PI / 2, 0, 0]);
        const furnaceRing = K.add(THREE, chest, new THREE.TorusGeometry(0.115, 0.018, 6, 14), bronzeMat, [0, 0.02, 0.265]);
        [-0.04, 0, 0.04].forEach(bx => {
          K.add(THREE, chest, new THREE.BoxGeometry(0.016, 0.18, 0.02), darkMat, [bx, 0.02, 0.28]);
        });
        // Twin Alchemical Steam Tanks on Back
        [-1, 1].forEach(s => {
          K.add(THREE, chest, new THREE.CylinderGeometry(0.085, 0.085, 0.34, 10), bronzeMat, [s * 0.16, 0.04, -0.27]);
          K.add(THREE, chest, new THREE.SphereGeometry(0.085, 8, 6), plateMat, [s * 0.16, 0.21, -0.27]);
          K.add(THREE, chest, new THREE.CylinderGeometry(0.032, 0.032, 0.12, 6), darkMat, [s * 0.16, 0.29, -0.27]);
          const pipe = K.tube(THREE, [[s * 0.16, 0.18, -0.27], [s * 0.22, 0.22, -0.14], [s * 0.14, 0.1, 0.05]], 0.02, 10, 6, bronzeMat);
          chest.add(pipe);
        });

        // Horned Runic Greathelm & Multi-Strand Braided Beard
        const neck = K.joint(THREE, chest, 0, 0.2, 0);
        const head = K.joint(THREE, neck, 0, 0.14, 0);
        K.add(THREE, head, new THREE.SphereGeometry(0.22, 14, 12), skinMat);
        // Greathelm dome + brow band + cheek plates + rivets
        K.add(THREE, head, new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), plateMat, [0, 0.04, 0]);
        K.add(THREE, head, new THREE.CylinderGeometry(0.245, 0.245, 0.075, 14), bronzeMat, [0, 0.09, 0]);
        K.rivetRing(THREE, head, 0.25, 10, 0.015, sparkMat, 0.09, 'y');
        K.add(THREE, head, new THREE.BoxGeometry(0.05, 0.14, 0.05), bronzeMat, [0, 0.01, 0.24]); // nasal guard
        K.add(THREE, head, new THREE.ConeGeometry(0.06, 0.16, 6), bronzeMat, [0, 0.28, 0]); // helm crest
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.SphereGeometry(0.025, 8, 6), sparkMat, [s * 0.075, 0.025, 0.2]); // glowing eyes
          K.add(THREE, head, new THREE.BoxGeometry(0.06, 0.18, 0.16), plateMat, [s * 0.21, -0.02, 0.04]); // cheek guard
          // Sweeping Curved Greathelm Horns
          const horn = K.tube(THREE, [
            [s * 0.21, 0.12, 0],
            [s * 0.34, 0.18, 0.04],
            [s * 0.38, 0.34, 0.12],
            [s * 0.3, 0.44, 0.16]
          ], 0.036, 14, 7, bronzeMat);
          head.add(horn);
        });

        // 3-Strand Braided Beard with Gold Clasps
        const beard = K.joint(THREE, head, 0, -0.08, 0.18);
        [-0.08, 0, 0.08].forEach((bx, idx) => {
          const braid = K.tube(THREE, [
            [bx * 0.7, 0.02, 0],
            [bx, -0.14, 0.04],
            [bx * 1.1, -0.32 - (idx === 1 ? 0.08 : 0), 0.02]
          ], idx === 1 ? 0.052 : 0.042, 12, 6, beardMat);
          beard.add(braid);
          K.add(THREE, beard, new THREE.TorusGeometry(idx === 1 ? 0.055 : 0.045, 0.012, 6, 10), bronzeMat, [bx, -0.15, 0.038], [Math.PI / 2, 0, 0]);
          K.add(THREE, beard, new THREE.TorusGeometry(idx === 1 ? 0.048 : 0.04, 0.012, 6, 10), bronzeMat, [bx * 1.05, -0.28, 0.024], [Math.PI / 2, 0, 0]);
        });
        K.add(THREE, beard, new THREE.BoxGeometry(0.09, 0.08, 0.04), sparkMat, [0, -0.35, 0.03]); // central beard clasp

        // Heavy Arms + Runic Tower Shield + Sparkite Warhammer
        const left = buildArm(THREE, chest, -0.44, 0.12, 0.24, 0.24, {
          pauldron: plateMat, upper: plateMat, fore: bronzeMat, dark: darkMat, trim: bronzeMat, hand: plateMat
        }, { radius: 0.088, pauldronScale: 1.25, spikes: true, handScale: 1.1 });
        // Runic Tower Shield
        const shield = K.joint(THREE, left.forearm, -0.12, -0.16, 0.06);
        shield.rotation.y = Math.PI / 2;
        const shieldBoard = K.extrude(THREE, [[-0.24, -0.38], [0.24, -0.38], [0.3, 0.2], [0, 0.36], [-0.3, 0.2]], 0.055, 0.015, plateMat);
        shield.add(shieldBoard);
        K.add(THREE, shield, new THREE.TorusGeometry(0.14, 0.022, 6, 12), bronzeMat, [0, 0.02, 0.04]);
        K.add(THREE, shield, new THREE.SphereGeometry(0.075, 8, 6), sparkMat, [0, 0.02, 0.045]);

        const right = buildArm(THREE, chest, 0.44, 0.12, 0.24, 0.24, {
          pauldron: plateMat, upper: plateMat, fore: bronzeMat, dark: darkMat, trim: bronzeMat, hand: plateMat
        }, { radius: 0.088, pauldronScale: 1.25, spikes: true, handScale: 1.1 });
        // Runic Sparkite Warhammer
        const hammer = K.joint(THREE, right.forearm, 0, -0.28, 0.08);
        hammer.rotation.x = Math.PI / 2;
        K.add(THREE, hammer, new THREE.CylinderGeometry(0.03, 0.034, 0.92, 8), darkMat, [0, 0.22, 0]);
        K.add(THREE, hammer, new THREE.BoxGeometry(0.24, 0.26, 0.44), plateMat, [0, 0.64, 0]);
        K.add(THREE, hammer, new THREE.BoxGeometry(0.26, 0.12, 0.24), bronzeMat, [0, 0.64, 0]);
        K.add(THREE, hammer, new THREE.BoxGeometry(0.25, 0.06, 0.46), sparkMat, [0, 0.64, 0]); // glowing rune inlay
        K.add(THREE, hammer, new THREE.ConeGeometry(0.055, 0.18, 5), bronzeMat, [0, 0.85, 0]); // top finial

        // Stout Armored Legs
        const leftLeg = buildLeg(THREE, rig, -0.19, 0.48, 0.21, 0.21, {
          thigh: plateMat, shin: bronzeMat, dark: darkMat, trim: bronzeMat, bootUpper: plateMat
        }, { radius: 0.1, bootScale: 1.15, spikeKnee: true });
        const rightLeg = buildLeg(THREE, rig, 0.19, 0.48, 0.21, 0.21, {
          thigh: plateMat, shin: bronzeMat, dark: darkMat, trim: bronzeMat, bootUpper: plateMat
        }, { radius: 0.1, bootScale: 1.15, spikeKnee: true });

        const parts = {
          rig, pelvis, torso, chest, neck, head,
          leftArm: left.arm, leftForearm: left.forearm,
          rightArm: right.arm, rightForearm: right.forearm,
          leftLeg: leftLeg.leg, leftShin: leftLeg.shin, leftFoot: leftLeg.foot,
          rightLeg: rightLeg.leg, rightShin: rightLeg.shin, rightFoot: rightLeg.foot
        };
        loadouts.set(root, { right: right.hand, left: left.hand, chest, head, pelvis, original: [hammer, shield] });
        root.userData.animations = K.RACE_ANIMATIONS;
        root.userData.animate = K.createHumanoidAnimator(parts, {
          race: 'dwarf',
          armSwing: 0.58,
          legSwing: 0.52,
          heavyLean: 0.34,
          beard,
          auraRings: [furnaceRing]
        });
        return root;
      }
    },

    // ================================================================
    // 4. ORCISH WARCHIEF (Southern Wastes)
    // ================================================================
    {
      id: 'gg-race-orc',
      name: 'Orcish Warchief (Southern Wastes)',
      game: 'GraveGain 3D / 2D',
      category: 'Characters',
      tags: ['orc', 'player', 'race', 'warrior', 'berserker', 'cleaver', 'tusks', 'animated'],
      description: 'Towering Southern Wastes Orc Warchief with curved ivory tusks, war-mohawk, trophy-skull spiked pauldron, glowing Rage runes, fist-buckler, and serrated Cleaver (23 animations).',
      build: function createOrcishWarchief(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const skinMat = K.mat(THREE, { color: 0x4d7c0f, accent: 0x365314, texKind: 'skin', bumpKind: 'skin', roughness: 0.68, metalness: 0.06 });
        const ironMat = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'armor', bumpKind: 'armor', roughness: 0.42, metalness: 0.72 });
        const leatherMat = K.mat(THREE, { color: 0x78350f, accent: 0xb45309, texKind: 'leather', bumpKind: 'leather', roughness: 0.82 });
        const boneMat = K.mat(THREE, { color: 0xfef3c7, accent: 0xd6d3d1, texKind: 'bone', roughness: 0.48 });
        const rageMat = K.mat(THREE, { color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.95, roughness: 0.2 });
        const hairMat = K.mat(THREE, { color: 0x1c1917, roughness: 0.9 });
        const darkMat = K.mat(THREE, { color: 0x0f172a, roughness: 0.8 });

        // Muscular Pelvis, Trophy Belt & Tattered Nomad Loincloth
        const pelvis = K.joint(THREE, rig, 0, 0.84, 0);
        K.add(THREE, pelvis, new THREE.CylinderGeometry(0.28, 0.24, 0.2, 8), leatherMat);
        K.add(THREE, pelvis, new THREE.CylinderGeometry(0.3, 0.3, 0.11, 10), ironMat, [0, 0.08, 0]);
        K.add(THREE, pelvis, new THREE.OctahedronGeometry(0.065, 0), rageMat, [0, 0.08, 0.31]); // rage buckle

        const tassets = [];
        [0, Math.PI, -1.1, 1.1].forEach((a, i) => {
          const piv = K.joint(THREE, pelvis, Math.sin(a) * 0.26, 0.03, Math.cos(a) * 0.26);
          piv.rotation.y = a;
          const flap = K.extrude(THREE, [[-0.1, 0], [0.1, 0], [0.14, -0.38], [0, -0.46], [-0.12, -0.36]], 0.025, 0.005, i === 0 ? leatherMat : ironMat);
          flap.rotation.x = -0.14;
          piv.add(flap);
          tassets.push(piv);
        });

        // Broad Muscular V-Tapered Torso + Bandolier + Rage Runes
        const torso = K.joint(THREE, pelvis, 0, 0.14, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.3, 0.24, 0.28, 9), skinMat, [0, 0.12, 0]);
        const chest = K.joint(THREE, torso, 0, 0.38, 0);
        K.add(THREE, chest, new THREE.CylinderGeometry(0.4, 0.28, 0.42, 9), skinMat);
        // Sculpted Pectorals & Ab definition
        [-1, 1].forEach(s => {
          const pec = K.add(THREE, chest, new THREE.SphereGeometry(0.16, 10, 8), skinMat, [s * 0.15, 0.08, 0.18]);
          pec.scale.set(1.15, 0.8, 0.72);
          // Glowing crimson Rage Rune war-markings
          K.add(THREE, chest, new THREE.BoxGeometry(0.14, 0.024, 0.02), rageMat, [s * 0.16, 0.09, 0.295], [0, 0, s * 0.32]);
        });
        // Diagonal Studded Leather Bandolier
        const band = K.add(THREE, chest, new THREE.BoxGeometry(0.12, 0.64, 0.48), leatherMat, [0, 0.0, 0], [0, 0, -0.68]);
        void band;
        K.add(THREE, chest, new THREE.BoxGeometry(0.15, 0.12, 0.06), ironMat, [0.05, 0.04, 0.26], [0, 0, -0.68]);

        // Heavy Neck & Orc Head with Curved Tusks & Braided War-Mohawk
        const neck = K.joint(THREE, chest, 0, 0.22, 0.03);
        K.add(THREE, neck, new THREE.CylinderGeometry(0.14, 0.17, 0.12, 9), skinMat, [0, 0.04, 0]);
        const head = K.joint(THREE, neck, 0, 0.2, 0.03);
        K.add(THREE, head, new THREE.IcosahedronGeometry(0.24, 1), skinMat, [0, 0.02, 0], [0, 0, 0], [1.05, 1.05, 1.08]);
        // Heavy Brow Ridge & Prognathous Jaw
        K.add(THREE, head, new THREE.BoxGeometry(0.32, 0.075, 0.14), skinMat, [0, 0.09, 0.18]);
        K.add(THREE, head, new THREE.BoxGeometry(0.26, 0.1, 0.18), skinMat, [0, -0.11, 0.14]);
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.SphereGeometry(0.028, 8, 6), rageMat, [s * 0.082, 0.045, 0.215]); // glowing eyes
          // Pointed Notched Ears + Iron Earrings
          K.add(THREE, head, new THREE.ConeGeometry(0.045, 0.16, 5), skinMat, [s * 0.25, 0.03, 0], [0, 0, -s * 1.15]);
          K.add(THREE, head, new THREE.TorusGeometry(0.032, 0.008, 5, 10), ironMat, [s * 0.26, -0.02, 0.01], [0, Math.PI / 2, 0]);
          // Curved Ivory Lower Tusks
          const tusk = K.tube(THREE, [
            [s * 0.085, -0.12, 0.21],
            [s * 0.1, -0.05, 0.27],
            [s * 0.085, 0.04, 0.25]
          ], 0.024, 10, 6, boneMat);
          head.add(tusk);
        });
        K.add(THREE, head, new THREE.TorusGeometry(0.028, 0.009, 5, 8), ironMat, [-0.095, -0.04, 0.26], [Math.PI / 2, 0, 0]); // tusk ring
        // War-Mohawk + Braided Topknot
        for (let m = 0; m < 4; m++) {
          K.add(THREE, head, new THREE.ConeGeometry(0.045, 0.16, 5), hairMat, [0, 0.27 - m * 0.02, 0.08 - m * 0.08], [-m * 0.25, 0, 0]);
        }
        const topknot = K.tube(THREE, [[0, 0.24, -0.08], [0, 0.12, -0.24], [0, -0.12, -0.28]], 0.04, 10, 6, hairMat);
        head.add(topknot);

        // Asymmetric Heavy Shoulders, Trophy Skull Pauldron, Cleaver & Buckler
        const left = buildArm(THREE, chest, -0.49, 0.14, 0.3, 0.28, {
          pauldron: ironMat, upper: skinMat, fore: leatherMat, dark: darkMat, trim: ironMat, hand: skinMat
        }, { radius: 0.098, pauldronScale: 1.35, spikes: true, armBand: true, claws: true, handScale: 1.15 });
        // Mini Trophy Skull mounted atop Left Pauldron!
        const trophySkull = K.makeSkull(THREE, boneMat, darkMat, rageMat, { scale: 0.45 });
        trophySkull.position.set(-0.04, 0.24, 0.04);
        trophySkull.rotation.set(-0.2, -0.35, 0.15);
        left.arm.add(trophySkull);
        // Spiked Iron Fist-Buckler on left forearm
        const buckler = K.joint(THREE, left.forearm, -0.11, -0.16, 0.02);
        K.add(THREE, buckler, new THREE.CylinderGeometry(0.24, 0.24, 0.05, 8), ironMat, [0, 0, 0], [0, 0, Math.PI / 2]);
        K.add(THREE, buckler, new THREE.ConeGeometry(0.06, 0.16, 6), boneMat, [-0.08, 0, 0], [0, 0, Math.PI / 2]);

        const right = buildArm(THREE, chest, 0.49, 0.14, 0.3, 0.28, {
          pauldron: leatherMat, upper: skinMat, fore: ironMat, dark: darkMat, trim: ironMat, hand: skinMat
        }, { radius: 0.098, pauldronScale: 1.05, spikes: false, armBand: true, claws: true, handScale: 1.15 });
        // Colossal Serrated Warchief Cleaver
        const cleaver = K.joint(THREE, right.forearm, 0, -0.32, 0.08);
        cleaver.rotation.x = Math.PI / 2.2;
        K.add(THREE, cleaver, new THREE.CylinderGeometry(0.032, 0.036, 1.08, 8), leatherMat, [0, 0.26, 0]);
        const blade = K.extrude(THREE, [
          [0, 0.28], [0.22, 0.32], [0.26, 0.56], [0.18, 0.64], [0.28, 0.78], [0.16, 1.02], [-0.04, 0.94], [-0.04, 0.28]
        ], 0.045, 0.01, ironMat);
        cleaver.add(blade);
        K.add(THREE, cleaver, new THREE.BoxGeometry(0.03, 0.66, 0.055), rageMat, [0.22, 0.65, 0], [0, 0, 0.06]); // molten edge
        K.add(THREE, cleaver, new THREE.SphereGeometry(0.065, 8, 6), boneMat, [0, -0.3, 0]); // skull pommel

        // Heavy Muscular Legs
        const leftLeg = buildLeg(THREE, rig, -0.185, 0.78, 0.37, 0.37, {
          thigh: skinMat, shin: leatherMat, dark: darkMat, trim: ironMat, bootUpper: leatherMat
        }, { radius: 0.102, bootScale: 1.12, spikeKnee: true });
        const rightLeg = buildLeg(THREE, rig, 0.185, 0.78, 0.37, 0.37, {
          thigh: skinMat, shin: leatherMat, dark: darkMat, trim: ironMat, bootUpper: leatherMat
        }, { radius: 0.102, bootScale: 1.12, spikeKnee: true });

        const parts = {
          rig, pelvis, torso, chest, neck, head,
          leftArm: left.arm, leftForearm: left.forearm,
          rightArm: right.arm, rightForearm: right.forearm,
          leftLeg: leftLeg.leg, leftShin: leftLeg.shin, leftFoot: leftLeg.foot,
          rightLeg: rightLeg.leg, rightShin: rightLeg.shin, rightFoot: rightLeg.foot
        };
        loadouts.set(root, { right: right.hand, left: left.hand, chest, head, pelvis, original: [cleaver] });
        root.userData.animations = K.RACE_ANIMATIONS;
        root.userData.animate = K.createHumanoidAnimator(parts, {
          race: 'orc',
          armSwing: 0.78,
          legSwing: 0.68,
          heavyLean: 0.36,
          tassets,
          braids: [topknot]
        });
        return root;
      }
    }
  );
  const races = ['human', 'elf', 'dwarf', 'orc'];
  const classes = ['warrior', 'tank', 'support', 'mage'];
  const originalClass = { human: 'warrior', elf: 'mage', dwarf: 'tank', orc: 'warrior' };
  const raceColors = { human: 0x58bbff, elf: 0x68ffd0, dwarf: 0xffb84d, orc: 0xff694e };
  const classColors = { warrior: 0xef804d, tank: 0x53baff, support: 0x80f0a2, mage: 0xc390ff };
  const catalog = window.GGG_MODEL_CATALOG;
  const fighters = {};

  // Class silhouette overlays + race-aware weapons so same-race heroes read apart in-arena.
  function dressClassSilhouette(THREE, nodes, cls, mats) {
    const { chest, head, pelvis } = nodes;
    if (!chest || !head) return;
    const { metal, dark, glow, soft } = mats;

    if (cls === 'warrior') {
      // Combat harness + spiky pauldrons + brow crest
      K.add(THREE, chest, new THREE.BoxGeometry(0.42, 0.08, 0.34), dark, [0, 0.16, 0.02]);
      K.add(THREE, chest, new THREE.BoxGeometry(0.16, 0.22, 0.08), glow, [0, 0.02, 0.2]);
      [-1, 1].forEach(s => {
        K.add(THREE, chest, new THREE.BoxGeometry(0.18, 0.14, 0.22), metal, [s * 0.28, 0.14, 0], [0, 0, -s * 0.35]);
        K.add(THREE, chest, new THREE.ConeGeometry(0.04, 0.12, 5), glow, [s * 0.32, 0.22, 0.04], [0.4, 0, 0]);
      });
      K.add(THREE, head, new THREE.BoxGeometry(0.18, 0.06, 0.2), metal, [0, 0.2, 0.04]);
      K.add(THREE, head, new THREE.ConeGeometry(0.05, 0.12, 4), glow, [0, 0.28, 0.02]);
    } else if (cls === 'tank') {
      // Bulky breastplate, oversized pauldrons, visored helm
      K.add(THREE, chest, new THREE.BoxGeometry(0.56, 0.38, 0.36), metal, [0, 0.02, 0.04]);
      K.add(THREE, chest, new THREE.BoxGeometry(0.22, 0.18, 0.1), glow, [0, 0.04, 0.22]);
      [-1, 1].forEach(s => {
        K.add(THREE, chest, new THREE.BoxGeometry(0.26, 0.22, 0.28), metal, [s * 0.34, 0.12, 0], [0, 0, -s * 0.2]);
        K.add(THREE, chest, new THREE.BoxGeometry(0.08, 0.16, 0.2), dark, [s * 0.42, 0.12, 0.04]);
      });
      if (pelvis) {
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.4, 0.14, 0.3), metal, [0, 0.02, 0.02]);
      }
      K.add(THREE, head, new THREE.BoxGeometry(0.36, 0.22, 0.34), metal, [0, 0.08, 0]);
      K.add(THREE, head, new THREE.BoxGeometry(0.28, 0.1, 0.12), glow, [0, 0.06, 0.16]);
      K.add(THREE, head, new THREE.BoxGeometry(0.12, 0.16, 0.1), dark, [0, -0.08, 0.16]);
    } else if (cls === 'support') {
      // Soft hood/cap, sash, utility pouches, cross emblem
      K.add(THREE, chest, new THREE.BoxGeometry(0.12, 0.28, 0.08), glow, [0, 0.02, 0.2]);
      K.add(THREE, chest, new THREE.BoxGeometry(0.28, 0.08, 0.08), glow, [0, 0.02, 0.2]);
      K.add(THREE, chest, new THREE.BoxGeometry(0.46, 0.1, 0.32), soft, [0, -0.08, 0.02], [0.15, 0, 0]);
      if (pelvis) {
        [[-0.16, 0.02, 0.14], [0.16, 0.02, 0.14]].forEach(p => {
          K.add(THREE, pelvis, new THREE.BoxGeometry(0.1, 0.12, 0.1), dark, p);
        });
      }
      K.add(THREE, head, new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), soft, [0, 0.1, -0.02]);
      K.add(THREE, head, new THREE.BoxGeometry(0.22, 0.05, 0.24), glow, [0, 0.02, 0.1]);
    } else {
      // Mage: pointed hood/hat, robe panels, orbiting shoulder gems
      K.add(THREE, chest, new THREE.BoxGeometry(0.48, 0.42, 0.2), soft, [0, -0.06, -0.12]);
      K.add(THREE, chest, new THREE.BoxGeometry(0.14, 0.26, 0.08), glow, [0, 0.02, 0.2]);
      [-1, 1].forEach(s => {
        K.add(THREE, chest, new THREE.OctahedronGeometry(0.08), glow, [s * 0.28, 0.16, 0.08]);
        K.add(THREE, chest, new THREE.BoxGeometry(0.12, 0.34, 0.16), soft, [s * 0.22, -0.1, -0.02], [0, 0, s * 0.25]);
      });
      if (pelvis) {
        K.add(THREE, pelvis, new THREE.BoxGeometry(0.44, 0.2, 0.28), soft, [0, -0.06, 0.02]);
      }
      const hat = K.joint(THREE, head, 0, 0.16, -0.02);
      K.add(THREE, hat, new THREE.ConeGeometry(0.18, 0.42, 8), soft, [0, 0.22, 0]);
      K.add(THREE, hat, new THREE.TorusGeometry(0.16, 0.03, 6, 12), glow, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
      K.add(THREE, hat, new THREE.OctahedronGeometry(0.06), glow, [0, 0.44, 0]);
    }
  }

  function equipClassWeapon(THREE, hands, race, cls, mats) {
    const { right, left } = hands;
    const { metal, dark, glow, soft } = mats;
    const weapon = K.joint(THREE, right, 0, 0, 0.04);
    weapon.rotation.x = 0.3;
    const id = race + '-' + cls;

    // Race × class weapon cues matching the 2dE roster titles.
    if (id === 'human-tank' || cls === 'tank' && (race === 'orc' || race === 'elf')) {
      // Baton / lance shaft + shield
      K.add(THREE, weapon, new THREE.CylinderGeometry(0.03, 0.035, 0.55, 8), dark, [0, 0.18, 0]);
      K.add(THREE, weapon, new THREE.BoxGeometry(0.1, 0.1, 0.1), glow, [0, 0.48, 0]);
      const shield = K.joint(THREE, left, 0, 0.08, 0.12);
      const plate = K.extrude(THREE, [[0, -0.34], [-0.3, -0.08], [-0.3, 0.26], [0, 0.36], [0.3, 0.26], [0.3, -0.08]], 0.07, 0.015, metal);
      shield.add(plate);
      K.add(THREE, shield, new THREE.OctahedronGeometry(0.11), glow, [0, 0.04, 0.09]);
      if (race === 'elf') {
        K.add(THREE, weapon, new THREE.ConeGeometry(0.05, 0.18, 5), glow, [0, 0.58, 0]);
      }
      return;
    }
    if (id === 'dwarf-tank') {
      // Keep hammer-like bulk even when not using original loadout path
      K.add(THREE, weapon, new THREE.CylinderGeometry(0.032, 0.035, 0.42, 8), dark, [0, 0.12, 0]);
      K.add(THREE, weapon, new THREE.BoxGeometry(0.28, 0.2, 0.22), metal, [0, 0.36, 0]);
      const shield = K.joint(THREE, left, 0, 0.1, 0.13);
      const plate = K.extrude(THREE, [[0, -0.32], [-0.29, -0.06], [-0.29, 0.24], [0, 0.34], [0.29, 0.24], [0.29, -0.06]], 0.06, 0.015, metal);
      shield.add(plate);
      return;
    }
    if (cls === 'warrior') {
      if (race === 'elf') {
        // Twin dagger silhouettes
        [-0.05, 0.05].forEach((ox, i) => {
          const d = K.extrude(THREE, [[-0.03, 0.1], [0.03, 0.1], [0.04, 0.42], [0, 0.55], [-0.04, 0.42]], 0.03, 0.01, metal);
          d.position.set(ox, 0, i ? 0.04 : -0.04);
          weapon.add(d);
        });
        K.add(THREE, weapon, new THREE.BoxGeometry(0.18, 0.04, 0.08), glow, [0, 0.12, 0]);
      } else if (race === 'dwarf') {
        K.add(THREE, weapon, new THREE.CylinderGeometry(0.03, 0.035, 0.4, 8), dark, [0, 0.1, 0]);
        K.add(THREE, weapon, new THREE.BoxGeometry(0.08, 0.22, 0.05), metal, [0.1, 0.34, 0]);
        K.add(THREE, weapon, new THREE.BoxGeometry(0.08, 0.22, 0.05), metal, [-0.1, 0.34, 0]);
        K.add(THREE, weapon, new THREE.BoxGeometry(0.22, 0.05, 0.08), glow, [0, 0.22, 0]);
      } else {
        // Cleaver / blade
        const blade = K.extrude(THREE, [[-0.07, 0.24], [0.07, 0.24], [0.12, 0.78], [0, 0.95], [-0.12, 0.78]], 0.05, 0.015, metal);
        weapon.add(blade);
        K.add(THREE, weapon, new THREE.BoxGeometry(0.3, 0.055, 0.1), glow, [0, 0.24, 0]);
      }
      return;
    }
    if (cls === 'support') {
      if (race === 'human') {
        // Medgun
        K.add(THREE, weapon, new THREE.BoxGeometry(0.08, 0.1, 0.42), soft, [0, 0.08, 0.08]);
        K.add(THREE, weapon, new THREE.BoxGeometry(0.05, 0.05, 0.16), glow, [0, 0.12, 0.28]);
        K.add(THREE, left, new THREE.IcosahedronGeometry(0.09, 1), glow, [0, -0.08, 0.12]);
      } else if (race === 'elf') {
        // Flask
        K.add(THREE, weapon, new THREE.CylinderGeometry(0.04, 0.07, 0.22, 8), soft, [0, 0.18, 0]);
        K.add(THREE, weapon, new THREE.SphereGeometry(0.09, 10, 8), glow, [0, 0.32, 0]);
        K.add(THREE, weapon, new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), dark, [0, 0.44, 0]);
      } else if (race === 'dwarf') {
        // Totem
        K.add(THREE, weapon, new THREE.CylinderGeometry(0.04, 0.05, 0.55, 8), dark, [0, 0.2, 0]);
        K.add(THREE, weapon, new THREE.BoxGeometry(0.16, 0.12, 0.16), metal, [0, 0.48, 0]);
        K.add(THREE, weapon, new THREE.OctahedronGeometry(0.09), glow, [0, 0.62, 0]);
      } else {
        // Hawk staff
        K.add(THREE, weapon, new THREE.CylinderGeometry(0.025, 0.035, 0.7, 8), dark, [0, 0.25, 0]);
        K.add(THREE, weapon, new THREE.SphereGeometry(0.09, 8, 6), soft, [0, 0.62, 0]);
        K.add(THREE, weapon, new THREE.ConeGeometry(0.06, 0.14, 5), glow, [0, 0.74, 0]);
      }
      return;
    }
    // Mage
    if (race === 'human') {
      // Wrench
      K.add(THREE, weapon, new THREE.BoxGeometry(0.07, 0.07, 0.42), metal, [0, 0.1, 0.06]);
      K.add(THREE, weapon, new THREE.TorusGeometry(0.08, 0.025, 6, 10), glow, [0, 0.12, 0.28], [0, Math.PI / 2, 0]);
    } else if (race === 'dwarf') {
      // Magma orb
      K.add(THREE, weapon, new THREE.SphereGeometry(0.12, 12, 10), glow, [0, 0.22, 0.08]);
      K.add(THREE, weapon, new THREE.OctahedronGeometry(0.07), metal, [0, 0.34, 0.08]);
    } else if (race === 'orc') {
      // Hex staff
      K.add(THREE, weapon, new THREE.CylinderGeometry(0.026, 0.04, 0.85, 8), dark, [0, 0.28, 0]);
      K.add(THREE, weapon, new THREE.TorusGeometry(0.14, 0.022, 8, 16), soft, [0, 0.74, 0]);
      K.add(THREE, weapon, new THREE.OctahedronGeometry(0.11), glow, [0, 0.74, 0]);
    } else {
      // Elf staff (original path usually keeps detailed staff; fallback)
      K.add(THREE, weapon, new THREE.CylinderGeometry(0.026, 0.04, 0.87, 8), metal, [0, 0.30, 0]);
      K.add(THREE, weapon, new THREE.TorusGeometry(0.16, 0.022, 8, 16), dark, [0, 0.77, 0]);
      K.add(THREE, weapon, new THREE.OctahedronGeometry(0.12), glow, [0, 0.77, 0]);
    }
  }

  function equipClass(THREE, root, race, cls, opts) {
    const options = opts || {};
    const loadout = loadouts.get(root);
    if (!loadout) return;
    const { right, left, original, chest, head, pelvis } = loadout;
    if (!options.keepWeapons && original) {
      original.forEach(item => { item.visible = false; });
    }
    const metal = K.mat(THREE, { color: raceColors[race], metalness: 0.55, roughness: 0.36 });
    const dark = K.mat(THREE, { color: 0x263449, metalness: 0.35, roughness: 0.55 });
    const glow = K.mat(THREE, { color: classColors[cls], emissive: classColors[cls], emissiveIntensity: 0.55 });
    const soft = K.mat(THREE, { color: classColors[cls], metalness: 0.15, roughness: 0.72, emissive: classColors[cls], emissiveIntensity: 0.22 });
    const mats = { metal, dark, glow, soft };
    dressClassSilhouette(THREE, { chest, head, pelvis }, cls, mats);
    if (!options.keepWeapons) {
      equipClassWeapon(THREE, { right, left }, race, cls, mats);
    }
  }

  for (const race of races) {
    const base = catalog.find(entry => entry.id === 'gg-race-' + race);
    for (const cls of classes) {
      const id = race + '-' + cls;
      const isOriginal = originalClass[race] === cls;
      if (isOriginal) {
        // Keep the detailed race weapon kit, but still stamp class silhouette cues.
        const title = id.replace(/(^|-)([a-z])/g, (_, prefix, letter) => (prefix ? ' ' : '') + letter.toUpperCase());
        const entry = {
          id: 'gg-fighter-' + id,
          fighterId: id,
          name: title,
          game: 'GraveGain 2D',
          category: 'Characters',
          tags: [race, cls, 'fighter', 'animated', 'canonical'],
          description: title + ' with class silhouette accents on the articulated GraveGain race rig.',
          build(THREE) {
            const root = base.build(THREE);
            equipClass(THREE, root, race, cls, { keepWeapons: true });
            return root;
          }
        };
        base.fighterId = id;
        fighters[id] = entry;
        catalog.push(entry);
        continue;
      }
      const title = id.replace(/(^|-)([a-z])/g, (_, prefix, letter) => (prefix ? ' ' : '') + letter.toUpperCase());
      const entry = {
        id: 'gg-fighter-' + id,
        fighterId: id,
        name: title,
        game: 'GraveGain 2D',
        category: 'Characters',
        tags: [race, cls, 'fighter', 'animated'],
        description: title + ' with class equipment and the articulated GraveGain race rig.',
        build(THREE) {
          const root = base.build(THREE);
          equipClass(THREE, root, race, cls);
          return root;
        }
      };
      fighters[id] = entry;
      catalog.push(entry);
    }
  }

  window.GGG_GRAVEGAIN_FIGHTERS = Object.freeze(fighters);
})();
