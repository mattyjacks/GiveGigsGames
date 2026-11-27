/* GraveGain2DE: Smash Slash Bash Mash — 2D Procedural Canvas Renderer */
(function () {
  'use strict';

  function drawStageBackground(ctx, stage, w, h, time, cam) {
    const t = stage.theme;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, t.skyTop);
    grad.addColorStop(1, t.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Starfield
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 42; i++) {
      const sx = ((i * 197 + 43 - cam.x * 0.05) % w + w) % w;
      const sy = ((i * 113 + 29 - cam.y * 0.04) % (h * 0.72) + (h * 0.72)) % (h * 0.72);
      const r = (i % 3 === 0) ? 1.8 : 1.0;
      const tw = 0.45 + 0.55 * Math.sin(time * 2.2 + i);
      ctx.globalAlpha = tw * 0.7;
      ctx.fillRect(sx, sy, r, r);
    }
    ctx.globalAlpha = 1;

    // Giantess Gas Giant in the MoonRock sky
    const gx = w * 0.76 - cam.x * 0.08;
    const gy = h * 0.24 - cam.y * 0.06;
    const gr = Math.min(w, h) * 0.16;
    const pGrad = ctx.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, gr * 0.15, gx, gy, gr);
    pGrad.addColorStop(0, t.accent);
    pGrad.addColorStop(0.55, t.planet);
    pGrad.addColorStop(1, 'rgba(10, 6, 24, 0.9)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fillStyle = pGrad;
    ctx.fill();
    // Planetary ring
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(gx, gy, gr * 1.55, gr * 0.3, -0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Distant silhouette ridges / skyline
    ctx.fillStyle = 'rgba(6, 10, 22, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 40; x += 40) {
      const worldX = x + cam.x * 0.15;
      const ridge = h * 0.72 + Math.sin(worldX * 0.008) * 32 + Math.cos(worldX * 0.021) * 18;
      ctx.lineTo(x, ridge);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  function drawStageGeometry(ctx, stage, platforms, time) {
    const t = stage.theme;

    // Optional forge lava hazard below Deep Forge Anvil
    if (stage.lavaY !== undefined) {
      const ly = stage.lavaY;
      const lavaGrad = ctx.createLinearGradient(0, ly, 0, ly + 180);
      lavaGrad.addColorStop(0, '#fb923c');
      lavaGrad.addColorStop(0.25, '#ea580c');
      lavaGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(-900, ly, 1800, 260);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
      for (let i = -600; i <= 600; i += 60) {
        const wave = Math.sin(time * 4 + i * 0.05) * 4;
        ctx.fillRect(i, ly + wave, 36, 4);
      }
    }

    for (const p of platforms) {
      if (p.solid) {
        // Under-hull / pillar shadow
        ctx.fillStyle = 'rgba(9, 13, 24, 0.78)';
        ctx.fillRect(p.x + 18, p.y + p.h, p.w - 36, 220);
        // Main stage deck
        ctx.fillStyle = t.ground;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Top glowing ley-trim
        ctx.fillStyle = t.trim;
        ctx.fillRect(p.x, p.y, p.w, 6);
        // Tech / stone seam accents
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let sx = p.x + 24; sx < p.x + p.w - 24; sx += 48) {
          ctx.fillRect(sx, p.y + 12, 22, p.h - 18);
        }
        // Ledge markers
        if (p.ledges) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(p.x, p.y, 12, 8);
          ctx.fillRect(p.x + p.w - 12, p.y, 12, 8);
        }
      } else {
        // Pass-through floating platform
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = t.accent;
        ctx.fillRect(p.x, p.y, p.w, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(p.x + 10, p.y + 7, p.w - 20, 2);
      }
    }
  }

  function drawWeapon(ctx, weapon, pal, attackPhase) {
    ctx.save();
    const swing = attackPhase > 0 ? Math.sin(attackPhase * Math.PI) * 1.35 : 0;
    ctx.rotate(swing);
    ctx.fillStyle = pal.weapon;
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 1.5;

    switch (weapon) {
      case 'carbine':
        ctx.fillRect(-2, -4, 22, 7);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(14, -3, 7, 3);
        ctx.fillStyle = pal.accent;
        ctx.fillRect(2, -7, 4, 3);
        break;
      case 'medgun':
        ctx.fillStyle = pal.secondary;
        ctx.fillRect(-2, -5, 18, 8);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(12, -3, 8, 4);
        ctx.fillRect(0, -8, 5, 3);
        break;
      case 'riotshield':
        ctx.fillStyle = pal.secondary;
        ctx.fillRect(4, -14, 9, 28);
        ctx.strokeRect(4, -14, 9, 28);
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(13, 0);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();
        break;
      case 'towershield':
        ctx.fillStyle = pal.primary;
        ctx.fillRect(6, -16, 10, 32);
        ctx.strokeRect(6, -16, 10, 32);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(9, -8, 4, 16);
        break;
      case 'wrench':
        ctx.fillRect(0, -3, 20, 5);
        ctx.beginPath();
        ctx.arc(20, 0, 6, 0.6, Math.PI * 2 - 0.6);
        ctx.stroke();
        break;
      case 'daggers':
        ctx.fillStyle = pal.secondary;
        ctx.beginPath();
        ctx.moveTo(2, -3);
        ctx.lineTo(22, 0);
        ctx.lineTo(2, 3);
        ctx.closePath();
        ctx.fill();
        break;
      case 'lance':
        ctx.fillRect(-4, -2, 26, 4);
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.moveTo(22, -5);
        ctx.lineTo(34, 0);
        ctx.lineTo(22, 5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'flask':
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.arc(8, 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(6, -7, 4, 4);
        break;
      case 'staff':
      case 'totem':
      case 'hawkstaff':
      case 'hexstaff':
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, -18, 4, 34);
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.arc(2, -21, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'axes':
      case 'cleaver':
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, -2, 18, 4);
        ctx.fillStyle = pal.secondary;
        ctx.beginPath();
        ctx.arc(17, -4, 9, -Math.PI * 0.7, Math.PI * 0.4);
        ctx.fill();
        break;
      case 'hammer':
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, -2, 18, 4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(14, -10, 10, 20);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(17, -8, 4, 16);
        break;
      case 'orb':
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.arc(12, -4, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.fillRect(0, -3, 18, 5);
        break;
    }
    ctx.restore();
  }

  function drawFighter(ctx, f, time) {
    const def = f.def;
    const pal = def.palette;
    const race = def.race;
    const scaleY = race === 'dwarf' ? 0.86 : race === 'orc' ? 1.12 : race === 'elf' ? 1.05 : 1.0;
    const scaleX = race === 'dwarf' ? 1.12 : race === 'orc' ? 1.15 : race === 'elf' ? 0.92 : 1.0;

    ctx.save();
    ctx.translate(f.x, f.y);

    // Ultimate ready aura
    if (f.hasUltimate) {
      ctx.save();
      const pulse = 1 + 0.14 * Math.sin(time * 12);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, -24, 24 * pulse, 32 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Invulnerability blink
    if (f.invuln > 0 && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Smash charge golden shimmer
    if (f.chargeTime > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
      ctx.beginPath();
      ctx.arc(0, -24, 26 + Math.sin(time * 28) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Counter / Reflect aura
    if (f.counterTimer > 0 || f.reflectTimer > 0) {
      ctx.save();
      ctx.strokeStyle = f.reflectTimer > 0 ? '#38bdf8' : '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -24, 27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hitstun tumble rotation
    if (f.hitstun > 0) {
      ctx.translate(0, -22);
      ctx.rotate(f.tumbleAngle || 0);
      ctx.translate(0, 22);
    }

    ctx.scale(f.face * scaleX, scaleY);

    if (!window.GG2DE_FIGHTER_MODELS?.draw(ctx, f, time)) drawCanvasFighter(ctx, f, time);

    // Active attack slash arc
    if (f.activeHitbox && f.attackTimer > 0) {
      ctx.save();
      ctx.strokeStyle = pal.glow;
      ctx.lineWidth = f.activeHitbox.smash ? 5 : 3;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(14, -24, Math.max(16, (f.activeHitbox.r || 26) * 0.78), -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Bubble Shield
    if (f.shielding) {
      const ratio = Math.max(0.25, f.shieldHp / 100);
      ctx.save();
      ctx.fillStyle = f.color + '33';
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 24, 31 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Dizzy shield-break stars
    if (f.dizzyTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#fde047';
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + (i * Math.PI * 2) / 3;
        ctx.fillText('★', f.x + Math.cos(a) * 16 - 4, f.y - 62 + Math.sin(a) * 5);
      }
      ctx.restore();
    }

    // Overhead P1 / P2 / CPU tag
    ctx.save();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.fillText(f.tag, f.x, f.y - 66);
    ctx.beginPath();
    ctx.moveTo(f.x - 5, f.y - 62);
    ctx.lineTo(f.x + 5, f.y - 62);
    ctx.lineTo(f.x, f.y - 56);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawClassGear(ctx, cls, pal) {
    // Silhouette overlays so Warrior / Tank / Support / Mage read apart at a glance.
    if (cls === 'warrior') {
      ctx.fillStyle = pal.secondary;
      ctx.fillRect(-12, -38, 24, 6);
      ctx.fillStyle = pal.glow;
      ctx.fillRect(-3, -34, 6, 14);
      [-1, 1].forEach(s => {
        ctx.fillStyle = pal.secondary;
        ctx.beginPath();
        ctx.moveTo(s * 10, -36);
        ctx.lineTo(s * 18, -42);
        ctx.lineTo(s * 14, -28);
        ctx.closePath();
        ctx.fill();
      });
    } else if (cls === 'tank') {
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.roundRect(-13, -38, 26, 26, 4);
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.fillRect(-5, -32, 10, 10);
      [-1, 1].forEach(s => {
        ctx.fillStyle = pal.secondary;
        ctx.fillRect(s * 12 - (s < 0 ? 8 : 0), -40, 8, 14);
      });
      ctx.fillStyle = pal.primary;
      ctx.fillRect(-11, -16, 22, 6);
    } else if (cls === 'support') {
      ctx.fillStyle = pal.glow;
      ctx.fillRect(-2, -34, 4, 14);
      ctx.fillRect(-7, -29, 14, 4);
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.moveTo(-11, -18);
      ctx.lineTo(11, -18);
      ctx.lineTo(14, -10);
      ctx.lineTo(-14, -10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(-12, -22, 6, 5);
      ctx.fillRect(6, -22, 6, 5);
    } else if (cls === 'mage') {
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.moveTo(-12, -20);
      ctx.lineTo(12, -20);
      ctx.lineTo(16, -8);
      ctx.lineTo(-16, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(-11, -34, 4, 0, Math.PI * 2);
      ctx.arc(11, -34, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(-3, -36, 6, 16);
    }
  }

  function drawClassHeadwear(ctx, cls, pal, race) {
    if (cls === 'tank') {
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.arc(0, -2, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.fillRect(-6, -4, 12, 5);
      if (race !== 'dwarf') {
        ctx.fillStyle = pal.primary;
        ctx.fillRect(-4, 4, 8, 5);
      }
    } else if (cls === 'mage') {
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(0, -22);
      ctx.lineTo(10, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(0, -22, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (cls === 'support') {
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.ellipse(0, -6, 11, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.fillRect(-5, -2, 10, 3);
    } else if (cls === 'warrior') {
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.moveTo(-4, -10);
      ctx.lineTo(0, -18);
      ctx.lineTo(4, -10);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCanvasFighter(ctx, f, time) {
    // Squash & stretch during jump/land/crouch
    ctx.save();
    const { palette: pal, race, cls } = f.def;
    const def = f.def;
    const crouchY = f.crouching ? 0.76 : 1;
    ctx.scale(1 / Math.sqrt(crouchY), crouchY);

    const runCycle = Math.abs(f.vx) > 25 && f.onGround ? Math.sin(time * 16) : 0;
    const attackPhase = f.attackTimer > 0 && f.attackDur > 0 ? 1 - f.attackTimer / f.attackDur : 0;

    // Back leg
    ctx.strokeStyle = pal.secondary;
    ctx.lineWidth = cls === 'tank' ? 7 : cls === 'mage' ? 4 : 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.lineTo(-5 - runCycle * 8, -2);
    ctx.stroke();

    // Front leg
    ctx.strokeStyle = pal.primary;
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.lineTo(5 + runCycle * 8, -2);
    ctx.stroke();

    // Jetpack for Human (warriors/tanks keep thrusters; support/mage get a smaller pack)
    if (race === 'human') {
      ctx.fillStyle = '#475569';
      const packH = cls === 'mage' || cls === 'support' ? 12 : 17;
      ctx.fillRect(-13, -34, 7, packH);
      if (!f.onGround && f.vy < 0) {
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.moveTo(-13, -17);
        ctx.lineTo(-9, -6 - Math.random() * 6);
        ctx.lineTo(-6, -17);
        ctx.fill();
      }
    }

    // Torso — tank bulkier, mage/support narrower
    const torsoW = cls === 'tank' ? 24 : cls === 'mage' || cls === 'support' ? 17 : 20;
    const torsoX = -torsoW / 2;
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.roundRect(torsoX, -36, torsoW, 23, 5);
    ctx.fill();

    // Accent chest crest / armor
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-6, -32, 12, 5);

    drawClassGear(ctx, cls, pal);

    // Elf filigree tasset (skip for tank plate skirt already drawn)
    if (race === 'elf' && cls !== 'tank') {
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.moveTo(-10, -16);
      ctx.lineTo(10, -16);
      ctx.lineTo(13, -6);
      ctx.lineTo(-13, -6);
      ctx.closePath();
      ctx.fill();
    }

    // Head
    ctx.save();
    ctx.translate(0, -45);
    if (race === 'human') {
      // EVA Sealed Helmet
      ctx.fillStyle = pal.secondary;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.roundRect(1, -5, 9, 8, 3);
      ctx.fill();
    } else if (race === 'elf') {
      // Pointed ear + glowing BrightEyes + emerald hair
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-16, -8);
      ctx.lineTo(-7, 2);
      ctx.closePath();
      ctx.fill();
      // Hair sweep
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(-2, -3, 9.5, Math.PI * 0.7, Math.PI * 2.1);
      ctx.fill();
      // BrightEyes
      ctx.fillStyle = pal.glow;
      ctx.fillRect(3, -3, 4, 3);
    } else if (race === 'dwarf') {
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      // Iron helm + horns (base); class headwear may layer on top
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, -2, 10.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-6, -9);
      ctx.lineTo(-12, -16);
      ctx.lineTo(-2, -10);
      ctx.fill();
      // Lush beard
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.moveTo(-7, 2);
      ctx.lineTo(8, 2);
      ctx.lineTo(4, 15);
      ctx.lineTo(-4, 15);
      ctx.closePath();
      ctx.fill();
    } else {
      // Orc skull + tusks + warpaint
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.fill();
      // Tusks
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.lineTo(7, -1);
      ctx.lineTo(9, 5);
      ctx.fill();
      // Glowing red/amber eye
      ctx.fillStyle = pal.glow;
      ctx.fillRect(3, -4, 4, 3);
      // Crest
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-3, -12, 6, 4);
    }
    drawClassHeadwear(ctx, cls, pal, race);
    ctx.restore();

    // Arm & Weapon
    ctx.save();
    ctx.translate(4, -29);
    drawWeapon(ctx, def.weapon, pal, attackPhase);
    ctx.restore();

    // Off-hand cue: tank shield plate
    if (cls === 'tank') {
      ctx.save();
      ctx.translate(-10, -28);
      ctx.fillStyle = pal.secondary;
      ctx.strokeStyle = pal.glow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-6, -12, 10, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pal.glow;
      ctx.fillRect(-3, -4, 4, 10);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawProjectile(ctx, p, time) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = p.color || '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    if (p.kind === 'hatchet' || p.kind === 'saw') {
      ctx.rotate(time * 18);
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-p.r * 0.5, -2, p.r, 4);
    } else if (p.kind === 'boulder' || p.kind === 'grenade' || p.kind === 'flask') {
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (p.kind === 'hawk') {
      ctx.scale(p.vx >= 0 ? 1 : -1, 1);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.beginPath();
      ctx.roundRect(-p.r * 1.4, -p.r * 0.55, p.r * 2.8, p.r * 1.1, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLeyCore(ctx, orb, time) {
    ctx.save();
    ctx.translate(orb.x, orb.y);
    const pulse = 1 + 0.14 * Math.sin(time * 9);
    const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 24 * pulse);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#fef08a');
    g.addColorStop(0.75, '#a855f7');
    g.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.rotate(time * 3);
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
  }

  function drawItem(ctx, it, time) {
    ctx.save();
    ctx.translate(it.x, it.y);
    if (it.kind === 'crate') {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-16, -32, 32, 32);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -32, 32, 32);
      ctx.beginPath();
      ctx.moveTo(-16, -32);
      ctx.lineTo(16, 0);
      ctx.moveTo(16, -32);
      ctx.lineTo(-16, 0);
      ctx.stroke();
    } else {
      const bob = Math.sin(time * 5 + it.x) * 3;
      ctx.translate(0, -14 + bob);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = it.kind === 'ale' ? '🍺' : it.kind === 'bomb' ? '💣' : '⚡';
      ctx.fillText(icon, 0, 1);
    }
    ctx.restore();
  }

  function drawTurret(ctx, tr) {
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-10, -14, 20, 14);
    ctx.fillStyle = tr.color || '#38bdf8';
    ctx.fillRect(0, -12, tr.face * 14, 5);
    ctx.restore();
  }

  function drawOffscreenIndicators(ctx, fighters, cam, w, h, scale) {
    for (const f of fighters) {
      if (f.eliminated || f.respawnTimer > 0) continue;
      const sx = (f.x - cam.x) * scale + w * 0.5;
      const sy = (f.y - 24 - cam.y) * scale + h * 0.5;
      if (sx >= 16 && sx <= w - 16 && sy >= 16 && sy <= h - 16) continue;
      const ix = Math.max(28, Math.min(w - 28, sx));
      const iy = Math.max(28, Math.min(h - 28, sy));
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ix, iy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.floor(f.pct)}%`, ix, iy);
      ctx.restore();
    }
  }

  function drawTrainingOverlay(ctx, match) {
    const { FIGHTER_HURT_RADIUS, FIGHTER_HURT_OFFSET } = window.GG2DE_ENGINE;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    function ring(x, y, radius, color) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const f of match.fighters) {
      if (f.eliminated || f.respawnTimer > 0) continue;
      const guarding = f.invuln > 0 ? ' · INVULN ' + Math.ceil(f.invuln * 1000) + 'ms' : '';
      ring(f.x, f.y - FIGHTER_HURT_OFFSET, FIGHTER_HURT_RADIUS, guarding ? '#fde047' : '#67e8f9');
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(Math.round(f.pct) + '%' + guarding, f.x, f.y + 14);
      const hit = f.activeHitbox;
      if (!hit) continue;
      const x = f.x + hit.ox;
      const y = f.y + hit.oy;
      ring(x, y, hit.r, '#fb7185');
      const angle = hit.angle * Math.PI / 180;
      const direction = hit.dir ?? f.face;
      const vx = Math.cos(angle) * direction, vy = -Math.sin(angle);
      const length = Math.max(22, Math.min(56, hit.kb * 0.10));
      const tx = x + vx * length, ty = y + vy * length;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.moveTo(tx - 8 * vx + 4 * vy, ty - 8 * vy - 4 * vx);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx - 8 * vx - 4 * vy, ty - 8 * vy + 4 * vx);
      ctx.stroke();
      ctx.fillStyle = '#fecdd3';
      ctx.fillText(Math.ceil(f.attackTimer * 1000) + 'ms', x, y - hit.r - 4);
    }
    for (const p of match.projectiles) ring(p.x, p.y, p.r, '#fb7185');
    ctx.restore();
  }

  window.GG2DE_RENDER = {
    drawStageBackground,
    drawStageGeometry,
    drawFighter,
    drawProjectile,
    drawLeyCore,
    drawItem,
    drawTurret,
    drawOffscreenIndicators,
    drawTrainingOverlay
  };
})();
