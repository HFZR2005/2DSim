import { EQUILIBRIUM_EPS, G } from './motion';

export type ConnectedParticlesConfig = {
  /** Trailing mass, kg. */
  m1: number;
  /** Leading mass (the force is applied here), kg. */
  m2: number;
  /** Horizontal force on m2, away from m1, N. */
  force: number;
  /** Coefficient of friction on the surface. 0 is the smooth case. */
  mu?: number;
};

export type ConnectedParticlesResult = {
  /** Signed acceleration, m/s². Positive ⇒ to the right, with P. */
  acceleration: number;
  /** String tension, N. */
  tension: number;
  /** False at equilibrium (|a| ≈ 0). */
  moving: boolean;
  /** μ used in the solve. */
  mu: number;
  /** Total friction opposing P, N. */
  frictionForce: number;
};

/**
 * Closed-form solution for two particles on one horizontal surface,
 * joined by a light inextensible string. A horizontal force P acts on
 * m2, away from m1, so the string stays taut once the pair moves.
 * μ = 0 is the smooth special case. Both particles share one μ.
 *
 *   P − T − μ m2 g = m2 a
 *   T − μ m1 g     = m1 a
 *
 * Adding: P − μ(m1 + m2)g = (m1 + m2)a.
 * While moving with the same μ, T = m1 P / (m1 + m2).
 */
export function solveConnectedParticles(
  config: ConnectedParticlesConfig,
): ConnectedParticlesResult {
  const m1 = Math.max(config.m1, 0);
  const m2 = Math.max(config.m2, 0);
  const force = Math.max(config.force, 0);
  const mu = Math.max(config.mu ?? 0, 0);
  const totalMass = m1 + m2;

  if (totalMass === 0) {
    return { acceleration: 0, tension: 0, moving: false, mu, frictionForce: 0 };
  }

  const friction1Lim = mu * m1 * G;
  const friction2Lim = mu * m2 * G;
  const frictionLim = friction1Lim + friction2Lim;

  if (force <= frictionLim + EQUILIBRIUM_EPS) {
    if (force <= friction2Lim + EQUILIBRIUM_EPS) {
      return {
        acceleration: 0,
        tension: 0,
        moving: false,
        mu,
        frictionForce: force,
      };
    }

    return {
      acceleration: 0,
      tension: force - friction2Lim,
      moving: false,
      mu,
      frictionForce: force,
    };
  }

  const acceleration = (force - frictionLim) / totalMass;
  const tension = m1 * force / totalMass;

  return {
    acceleration,
    tension,
    moving: true,
    mu,
    frictionForce: frictionLim,
  };
}
