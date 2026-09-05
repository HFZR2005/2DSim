import {
  clampLadderAngle,
  solveLadderAgainstWall,
  type LadderConfig,
} from '../physics/ladderAgainstWall';
import type { Point } from '../render/canvasRenderer';

/** Uniform ladder length, m. Cancels in the force equations; used for moments and drawing. */
export const LADDER_LENGTH = 4;

export type Viewport = {
  width: number;
  height: number;
};

export type SceneReadout = {
  mass: number;
  angleDegrees: number;
  mu: number;
  groundNormal: number;
  wallReaction: number;
  frictionForce: number;
  muMin: number;
  status: 'EQUILIBRIUM' | 'WOULD SLIP';
};

export type ForceArrow = {
  from: Point;
  to: Point;
  label: string;
};

export type DrawableScene = {
  wall: { x: number; y1: number; y2: number };
  ground: { x1: number; y: number; x2: number };
  ladder: Point[];
  arrows: ForceArrow[];
  angleLabel: { x: number; y: number; text: string };
  readout: SceneReadout;
};

export type SceneInput = {
  config: LadderConfig;
  viewport: Viewport;
};

/**
 * Maps the closed-form statics onto canvas-space geometry.
 * Time does not enter — the ladder is a rigid body at rest or it would slip.
 */
export function layoutLadderAgainstWall(input: SceneInput): DrawableScene {
  const { config, viewport } = input;
  const physics = solveLadderAgainstWall(config);
  const theta = (clampLadderAngle(config.angleDegrees) * Math.PI) / 180;
  const scale = computeScale(viewport, theta);

  const wallHeight = LADDER_LENGTH * Math.sin(theta) * scale;
  const base = LADDER_LENGTH * Math.cos(theta) * scale;
  const groundY = Math.min(viewport.height * 0.78, viewport.height - 36);
  const wallX = Math.max((viewport.width - base) / 2 - 8, 56);

  const foot: Point = { x: wallX + base, y: groundY };
  const top: Point = { x: wallX, y: groundY - wallHeight };
  const mid: Point = { x: (foot.x + top.x) / 2, y: (foot.y + top.y) / 2 };

  const arrow = Math.min(48, Math.max(32, viewport.width * 0.055));
  const towardWall = Math.min(arrow, Math.max(18, base - 12));

  return {
    wall: { x: wallX, y1: top.y - 28, y2: groundY },
    ground: { x1: wallX, y: groundY, x2: Math.min(foot.x + 72, viewport.width - 16) },
    ladder: [foot, top],
    arrows: [
      { from: mid, to: { x: mid.x, y: mid.y + arrow }, label: 'mg' },
      { from: foot, to: { x: foot.x, y: foot.y - arrow }, label: 'N' },
      { from: foot, to: { x: foot.x - towardWall, y: foot.y }, label: 'F' },
      { from: top, to: { x: top.x + arrow, y: top.y }, label: 'S' },
    ],
    angleLabel: { x: foot.x - 22, y: foot.y - 18, text: 'θ' },
    readout: {
      mass: config.mass,
      angleDegrees: clampLadderAngle(config.angleDegrees),
      mu: physics.mu,
      groundNormal: physics.groundNormal,
      wallReaction: physics.wallReaction,
      frictionForce: physics.frictionForce,
      muMin: physics.muMin,
      status: physics.equilibrium ? 'EQUILIBRIUM' : 'WOULD SLIP',
    },
  };
}

function computeScale(viewport: Viewport, theta: number): number {
  const horiz = LADDER_LENGTH * Math.cos(theta) + 1.6;
  const vert = LADDER_LENGTH * Math.sin(theta) + 1.2;
  const availW = Math.max(viewport.width - 160, 120);
  const availH = Math.max(viewport.height - 90, 120);
  return Math.min(availW / horiz, availH / vert);
}
