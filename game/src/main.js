// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// level-clear and game over.
//
// ?seed=N fixes the reef's random pattern. ?shot=start|play|level|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_DASH, EVENT_HIT, EVENT_LEVEL, EVENT_OVER } from './world.js';
import { ACTION_MUTE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

world.state.best = readBest();

function describeState() {
  const state = world.state;
  switch (state.screen) {
    case 'title':
      return 'Lumen Drift. Press Enter or click to begin.';
    case 'play':
      return `Score ${state.score} of ${world.target()}, level ${state.level}, hull ${state.hull}, fuel ${Math.round(state.fuel)}.`;
    case 'paused':
      return `Paused. Score ${state.score}, level ${state.level}.`;
    case 'level':
      return `Beacon ${state.level - 1} lit. Score ${state.score}. Press Enter for the next reef.`;
    case 'over':
      return `Game over. Score ${state.score}, best ${state.best}. Press Enter to play again.`;
    default:
      return 'Lumen Drift.';
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.target());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function playEvents(events) {
  for (const event of events) {
    if (event.type === 'pickup') audio.pickup(event.combo);
    else if (event.type === 'bright') audio.brightPickup(event.combo);
    else if (event.type === EVENT_HIT) audio.hit();
    else if (event.type === EVENT_DASH) audio.dash();
    else if (event.type === EVENT_LEVEL) audio.level();
    else if (event.type === EVENT_OVER) {
      audio.over();
      saveBest(world.state.best);
    }
  }
}

function runLive() {
  let last = performance.now();
  let accumulator = 0;
  let announced = '';
  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    // A gesture starts the audio context; the mute key toggles it.
    const actions = input.takeActions();
    if (actions.length > 0) audio.ensure();
    if (actions.includes(ACTION_MUTE)) audio.toggleMute();
    // The world reads the same queue; the first step of the frame consumes it.
    const stepInput = {
      held: input.held,
      pointer: input.pointer,
      takeActions: () => actions.splice(0, actions.length),
    };
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      accumulator -= STEP;
      guard += 1;
      playEvents(world.update(STEP, stepInput));
    }
    if (guard >= 8) accumulator = 0;
    renderer.draw(world.state, world.state.screen, world.state.best, world.target());
    const text = describeState();
    if (text !== announced) {
      status.textContent = text;
      announced = text;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) {
  runShot(shot);
} else {
  runLive();
}
