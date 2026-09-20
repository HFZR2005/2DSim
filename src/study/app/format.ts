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

export function formatLoggedAt(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatLoggedAtLong(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
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

export function localDayKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(key: string): string {
  const [year, month, date] = key.split('-').map(Number);
  const weekday = new Date(year, month - 1, date).getDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  return shiftDay(key, -back);
}

export function lastWeeks(count: number): string[] {
  const origin = startOfWeek(todayKey());
  const weeks: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    weeks.push(shiftDay(origin, -i * 7));
  }
  return weeks;
}

export function formatWeek(key: string): string {
  const [year, month, date] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, date));
}

export function daysSince(iso: string): number {
  const last = new Date(`${localDayKey(iso)}T12:00:00`);
  const today = new Date(`${todayKey()}T12:00:00`);
  return Math.max(0, Math.round((today.getTime() - last.getTime()) / 86_400_000));
}

export function recencyKind(days: number): 'fresh' | 'fade' | 'cold' {
  if (days <= 7) return 'fresh';
  if (days <= 21) return 'fade';
  return 'cold';
}

export function formatRecency(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function weekVisited(dates: string[], weeks: string[]): boolean[] {
  const set = new Set(dates.map((iso) => startOfWeek(localDayKey(iso))));
  return weeks.map((week) => set.has(week));
}
