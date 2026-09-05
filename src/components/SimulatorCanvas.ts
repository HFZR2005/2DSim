import type { Experiment } from './workbenchTypes';
import { writeReadout } from './workbenchTypes';

export class SimulatorCanvas<C> {
  private readonly canvas: HTMLCanvasElement;
  private readonly readout: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly experiment: Experiment<C>;
  private config: C;
  private running = false;
  private startMs = 0;
  private elapsed = 0;
  private frame = 0;
  private observer: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, readout: HTMLElement, experiment: Experiment<C>) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }

    this.canvas = canvas;
    this.readout = readout;
    this.ctx = ctx;
    this.experiment = experiment;
    this.config = experiment.defaultConfig;
    this.observeResize();
    this.draw(0);
  }

  setConfig(config: C): void {
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

    const rows = this.experiment.render(this.ctx, {
      config: this.config,
      t,
      running: this.running,
      viewport: { width, height },
    });
    writeReadout(this.readout, rows);
  }
}
