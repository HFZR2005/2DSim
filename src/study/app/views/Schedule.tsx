import 'temporal-polyfill/global';
import { Temporal } from 'temporal-polyfill';
import {
  createCalendar,
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
  createViewWeekAgenda,
} from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { createEventModalPlugin } from '@schedule-x/event-modal';
import { createCurrentTimePlugin } from '@schedule-x/current-time';
import '@schedule-x/theme-default/dist/index.css';
import { useEffect, useRef, useState } from 'preact/hooks';
import { saveCalendarUrl, uploadCalendarIcs, type CalendarEvent, type CalendarFeed } from '../api';

const TIMEZONE = 'Europe/London';
const SMALL_CALENDAR_PX = 900;

type Props = {
  studentId: string;
  calendar: CalendarFeed | null;
  loading: boolean;
  onChanged: () => void;
};

type SxEvent = {
  id: string;
  title: string;
  start: Temporal.ZonedDateTime | Temporal.PlainDate;
  end: Temporal.ZonedDateTime | Temporal.PlainDate;
  location?: string;
  calendarId: string;
};

function toSxEvents(events: CalendarEvent[]): SxEvent[] {
  return events.map((event, index) => {
    const id = `e${index}`;
    if (event.allDay) {
      const start = Temporal.Instant.from(event.start).toZonedDateTimeISO(TIMEZONE).toPlainDate();
      let end = Temporal.Instant.from(event.end).toZonedDateTimeISO(TIMEZONE).toPlainDate().subtract({ days: 1 });
      if (Temporal.PlainDate.compare(end, start) < 0) end = start;
      return { id, title: event.title, start, end, location: event.location ?? undefined, calendarId: 'study' };
    }
    return {
      id,
      title: event.title,
      start: Temporal.Instant.from(event.start).toZonedDateTimeISO(TIMEZONE),
      end: Temporal.Instant.from(event.end).toZonedDateTimeISO(TIMEZONE),
      location: event.location ?? undefined,
      calendarId: 'study',
    };
  });
}

function isNarrow(el?: HTMLElement | null): boolean {
  const width = el?.clientWidth || window.innerWidth;
  return width < SMALL_CALENDAR_PX;
}

function TimetableGrid({ events }: { events: CalendarEvent[] }) {
  const host = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  const service = useRef<{ set: (next: SxEvent[]) => void } | null>(null);
  const [mountError, setMountError] = useState('');
  eventsRef.current = events;

  useEffect(() => {
    const root = host.current;
    if (!root) return;

    let dead = false;
    let app: { destroy: () => void } | null = null;

    try {
      const eventsService = createEventsServicePlugin();
      service.current = eventsService;
      const small = isNarrow(root);
      app = createCalendar({
        views: [
          createViewWeek(),
          createViewDay(),
          createViewMonthGrid(),
          createViewWeekAgenda(),
          createViewMonthAgenda(),
        ],
        defaultView: small ? 'week-agenda' : 'week',
        locale: 'en-GB',
        timezone: TIMEZONE,
        firstDayOfWeek: 1,
        dayBoundaries: { start: '07:00', end: '21:00' },
        weekOptions: { gridHeight: small ? 480 : 720 },
        isResponsive: true,
        callbacks: {
          isCalendarSmall: ($app: { elements: { calendarWrapper?: HTMLElement | null } }) =>
            isNarrow($app.elements.calendarWrapper ?? root),
        },
        calendars: {
          study: {
            colorName: 'study',
            lightColors: {
              main: '#3452ff',
              container: '#dce2ff',
              onContainer: '#1c2230',
            },
          },
        },
        events: toSxEvents(eventsRef.current),
        plugins: [eventsService, createEventModalPlugin(), createCurrentTimePlugin({ fullWeekWidth: true })],
      });
      app.render(root);
      eventsService.set(toSxEvents(eventsRef.current));
    } catch (err) {
      if (!dead) setMountError(err instanceof Error ? err.message : 'Could not open the calendar');
    }

    return () => {
      dead = true;
      service.current = null;
      app?.destroy();
    };
  }, []);

  useEffect(() => {
    service.current?.set(toSxEvents(events));
  }, [events]);

  return (
    <>
      {mountError && <p class="study-error">{mountError}</p>}
      <div class="sx-preact-calendar-wrapper timetable-grid" ref={host} />
    </>
  );
}

export function Schedule({ studentId, calendar, loading, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveUrl(event: Event) {
    event.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    setError('');
    try {
      await saveCalendarUrl(studentId, url.trim());
      setUrl('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save calendar');
    } finally {
      setSaving(false);
    }
  }

  async function saveFile(file: File) {
    setSaving(true);
    setError('');
    try {
      await uploadCalendarIcs(studentId, file);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload calendar');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError('');
    try {
      await saveCalendarUrl(studentId, null);
      setUrl('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove calendar');
    } finally {
      setSaving(false);
    }
  }

  const events = calendar?.events ?? [];

  return (
    <section class="timetable">
      <div class="page-head">
        <h2>Timetable</h2>
        {calendar?.canEdit && calendar.connected && (
          <button type="button" class="text-btn inline-text" disabled={saving} onClick={remove}>
            Remove
          </button>
        )}
      </div>

      {loading && <p class="muted">Loading timetable…</p>}
      {calendar?.error && <p class="study-error">{calendar.error}</p>}
      {error && <p class="study-error">{error}</p>}

      {!loading && calendar && !calendar.connected && (
        <p class="empty">
          {calendar.canEdit
            ? 'Add a Google Calendar (or Outlook / iCloud) so staff can see your week.'
            : 'No timetable yet. The student adds this from their own sign-in.'}
        </p>
      )}

      {!loading && calendar?.connected && <TimetableGrid events={events} />}

      {calendar?.canEdit && (
        <form class="timetable-form" onSubmit={saveUrl}>
          <p class="muted">
            In Google Calendar: Settings → the calendar → Integrate calendar → Secret address in
            iCal format. Or upload an .ics export.
          </p>
          <label>
            iCal link
            <input
              value={url}
              placeholder={calendar.feedUrl ?? 'https://calendar.google.com/calendar/ical/…'}
              onInput={(event) => setUrl(event.currentTarget.value)}
            />
          </label>
          <div class="timetable-actions">
            <button type="submit" class="primary" disabled={saving || !url.trim()}>
              {saving ? 'Saving' : 'Save link'}
            </button>
            <button type="button" disabled={saving} onClick={() => fileInput.current?.click()}>
              Upload .ics
            </button>
            <input
              ref={fileInput}
              class="file-input"
              type="file"
              accept=".ics,text/calendar"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void saveFile(file);
              }}
            />
          </div>
        </form>
      )}
    </section>
  );
}
