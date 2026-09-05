import { EQUILIBRIUM_EPS, G } from './motion';

export type LadderConfig = {
  /** Ladder mass, kg. Uniform. */
  mass: number;
  /** Angle between the ladder and the ground, degrees. */
  angleDegrees: number;
  /** Coefficient of friction at the ground. 0 is the smooth-ground case. */
  mu?: number;
};

export type LadderResult = {
  /** Ground normal, N. Equals the weight. */
  groundNormal: number;
  /** Horizontal wall reaction, N. */
  wallReaction: number;
  /** Friction at the ground (toward the wall), N. Equals the wall reaction. */
  frictionForce: number;
  /** Least μ at the ground for which equilibrium is possible. */
  muMin: number;
  /** True while F ≤ μN. */
  equilibrium: boolean;
  /** μ used in the check. */
  mu: number;
};

/**
 * Closed-form equilibrium of a uniform ladder on rough ground against a
 * smooth vertical wall. The wall is smooth, so there is no friction there.
 * μ = 0 is the smooth-ground special case — then the ladder cannot rest.
 *
 *   N = mg
 *   S = F = mg / (2 tan θ)
 *   stands while F ≤ μN, i.e. μ ≥ 1 / (2 tan θ)
 */
export function solveLadderAgainstWall(config: LadderConfig): LadderResult {
  const mass = Math.max(config.mass, 0);
  const mu = Math.max(config.mu ?? 0, 0);
  const theta = (clampAngle(config.angleDegrees) * Math.PI) / 180;
  const tanTheta = Math.tan(theta);
  const muMin = tanTheta > 0 ? 1 / (2 * tanTheta) : Number.POSITIVE_INFINITY;

  if (mass === 0) {
    return {
      groundNormal: 0,
      wallReaction: 0,
      frictionForce: 0,
      muMin,
      equilibrium: true,
      mu,
    };
  }

  const weight = mass * G;
  const wallReaction = tanTheta > 0 ? weight / (2 * tanTheta) : Number.POSITIVE_INFINITY;
  const frictionForce = wallReaction;
  const equilibrium = frictionForce <= mu * weight + EQUILIBRIUM_EPS;

  return {
    groundNormal: weight,
    wallReaction,
    frictionForce,
    muMin,
    equilibrium,
    mu,
  };
}

export function clampLadderAngle(angleDegrees: number): number {
  return clampAngle(angleDegrees);
}

function clampAngle(angleDegrees: number): number {
  if (!Number.isFinite(angleDegrees)) return 60;
  return Math.min(80, Math.max(15, angleDegrees));
}
