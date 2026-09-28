import { Temporal } from 'temporal-polyfill';

const root = globalThis as typeof globalThis & { Temporal?: typeof Temporal };
if (!root.Temporal) {
  root.Temporal = Temporal;
}
