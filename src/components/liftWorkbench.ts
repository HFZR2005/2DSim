import { type LiftConfig } from '../physics/lift';
import {
  drawArrow,
  drawGrid,
  drawIncline,
  drawParticle,
  drawRect,
  drawString,
  drawSurface,
} from '../render/canvasRenderer';
import { layoutLift } from '../scene/liftScene';
import { fmt, type Experiment, type ReadoutRow } from './workbenchTypes';

export const liftDefaults: LiftConfig = {
  mass: 80,
  acceleration: 1.2,
};

export const liftWorkbench: Experiment<LiftConfig> = {
  defaultConfig: liftDefaults,
  controls: [
    { id: 'mass', label: 'm / kg', min: 40, max: 120, step: 1, value: 80, digits: 0 },
    {
      id: 'acceleration',
      label: 'a / m/s²',
      min: -12,
      max: 8,
      step: 0.1,
      value: 1.2,
      digits: 1,
      hint: 'Up is positive. a = 0 is at rest. a = −g is free fall.',
    },
  ],
  parseConfig: (values) => ({
    mass: values.mass,
    acceleration: values.acceleration,
  }),
  render(ctx, input) {
    const scene = layoutLift(input);

    ctx.clearRect(0, 0, input.viewport.width, input.viewport.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, input.viewport.width, input.viewport.height);
    drawGrid(ctx, input.viewport.width, input.viewport.height);
    drawIncline(ctx, scene.shaftLeft);
    drawIncline(ctx, scene.shaftRight);
    drawIncline(ctx, scene.ceiling);
    drawSurface(ctx, scene.floor.x1, scene.floor.y, scene.floor.x2);
    drawString(ctx, scene.cable);
    drawRect(ctx, scene.cabin.x, scene.cabin.y, scene.cabin.width, scene.cabin.height);
    drawParticle(ctx, scene.mass.x, scene.mass.y, scene.mass.radius, scene.mass.label, true);
    for (const arrow of scene.arrows) {
      drawArrow(ctx, arrow.from, arrow.to, arrow.label);
    }

    const r = scene.readout;
    const rows: ReadoutRow[] = [
      { type: 'row', k: 'm', v: `${fmt(r.mass, 0)} kg` },
      { type: 'row', k: 'a', v: `${fmt(r.acceleration, 1)} m/s²` },
      { type: 'row', k: 'mg', v: `${fmt(r.weight, 1)} N` },
      { type: 'spacer' },
      { type: 'row', k: 'T', v: `${fmt(r.tension, 1)} N`, accent: true },
      { type: 'row', k: 'v', v: `${fmt(r.velocity, 2)} m/s` },
      { type: 'row', k: 't', v: `${fmt(r.time, 2)} s` },
      { type: 'spacer' },
      { type: 'row', k: 'status', v: r.status },
    ];
    return rows;
  },
};
