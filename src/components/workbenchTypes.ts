export type ControlField = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  digits: number;
  hint?: string;
};

export type ReadoutRow =
  | { type: 'row'; k: string; v: string; accent?: boolean }
  | { type: 'spacer' };

export type Viewport = {
  width: number;
  height: number;
};

export type Experiment<C> = {
  defaultConfig: C;
  controls: ControlField[];
  parseConfig: (values: Record<string, number>) => C;
  render: (
    ctx: CanvasRenderingContext2D,
    input: { config: C; t: number; running: boolean; viewport: Viewport },
  ) => ReadoutRow[];
};

export function writeReadout(el: HTMLElement, rows: ReadoutRow[]): void {
  el.innerHTML = rows
    .map((row) => {
      if (row.type === 'spacer') return '<div class="row spacer"></div>';
      const accent = row.accent ? ' accent' : '';
      return `<div class="row${accent}"><span class="k">${row.k}</span><span class="v">${row.v}</span></div>`;
    })
    .join('');
}

export function fmt(value: number, digits: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);
  const text = (abs < 1e-10 ? 0 : n).toFixed(digits);
  return n >= 0 ? ` ${text}` : text;
}
