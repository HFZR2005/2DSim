import { EQUILIBRIUM_EPS, G } from './motion';

export { G } from './motion';

export type PulleyConfig = {
  /** Mass on the incline, kg. */
  m1: number;
  /** Hanging mass, kg. */
  m2: number;
  /** Incline angle from the horizontal, degrees (0–90). */
  angleDegrees: number;
  /** Coefficient of friction on the incline. 0 is the smooth case. */
  mu?: number;
};

export type PulleyResult = {
  /** Signed acceleration, m/s². Positive ⇒ hanging particle descends. */
  acceleration: number;
  /** String tension, N. */
  tension: number;
  /** False at equilibrium (|a| ≈ 0). */
  moving: boolean;
  /** μ used in the solve. */
  mu: number;
  /** Friction force on m1 along the plane, N. Kinetic if moving, static if not. */
  frictionForce: number;
};

export { motionFromRest } from './motion';
export type { MotionState } from './motion';

/**
 * Closed-form solution for two particles joined by a light inextensible
 * string over a smooth pulley. Particle 1 is on an incline with friction μ.
 * μ = 0 is the smooth special case.
 *
 * Positive a ⇒ hanging particle descends, m1 moves up the slope.
 * Friction on m1 opposes that motion (or the impending motion).
 *
 *   m2 g − T = m2 a
 *   T − m1 g sinθ ∓ μ m1 g cosθ = m1 a
 */
export function solveTwoParticlePulley(config: PulleyConfig): PulleyResult {
  const m1 = Math.max(config.m1, 0);
  const m2 = Math.max(config.m2, 0);
  const mu = Math.max(config.mu ?? 0, 0);
  const totalMass = m1 + m2;

  if (totalMass === 0) {
    return { acceleration: 0, tension: 0, moving: false, mu, frictionForce: 0 };
  }

  const theta = (clampAngle(config.angleDegrees) * Math.PI) / 180;
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  const drive = m2 - m1 * sinTheta;
  const frictionCoeff = mu * m1 * cosTheta;
  const limitingFriction = frictionCoeff * G;

  if (Math.abs(drive) * G <= limitingFriction + EQUILIBRIUM_EPS) {
    return {
      acceleration: 0,
      tension: m2 * G,
      moving: false,
      mu,
      frictionForce: Math.abs(drive) * G,
    };
  }

  const signedFriction = drive > 0 ? -frictionCoeff : frictionCoeff;
  const acceleration = (G * (drive + signedFriction)) / totalMass;
  const tension = m2 * (G - acceleration);

  return {
    acceleration,
    tension,
    moving: true,
    mu,
    frictionForce: limitingFriction,
  };
}

function clampAngle(angleDegrees: number): number {
  if (!Number.isFinite(angleDegrees)) return 0;
  return Math.min(90, Math.max(0, angleDegrees));
}
