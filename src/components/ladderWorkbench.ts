import { type LadderConfig } from '../physics/ladderAgainstWall';
import {
  drawArrow,
  drawGrid,
  drawRod,
  drawSurface,
  drawWall,
} from '../render/canvasRenderer';
import { layoutLadderAgainstWall } from '../scene/ladderAgainstWallScene';
import { fmt, type Experiment, type ReadoutRow } from './workbenchTypes';

export const ladderDefaults: LadderConfig = {
  mass: 10,
  angleDegrees: 60,
  mu: 0.4,
};

export const ladderWorkbench: Experiment<LadderConfig> = {
  defaultConfig: ladderDefaults,
  actions: false,
  controls: [
    { id: 'mass', label: 'm / kg', min: 1, max: 40, step: 0.5, value: 10, digits: 1 },
    {
      id: 'angleDegrees',
      label: 'incline θ / °',
      min: 15,
      max: 80,
      step: 1,
      value: 60,
      digits: 0,
      hint: 'Angle with the ground. The wall is vertical and smooth.',
    },
    {
      id: 'mu',
      label: 'friction μ',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0.4,
      digits: 2,
      hint: 'μ at the ground. μ = 0 is smooth ground — the ladder cannot rest.',
    },
  ],
  parseConfig: (values) => ({
    mass: values.mass,
    angleDegrees: values.angleDegrees,
    mu: values.mu,
  }),
  render(ctx, input) {
    const scene = layoutLadderAgainstWall({
      config: input.config,
      viewport: input.viewport,
    });

    ctx.clearRect(0, 0, input.viewport.width, input.viewport.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, input.viewport.width, input.viewport.height);
    drawGrid(ctx, input.viewport.width, input.viewport.height);
    drawWall(ctx, scene.wall.x, scene.wall.y1, scene.wall.y2);
    drawSurface(ctx, scene.ground.x1, scene.ground.y, scene.ground.x2);
    drawRod(ctx, scene.ladder);
    for (const arrow of scene.arrows) {
      drawArrow(ctx, arrow.from, arrow.to, arrow.label);
    }

    ctx.save();
    ctx.fillStyle = '#7a7a7a';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scene.angleLabel.text, scene.angleLabel.x, scene.angleLabel.y);
    ctx.restore();

    const r = scene.readout;
    const rows: ReadoutRow[] = [
      { type: 'row', k: 'm', v: `${fmt(r.mass, 1)} kg` },
      { type: 'row', k: 'θ', v: `${fmt(r.angleDegrees, 0)}°` },
      { type: 'row', k: 'μ', v: fmt(r.mu, 2) },
      { type: 'spacer' },
      { type: 'row', k: 'N', v: `${fmt(r.groundNormal, 2)} N` },
      { type: 'row', k: 'S', v: `${fmt(r.wallReaction, 2)} N` },
      { type: 'row', k: 'F', v: `${fmt(r.frictionForce, 2)} N`, accent: true },
      { type: 'row', k: 'least μ', v: fmt(r.muMin, 3) },
      { type: 'spacer' },
      { type: 'row', k: 'status', v: r.status },
    ];
    return rows;
  },
};
