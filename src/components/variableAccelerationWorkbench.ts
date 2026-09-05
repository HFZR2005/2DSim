import { type VariableAccelerationConfig } from '../physics/variableAcceleration';
import { drawGrid, drawIncline, drawParticle, drawSurface } from '../render/canvasRenderer';
import { layoutVariableAcceleration } from '../scene/variableAccelerationScene';
import { fmt, type Experiment, type ReadoutRow } from './workbenchTypes';

export const variableAccelerationDefaults: VariableAccelerationConfig = {
  p: 3,
  q: 2,
  r: -1,
};

export const variableAccelerationWorkbench: Experiment<VariableAccelerationConfig> = {
  defaultConfig: variableAccelerationDefaults,
  controls: [
    {
      id: 'p',
      label: 'p / m/s',
      min: -8,
      max: 8,
      step: 0.5,
      value: 3,
      digits: 1,
      hint: 'v(t) = p + q t + r t², with s = 0 at t = 0.',
    },
    { id: 'q', label: 'q / m/s²', min: -6, max: 6, step: 0.5, value: 2, digits: 1 },
    {
      id: 'r',
      label: 'r / m/s³',
      min: -2,
      max: 2,
      step: 0.1,
      value: -1,
      digits: 1,
      hint: 'r = 0 is constant acceleration. r = 0 and q = 0 is constant velocity.',
    },
  ],
  parseConfig: (values) => ({
    p: values.p,
    q: values.q,
    r: values.r,
  }),
  render(ctx, input) {
    const scene = layoutVariableAcceleration(input);

    ctx.clearRect(0, 0, input.viewport.width, input.viewport.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, input.viewport.width, input.viewport.height);
    drawGrid(ctx, input.viewport.width, input.viewport.height);
    drawSurface(ctx, scene.track.x1, scene.track.y, scene.track.x2);
    drawIncline(ctx, [
      { x: scene.origin.x, y: scene.origin.y - 8 },
      { x: scene.origin.x, y: scene.origin.y + 8 },
    ]);
    drawParticle(ctx, scene.particle.x, scene.particle.y, scene.particle.radius);

    const r = scene.readout;
    const rows: ReadoutRow[] = [
      { type: 'row', k: 'p', v: `${fmt(r.p, 1)} m/s` },
      { type: 'row', k: 'q', v: `${fmt(r.q, 1)} m/s²` },
      { type: 'row', k: 'r', v: `${fmt(r.r, 1)} m/s³` },
      { type: 'spacer' },
      { type: 'row', k: 's', v: `${fmt(r.s, 2)} m`, accent: true },
      { type: 'row', k: 'v', v: `${fmt(r.v, 2)} m/s` },
      { type: 'row', k: 'a', v: `${fmt(r.a, 2)} m/s²` },
      { type: 'row', k: 't', v: `${fmt(r.time, 2)} s` },
      { type: 'spacer' },
      { type: 'row', k: 'status', v: r.status },
    ];
    return rows;
  },
};
