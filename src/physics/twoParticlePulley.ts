/** Standard gravity, m/s². */
export const G = 9.81;

export type PulleyConfig = {
  /** Mass on the incline, kg. */
  m1: number;
  /** Hanging mass, kg. */
  m2: number;
  /** Incline angle from the horizontal, degrees (0–90). */
  angleDegrees: number;
};

export type PulleyResult = {
  /** Signed acceleration, m/s². Positive ⇒ hanging particle descends. */
  acceleration: number;
  /** String tension, N. */
  tension: number;
  /** False at equilibrium (|a| ≈ 0). */
  moving: boolean;
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
 * string over a smooth pulley. Particle 1 is on a frictionless incline.
 *
 *   m2 g − T = m2 a
 *   T − m1 g sinθ = m1 a
 */
export function solveTwoParticlePulley(config: PulleyConfig): PulleyResult {
  const m1 = Math.max(config.m1, 0);
  const m2 = Math.max(config.m2, 0);
  const totalMass = m1 + m2;

  if (totalMass === 0) {
    return { acceleration: 0, tension: 0, moving: false };
  }

  const theta = (clampAngle(config.angleDegrees) * Math.PI) / 180;
  const sinTheta = Math.sin(theta);

  const acceleration = (G * (m2 - m1 * sinTheta)) / totalMass;
  const tension = m2 * (G - acceleration);
  const moving = Math.abs(acceleration) > EQUILIBRIUM_EPS;

  return { acceleration, tension, moving };
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
