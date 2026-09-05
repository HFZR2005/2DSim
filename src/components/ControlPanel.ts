import type { PulleyConfig } from '../physics/twoParticlePulley';

export type ControlPanelHandlers = {
  onChange: (config: PulleyConfig) => void;
  onRun: () => void;
  onReset: () => void;
};

const DEFAULTS: PulleyConfig = {
  m1: 2,
  m2: 3,
  angleDegrees: 30,
};

export class ControlPanel {
  private readonly root: HTMLElement;
  private readonly handlers: ControlPanelHandlers;
  private m1Input!: HTMLInputElement;
  private m2Input!: HTMLInputElement;
  private angleInput!: HTMLInputElement;
  private m1Out!: HTMLOutputElement;
  private m2Out!: HTMLOutputElement;
  private angleOut!: HTMLOutputElement;

  constructor(root: HTMLElement, handlers: ControlPanelHandlers) {
    this.root = root;
    this.handlers = handlers;
    this.render();
    this.bind();
  }

  getConfig(): PulleyConfig {
    return {
      m1: Number(this.m1Input.value),
      m2: Number(this.m2Input.value),
      angleDegrees: Number(this.angleInput.value),
    };
  }

  private render(): void {
    this.root.innerHTML = `
      <h2 class="panel-title">Controls</h2>

      <label class="field" for="ctrl-m1">
        <span class="field-label">m1 / kg</span>
        <span class="field-row">
          <input id="ctrl-m1" type="range" min="0.5" max="10" step="0.1" value="${DEFAULTS.m1}" />
          <output id="ctrl-m1-out">${DEFAULTS.m1.toFixed(1)}</output>
        </span>
      </label>

      <label class="field" for="ctrl-m2">
        <span class="field-label">m2 / kg</span>
        <span class="field-row">
          <input id="ctrl-m2" type="range" min="0.5" max="10" step="0.1" value="${DEFAULTS.m2}" />
          <output id="ctrl-m2-out">${DEFAULTS.m2.toFixed(1)}</output>
        </span>
      </label>

      <label class="field" for="ctrl-angle">
        <span class="field-label">incline θ / °</span>
        <span class="field-row">
          <input id="ctrl-angle" type="range" min="0" max="90" step="1" value="${DEFAULTS.angleDegrees}" />
          <output id="ctrl-angle-out">${DEFAULTS.angleDegrees.toFixed(0)}</output>
        </span>
        <span class="field-hint">90° is the Atwood case — both masses hang vertically.</span>
      </label>

      <div class="actions">
        <button type="button" id="ctrl-run">Run</button>
        <button type="button" id="ctrl-reset">Reset</button>
      </div>
    `;

    this.m1Input = this.root.querySelector('#ctrl-m1')!;
    this.m2Input = this.root.querySelector('#ctrl-m2')!;
    this.angleInput = this.root.querySelector('#ctrl-angle')!;
    this.m1Out = this.root.querySelector('#ctrl-m1-out')!;
    this.m2Out = this.root.querySelector('#ctrl-m2-out')!;
    this.angleOut = this.root.querySelector('#ctrl-angle-out')!;
  }

  private bind(): void {
    const emit = (): void => {
      this.m1Out.value = Number(this.m1Input.value).toFixed(1);
      this.m2Out.value = Number(this.m2Input.value).toFixed(1);
      this.angleOut.value = Number(this.angleInput.value).toFixed(0);
      this.handlers.onChange(this.getConfig());
    };

    this.m1Input.addEventListener('input', emit);
    this.m2Input.addEventListener('input', emit);
    this.angleInput.addEventListener('input', emit);

    this.root.querySelector('#ctrl-run')!.addEventListener('click', () => {
      this.handlers.onRun();
    });
    this.root.querySelector('#ctrl-reset')!.addEventListener('click', () => {
      this.handlers.onReset();
    });
  }
}
