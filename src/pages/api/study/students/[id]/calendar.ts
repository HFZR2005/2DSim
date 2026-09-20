import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentAccess, requireStudentSelf } from '../../../../../study/auth/session';
import { fetchCalendarIcs, loadStudentEvents, normalizeCalendarUrl, parseCalendarEvents } from '../../../../../study/calendar';
import { getStudent, getStudentCalendar, setStudentCalendar } from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { ICS_MAX, updateCalendarSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; params: { id: string } }) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    const viewer = requireStudentAccess(context.locals, studentId);
    if (!(await getStudent(studentId))) {
      return json({ error: 'Student not found' }, 404);
    }

    const calendar = (await getStudentCalendar(studentId)) ?? { url: null, ics: null };
    const connected = Boolean(calendar.url || calendar.ics);
    const canEdit = viewer.role === 'student' && viewer.studentId === studentId;

    let events = [];
    let error: string | null = null;
    if (connected) {
      try {
        events = await loadStudentEvents(calendar);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Could not read that calendar';
      }
    }

    return json({
      connected,
      canEdit,
      source: calendar.url ? 'url' : calendar.ics ? 'file' : null,
      feedUrl: canEdit ? calendar.url : null,
      events,
      error,
    });
  });
}

export async function PUT(context: { locals: App.Locals; params: { id: string }; request: Request }) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentSelf(context.locals, studentId);
    if (!(await getStudent(studentId))) {
      return json({ error: 'Student not found' }, 404);
    }

    const contentType = context.request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await context.request.formData();
      const file = form.get('ics');
      if (!(file instanceof File)) {
        return json({ error: 'Choose an .ics file' }, 400);
      }
      if (file.size > ICS_MAX) {
        return json({ error: 'That calendar file is too large' }, 400);
      }
      const ics = await file.text();
      try {
        parseCalendarEvents(ics);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'That file is not a calendar' }, 400);
      }
      await setStudentCalendar(studentId, { url: null, ics });
      return json({ ok: true, source: 'file' });
    }

    const parsed = updateCalendarSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Add a calendar link' }, 400);
    }
    if (parsed.data.url === null || parsed.data.url === '') {
      await setStudentCalendar(studentId, { url: null, ics: null });
      return json({ ok: true, source: null });
    }

    let url: string;
    try {
      url = normalizeCalendarUrl(parsed.data.url).toString();
      parseCalendarEvents(await fetchCalendarIcs(url));
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Could not read that calendar' }, 400);
    }
    await setStudentCalendar(studentId, { url, ics: null });
    return json({ ok: true, source: 'url' });
  });
}
