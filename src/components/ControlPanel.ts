import type { ControlField, Experiment } from './workbenchTypes';

export type ControlPanelHandlers<C> = {
  onChange: (config: C) => void;
  onRun: () => void;
  onReset: () => void;
};

export class ControlPanel<C> {
  private readonly root: HTMLElement;
  private readonly experiment: Experiment<C>;
  private readonly handlers: ControlPanelHandlers<C>;
  private readonly inputs = new Map<string, HTMLInputElement>();
  private readonly outputs = new Map<string, HTMLOutputElement>();

  constructor(root: HTMLElement, experiment: Experiment<C>, handlers: ControlPanelHandlers<C>) {
    this.root = root;
    this.experiment = experiment;
    this.handlers = handlers;
    this.render();
    this.bind();
  }

  getConfig(): C {
    const values: Record<string, number> = {};
    for (const field of this.experiment.controls) {
      values[field.id] = Number(this.inputs.get(field.id)?.value);
    }
    return this.experiment.parseConfig(values);
  }

  private render(): void {
    const fields = this.experiment.controls
      .map((field) => fieldMarkup(field))
      .join('');

    const actions =
      this.experiment.actions === false
        ? ''
        : `
      <div class="actions">
        <button type="button" id="ctrl-run">Run</button>
        <button type="button" id="ctrl-reset">Reset</button>
      </div>
    `;

    this.root.innerHTML = `
      <h2 class="panel-title">Controls</h2>
      ${fields}
      ${actions}
    `;

    for (const field of this.experiment.controls) {
      this.inputs.set(field.id, this.root.querySelector(`#ctrl-${field.id}`)!);
      this.outputs.set(field.id, this.root.querySelector(`#ctrl-${field.id}-out`)!);
    }
  }

  private bind(): void {
    const emit = (): void => {
      for (const field of this.experiment.controls) {
        const input = this.inputs.get(field.id);
        const output = this.outputs.get(field.id);
        if (input && output) {
          output.value = Number(input.value).toFixed(field.digits);
        }
      }
      this.handlers.onChange(this.getConfig());
    };

    for (const input of this.inputs.values()) {
      input.addEventListener('input', emit);
    }

    this.root.querySelector('#ctrl-run')?.addEventListener('click', () => {
      this.handlers.onRun();
    });
    this.root.querySelector('#ctrl-reset')?.addEventListener('click', () => {
      this.handlers.onReset();
    });
  }
}

function fieldMarkup(field: ControlField): string {
  const hint = field.hint ? `<span class="field-hint">${field.hint}</span>` : '';
  return `
    <label class="field" for="ctrl-${field.id}">
      <span class="field-label">${field.label}</span>
      <span class="field-row">
        <input id="ctrl-${field.id}" type="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${field.value}" />
        <output id="ctrl-${field.id}-out">${field.value.toFixed(field.digits)}</output>
      </span>
      ${hint}
    </label>
  `;
}
