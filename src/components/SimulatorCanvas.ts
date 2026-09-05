import { solveTwoParticlePulley, type PulleyConfig } from '../physics/twoParticlePulley';
import {
  drawGrid,
  drawIncline,
  drawParticle,
  drawPulley,
  drawString,
} from '../render/canvasRenderer';
import { layoutTwoParticlePulley, type SceneReadout } from '../scene/twoParticlePulleyScene';

export class SimulatorCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly readout: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D;
  private config: PulleyConfig = { m1: 2, m2: 3, angleDegrees: 30, mu: 0 };
  private running = false;
  private startMs = 0;
  private elapsed = 0;
  private frame = 0;
  private observer: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, readout: HTMLElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }

    this.canvas = canvas;
    this.readout = readout;
    this.ctx = ctx;
    this.observeResize();
    this.draw(0);
  }

  setConfig(config: PulleyConfig): void {
    this.config = config;
    if (!this.running) {
      this.draw(this.elapsed);
    }
  }

  run(): void {
    if (this.running) return;
    this.running = true;
    this.startMs = performance.now() - this.elapsed * 1000;
    this.tick();
  }

  reset(): void {
    this.running = false;
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    this.elapsed = 0;
    this.draw(0);
  }

  destroy(): void {
    this.reset();
    this.observer?.disconnect();
  }

  private observeResize(): void {
    this.observer = new ResizeObserver(() => {
      this.syncCanvasSize();
      this.draw(this.elapsed);
    });
    this.observer.observe(this.canvas);
    this.syncCanvasSize();
  }

  private syncCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width * dpr), 1);
    const height = Math.max(Math.floor(rect.height * dpr), 1);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private tick = (): void => {
    if (!this.running) return;
    this.elapsed = (performance.now() - this.startMs) / 1000;
    this.draw(this.elapsed);
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(t: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width < 2 || height < 2) return;

    const physics = solveTwoParticlePulley(this.config);
    const scene = layoutTwoParticlePulley({
      config: this.config,
      physics,
      t,
      running: this.running,
      viewport: { width, height },
    });

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);
    drawGrid(this.ctx, width, height);
    drawIncline(this.ctx, scene.incline);
    drawString(this.ctx, scene.string);
    drawPulley(this.ctx, scene.pulley.x, scene.pulley.y, scene.pulley.radius);
    drawParticle(
      this.ctx,
      scene.particle1.x,
      scene.particle1.y,
      scene.particle1.radius,
      scene.particle1.label,
    );
    drawParticle(
      this.ctx,
      scene.particle2.x,
      scene.particle2.y,
      scene.particle2.radius,
      scene.particle2.label,
    );

    this.renderReadout(scene.readout);
  }

  private renderReadout(r: SceneReadout): void {
    this.readout.innerHTML = `
      <div class="row"><span class="k">m1</span><span class="v">${fmt(r.m1, 2)} kg</span></div>
      <div class="row"><span class="k">m2</span><span class="v">${fmt(r.m2, 2)} kg</span></div>
      <div class="row"><span class="k">θ</span><span class="v">${fmt(r.angleDegrees, 1)}°</span></div>
      <div class="row"><span class="k">μ</span><span class="v">${fmt(r.mu, 2)}</span></div>
      <div class="row"><span class="k">F</span><span class="v">${fmt(r.frictionForce, 2)} N</span></div>
      <div class="row spacer"></div>
      <div class="row"><span class="k">a</span><span class="v">${fmt(r.acceleration, 2)} m/s²</span></div>
      <div class="row accent"><span class="k">T</span><span class="v">${fmt(r.tension, 2)} N</span></div>
      <div class="row"><span class="k">v</span><span class="v">${fmt(r.velocity, 2)} m/s</span></div>
      <div class="row"><span class="k">t</span><span class="v">${fmt(r.time, 2)} s</span></div>
      <div class="row spacer"></div>
      <div class="row"><span class="k">status</span><span class="v">${r.status}</span></div>
    `;
  }
}

function fmt(value: number, digits: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);
  const text = (abs < 1e-10 ? 0 : n).toFixed(digits);
  return n >= 0 ? ` ${text}` : text;
}
