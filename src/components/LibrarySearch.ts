import { getScenario, matchesScenario } from '../catalog/scenarios';

export class LibrarySearch {
  private readonly input: HTMLInputElement;
  private readonly chips: HTMLButtonElement[];
  private readonly rows: HTMLElement[];
  private readonly empty: HTMLElement | null;
  private filterId = 'all';

  constructor(root: HTMLElement) {
    const input = root.querySelector<HTMLInputElement>('#library-search');
    if (!input) {
      throw new Error('Library search input missing');
    }

    this.input = input;
    this.chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
    this.rows = [...root.querySelectorAll<HTMLElement>('[data-slug]')];
    this.empty = root.querySelector('#library-empty');

    this.input.addEventListener('input', () => this.apply());
    for (const chip of this.chips) {
      chip.addEventListener('click', () => {
        this.filterId = chip.dataset.filter ?? 'all';
        this.syncChips();
        this.apply();
      });
    }

    this.syncChips();
    this.apply();
    this.input.focus();
  }

  private syncChips(): void {
    for (const chip of this.chips) {
      const active = chip.dataset.filter === this.filterId;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  private apply(): void {
    const query = this.input.value;
    let visible = 0;

    for (const row of this.rows) {
      const scenario = getScenario(row.dataset.slug ?? '');
      const show = scenario ? matchesScenario(scenario, query, this.filterId) : false;
      row.hidden = !show;
      if (show) visible += 1;
    }

    if (this.empty) {
      this.empty.hidden = visible > 0;
    }
  }
}
