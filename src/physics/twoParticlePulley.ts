/** Standard gravity, m/s². */
export const G = 9.81;

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

export type MotionState = {
  /** Displacement of the hanging particle from rest, m. Positive downward. */
  displacement: number;
  /** Velocity of the hanging particle, m/s. Positive downward. */
  velocity: number;
  /** Time used for the kinematic evaluation, s. */
  t: number;
  /** True when travel was clamped at a geometric limit. */
  stopped: boolean;
};

const EQUILIBRIUM_EPS = 1e-10;

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

/**
 * Constant-acceleration motion from rest: s = ½ a t², v = a t.
 * If `maxTravel` is set, motion freezes once |s| would exceed it.
 */
export function motionFromRest(
  acceleration: number,
  t: number,
  maxTravel?: number,
): MotionState {
  const elapsed = Math.max(t, 0);

  if (Math.abs(acceleration) <= EQUILIBRIUM_EPS) {
    return { displacement: 0, velocity: 0, t: elapsed, stopped: false };
  }

  if (maxTravel === undefined || maxTravel <= 0) {
    return {
      displacement: 0.5 * acceleration * elapsed * elapsed,
      velocity: acceleration * elapsed,
      t: elapsed,
      stopped: false,
    };
  }

  const tLimit = Math.sqrt((2 * maxTravel) / Math.abs(acceleration));
  if (elapsed >= tLimit) {
    return {
      displacement: Math.sign(acceleration) * maxTravel,
      velocity: 0,
      t: tLimit,
      stopped: true,
    };
  }

  return {
    displacement: 0.5 * acceleration * elapsed * elapsed,
    velocity: acceleration * elapsed,
    t: elapsed,
    stopped: false,
  };
}

function clampAngle(angleDegrees: number): number {
  if (!Number.isFinite(angleDegrees)) return 0;
  return Math.min(90, Math.max(0, angleDegrees));
}
