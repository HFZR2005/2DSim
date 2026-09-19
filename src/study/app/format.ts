import { sessionSignal } from '../signal';

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function shiftDay(key: string, delta: number): string {
  const [year, month, date] = key.split('-').map(Number);
  const next = new Date(year, month - 1, date + delta);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function formatDayLong(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function formatPercent(signal: number): string {
  return `${Math.round(signal * 100)}%`;
}

export function streakFromDates(keys: string[]): number {
  const unique = [...new Set(keys)].sort();
  if (unique.length === 0) return 0;
  const latest = unique[unique.length - 1];
  const today = todayKey();
  if (latest !== today && latest !== shiftDay(today, -1)) return 0;

  let streak = 0;
  let cursor = latest;
  const set = new Set(unique);
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

export function daySignals(sessions: { created_at: string; score?: string | null; confidence?: string | null; signal?: number }[]) {
  const map = new Map<string, number[]>();
  for (const session of sessions) {
    const key = dayKey(session.created_at);
    const list = map.get(key) ?? [];
    list.push(session.signal ?? sessionSignal(session));
    map.set(key, list);
  }
  const averages = new Map<string, number>();
  for (const [key, values] of map) {
    averages.set(key, values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return averages;
}

export function lastDays(count: number): string[] {
  const days: string[] = [];
  const start = todayKey();
  for (let i = count - 1; i >= 0; i -= 1) {
    days.push(shiftDay(start, -i));
  }
  return days;
}
