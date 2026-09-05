import { EQUILIBRIUM_EPS, G } from './motion';

export type ProjectileConfig = {
  /** Launch speed, m/s. */
  speed: number;
  /** Launch angle above the horizontal, degrees (0–90). */
  angleDegrees: number;
  /** Launch height above the landing level, m. 0 is level ground. */
  height: number;
};

export type ProjectileResult = {
  /** Time from launch to landing, s. */
  flightTime: number;
  /** Horizontal distance to landing, m. */
  range: number;
  /** Greatest height above the landing level, m. */
  maxHeight: number;
  ux: number;
  uy: number;
};

export type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  landed: boolean;
};

/**
 * Closed-form projectile under constant g, no air resistance.
 * Launch from (0, h) at speed u and angle θ. Lands on y = 0.
 * h = 0 is the level-ground special case.
 *
 *   x = (u cos θ) t
 *   y = h + (u sin θ) t − ½ g t²
 *   T = (u sin θ + √((u sin θ)² + 2 g h)) / g
 */
export function solveProjectile(config: ProjectileConfig): ProjectileResult {
  const speed = Math.max(config.speed, 0);
  const height = Math.max(config.height, 0);
  const theta = (clampAngle(config.angleDegrees) * Math.PI) / 180;
  const ux = speed * Math.cos(theta);
  const uy = speed * Math.sin(theta);
  const flightTime = landingTime(uy, height);
  const range = ux * flightTime;
  const maxHeight = height + (uy * uy) / (2 * G);

  return { flightTime, range, maxHeight, ux, uy };
}

export function projectileState(config: ProjectileConfig, t: number): ProjectileState {
  const { ux, uy, flightTime } = solveProjectile(config);
  const height = Math.max(config.height, 0);
  const elapsed = Math.max(t, 0);
  const landed = elapsed >= flightTime - EQUILIBRIUM_EPS;
  const tau = landed ? flightTime : elapsed;

  return {
    x: ux * tau,
    y: Math.max(0, height + uy * tau - 0.5 * G * tau * tau),
    vx: ux,
    vy: landed ? 0 : uy - G * tau,
    t: tau,
    landed,
  };
}

export function clampProjectileAngle(angleDegrees: number): number {
  return clampAngle(angleDegrees);
}

function landingTime(uy: number, height: number): number {
  const disc = uy * uy + 2 * G * height;
  if (disc < 0) return 0;
  const time = (uy + Math.sqrt(disc)) / G;
  return time > EQUILIBRIUM_EPS ? time : 0;
}

function clampAngle(angleDegrees: number): number {
  if (!Number.isFinite(angleDegrees)) return 45;
  return Math.min(90, Math.max(0, angleDegrees));
}
