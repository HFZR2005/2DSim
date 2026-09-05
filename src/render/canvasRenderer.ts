export type Point = {
  x: number;
  y: number;
};

const INK = '#d4d4d4';
const INK_DIM = '#7a7a7a';
const ACCENT = '#e05a4e';
const GRID = 'rgba(255,255,255,0.045)';
const GRID_MAJOR = 'rgba(255,255,255,0.09)';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing = 32,
): void {
  ctx.save();
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += spacing) {
    ctx.strokeStyle = x % (spacing * 4) === 0 ? GRID_MAJOR : GRID;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += spacing) {
    ctx.strokeStyle = y % (spacing * 4) === 0 ? GRID_MAJOR : GRID;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  label?: string,
  labelAbove = false,
): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#0a0a0a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (label) {
    ctx.fillStyle = INK_DIM;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, labelAbove ? y - radius - 14 : y + radius + 14);
  }

  ctx.restore();
}

export function drawIncline(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawString(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawSurface(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
): void {
  drawIncline(ctx, [
    { x: x1, y },
    { x: x2, y },
  ]);

  ctx.save();
  ctx.strokeStyle = INK_DIM;
  ctx.lineWidth = 1;
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y);
    ctx.lineTo(x - 5.5, y + 6);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  label?: string,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const head = 8;

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - 0.4), to.y - head * Math.sin(angle - 0.4));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle + 0.4), to.y - head * Math.sin(angle + 0.4));
  ctx.stroke();

  if (label) {
    ctx.fillStyle = INK_DIM;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 8);
  }

  ctx.restore();
}

export function drawPulley(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, Math.max(radius * 0.28, 2), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
