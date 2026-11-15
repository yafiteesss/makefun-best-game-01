// Keyboard and mouse input, read once per frame. Edge-triggered actions (confirm,
// pause, dash, mute) are consumed by the loop: pressing a key queues the action
// until the next update reads it, so a tap is never lost between frames.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_DASH = 'dash';
export const ACTION_MUTE = 'mute';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Shift: ACTION_DASH,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
};

const KEY_DIRECTIONS = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
};

export function createInput(canvas) {
  const held = { left: false, right: false, up: false, down: false };
  const queued = [];
  // The pointer in game coordinates; null until the mouse first moves over the game.
  const pointer = { x: null, y: null, active: false, down: false };

  function toGame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 960, rect.height / 600);
    const offsetX = (rect.width - 960 * scale) / 2;
    const offsetY = (rect.height - 600 * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  function onKeyDown(event) {
    const action = KEY_ACTIONS[event.key];
    if (action) {
      if (!event.repeat) queued.push(action);
      event.preventDefault();
      return;
    }
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) {
      held[direction] = true;
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) held[direction] = false;
  }

  function onPointerMove(event) {
    const p = toGame(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
  }

  function onPointerDown(event) {
    const p = toGame(event.clientX, event.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
    pointer.down = true;
    queued.push(ACTION_CONFIRM);
  }

  function onPointerUp() {
    pointer.down = false;
  }

  function onBlur() {
    held.left = held.right = held.up = held.down = false;
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('blur', onBlur);

  return {
    held,
    pointer,
    /** The actions queued since the last frame, oldest first; reading clears them. */
    takeActions() {
      const actions = queued.splice(0, queued.length);
      return actions;
    },
  };
}
