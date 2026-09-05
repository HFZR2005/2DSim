import { solveConnectedParticles, type ConnectedParticlesConfig } from '../physics/connectedParticles';
import { motionFromRest } from '../physics/motion';
import type { Point } from '../render/canvasRenderer';

const SURFACE_LEN = 6.4;
const STRING_LEN = 1.35;
const START_X = 1.15;
const PARTICLE_R = 0.13;
const EDGE_MARGIN = 0.42;

export type Viewport = {
  width: number;
  height: number;
};

export type SceneReadout = {
  m1: number;
  m2: number;
  force: number;
  mu: number;
  frictionForce: number;
  acceleration: number;
  tension: number;
  velocity: number;
  time: number;
  status: 'READY' | 'MOVING' | 'AT REST' | 'STOPPED';
};

export type DrawableScene = {
  surface: { x1: number; y: number; x2: number };
  particle1: { x: number; y: number; radius: number; label: string };
  particle2: { x: number; y: number; radius: number; label: string };
  string: Point[];
  forceArrow: { from: Point; to: Point; label: string };
  readout: SceneReadout;
};

export type SceneInput = {
  config: ConnectedParticlesConfig;
  /** Elapsed time since Run, seconds. */
  t: number;
  /** True while the animation loop is active. */
  running: boolean;
  viewport: Viewport;
};

/**
 * Maps the closed-form physics state at time t onto canvas-space geometry.
 * Positive acceleration moves both particles to the right.
 */
export function layoutConnectedParticles(input: SceneInput): DrawableScene {
  const { config, t, running, viewport } = input;
  const physics = solveConnectedParticles(config);
  const scale = computeScale(viewport);
  const surfaceY = viewport.height * 0.58;
  const surfaceW = SURFACE_LEN * scale;
  const surfaceX1 = (viewport.width - surfaceW) / 2;
  const surfaceX2 = surfaceX1 + surfaceW;

  const maxTravel = Math.max(0, SURFACE_LEN - EDGE_MARGIN - START_X - STRING_LEN);
  const motion = motionFromRest(physics.acceleration, t, maxTravel);
  const s = motion.displacement;

  const radius = PARTICLE_R * scale;
  const y = surfaceY - radius;
  const x1 = surfaceX1 + (START_X + s) * scale;
  const x2 = surfaceX1 + (START_X + STRING_LEN + s) * scale;

  const arrowStart = x2 + radius + 10;
  const arrowLen = Math.min(56, Math.max(36, viewport.width * 0.08));

  return {
    surface: { x1: surfaceX1, y: surfaceY, x2: surfaceX2 },
    particle1: { x: x1, y, radius, label: 'm1' },
    particle2: { x: x2, y, radius, label: 'm2' },
    string: [
      { x: x1, y },
      { x: x2, y },
    ],
    forceArrow: {
      from: { x: arrowStart, y },
      to: { x: arrowStart + arrowLen, y },
      label: 'P',
    },
    readout: {
      m1: config.m1,
      m2: config.m2,
      force: Math.max(config.force, 0),
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

function computeScale(viewport: Viewport): number {
  const availW = Math.max(viewport.width - 72, 120);
  const availH = Math.max(viewport.height - 120, 100);
  return Math.min(availW / SURFACE_LEN, availH / 2.2);
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
