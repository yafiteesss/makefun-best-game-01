// The world: the ship, the drifting reef rocks, the light-motes, the particles,
// and the rules that bind them. It knows nothing about the screen or the sound:
// update() advances one fixed step and returns the events the loop should answer
// (a pickup to chime, a hit to thud, a level lit, a lamp gone out).

import {
  BRIGHT_MOTE_CHANCE,
  BRIGHT_MOTE_POINTS,
  COMBO_MAX,
  COMBO_WINDOW,
  DASH_COST,
  DASH_INVULN,
  DASH_SPEED,
  DASH_TIME,
  FUEL_DRAIN,
  FUEL_MAX,
  FUEL_PER_BRIGHT_MOTE,
  FUEL_PER_MOTE,
  HEIGHT,
  HIT_INVULN,
  HULL_MAX,
  LEVELS,
  LEVEL_CLEAR_FUEL_BONUS,
  LEVEL_CLEAR_HULL_BONUS,
  MOTE_POINTS,
  SHIP_ACCEL,
  SHIP_DAMPING,
  SHIP_MAX_SPEED,
  SHIP_RADIUS,
  WIDTH,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';

export const EVENT_PICKUP = 'pickup';
export const EVENT_BRIGHT = 'bright';
export const EVENT_HIT = 'hit';
export const EVENT_DASH = 'dash';
export const EVENT_LEVEL = 'level';
export const EVENT_OVER = 'over';

const MOTE_COLORS = ['#ffd97a', '#ffe9a8', '#ffc44d'];
const NEBULA_COLORS = [
  'rgba(88, 60, 180, 0.20)',
  'rgba(30, 120, 160, 0.16)',
  'rgba(180, 70, 130, 0.14)',
  'rgba(60, 90, 200, 0.16)',
];

function makeStars(random, count, layer) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: random.range(0, WIDTH),
      y: random.range(0, HEIGHT),
      size: random.range(0.6, 1.8) * layer,
      speed: random.range(6, 16) * layer,
      twinkle: random.range(0, Math.PI * 2),
      twinkleSpeed: random.range(0.5, 2),
    });
  }
  return stars;
}

function makeNebulae(random) {
  const nebulae = [];
  for (let i = 0; i < 5; i += 1) {
    nebulae.push({
      x: random.range(0, WIDTH),
      y: random.range(0, HEIGHT),
      radius: random.range(140, 260),
      color: NEBULA_COLORS[i % NEBULA_COLORS.length],
      driftX: random.range(-4, 4),
      driftY: random.range(2, 6),
    });
  }
  return nebulae;
}

function makeRock(random, level, edge) {
  const radius = random.range(14, 30);
  const verts = [];
  const points = random.int(7, 10);
  for (let i = 0; i < points; i += 1) {
    verts.push(random.range(0.75, 1.15));
  }
  const rock = {
    radius,
    verts,
    rotation: random.range(0, Math.PI * 2),
    spin: random.range(-0.8, 0.8),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  };
  const speed = random.range(level.rockSpeed * 0.7, level.rockSpeed * 1.3);
  if (edge === 'top') {
    rock.x = random.range(0, WIDTH);
    rock.y = -radius - 4;
    rock.vx = random.range(-25, 25);
    rock.vy = speed;
  } else {
    rock.x = WIDTH + radius + 4;
    rock.y = random.range(0, HEIGHT * 0.7);
    rock.vx = -speed * random.range(0.7, 1.1);
    rock.vy = random.range(10, 50);
  }
  return rock;
}

function makeMote(random, bright) {
  return {
    x: random.range(40, WIDTH - 40),
    y: random.range(60, HEIGHT - 60),
    radius: bright ? 13 : 10,
    bright,
    color: bright ? '#7fe7ff' : MOTE_COLORS[Math.floor(random.next() * MOTE_COLORS.length)],
    phase: random.range(0, Math.PI * 2),
    wobble: random.range(0.5, 1.4),
    driftX: random.range(-8, 8),
    driftY: random.range(-6, 10),
  };
}

function burst(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.random.range(0, Math.PI * 2);
    const magnitude = state.random.range(speed * 0.3, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life: state.random.range(0.35, 0.8),
      maxLife: 0.8,
      color,
      size: state.random.range(1.5, 3.5),
    });
  }
}

