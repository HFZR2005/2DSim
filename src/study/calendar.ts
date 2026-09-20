import ICAL from 'ical.js';

export type CalendarEvent = {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
};

const ICS_MAX = 800_000;
const WINDOW_DAYS = 45;
const MAX_OCCURRENCES = 800;

const ALLOWED_HOSTS = new Set([
  'calendar.google.com',
  'outlook.office365.com',
  'outlook.office.com',
  'outlook.live.com',
  'calendar.icloud.com',
]);

function hostAllowed(host: string): boolean {
  const name = host.toLowerCase();
  if (ALLOWED_HOSTS.has(name)) return true;
  return name.endsWith('.icloud.com') && name.includes('caldav');
}

export function normalizeCalendarUrl(raw: string): URL {
  const trimmed = raw.trim();
  const href = trimmed.replace(/^webcal:/i, 'https:');
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw new Error('That is not a valid calendar link');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Calendar links must use https');
  }
  if (!hostAllowed(url.hostname)) {
    throw new Error('Use a Google, Outlook, or iCloud calendar link');
  }
  return url;
}

async function fetchOnce(url: URL): Promise<Response> {
  return fetch(url, {
    redirect: 'manual',
    headers: { Accept: 'text/calendar, text/plain, */*' },
    signal: AbortSignal.timeout(8000),
  });
}

export async function fetchCalendarIcs(raw: string): Promise<string> {
  let url = normalizeCalendarUrl(raw);
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetchOnce(url);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Could not read that calendar');
      const next = new URL(location, url);
      if (!hostAllowed(next.hostname) || next.protocol !== 'https:') {
        throw new Error('Could not read that calendar');
      }
      url = next;
      continue;
    }
    if (!response.ok) {
      throw new Error('Could not read that calendar');
    }
    const text = await response.text();
    if (text.length > ICS_MAX) {
      throw new Error('That calendar file is too large');
    }
    return text;
  }
  throw new Error('Could not read that calendar');
}

function toIso(time: ICAL.Time): string {
  return time.toJSDate().toISOString();
}

function registerTimezones(root: ICAL.Component) {
  for (const zone of root.getAllSubcomponents('vtimezone')) {
    const tzid = zone.getFirstPropertyValue('tzid');
    if (typeof tzid === 'string' && !ICAL.TimezoneService.has(tzid)) {
      ICAL.TimezoneService.register(zone);
    }
  }
}

export function parseCalendarEvents(ics: string, from = new Date()): CalendarEvent[] {
  if (!ics.includes('BEGIN:VCALENDAR')) {
    throw new Error('That file is not a calendar');
  }

  const parsed = ICAL.parse(ics);
  const root = new ICAL.Component(parsed);
  registerTimezones(root);

  const rangeStart = from.getTime();
  const rangeEnd = rangeStart + WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const events: CalendarEvent[] = [];

  for (const vevent of root.getAllSubcomponents('vevent')) {
    if (vevent.getFirstPropertyValue('recurrence-id')) continue;
    const event = new ICAL.Event(vevent);
    if (!event.startDate) continue;

    const push = (start: ICAL.Time, end: ICAL.Time) => {
      const startMs = start.toJSDate().getTime();
      const endMs = end.toJSDate().getTime();
      if (endMs <= rangeStart || startMs >= rangeEnd) return;
      events.push({
        title: event.summary?.trim() || 'Busy',
        start: toIso(start),
        end: toIso(end),
        allDay: Boolean(start.isDate),
        location: event.location?.trim() || null,
      });
    };

    if (event.isRecurring()) {
      const expand = event.iterator();
      let next = expand.next();
      let seen = 0;
      while (next && seen < MAX_OCCURRENCES) {
        const details = event.getOccurrenceDetails(next);
        if (details.startDate.toJSDate().getTime() >= rangeEnd) break;
        push(details.startDate, details.endDate);
        next = expand.next();
        seen += 1;
      }
    } else {
      push(event.startDate, event.endDate ?? event.startDate);
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export async function loadStudentEvents(calendar: { url: string | null; ics: string | null }): Promise<CalendarEvent[]> {
  if (calendar.url) {
    return parseCalendarEvents(await fetchCalendarIcs(calendar.url));
  }
  if (calendar.ics) {
    return parseCalendarEvents(calendar.ics);
  }
  return [];
}
