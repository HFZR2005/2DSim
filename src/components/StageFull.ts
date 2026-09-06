const STORAGE_KEY = '2dsim-stage-full';

export class StageFull {
  private readonly app: HTMLElement;
  private readonly button: HTMLButtonElement;

  constructor(app: HTMLElement) {
    const button = app.querySelector<HTMLButtonElement>('#stage-full-btn');
    if (!button) {
      throw new Error('Stage full button missing');
    }

    this.app = app;
    this.button = button;

    this.button.addEventListener('click', () => this.toggle());
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!this.isOn()) return;
      const panel = this.app.querySelector<HTMLElement>('#scenario-switcher-panel');
      if (panel && !panel.hidden) return;
      this.exit();
    });

    if (readStored()) {
      this.enter();
    }
  }

  private isOn(): boolean {
    return this.app.classList.contains('is-stage-full');
  }

  private toggle(): void {
    if (this.isOn()) {
      this.exit();
    } else {
      this.enter();
    }
  }

  private enter(): void {
    this.app.classList.add('is-stage-full');
    writeStored(true);
    window.scrollTo(0, 0);
    this.syncButton();
  }

  private exit(): void {
    this.app.classList.remove('is-stage-full');
    writeStored(false);
    this.syncButton();
  }

  private syncButton(): void {
    const on = this.isOn();
    this.button.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.button.setAttribute('aria-label', on ? 'Exit full view' : 'Full view');
    this.button.textContent = on ? '[Exit]' : '[Full]';
  }
}

function readStored(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStored(on: boolean): void {
  try {
    if (on) {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode or blocked storage — in-memory class is enough.
  }
}
