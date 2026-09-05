import {
  motionFromRest,
  type PulleyConfig,
  type PulleyResult,
} from '../physics/twoParticlePulley';
import type { Point } from '../render/canvasRenderer';

/** Rest distance of m1 from the pulley centre, along the incline. */
const S1_0 = 2.2;
/** Rest distance of m2 below the pulley centre. */
const S2_0 = 1.5;
const PLANE_LEN = 3.2;
const PARTICLE_R = 0.13;
const PULLEY_R = 0.18;
const PULLEY_CLEARANCE = 0.06;

export type Viewport = {
  width: number;
  height: number;
};

export type SceneReadout = {
  m1: number;
  m2: number;
  angleDegrees: number;
  mu: number;
  frictionForce: number;
  acceleration: number;
  tension: number;
  velocity: number;
  time: number;
  status: 'READY' | 'MOVING' | 'AT REST' | 'STOPPED';
};

export type DrawableScene = {
  pulley: { x: number; y: number; radius: number };
  incline: Point[];
  particle1: { x: number; y: number; radius: number; label: string };
  particle2: { x: number; y: number; radius: number; label: string };
  string: Point[];
  readout: SceneReadout;
};

export type SceneInput = {
  config: PulleyConfig;
  physics: PulleyResult;
  /** Elapsed time since Run, seconds. */
  t: number;
  /** True while the animation loop is active. */
  running: boolean;
  viewport: Viewport;
};

/**
 * Maps the closed-form physics state at time t onto canvas-space geometry.
 * Positive acceleration moves m2 down and m1 up the incline.
 */
export function layoutTwoParticlePulley(input: SceneInput): DrawableScene {
  const { config, physics, t, running, viewport } = input;
  const theta = (clampAngle(config.angleDegrees) * Math.PI) / 180;
  const scale = computeScale(viewport, theta);

  const maxTravel = travelLimit(physics.acceleration);
  const motion = motionFromRest(physics.acceleration, t, maxTravel);

  const s1 = S1_0 - motion.displacement;
  const s2 = S2_0 + motion.displacement;

  const pulley = placePulley(viewport, theta, scale);
  const dir: Point = { x: -Math.cos(theta), y: Math.sin(theta) };

  const particle1 = {
    x: pulley.x + dir.x * s1 * scale,
    y: pulley.y + dir.y * s1 * scale,
    radius: PARTICLE_R * scale,
    label: 'm1',
  };

  const particle2 = {
    x: pulley.x,
    y: pulley.y + s2 * scale,
    radius: PARTICLE_R * scale,
    label: 'm2',
  };

  const pulleyPx = PULLEY_R * scale;
  const rimIncline: Point = {
    x: pulley.x + dir.x * pulleyPx,
    y: pulley.y + dir.y * pulleyPx,
  };
  const rimHang: Point = { x: pulley.x, y: pulley.y + pulleyPx };

  const planeEnd: Point = {
    x: pulley.x + dir.x * PLANE_LEN * scale,
    y: pulley.y + dir.y * PLANE_LEN * scale,
  };
  const planeFoot: Point = { x: pulley.x, y: planeEnd.y };

  const incline: Point[] = [rimIncline, planeEnd];
  if (Math.sin(theta) > 0.02) {
    incline.push(planeFoot);
  }

  return {
    pulley: { x: pulley.x, y: pulley.y, radius: pulleyPx },
    incline,
    particle1,
    particle2,
    string: [
      { x: particle1.x, y: particle1.y },
      rimIncline,
      rimHang,
      { x: particle2.x, y: particle2.y },
    ],
    readout: {
      m1: config.m1,
      m2: config.m2,
      angleDegrees: clampAngle(config.angleDegrees),
      mu: physics.mu,
      frictionForce: physics.frictionForce,
      acceleration: physics.acceleration,
      tension: physics.tension,
      velocity: motion.velocity,
      time: motion.stopped ? motion.t : Math.max(t, 0),
      status: statusLine(physics.moving, running, motion.stopped),
    },
  };
}

function travelLimit(acceleration: number): number {
  const minSep = PULLEY_R + PARTICLE_R + PULLEY_CLEARANCE;
  if (acceleration > 0) {
    return Math.max(0, S1_0 - minSep);
  }
  if (acceleration < 0) {
    return Math.max(0, Math.min(S2_0 - minSep, PLANE_LEN - PARTICLE_R - S1_0));
  }
  return 0;
}

function computeScale(viewport: Viewport, theta: number): number {
  const horiz = PLANE_LEN * Math.cos(theta) + 1.4;
  const vert = PLANE_LEN * Math.sin(theta) + S2_0 + 1.8;
  const availW = Math.max(viewport.width - 200, 120);
  const availH = Math.max(viewport.height - 100, 120);
  return Math.min(availW / horiz, availH / vert);
}

function placePulley(viewport: Viewport, theta: number, scale: number): Point {
  const planeDx = PLANE_LEN * Math.cos(theta) * scale;
  const planeDy = PLANE_LEN * Math.sin(theta) * scale;
  const hang = (S2_0 + 0.7) * scale;
  const boxH = Math.max(planeDy, 0) + hang;

  return {
    x: viewport.width / 2 + planeDx / 2 - 12,
    y: Math.max((viewport.height - boxH) / 2 + 28, 56),
  };
}

function statusLine(
  wouldMove: boolean,
  running: boolean,
  stopped: boolean,
): SceneReadout['status'] {
  if (!wouldMove) return 'AT REST';
  if (stopped) return 'STOPPED';
  if (running) return 'MOVING';
  return 'READY';
}

function clampAngle(angleDegrees: number): number {
  if (!Number.isFinite(angleDegrees)) return 0;
  return Math.min(90, Math.max(0, angleDegrees));
}
