/** Standard gravity, m/s². */
export const G = 9.81;

export const EQUILIBRIUM_EPS = 1e-10;

export type MotionState = {
  /** Displacement from rest, m. Sign follows acceleration. */
  displacement: number;
  /** Velocity, m/s. Sign follows acceleration. */
  velocity: number;
  /** Time used for the kinematic evaluation, s. */
  t: number;
  /** True when travel was clamped at a geometric limit. */
  stopped: boolean;
};

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
