import { type ProjectileConfig } from '../physics/projectileMotion';
import { drawGrid, drawParticle, drawString, drawSurface } from '../render/canvasRenderer';
import { layoutProjectileMotion } from '../scene/projectileMotionScene';
import { fmt, type Experiment, type ReadoutRow } from './workbenchTypes';

export const projectileDefaults: ProjectileConfig = {
  speed: 20,
  angleDegrees: 45,
  height: 0,
};

export const projectileWorkbench: Experiment<ProjectileConfig> = {
  defaultConfig: projectileDefaults,
  controls: [
    { id: 'speed', label: 'u / m/s', min: 1, max: 40, step: 0.5, value: 20, digits: 1 },
    {
      id: 'angleDegrees',
      label: 'launch θ / °',
      min: 0,
      max: 90,
      step: 1,
      value: 45,
      digits: 0,
      hint: '45° gives the greatest range on level ground. 0° is a horizontal throw.',
    },
    {
      id: 'height',
      label: 'height h / m',
      min: 0,
      max: 20,
      step: 0.5,
      value: 0,
      digits: 1,
      hint: 'h = 0 is level ground. Raise h for projection from a cliff.',
    },
  ],
  parseConfig: (values) => ({
    speed: values.speed,
    angleDegrees: values.angleDegrees,
    height: values.height,
  }),
  render(ctx, input) {
    const scene = layoutProjectileMotion(input);

    ctx.clearRect(0, 0, input.viewport.width, input.viewport.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, input.viewport.width, input.viewport.height);
    drawGrid(ctx, input.viewport.width, input.viewport.height);
    drawSurface(ctx, scene.ground.x1, scene.ground.y, scene.ground.x2);
    drawString(ctx, scene.trajectory);
    drawParticle(ctx, scene.particle.x, scene.particle.y, scene.particle.radius);

    const r = scene.readout;
    const rows: ReadoutRow[] = [
      { type: 'row', k: 'u', v: `${fmt(r.speed, 1)} m/s` },
      { type: 'row', k: 'θ', v: `${fmt(r.angleDegrees, 0)}°` },
      { type: 'row', k: 'h', v: `${fmt(r.height, 1)} m` },
      { type: 'spacer' },
      { type: 'row', k: 'R', v: `${fmt(r.range, 2)} m`, accent: true },
      { type: 'row', k: 'H', v: `${fmt(r.maxHeight, 2)} m` },
      { type: 'row', k: 'T', v: `${fmt(r.flightTime, 2)} s` },
      { type: 'row', k: 'vx', v: `${fmt(r.vx, 2)} m/s` },
      { type: 'row', k: 'vy', v: `${fmt(r.vy, 2)} m/s` },
      { type: 'row', k: 't', v: `${fmt(r.time, 2)} s` },
      { type: 'spacer' },
      { type: 'row', k: 'status', v: r.status },
    ];
    return rows;
  },
};
