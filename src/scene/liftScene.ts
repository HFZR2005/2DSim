import { motionFromRest } from '../physics/motion';
import { solveLift, type LiftConfig } from '../physics/lift';
import type { Point } from '../render/canvasRenderer';

const SHAFT_H = 7.2;
const CABIN_H = 1.55;
const CABIN_W = 1.7;
const START = 2.1;
const MARGIN = 0.2;

export type Viewport = {
  width: number;
  height: number;
};

export type SceneReadout = {
  mass: number;
  acceleration: number;
  tension: number;
  weight: number;
  velocity: number;
  time: number;
  status: 'READY' | 'MOVING' | 'AT REST' | 'STOPPED' | 'SLACK';
};

export type DrawableScene = {
  shaftLeft: Point[];
  shaftRight: Point[];
  floor: { x1: number; y: number; x2: number };
  ceiling: Point[];
  cabin: { x: number; y: number; width: number; height: number };
  cable: Point[];
  mass: { x: number; y: number; radius: number; label: string };
  arrows: { from: Point; to: Point; label: string }[];
  readout: SceneReadout;
};

export type SceneInput = {
  config: LiftConfig;
  t: number;
  running: boolean;
  viewport: Viewport;
};

export function layoutLift(input: SceneInput): DrawableScene {
  const { config, t, running, viewport } = input;
  const physics = solveLift(config);
  const scale = computeScale(viewport);
  const maxTravel = travelLimit(physics.acceleration);
  const motion = motionFromRest(physics.acceleration, t, maxTravel);

  const shaftH = SHAFT_H * scale;
  const cabinH = CABIN_H * scale;
  const cabinW = CABIN_W * scale;
  const groundY = Math.min(viewport.height * 0.82, viewport.height - 28);
  const shaftX = viewport.width / 2;
  const s = motion.displacement;
  const cabinFloor = groundY - (START + s) * scale;
  const cabin = {
    x: shaftX - cabinW / 2,
    y: cabinFloor - cabinH,
    width: cabinW,
    height: cabinH,
  };
  const ceilingY = groundY - shaftH;
  const mass = {
    x: shaftX,
    y: cabin.y + cabinH * 0.62,
    radius: Math.max(7, 0.16 * scale),
    label: 'm',
  };
  const arrow = Math.min(40, Math.max(28, viewport.height * 0.05));

  return {
    shaftLeft: [
      { x: cabin.x - 10, y: ceilingY },
      { x: cabin.x - 10, y: groundY },
    ],
    shaftRight: [
      { x: cabin.x + cabinW + 10, y: ceilingY },
      { x: cabin.x + cabinW + 10, y: groundY },
    ],
    floor: { x1: cabin.x - 28, y: groundY, x2: cabin.x + cabinW + 28 },
    ceiling: [
      { x: cabin.x - 16, y: ceilingY },
      { x: cabin.x + cabinW + 16, y: ceilingY },
    ],
    cabin,
    cable: [
      { x: shaftX, y: ceilingY },
      { x: shaftX, y: cabin.y },
    ],
    mass,
    arrows: [
      { from: { x: shaftX, y: cabin.y }, to: { x: shaftX, y: cabin.y - arrow }, label: 'T' },
      { from: { x: mass.x, y: mass.y + mass.radius }, to: { x: mass.x, y: mass.y + mass.radius + arrow }, label: 'mg' },
    ],
    readout: {
      mass: config.mass,
      acceleration: physics.acceleration,
      tension: physics.tension,
      weight: physics.weight,
      velocity: motion.velocity,
      time: motion.stopped ? motion.t : Math.max(t, 0),
      status: statusLine(physics.acceleration, physics.slack, running, motion.stopped),
    },
  };
}

function travelLimit(acceleration: number): number {
  if (acceleration > 0) return Math.max(0, SHAFT_H - CABIN_H - START - MARGIN);
  if (acceleration < 0) return Math.max(0, START - MARGIN);
  return 0;
}

function computeScale(viewport: Viewport): number {
  const availH = Math.max(viewport.height - 80, 120);
  const availW = Math.max(viewport.width - 160, 120);
  return Math.min(availH / (SHAFT_H + 0.8), availW / 4.2);
}

function statusLine(
  acceleration: number,
  slack: boolean,
  running: boolean,
  stopped: boolean,
): SceneReadout['status'] {
  if (slack) return 'SLACK';
  if (Math.abs(acceleration) < 1e-10) return 'AT REST';
  if (stopped) return 'STOPPED';
  if (running) return 'MOVING';
  return 'READY';
}
