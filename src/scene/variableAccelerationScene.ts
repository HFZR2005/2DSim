import {
  samplePath,
  variableAccelerationState,
  type VariableAccelerationConfig,
} from '../physics/variableAcceleration';
import type { Point } from '../render/canvasRenderer';

const PARTICLE_R = 8;

export type Viewport = {
  width: number;
  height: number;
};

export type SceneReadout = {
  p: number;
  q: number;
  r: number;
  s: number;
  v: number;
  a: number;
  time: number;
  status: 'READY' | 'MOVING' | 'STOPPED';
};

export type DrawableScene = {
  track: { x1: number; y: number; x2: number };
  origin: Point;
  particle: { x: number; y: number; radius: number };
  readout: SceneReadout;
};

export type SceneInput = {
  config: VariableAccelerationConfig;
  t: number;
  running: boolean;
  viewport: Viewport;
};

export function layoutVariableAcceleration(input: SceneInput): DrawableScene {
  const { config, t, running, viewport } = input;
  const motion = variableAccelerationState(config, t);
  const path = samplePath(config);
  const sMin = Math.min(0, ...path.map((p) => p.s));
  const sMax = Math.max(0, ...path.map((p) => p.s));
  const span = Math.max(sMax - sMin, 1);
  const pad = span * 0.12;
  const scale = Math.max(viewport.width - 140, 120) / (span + 2 * pad);
  const y = viewport.height * 0.55;
  const originX = (viewport.width - (span + 2 * pad) * scale) / 2 + (0 - sMin + pad) * scale;
  const toX = (s: number) => originX + s * scale;

  return {
    track: {
      x1: toX(sMin - pad),
      y,
      x2: toX(sMax + pad),
    },
    origin: { x: toX(0), y },
    particle: {
      x: toX(motion.s),
      y: y - PARTICLE_R,
      radius: PARTICLE_R,
    },
    readout: {
      p: config.p,
      q: config.q,
      r: config.r,
      s: motion.s,
      v: motion.v,
      a: motion.a,
      time: motion.t,
      status: statusLine(running, motion.stopped, t),
    },
  };
}

function statusLine(
  running: boolean,
  stopped: boolean,
  t: number,
): SceneReadout['status'] {
  if (stopped && (running || t > 0)) return 'STOPPED';
  if (running) return 'MOVING';
  return 'READY';
}
