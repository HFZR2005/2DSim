import { type ConnectedParticlesConfig } from '../physics/connectedParticles';
import {
  drawArrow,
  drawGrid,
  drawParticle,
  drawString,
  drawSurface,
} from '../render/canvasRenderer';
import { layoutConnectedParticles } from '../scene/connectedParticlesScene';
import { fmt, type Experiment, type ReadoutRow } from './workbenchTypes';

export const connectedParticlesDefaults: ConnectedParticlesConfig = {
  m1: 2,
  m2: 3,
  force: 10,
  mu: 0,
};

export const connectedParticlesWorkbench: Experiment<ConnectedParticlesConfig> = {
  defaultConfig: connectedParticlesDefaults,
  controls: [
    { id: 'm1', label: 'm1 / kg', min: 0.5, max: 10, step: 0.1, value: 2, digits: 1 },
    { id: 'm2', label: 'm2 / kg', min: 0.5, max: 10, step: 0.1, value: 3, digits: 1 },
    {
      id: 'force',
      label: 'P / N',
      min: 0,
      max: 40,
      step: 0.5,
      value: 10,
      digits: 1,
      hint: 'Applied to m2, away from m1, so the string stays taut.',
    },
    {
      id: 'mu',
      label: 'friction μ',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0,
      digits: 2,
      hint: 'μ = 0 is the smooth case. Both particles share one μ.',
    },
  ],
  parseConfig: (values) => ({
    m1: values.m1,
    m2: values.m2,
    force: values.force,
    mu: values.mu,
  }),
  render(ctx, input) {
    const scene = layoutConnectedParticles(input);

    ctx.clearRect(0, 0, input.viewport.width, input.viewport.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, input.viewport.width, input.viewport.height);
    drawGrid(ctx, input.viewport.width, input.viewport.height);
    drawSurface(ctx, scene.surface.x1, scene.surface.y, scene.surface.x2);
    drawString(ctx, scene.string);
    drawParticle(
      ctx,
      scene.particle1.x,
      scene.particle1.y,
      scene.particle1.radius,
      scene.particle1.label,
      true,
    );
    drawParticle(
      ctx,
      scene.particle2.x,
      scene.particle2.y,
      scene.particle2.radius,
      scene.particle2.label,
      true,
    );
    drawArrow(ctx, scene.forceArrow.from, scene.forceArrow.to, scene.forceArrow.label);

    const r = scene.readout;
    const rows: ReadoutRow[] = [
      { type: 'row', k: 'm1', v: `${fmt(r.m1, 2)} kg` },
      { type: 'row', k: 'm2', v: `${fmt(r.m2, 2)} kg` },
      { type: 'row', k: 'P', v: `${fmt(r.force, 1)} N` },
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
