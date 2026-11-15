// Staged scenes for screenshots: ?shot=start|play|level|end (with &seed=N) builds
// a fixed scene from the seeded random source and paints it, instead of running
// the loop. The screenshots are real renders of the game's own code, with the
// same HUD, ship, motes and rocks a player would see.

import { HEIGHT, HULL_MAX, WIDTH } from './config.js';
import {
  SCREEN_LEVEL,
  SCREEN_OVER,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './world.js';

function scatterMotes(world, count) {
  const { random } = world.state;
  for (let i = 0; i < count; i += 1) {
    world.state.motes.push({
      x: random.range(60, WIDTH - 60),
      y: random.range(90, HEIGHT - 80),
      radius: random.chance(0.15) ? 13 : 10,
      bright: random.chance(0.15),
      color: random.pick(['#ffd97a', '#ffe9a8', '#ffc44d', '#7fe7ff']),
      phase: random.range(0, Math.PI * 2),
      wobble: random.range(0.5, 1.4),
      driftX: 0,
      driftY: 0,
    });
  }
}

function scatterRocks(world, count) {
  const { random } = world.state;
  for (let i = 0; i < count; i += 1) {
    const radius = random.range(15, 30);
    const verts = [];
    const points = random.int(7, 10);
    for (let j = 0; j < points; j += 1) verts.push(random.range(0.75, 1.15));
    world.state.rocks.push({
      radius,
      verts,
      rotation: random.range(0, Math.PI * 2),
      spin: 0,
      x: random.range(60, WIDTH - 60),
      y: random.range(110, HEIGHT - 100),
      vx: 0,
      vy: 0,
    });
  }
}

function scatterParticles(world, x, y, color, count) {
  const { random } = world.state;
  for (let i = 0; i < count; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    const magnitude = random.range(20, 140);
    world.state.particles.push({
      x: x + random.range(-14, 14),
      y: y + random.range(-14, 14),
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life: random.range(0.3, 0.8),
      maxLife: 0.8,
      color,
      size: random.range(1.5, 3.5),
    });
  }
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset(1);
  state.elapsed = 12.4;
  state.best = 512;

  if (name === 'start') {
    state.screen = SCREEN_TITLE;
    state.ship.x = WIDTH / 2;
    state.ship.y = HEIGHT * 0.66;
    scatterMotes(world, 7);
    scatterRocks(world, 3);
    return { screen: SCREEN_TITLE, best: 512 };
  }

  if (name === 'play') {
    state.screen = SCREEN_PLAY;
    state.score = 260;
    state.level = 1;
    state.hull = HULL_MAX;
    state.fuel = 72;
    state.combo = 4;
    state.comboTimer = 1.8;
    state.time = 41.2;
    state.ship.x = 470;
    state.ship.y = 380;
    state.ship.vx = 120;
    state.ship.vy = -60;
    state.ship.angle = Math.atan2(-60, 120);
    state.ship.thrust = 0.8;
    scatterMotes(world, 8);
    scatterRocks(world, 5);
    // Keep the ship visible: no rock may sit on top of it in this scene.
    world.state.rocks = world.state.rocks.filter(
      (rock) => Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y) > 110,
    );
    scatterParticles(world, 560, 330, '#ffd97a', 10);
    scatterParticles(world, 380, 430, '#7fe7ff', 8);
    return { screen: SCREEN_PLAY, best: 512 };
  }

  if (name === 'level') {
    state.screen = SCREEN_LEVEL;
    state.score = 450;
    state.level = 2;
    state.levelBonus = 50;
    state.hull = HULL_MAX;
    state.fuel = 100;
    state.ship.x = WIDTH / 2;
    state.ship.y = HEIGHT * 0.66;
    scatterMotes(world, 6);
    scatterParticles(world, WIDTH / 2, 300, '#ffd97a', 16);
    return { screen: SCREEN_LEVEL, best: 512 };
  }

  // 'end' (and anything unknown): the game-over screen.
  state.screen = SCREEN_OVER;
  state.score = 512;
  state.best = 512;
  state.hull = 0;
  state.fuel = 0;
  state.ship.x = 480;
  state.ship.y = 330;
  scatterMotes(world, 5);
  scatterRocks(world, 4);
  scatterParticles(world, 480, 330, '#ffb35c', 20);
  return { screen: SCREEN_OVER, best: 512 };
}
