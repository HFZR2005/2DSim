import {
  clampProjectileAngle,
  projectileState,
  solveProjectile,
  type ProjectileConfig,
} from '../physics/projectileMotion';
import type { Point } from '../render/canvasRenderer';

const PARTICLE_R = 0.13;
const TRAJECTORY_STEPS = 48;

export type Viewport = {
  width: number;
  height: number;
};

export type SceneReadout = {
  speed: number;
  angleDegrees: number;
  height: number;
  range: number;
  maxHeight: number;
  flightTime: number;
  vx: number;
  vy: number;
  time: number;
  status: 'READY' | 'MOVING' | 'LANDED';
};

export type DrawableScene = {
  ground: { x1: number; y: number; x2: number };
  trajectory: Point[];
  particle: { x: number; y: number; radius: number; label: string };
  readout: SceneReadout;
};

export type SceneInput = {
  config: ProjectileConfig;
  t: number;
  running: boolean;
  viewport: Viewport;
};

export function layoutProjectileMotion(input: SceneInput): DrawableScene {
  const { config, t, running, viewport } = input;
  const physics = solveProjectile(config);
  const motion = projectileState(config, t);
  const height = Math.max(config.height, 0);
  const spanX = Math.max(physics.range, 1);
  const spanY = Math.max(physics.maxHeight, height, 1);
  const scale = computeScale(viewport, spanX, spanY);

  const groundY = Math.min(viewport.height * 0.78, viewport.height - 36);
  const originX = Math.max((viewport.width - spanX * scale) / 2, 48);

  const toCanvas = (x: number, y: number): Point => ({
    x: originX + x * scale,
    y: groundY - y * scale,
  });

  const trajectory: Point[] = [];
  const steps = TRAJECTORY_STEPS;
  const duration = Math.max(physics.flightTime, 1e-6);
  for (let i = 0; i <= steps; i++) {
    const state = projectileState(config, (duration * i) / steps);
    trajectory.push(toCanvas(state.x, state.y));
  }

  const pos = toCanvas(motion.x, motion.y);

  return {
    ground: {
      x1: Math.max(originX - 36, 12),
      y: groundY,
      x2: Math.min(originX + spanX * scale + 48, viewport.width - 12),
    },
    trajectory,
    particle: {
      x: pos.x,
      y: pos.y,
      radius: Math.max(6, Math.min(10, PARTICLE_R * scale)),
      label: '',
    },
    readout: {
      speed: Math.max(config.speed, 0),
      angleDegrees: clampProjectileAngle(config.angleDegrees),
      height,
      range: physics.range,
      maxHeight: physics.maxHeight,
      flightTime: physics.flightTime,
      vx: motion.vx,
      vy: motion.vy,
      time: motion.t,
      status: statusLine(running, motion.landed, physics.flightTime),
    },
  };
}

function computeScale(viewport: Viewport, spanX: number, spanY: number): number {
  const availW = Math.max(viewport.width - 120, 120);
  const availH = Math.max(viewport.height - 100, 120);
  return Math.min(availW / (spanX + 0.8), availH / (spanY + 0.8));
}

function statusLine(
  running: boolean,
  landed: boolean,
  flightTime: number,
): SceneReadout['status'] {
  if (flightTime <= 0) return 'LANDED';
  if (landed && running) return 'LANDED';
  if (landed && !running) return 'READY';
  if (running) return 'MOVING';
  return 'READY';
}
