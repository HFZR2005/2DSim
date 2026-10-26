export const TIMEZONE = 'Europe/London';

export function ymdInLondon(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysYmd(ymd: string, days: number): string {
  const start = londonDayStart(ymd);
  start.setUTCDate(start.getUTCDate() + days);
  return ymdInLondon(start);
}

export function londonOffset(date: Date): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, timeZoneName: 'shortOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  if (name === 'GMT' || name === 'UTC') return '+00:00';
  const match = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return '+00:00';
  return `${match[1]}${match[2].padStart(2, '0')}:${(match[3] ?? '00').padStart(2, '0')}`;
}

export function londonDayStart(ymd: string): Date {
  for (const offset of ['+01:00', '+00:00'] as const) {
    const date = new Date(`${ymd}T00:00:00${offset}`);
    if (Number.isNaN(date.getTime())) continue;
    if (ymdInLondon(date) === ymd && londonOffset(date) === offset) return date;
  }
  return new Date(`${ymd}T00:00:00+00:00`);
}

export function toIsoOffset(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : date.toISOString();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${londonOffset(date)}`;
}

export function parseYmd(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(field);
  }
  return value;
}
