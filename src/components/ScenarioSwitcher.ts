export class ScenarioSwitcher {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;

  constructor(root: HTMLElement) {
    const button = root.querySelector<HTMLButtonElement>('#scenario-switcher-btn');
    const panel = root.querySelector<HTMLElement>('#scenario-switcher-panel');
    if (!button || !panel) {
      throw new Error('Scenario switcher markup missing');
    }

    this.button = button;
    this.panel = panel;

    this.button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });

    this.panel.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.close();
        this.button.focus();
      }
    });
  }

  private toggle(): void {
    if (this.panel.hidden) {
      this.open();
    } else {
      this.close();
    }
  }

  private open(): void {
    this.panel.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
  }

  private close(): void {
    if (this.panel.hidden) return;
    this.panel.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
  }
}
