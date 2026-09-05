import { EQUILIBRIUM_EPS } from './motion';

/** Time window used for the run, s. Closed-form; no root finding. */
export const RUN_TIME = 4;

export type VariableAccelerationConfig = {
  /** v(t) = p + q t + r t². Constant term, m/s. */
  p: number;
  /** Coefficient of t, m/s². */
  q: number;
  /** Coefficient of t², m/s³. r = 0 is constant acceleration. */
  r: number;
};

export type VariableAccelerationState = {
  t: number;
  s: number;
  v: number;
  a: number;
  stopped: boolean;
};

/**
 * Closed-form motion from a given quadratic velocity:
 *   v(t) = p + q t + r t²
 *   a(t) = q + 2 r t
 *   s(t) = p t + ½ q t² + ⅓ r t³   (s = 0 at t = 0)
 *
 * r = 0 is constant acceleration; r = 0 and q = 0 is constant velocity.
 */
export function variableAccelerationState(
  config: VariableAccelerationConfig,
  t: number,
): VariableAccelerationState {
  const p = Number.isFinite(config.p) ? config.p : 0;
  const q = Number.isFinite(config.q) ? config.q : 0;
  const r = Number.isFinite(config.r) ? config.r : 0;
  const elapsed = Math.max(t, 0);
  const stopped = elapsed >= RUN_TIME - EQUILIBRIUM_EPS;
  const tau = stopped ? RUN_TIME : elapsed;

  return {
    t: tau,
    s: p * tau + 0.5 * q * tau * tau + (r * tau * tau * tau) / 3,
    v: p + q * tau + r * tau * tau,
    a: q + 2 * r * tau,
    stopped,
  };
}

export function samplePath(
  config: VariableAccelerationConfig,
  steps = 40,
): { t: number; s: number }[] {
  const points: { t: number; s: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (RUN_TIME * i) / steps;
    points.push({ t, s: variableAccelerationState(config, t).s });
  }
  return points;
}
