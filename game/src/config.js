// Tuning for Lumen Drift: one lantern-ship, drifting reef rocks, light-motes that
// charge the beacon. Every number below is a gameplay decision, kept in one place
// so a play-test can retune the game without touching the world or the renderer.

/** The canvas the game is designed for; the renderer letterboxes it to the window. */
export const WIDTH = 960;
export const HEIGHT = 600;

/** Fixed simulation step; the loop runs several in a slow frame, none in a fast one. */
export const STEP = 1 / 60;

/** localStorage key for the best score. */
export const BEST_KEY = 'lumen-drift-best';

/** One row per level: the score that lights the beacon, and how hostile the reef is. */
export const LEVELS = [
  { target: 400, rockRate: 0.55, moteRate: 1.15, rockSpeed: 55, rockMax: 7 },
  { target: 900, rockRate: 0.75, moteRate: 1.3, rockSpeed: 68, rockMax: 9 },
  { target: 1500, rockRate: 0.95, moteRate: 1.45, rockSpeed: 82, rockMax: 11 },
  { target: 2300, rockRate: 1.15, moteRate: 1.6, rockSpeed: 96, rockMax: 13 },
  { target: 3200, rockRate: 1.35, moteRate: 1.75, rockSpeed: 110, rockMax: 15 },
];

/** Fuel: the lamp burns while you fly; motes feed it, dashing spends it. */
export const FUEL_MAX = 100;
export const FUEL_DRAIN = 1.1;
export const FUEL_PER_MOTE = 6;
export const FUEL_PER_BRIGHT_MOTE = 12;

/** The dash: a short burst with brief invulnerability, paid for in fuel. */
export const DASH_COST = 12;
export const DASH_TIME = 0.22;
export const DASH_SPEED = 540;
export const DASH_INVULN = 0.7;

/** Combo: motes gathered inside the window multiply the score. */
export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 8;

/** Hull: three hits and the ship is lost. */
export const HULL_MAX = 3;
export const HIT_INVULN = 1.4;

/** The ship. */
export const SHIP_RADIUS = 14;
export const SHIP_ACCEL = 1500;
export const SHIP_MAX_SPEED = 330;
export const SHIP_DAMPING = 2.4;

/** Scoring. */
export const MOTE_POINTS = 10;
export const BRIGHT_MOTE_POINTS = 25;
export const BRIGHT_MOTE_CHANCE = 0.12;
export const LEVEL_CLEAR_FUEL_BONUS = 2;
export const LEVEL_CLEAR_HULL_BONUS = 50;
