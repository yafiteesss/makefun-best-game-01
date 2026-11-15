// The renderer: every pixel of Lumen Drift, drawn on one canvas. The background is
// a dusk gradient with drifting nebulae and three layers of twinkling stars; the
// ship is a little lantern-ship with a lit core; motes glow; rocks are craggy
// polygons. The HUD and the title, pause, level-clear and game-over screens are
// drawn here too, so a screenshot shows the whole game, not a DOM overlay.

import { HEIGHT, HULL_MAX, WIDTH } from './config.js';
import {
  SCREEN_LEVEL,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, state) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#0b1030');
  gradient.addColorStop(0.55, '#171238');
  gradient.addColorStop(1, '#2a1a4a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const nebula of state.nebulae) {
    const glow = ctx.createRadialGradient(
      nebula.x, nebula.y, 0,
      nebula.x, nebula.y, nebula.radius,
    );
    glow.addColorStop(0, nebula.color);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
  }

  for (const star of state.stars) {
    const alpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(star.twinkle));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#dfe8ff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawMote(ctx, mote, time) {
  const pulse = 1 + 0.12 * Math.sin(time * 3 + mote.phase);
  const radius = mote.radius * pulse;
  ctx.save();
  ctx.shadowColor = mote.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = mote.color;
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRock(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.rotation);
  ctx.beginPath();
  for (let i = 0; i < rock.verts.length; i += 1) {
    const angle = (i / rock.verts.length) * Math.PI * 2;
    const r = rock.radius * rock.verts[i];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#4a3f3a';
  ctx.fill();
  ctx.strokeStyle = '#6e5d54';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(-rock.radius * 0.3, -rock.radius * 0.2, rock.radius * 0.22, 0, Math.PI * 2);
  ctx.arc(rock.radius * 0.35, rock.radius * 0.3, rock.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShip(ctx, ship, time) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  // A hit just taken blinks the ship while it is invulnerable.
  if (ship.invuln > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.rotate(ship.angle + Math.PI / 2);
  // The hull: a slim teardrop with side fins.
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(11, -4, 9, 8);
  ctx.quadraticCurveTo(5, 14, 0, 14);
  ctx.quadraticCurveTo(-5, 14, -9, 8);
  ctx.quadraticCurveTo(-11, -4, 0, -18);
  ctx.closePath();
  ctx.fillStyle = '#e8dcc0';
  ctx.fill();
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // The lantern core: a warm glow that flickers as the lamp burns.
  const flicker = 0.85 + 0.15 * Math.sin(time * 9);
  ctx.shadowColor = '#ffc44d';
  ctx.shadowBlur = 16 * flicker;
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(0, 0, 5.5 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // The flame trail while thrusting.
  if (ship.thrust > 0.3) {
    ctx.fillStyle = `rgba(255, 179, 92, ${0.55 * ship.thrust})`;
    ctx.beginPath();
    ctx.moveTo(-4, 13);
    ctx.lineTo(0, 13 + 12 * ship.thrust + 4 * Math.sin(time * 22));
    ctx.lineTo(4, 13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHearts(ctx, x, y, hull) {
  for (let i = 0; i < HULL_MAX; i += 1) {
    const hx = x + i * 26;
    ctx.save();
    ctx.translate(hx, y);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-9, -2, -6, -9, 0, -4);
    ctx.bezierCurveTo(6, -9, 9, -2, 0, 7);
    ctx.closePath();
    ctx.fillStyle = i < hull ? '#ff7a6b' : 'rgba(255, 255, 255, 0.18)';
    ctx.fill();
    ctx.restore();
  }
}

function drawHud(ctx, state, target) {
  // Top bar: score and beacon target on the left, level in the middle, hull and
  // fuel on the right.
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 30, 0.55)';
  roundRect(ctx, 12, 10, WIDTH - 24, 52, 10);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 28, 30);
  ctx.fillStyle = '#b9c4e8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`Beacon at ${target}`, 28, 50);

  ctx.fillStyle = '#dfe8ff';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${state.level}`, WIDTH / 2, 26);
  const progress = Math.min(1, state.score / target);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  roundRect(ctx, WIDTH / 2 - 90, 40, 180, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd97a';
  roundRect(ctx, WIDTH / 2 - 90, 40, 180 * progress, 8, 4);
  ctx.fill();

  drawHearts(ctx, WIDTH - 196, 26, state.hull);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b9c4e8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('FUEL', WIDTH - 208, 48);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  roundRect(ctx, WIDTH - 196, 42, 168, 10, 5);
  ctx.fill();
  const fuelFraction = Math.max(0, state.fuel / 100);
  ctx.fillStyle = fuelFraction > 0.3 ? '#7fe7a8' : '#ff7a6b';
  roundRect(ctx, WIDTH - 196, 42, 168 * fuelFraction, 10, 5);
  ctx.fill();

  // The combo badge floats beside the ship while a chain is alive.
  if (state.combo > 1) {
    const remaining = state.comboTimer / 2.5;
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(`COMBO x${state.combo}`, state.ship.x, state.ship.y - 34);
    ctx.fillStyle = 'rgba(255, 233, 168, 0.5)';
    ctx.fillRect(state.ship.x - 26, state.ship.y - 28, 52 * remaining, 3);
  }

  if (state.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, state.messageTimer);
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.message, WIDTH / 2, 92);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPanel(ctx, title, lines, footnote) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 30, 0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(20, 24, 60, 0.9)';
  roundRect(ctx, WIDTH / 2 - 300, 108, 600, 384, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 122, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, WIDTH / 2, 158);

  ctx.fillStyle = '#dfe8ff';
  ctx.font = '19px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, 216 + i * 34);
  });

  ctx.fillStyle = '#9fb0dd';
  ctx.font = '16px Georgia, serif';
  ctx.fillText(footnote, WIDTH / 2, 452);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const scale = Math.min(canvas.width / WIDTH, canvas.height / HEIGHT);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - WIDTH * scale) / 2, (canvas.height - HEIGHT * scale) / 2);
  }

  function draw(state, screen, best, target) {
    fit();
    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground(ctx, state);

    for (const mote of state.motes) drawMote(ctx, mote, state.elapsed);
    for (const rock of state.rocks) drawRock(ctx, rock);
    if (screen !== SCREEN_OVER) drawShip(ctx, state.ship, state.elapsed);
    drawParticles(ctx, state.particles);

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(ctx, state, target);
    }

    if (screen === SCREEN_TITLE) {
      drawPanel(
        ctx,
        'LUMEN DRIFT',
        [
          'Steer the lantern-ship through the Dusk Reefs.',
          'Gather light-motes to charge the beacon —',
          'reach the target score before your lamp runs dry.',
          'Dodge the reef rocks: three hits and the light goes out.',
          '',
          'Mouse or WASD / arrows to fly · Space to dash',
          'P to pause · M to mute',
        ],
        best > 0 ? `Best score ${best} — press Enter or click to begin` : 'Press Enter or click to begin',
      );
    } else if (screen === SCREEN_PAUSED) {
      drawPanel(
        ctx,
        'PAUSED',
        [
          `Score ${state.score}  ·  Level ${state.level}`,
          'The reef waits for no one — except now.',
        ],
        'Press P, Enter or click to keep flying',
      );
    } else if (screen === SCREEN_LEVEL) {
      drawPanel(
        ctx,
        `BEACON ${state.level - 1} LIT`,
        [
          `Score ${state.score}  (beacon bonus +${state.levelBonus})`,
          `Level ${state.level}: a darker reef, faster rocks.`,
          'Your lamp is refilled and your hull mended.',
        ],
        'Press Enter or click to fly the next reef',
      );
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        ctx,
        'THE LAMP GOES OUT',
        [
          `Score ${state.score}`,
          state.score >= best && state.score > 0 ? 'A new best — the reef remembers.' : `Best score ${best}`,
          'The motes drift on without you.',
        ],
        'Press Enter or click to light the lamp again',
      );
    }
    ctx.restore();
  }

  return { draw };
}
