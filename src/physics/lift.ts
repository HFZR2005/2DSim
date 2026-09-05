import { EQUILIBRIUM_EPS, G } from './motion';

export type LiftConfig = {
  /** Mass of the passenger (or hanging load), kg. */
  mass: number;
  /** Lift acceleration, m/s². Positive is upward. */
  acceleration: number;
};

export type LiftResult = {
  /** Cable tension / scale reading, N. Zero in free fall or if the cable slacks. */
  tension: number;
  /** True weight, N. */
  weight: number;
  /** μ-free; a = 0 is the stationary special case. */
  acceleration: number;
  /** True when the cable would go slack (a ≤ −g). */
  slack: boolean;
};

/**
 * Closed-form apparent weight in a lift. Taking upward as positive,
 * T − mg = ma, so T = m(g + a). a = 0 is at rest; a = −g is free fall.
 *
 * The same T is the scale reading if the person stands on the floor,
 * or the cable tension if the load hangs from the ceiling.
 */
export function solveLift(config: LiftConfig): LiftResult {
  const mass = Math.max(config.mass, 0);
  const acceleration = Number.isFinite(config.acceleration) ? config.acceleration : 0;
  const weight = mass * G;
  const raw = mass * (G + acceleration);
  const slack = raw <= EQUILIBRIUM_EPS;
  return {
    tension: slack ? 0 : raw,
    weight,
    acceleration,
    slack,
  };
}