export function createWorld(random) {
  const state = {
    random,
    screen: SCREEN_TITLE,
    level: 1,
    score: 0,
    best: 0,
    hull: HULL_MAX,
    fuel: FUEL_MAX,
    combo: 0,
    comboTimer: 0,
    time: 0,
    levelBonus: 0,
    message: '',
    messageTimer: 0,
    ship: {
      x: WIDTH / 2,
      y: HEIGHT * 0.62,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      invuln: 0,
      dashTimer: 0,
      dashX: 0,
      dashY: 0,
      thrust: 0,
    },
    motes: [],
    rocks: [],
    particles: [],
    stars: [...makeStars(random, 60, 0.7), ...makeStars(random, 40, 1.2), ...makeStars(random, 24, 1.8)],
    nebulae: makeNebulae(random),
    moteTimer: 0,
    rockTimer: 0,
    elapsed: 0,
  };

  function levelConfig() {
    return LEVELS[Math.min(state.level, LEVELS.length) - 1];
  }

  function target() {
    return levelConfig().target;
  }

  function reset(level) {
    state.level = level;
    state.score = 0;
    state.hull = HULL_MAX;
    state.fuel = FUEL_MAX;
    state.combo = 0;
    state.comboTimer = 0;
    state.time = 0;
    state.levelBonus = 0;
    state.message = '';
    state.messageTimer = 0;
    state.motes = [];
    state.rocks = [];
    state.particles = [];
    state.moteTimer = 0;
    state.rockTimer = 0.5;
    state.ship.x = WIDTH / 2;
    state.ship.y = HEIGHT * 0.62;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.angle = -Math.PI / 2;
    state.ship.invuln = 0;
    state.ship.dashTimer = 0;
    state.ship.thrust = 0;
    // Seed the reef with a few motes so the first seconds already offer a choice.
    for (let i = 0; i < 5; i += 1) {
      state.motes.push(makeMote(random, false));
    }
  }

  function startGame() {
    reset(1);
    state.screen = SCREEN_PLAY;
  }

  function nextLevel() {
    const bonus = Math.round(state.fuel) * LEVEL_CLEAR_FUEL_BONUS + state.hull * LEVEL_CLEAR_HULL_BONUS;
    state.levelBonus = bonus;
    state.score += bonus;
    state.level += 1;
    state.fuel = FUEL_MAX;
    state.hull = HULL_MAX;
    state.combo = 0;
    state.comboTimer = 0;
    state.motes = [];
    state.rocks = [];
    state.particles = [];
    state.moteTimer = 0;
    state.rockTimer = 1;
    state.ship.x = WIDTH / 2;
    state.ship.y = HEIGHT * 0.62;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.invuln = 1;
    state.screen = SCREEN_LEVEL;
    state.message = `Beacon ${state.level - 1} lit`;
    state.messageTimer = 2.5;
  }

  function endGame() {
    state.screen = SCREEN_OVER;
    if (state.score > state.best) state.best = state.score;
    burst(state, state.ship.x, state.ship.y, '#ffb35c', 42, 220);
    burst(state, state.ship.x, state.ship.y, '#ffffff', 18, 160);
  }

  function updateShip(dt, input) {
    const ship = state.ship;
    const held = input.held;
    const pointer = input.pointer;

    let ax = 0;
    let ay = 0;
    if (held.left) ax -= 1;
    if (held.right) ax += 1;
    if (held.up) ay -= 1;
    if (held.down) ay += 1;
    if (ax !== 0 || ay !== 0) {
      const length = Math.hypot(ax, ay);
      ax /= length;
      ay /= length;
    } else if (pointer.active && pointer.x !== null) {
      // Steer toward the pointer when the mouse is the hand on the wheel.
      const dx = pointer.x - ship.x;
      const dy = pointer.y - ship.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        ax = dx / distance;
        ay = dy / distance;
      }
    }

    if (ship.dashTimer > 0) {
      ship.dashTimer -= dt;
      ship.vx = ship.dashX * DASH_SPEED;
      ship.vy = ship.dashY * DASH_SPEED;
      ship.thrust = 1;
    } else {
      ship.vx += ax * SHIP_ACCEL * dt;
      ship.vy += ay * SHIP_ACCEL * dt;
      const damp = Math.exp(-SHIP_DAMPING * dt);
      ship.vx *= damp;
      ship.vy *= damp;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > SHIP_MAX_SPEED) {
        ship.vx = (ship.vx / speed) * SHIP_MAX_SPEED;
        ship.vy = (ship.vy / speed) * SHIP_MAX_SPEED;
      }
      ship.thrust = Math.min(1, speed / SHIP_MAX_SPEED);
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = Math.max(SHIP_RADIUS, Math.min(WIDTH - SHIP_RADIUS, ship.x));
    ship.y = Math.max(SHIP_RADIUS + 8, Math.min(HEIGHT - SHIP_RADIUS, ship.y));
    if (Math.hypot(ship.vx, ship.vy) > 20) {
      ship.angle = Math.atan2(ship.vy, ship.vx);
    }
    if (ship.invuln > 0) ship.invuln -= dt;

    // A faint thrust trail, so motion reads even on a still screenshot.
    if (ship.thrust > 0.25 && state.random.chance(0.6)) {
      state.particles.push({
        x: ship.x - Math.cos(ship.angle) * 16,
        y: ship.y - Math.sin(ship.angle) * 16,
        vx: -Math.cos(ship.angle) * 40 + state.random.range(-12, 12),
        vy: -Math.sin(ship.angle) * 40 + state.random.range(-12, 12),
        life: 0.4,
        maxLife: 0.4,
        color: '#ffb35c',
        size: state.random.range(1.5, 3),
      });
    }
  }

  function update(dt, input) {
    const events = [];
    const actions = input.takeActions();

    if (state.screen === SCREEN_TITLE) {
      if (actions.includes('confirm')) startGame();
      updateAmbient(dt);
      return events;
    }
    if (state.screen === SCREEN_LEVEL) {
      if (actions.includes('confirm')) state.screen = SCREEN_PLAY;
      updateAmbient(dt);
      return events;
    }
    if (state.screen === SCREEN_OVER) {
      if (actions.includes('confirm')) startGame();
      updateAmbient(dt);
      return events;
    }
    if (state.screen === SCREEN_PAUSED) {
      if (actions.includes('pause') || actions.includes('confirm')) state.screen = SCREEN_PLAY;
      return events;
    }

    // SCREEN_PLAY from here on.
    if (actions.includes('pause')) {
      state.screen = SCREEN_PAUSED;
      return events;
    }
    if (actions.includes('dash')) {
      const ship = state.ship;
      if (state.fuel >= DASH_COST && ship.dashTimer <= 0) {
        let dx = ship.vx;
        let dy = ship.vy;
        const speed = Math.hypot(dx, dy);
        if (speed < 20 && input.pointer.active && input.pointer.x !== null) {
          dx = input.pointer.x - ship.x;
          dy = input.pointer.y - ship.y;
        }
        if (speed < 20 && Math.hypot(dx, dy) < 20) {
          dx = Math.cos(ship.angle);
          dy = Math.sin(ship.angle);
        }
        const length = Math.hypot(dx, dy) || 1;
        ship.dashX = dx / length;
        ship.dashY = dy / length;
        ship.dashTimer = DASH_TIME;
        ship.invuln = Math.max(ship.invuln, DASH_INVULN);
        state.fuel -= DASH_COST;
        events.push({ type: EVENT_DASH });
        burst(state, ship.x, ship.y, '#9fd8ff', 10, 120);
      }
    }

    state.time += dt;
    state.elapsed += dt;
    const level = levelConfig();

    // The lamp burns: fuel drains, and an empty lamp ends the run.
    state.fuel -= FUEL_DRAIN * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      endGame();
      events.push({ type: EVENT_OVER, reason: 'fuel' });
      return events;
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.messageTimer > 0) state.messageTimer -= dt;

    updateShip(dt, input);

    // Spawn motes and rocks on their own clocks, denser as the levels rise.
    state.moteTimer -= dt;
    if (state.moteTimer <= 0 && state.motes.length < 10) {
      state.motes.push(makeMote(random, random.chance(BRIGHT_MOTE_CHANCE)));
      state.moteTimer = 1 / level.moteRate;
    }
    state.rockTimer -= dt;
    if (state.rockTimer <= 0 && state.rocks.length < level.rockMax) {
      state.rocks.push(makeRock(random, level, random.chance(0.7) ? 'top' : 'right'));
      state.rockTimer = 1 / level.rockRate;
    }

    // Motes drift and wobble; the ship gathers them.
    for (let i = state.motes.length - 1; i >= 0; i -= 1) {
      const mote = state.motes[i];
      mote.phase += dt * mote.wobble;
      mote.x += (mote.driftX + Math.cos(mote.phase) * 14) * dt;
      mote.y += (mote.driftY + Math.sin(mote.phase * 0.7) * 10) * dt;
      if (mote.x < 16 || mote.x > WIDTH - 16 || mote.y < 40 || mote.y > HEIGHT - 16) {
        state.motes.splice(i, 1);
        continue;
      }
      const distance = Math.hypot(mote.x - state.ship.x, mote.y - state.ship.y);
      if (distance < mote.radius + SHIP_RADIUS + 4) {
        state.combo = Math.min(state.combo + 1, COMBO_MAX);
        state.comboTimer = COMBO_WINDOW;
        const points = (mote.bright ? BRIGHT_MOTE_POINTS : MOTE_POINTS) * state.combo;
        state.score += points;
        state.fuel = Math.min(FUEL_MAX, state.fuel + (mote.bright ? FUEL_PER_BRIGHT_MOTE : FUEL_PER_MOTE));
        burst(state, mote.x, mote.y, mote.color, mote.bright ? 16 : 9, 130);
        events.push({ type: mote.bright ? EVENT_BRIGHT : EVENT_PICKUP, combo: state.combo, points });
        state.motes.splice(i, 1);
        if (state.score >= target()) {
          nextLevel();
          events.push({ type: EVENT_LEVEL, level: state.level - 1, bonus: state.levelBonus });
          return events;
        }
      }
    }

    // Rocks drift and spin; one touch costs a hull plate.
    for (let i = state.rocks.length - 1; i >= 0; i -= 1) {
      const rock = state.rocks[i];
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.rotation += rock.spin * dt;
      if (rock.y > HEIGHT + rock.radius + 8 || rock.x < -rock.radius - 8) {
        state.rocks.splice(i, 1);
        continue;
      }
      const distance = Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y);
      if (distance < rock.radius + SHIP_RADIUS - 2 && state.ship.invuln <= 0 && state.ship.dashTimer <= 0) {
        state.hull -= 1;
        state.combo = 0;
        state.comboTimer = 0;
        state.ship.invuln = HIT_INVULN;
        burst(state, state.ship.x, state.ship.y, '#ff7a5c', 26, 200);
        burst(state, rock.x, rock.y, '#b9a58c', 12, 140);
        state.rocks.splice(i, 1);
        events.push({ type: EVENT_HIT, hull: state.hull });
        if (state.hull <= 0) {
          endGame();
          events.push({ type: EVENT_OVER, reason: 'hull' });
          return events;
        }
      }
    }

    updateParticles(dt);
    updateAmbient(dt);
    return events;
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-2 * dt);
      p.vy *= Math.exp(-2 * dt);
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function updateAmbient(dt) {
    for (const star of state.stars) {
      star.y += star.speed * dt;
      star.twinkle += star.twinkleSpeed * dt;
      if (star.y > HEIGHT + 2) {
        star.y = -2;
        star.x = state.random.range(0, WIDTH);
      }
    }
    for (const nebula of state.nebulae) {
      nebula.x += nebula.driftX * dt;
      nebula.y += nebula.driftY * dt;
      if (nebula.y - nebula.radius > HEIGHT) nebula.y = -nebula.radius;
      if (nebula.x - nebula.radius > WIDTH) nebula.x = -nebula.radius;
      if (nebula.x + nebula.radius < 0) nebula.x = WIDTH + nebula.radius;
    }
    updateParticles(dt);
  }

  return {
    state,
    target,
    levelConfig,
    reset,
    startGame,
    update,
  };
}
