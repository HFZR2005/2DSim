import '../ensureTemporal';
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
import { ActionButton, useActionStatus } from '../ActionButton';

const TIMEZONE = 'Europe/London';
const SMALL_CALENDAR_PX = 900;
const Temporal = globalThis.Temporal;

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
  const next: SxEvent[] = [];
  events.forEach((event, index) => {
    try {
      const id = `e${index}`;
      if (event.allDay) {
        const start = Temporal.Instant.from(event.start).toZonedDateTimeISO(TIMEZONE).toPlainDate();
        let end = Temporal.Instant.from(event.end).toZonedDateTimeISO(TIMEZONE).toPlainDate().subtract({ days: 1 });
        if (Temporal.PlainDate.compare(end, start) < 0) end = start;
        next.push({ id, title: event.title, start, end, location: event.location ?? undefined, calendarId: 'study' });
        return;
      }
      next.push({
        id,
        title: event.title,
        start: Temporal.Instant.from(event.start).toZonedDateTimeISO(TIMEZONE),
        end: Temporal.Instant.from(event.end).toZonedDateTimeISO(TIMEZONE),
        location: event.location ?? undefined,
        calendarId: 'study',
      });
    } catch {
      return;
    }
  });
  return next;
}

function isCompact(el?: HTMLElement | null): boolean {
  const width = el?.clientWidth || window.innerWidth;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse || width < SMALL_CALENDAR_PX;
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

    function mount() {
      if (dead || app || !host.current) return;
      const el = host.current;
      if (el.clientWidth < 8) return;

      try {
        const eventsService = createEventsServicePlugin();
        service.current = eventsService;
        const compact = isCompact(el);
        const plugins = compact
          ? [eventsService, createEventModalPlugin()]
          : [eventsService, createEventModalPlugin(), createCurrentTimePlugin({ fullWeekWidth: true })];
        app = createCalendar({
          views: [
            createViewWeek(),
            createViewDay(),
            createViewMonthGrid(),
            createViewWeekAgenda(),
            createViewMonthAgenda(),
          ],
          defaultView: compact ? 'week-agenda' : 'week',
          locale: 'en-GB',
          timezone: TIMEZONE,
          firstDayOfWeek: 1,
          dayBoundaries: { start: '07:00', end: '21:00' },
          weekOptions: { gridHeight: compact ? 480 : 720 },
          isResponsive: true,
          callbacks: {
            isCalendarSmall: ($app: { elements: { calendarWrapper?: HTMLElement | null } }) =>
              isCompact($app.elements.calendarWrapper ?? el),
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
          plugins,
        });
        app.render(el);
        eventsService.set(toSxEvents(eventsRef.current));
        window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      } catch (err) {
        if (!dead) setMountError(err instanceof Error ? err.message : 'Could not open the calendar');
      }
    }

    mount();
    const observer = new ResizeObserver(() => mount());
    observer.observe(root);

    return () => {
      dead = true;
      observer.disconnect();
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
  const saveLink = useActionStatus();
  const uploadFile = useActionStatus();
  const removeCal = useActionStatus();

  async function saveUrl(event: Event) {
    event.preventDefault();
    if (!url.trim()) return;
    try {
      await saveLink.run(async () => {
        await saveCalendarUrl(studentId, url.trim());
        setUrl('');
        onChanged();
      });
    } catch {
      return;
    }
  }

  async function saveFile(file: File) {
    try {
      await uploadFile.run(async () => {
        await uploadCalendarIcs(studentId, file);
        onChanged();
      });
    } catch {
      return;
    }
  }

  async function remove() {
    try {
      await removeCal.runAndHoldOk(async () => {
        await saveCalendarUrl(studentId, null);
        setUrl('');
      });
      onChanged();
    } catch {
      return;
    }
  }

  const events = calendar?.events ?? [];

  return (
    <section class="timetable">
      <div class="page-head">
        <h2>Timetable</h2>
        {calendar?.canEdit && calendar.connected && (
          <ActionButton
            type="button"
            class="text-btn inline-text"
            status={removeCal.status}
            idle="Remove"
            loading="Removing"
            ok="Removed"
            error="Couldn't remove"
            disabled={saveLink.busy || uploadFile.busy}
            onClick={() => void remove()}
          />
        )}
      </div>

      {loading && <p class="muted">Loading timetable…</p>}
      {calendar?.error && <p class="study-error">{calendar.error}</p>}

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
            <ActionButton
              type="submit"
              class="primary"
              status={saveLink.status}
              idle="Save link"
              loading="Saving"
              ok="Saved"
              error="Couldn't save"
              disabled={uploadFile.busy || removeCal.busy || (!url.trim() && saveLink.status === 'idle')}
            />
            <ActionButton
              type="button"
              status={uploadFile.status}
              idle="Upload .ics"
              loading="Uploading"
              ok="Uploaded"
              error="Couldn't upload"
              disabled={saveLink.busy || removeCal.busy}
              onClick={() => fileInput.current?.click()}
            />
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
