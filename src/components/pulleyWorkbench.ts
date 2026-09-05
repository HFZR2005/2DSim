import { type PulleyConfig } from '../physics/twoParticlePulley';
import { solveTwoParticlePulley } from '../physics/twoParticlePulley';
import {
  drawGrid,
  drawIncline,
  drawParticle,
  drawPulley,
  drawString,
} from '../render/canvasRenderer';
import { layoutTwoParticlePulley } from '../scene/twoParticlePulleyScene';
import { fmt, type Experiment, type ReadoutRow } from './workbenchTypes';

export const pulleyDefaults: PulleyConfig = {
  m1: 2,
  m2: 3,
  angleDegrees: 30,
  mu: 0,
};

export const pulleyWorkbench: Experiment<PulleyConfig> = {
  defaultConfig: pulleyDefaults,
  controls: [
    { id: 'm1', label: 'm1 / kg', min: 0.5, max: 10, step: 0.1, value: 2, digits: 1 },
    { id: 'm2', label: 'm2 / kg', min: 0.5, max: 10, step: 0.1, value: 3, digits: 1 },
    {
      id: 'angleDegrees',
      label: 'incline θ / °',
      min: 0,
      max: 90,
      step: 1,
      value: 30,
      digits: 0,
      hint: '90° is the Atwood case — both masses hang vertically.',
    },
    {
      id: 'mu',
      label: 'friction μ',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0,
      digits: 2,
      hint: 'μ = 0 is the smooth case. Friction on m1 opposes its motion.',
    },
  ],
  parseConfig: (values) => ({
    m1: values.m1,
    m2: values.m2,
    angleDegrees: values.angleDegrees,
    mu: values.mu,
  }),
  render(ctx, input) {
    const physics = solveTwoParticlePulley(input.config);
    const scene = layoutTwoParticlePulley({
      config: input.config,
      physics,
      t: input.t,
      running: input.running,
      viewport: input.viewport,
    });

    ctx.clearRect(0, 0, input.viewport.width, input.viewport.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, input.viewport.width, input.viewport.height);
    drawGrid(ctx, input.viewport.width, input.viewport.height);
    drawIncline(ctx, scene.incline);
    drawString(ctx, scene.string);
    drawPulley(ctx, scene.pulley.x, scene.pulley.y, scene.pulley.radius);
    drawParticle(ctx, scene.particle1.x, scene.particle1.y, scene.particle1.radius, scene.particle1.label);
    drawParticle(ctx, scene.particle2.x, scene.particle2.y, scene.particle2.radius, scene.particle2.label);

    const r = scene.readout;
    const rows: ReadoutRow[] = [
      { type: 'row', k: 'm1', v: `${fmt(r.m1, 2)} kg` },
      { type: 'row', k: 'm2', v: `${fmt(r.m2, 2)} kg` },
      { type: 'row', k: 'θ', v: `${fmt(r.angleDegrees, 1)}°` },
      { type: 'row', k: 'μ', v: fmt(r.mu, 2) },
      { type: 'row', k: 'F', v: `${fmt(r.frictionForce, 2)} N` },
      { type: 'spacer' },
      { type: 'row', k: 'a', v: `${fmt(r.acceleration, 2)} m/s²` },
      { type: 'row', k: 'T', v: `${fmt(r.tension, 2)} N`, accent: true },
      { type: 'row', k: 'v', v: `${fmt(r.velocity, 2)} m/s` },
      { type: 'row', k: 't', v: `${fmt(r.time, 2)} s` },
      { type: 'spacer' },
      { type: 'row', k: 'status', v: r.status },
    ];
    return rows;
  },
};
