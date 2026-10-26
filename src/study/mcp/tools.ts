import { visibleStudentIds } from '../auth/viewer';
import { getStudentCalendar, getUser, studentSummaries } from '../db';
import { fetchCalendarIcs, parseCalendarEvents } from '../calendar';
import type { McpAuth } from './access';
import { hasScope, resolveStudentId } from './access';
import {
  createApplication,
  getApplication,
  isStage,
  listApplications,
  STAGES,
  updateApplication,
  type NextEvent,
  type Stage,
} from './applications';
import { forbidden, invalid, notFound, ToolError } from './errors';
import {
  addTopic,
  getLog,
  getLogRow,
  insertLog,
  listLogsPage,
  listTopics,
  reviewQueue,
  softDeleteLog,
  topicExists,
  updateLog,
  markReview,
  listLogsForStudent,
  type McpConfidence,
  type McpKind,
  type ReviewStatus,
} from './logs';
import { getIdempotent, saveIdempotent } from './store';
import { addDaysYmd, londonDayStart, toIsoOffset, ymdInLondon } from './time';

type Json = Record<string, unknown>;

const NOTE_MAX = 4000;
const STR_MAX = 200;
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const writeHint = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const destroyHint = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function bounded(value: unknown, field: string, max = STR_MAX): string {
  const text = str(value);
  if (!text) throw invalid(field, `${field} is required`);
  if (text.length > max) throw invalid(field, `${field} must be at most ${max} characters`);
  return text;
}

function optionalBounded(value: unknown, field: string, max = STR_MAX): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value);
  if (text.length > max) throw invalid(field, `${field} must be at most ${max} characters`);
  return text;
}

function ymd(value: unknown, field: string): string {
  const text = str(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) throw invalid(field, `${field} must be YYYY-MM-DD`);
  return text;
}

function optionalYmd(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return ymd(value, field);
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function limitOf(value: unknown, fallback = 20): number {
  const n = num(value);
  if (n === undefined) return fallback;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

async function idempotent(auth: McpAuth, args: Json, run: () => Promise<unknown>): Promise<unknown> {
  const id = optionalBounded(args.client_request_id, 'client_request_id', 64);
  if (id) {
    const existing = await getIdempotent(auth.userId, id);
    if (existing) return existing;
  }
  const result = await run();
  if (id) await saveIdempotent(auth.userId, id, result);
  return result;
}

export const mcpTools = [
  {
    name: 'who_am_i',
    description: 'Signed-in MechLab account, linked student record, and token scopes. Call this first.',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
  },
  {
    name: 'list_students',
    description: 'Students this token can see. A self-only token returns only the linked self record.',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
  },
  {
    name: 'list_topics',
    description: 'Allowed subject and topic names for this student. log_session may only use these until add_topic is called.',
    inputSchema: {
      type: 'object',
      properties: { student_id: { type: 'string' } },
    },
    annotations: readOnly,
  },
  {
    name: 'get_summary',
    description: 'How this student is doing since a date (default 7 days ago): session counts, minutes, topic progress, review due count.',
    inputSchema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        since: { type: 'string', description: 'YYYY-MM-DD, default 7 days ago' },
      },
    },
    annotations: readOnly,
  },
  {
    name: 'get_review_queue',
    description: 'Sessions due for a redo on or before a date (default today).',
    inputSchema: {
      type: 'object',
      properties: { student_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } },
    },
    annotations: readOnly,
  },
  {
    name: 'list_logs',
    description: 'Recent practice and paper sessions, newest first. Notes longer than 200 characters are truncated.',
    inputSchema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        since: { type: 'string' },
        until: { type: 'string' },
        subject: { type: 'string' },
        topic: { type: 'string' },
        item_ref: { type: 'string' },
        limit: { type: 'number' },
        cursor: { type: 'string' },
      },
    },
    annotations: readOnly,
  },
  {
    name: 'get_log',
    description: 'One session with the full note.',
    inputSchema: {
      type: 'object',
      properties: { log_id: { type: 'string' } },
      required: ['log_id'],
    },
    annotations: readOnly,
  },
  {
    name: 'list_applications',
    description: 'Job applications for this student. Hidden rejected/withdrawn unless include_closed is true.',
    inputSchema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        stage: { type: 'string', enum: [...STAGES] },
        include_closed: { type: 'boolean' },
      },
    },
    annotations: readOnly,
  },
  {
    name: 'get_upcoming',
    description: 'Application events and timetable blocks in the next N days (default 14, max 60).',
    inputSchema: {
      type: 'object',
      properties: { student_id: { type: 'string' }, days: { type: 'number' } },
    },
    annotations: readOnly,
  },
  {
    name: 'log_session',
    description:
      'Log a practice or paper session on the signed-in student (or student_id if the token allows). subject and topic must already exist in list_topics.',
    inputSchema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        kind: { type: 'string', enum: ['practice', 'paper'] },
        subject: { type: 'string' },
        topic: { type: 'string' },
        title: { type: 'string' },
        item_ref: { type: 'string' },
        started_at: { type: 'string' },
        minutes: { type: 'number' },
        score: { type: 'string' },
        progress: { type: 'number' },
        confidence: { type: 'string', enum: ['low', 'okay', 'high'] },
        note: { type: 'string' },
        fix_next: { type: 'string' },
        redo_after: { type: 'string' },
        resolves_log_id: { type: 'string' },
        client_request_id: { type: 'string' },
      },
      required: ['subject', 'topic', 'kind'],
    },
    annotations: writeHint,
  },
  {
    name: 'update_session',
    description: 'Partial update of a session. Cannot move it to another student.',
    inputSchema: {
      type: 'object',
      properties: {
        log_id: { type: 'string' },
        title: { type: 'string' },
        item_ref: { type: 'string' },
        started_at: { type: 'string' },
        minutes: { type: 'number' },
        score: { type: 'string' },
        progress: { type: 'number' },
        confidence: { type: 'string', enum: ['low', 'okay', 'high'] },
        note: { type: 'string' },
        subject: { type: 'string' },
        topic: { type: 'string' },
        fix_next: { type: 'string' },
        redo_after: { type: 'string' },
        resolves_log_id: { type: 'string' },
        client_request_id: { type: 'string' },
      },
      required: ['log_id'],
    },
    annotations: writeHint,
  },
  {
    name: 'set_review_status',
    description: 'Mark a session pending, done, or dismissed. Pass redo_after to snooze.',
    inputSchema: {
      type: 'object',
      properties: {
        log_id: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'done', 'dismissed'] },
        redo_after: { type: 'string' },
        client_request_id: { type: 'string' },
      },
      required: ['log_id', 'status'],
    },
    annotations: writeHint,
  },
  {
    name: 'delete_session',
    description: 'Soft-delete a session Claude created. Hidden from later reads.',
    inputSchema: {
      type: 'object',
      properties: { log_id: { type: 'string' } },
      required: ['log_id'],
    },
    annotations: destroyHint,
  },
  {
    name: 'add_topic',
    description: 'Add a subject/topic pair to the allowed list for this student. Required before logging a new topic.',
    inputSchema: {
      type: 'object',
      properties: { student_id: { type: 'string' }, subject: { type: 'string' }, topic: { type: 'string' } },
      required: ['subject', 'topic'],
    },
    annotations: writeHint,
  },
  {
    name: 'create_application',
    description: 'Add a job application. stage defaults to applied.',
    inputSchema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        company: { type: 'string' },
        role: { type: 'string' },
        stage: { type: 'string', enum: [...STAGES] },
        next_event: { type: 'object' },
        url: { type: 'string' },
        notes: { type: 'string' },
        client_request_id: { type: 'string' },
      },
      required: ['company', 'role'],
    },
    annotations: writeHint,
  },
  {
    name: 'update_application',
    description: 'Update an application. next_event null clears it. append_note adds a dated line. Stage changes are recorded in history.',
    inputSchema: {
      type: 'object',
      properties: {
        application_id: { type: 'string' },
        stage: { type: 'string', enum: [...STAGES] },
        next_event: {},
        url: { type: 'string' },
        notes: { type: 'string' },
        append_note: { type: 'string' },
        client_request_id: { type: 'string' },
      },
      required: ['application_id'],
    },
    annotations: writeHint,
  },
];

export async function callMcpTool(auth: McpAuth, name: string, args: Json): Promise<unknown> {
  switch (name) {
    case 'who_am_i':
      return whoAmI(auth);
    case 'list_students':
      return listStudents(auth);
    case 'list_topics':
      return topics(auth, args);
    case 'get_summary':
      return summary(auth, args);
    case 'get_review_queue':
      return reviews(auth, args);
    case 'list_logs':
    case 'list_recent_work':
      return logs(auth, args);
    case 'get_log':
      return oneLog(auth, args);
    case 'list_applications':
      return apps(auth, args);
    case 'get_upcoming':
      return upcoming(auth, args);
    case 'log_session':
    case 'log_practice':
      return logSession(auth, args, name === 'log_practice' ? 'practice' : undefined);
    case 'log_paper':
      return logSession(auth, { ...args, kind: 'paper' }, 'paper');
    case 'update_session':
    case 'update_note':
      return patchSession(auth, args);
    case 'set_review_status':
      return setReview(auth, args);
    case 'delete_session':
    case 'delete_work':
      return removeSession(auth, args);
    case 'add_topic':
      return addTopicTool(auth, args);
    case 'create_application':
      return createApp(auth, args);
    case 'update_application':
      return patchApp(auth, args);
    default:
      throw new ToolError('NOT_FOUND', `Unknown tool: ${name}`);
  }
}

async function whoAmI(auth: McpAuth) {
  const user = await getUser(auth.userId);
  return {
    account_id: auth.userId,
    role: auth.viewer.role,
    display_name: user?.display_name ?? null,
    self_student_id: auth.selfStudentId,
    token_scopes: auth.scopes,
  };
}

async function listStudents(auth: McpAuth) {
  if (hasScope(auth, 'students:read')) {
    const allowed = visibleStudentIds(auth.viewer);
    const students = allowed ? await studentSummaries(undefined, allowed) : await studentSummaries();
    return {
      student_id: auth.selfStudentId,
      items: students.map(studentJson),
      next_cursor: null,
    };
  }
  if (!auth.selfStudentId) return { student_id: null, items: [], next_cursor: null };
  resolveStudentId(auth, undefined, 'read');
  const students = await studentSummaries(auth.selfStudentId);
  return { student_id: auth.selfStudentId, items: students.map(studentJson), next_cursor: null };
}

function studentJson(student: Awaited<ReturnType<typeof studentSummaries>>[number]) {
  return {
    id: student.id,
    display_name: student.display_name,
    session_count: student.sessionCount,
    test_count: student.testCount,
    average_progress: student.averageSignal,
    last_studied: student.lastStudied,
  };
}

async function topics(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'read');
  return { student_id: studentId, subjects: await listTopics(studentId) };
}

async function summary(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'read');
  const since = optionalYmd(args.since, 'since') ?? addDaysYmd(ymdInLondon(), -7);
  const sinceMs = londonDayStart(since).getTime();
  const logs = (await listLogsForStudent(studentId)).filter((log) => new Date(log.created_at).getTime() >= sinceMs);
  const bySubject = new Map<string, Map<string, typeof logs>>();
  for (const log of logs) {
    const topicsMap = bySubject.get(log.subject) ?? new Map();
    const list = topicsMap.get(log.topic) ?? [];
    list.push(log);
    topicsMap.set(log.topic, list);
    bySubject.set(log.subject, topicsMap);
  }
  const subjects = [...bySubject.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([subject, topicsMap]) => ({
    subject,
    topics: [...topicsMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([topic, items]) => {
      const ordered = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const measured = ordered.filter((item) => item.progress != null).map((item) => item.progress as number);
      const mid = Math.floor(measured.length / 2);
      const earlier = measured.slice(0, mid);
      const later = measured.slice(mid);
      const avg = (xs: number[]) => (xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : null);
      const earlyAvg = avg(earlier);
      const lateAvg = avg(later);
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (earlyAvg != null && lateAvg != null) {
        const delta = lateAvg - earlyAvg;
        if (delta > 0.05) trend = 'up';
        else if (delta < -0.05) trend = 'down';
      }
      return {
        topic,
        sessions: items.length,
        minutes: items.reduce((sum, item) => sum + (item.minutes ?? 0), 0),
        average_progress: avg(measured),
        trend,
        last_studied: ordered[ordered.length - 1]?.started_at ?? null,
      };
    }),
  }));
  const due = await reviewQueue(studentId, ymdInLondon());
  return {
    student_id: studentId,
    since,
    totals: {
      sessions: logs.length,
      minutes: logs.reduce((sum, item) => sum + (item.minutes ?? 0), 0),
    },
    subjects,
    review_due_count: due.length,
    last_session_at: logs[0]?.started_at ?? null,
  };
}

async function reviews(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'read');
  const date = optionalYmd(args.date, 'date') ?? ymdInLondon();
  const items = await reviewQueue(studentId, date);
  return {
    student_id: studentId,
    date,
    items: items.map((log) => ({
      log_id: log.id,
      item_ref: log.item_ref,
      title: log.title,
      subject: log.subject,
      topic: log.topic,
      fix_next: log.fix_next,
      redo_after: log.redo_after,
      original_progress: log.progress,
    })),
  };
}

async function logs(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'read');
  const page = await listLogsPage({
    studentId,
    since: optionalYmd(args.since, 'since'),
    until: optionalYmd(args.until, 'until'),
    subject: str(args.subject),
    topic: str(args.topic),
    itemRef: str(args.item_ref),
    limit: limitOf(args.limit),
    cursor: str(args.cursor),
  });
  return { student_id: studentId, ...page };
}

async function oneLog(auth: McpAuth, args: Json) {
  const id = bounded(args.log_id, 'log_id', 64);
  const log = await getLog(id);
  if (!log) throw notFound('Session not found');
  resolveStudentId(auth, log.student_id, 'read');
  return { student_id: log.student_id, ...log };
}

async function apps(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'read');
  const stage = str(args.stage);
  if (stage && !isStage(stage)) throw invalid('stage', 'Unknown stage');
  const items = await listApplications(studentId, stage && isStage(stage) ? stage : undefined, Boolean(args.include_closed));
  return { student_id: studentId, items, next_cursor: null };
}

async function upcoming(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'read');
  const days = Math.min(60, Math.max(1, num(args.days) ?? 14));
  const from = ymdInLondon();
  const to = addDaysYmd(from, days);
  const fromMs = londonDayStart(from).getTime();
  const toMs = londonDayStart(to).getTime();
  const items: Array<{
    source: 'application' | 'calendar';
    at: string;
    ends_at?: string;
    type: string;
    label: string;
    application_id?: string;
  }> = [];
  for (const app of await listApplications(studentId, undefined, true)) {
    const at = app.next_event?.at;
    if (!at) continue;
    const ms = new Date(at).getTime();
    if (ms < fromMs || ms >= toMs) continue;
    items.push({
      source: 'application',
      at: toIsoOffset(at),
      ends_at: app.next_event?.ends_at ? toIsoOffset(app.next_event.ends_at) : undefined,
      type: app.next_event?.type ?? 'other',
      label: app.next_event?.label || `${app.company} · ${app.role}`,
      application_id: app.id,
    });
  }
  try {
    const calendar = await getStudentCalendar(studentId);
    if (calendar?.url || calendar?.ics) {
      const ics = calendar.url ? await fetchCalendarIcs(calendar.url) : calendar.ics;
      if (ics) {
        for (const event of parseCalendarEvents(ics, new Date(fromMs))) {
          const ms = new Date(event.start).getTime();
          if (ms < fromMs || ms >= toMs) continue;
          items.push({
            source: 'calendar',
            at: toIsoOffset(event.start),
            ends_at: event.end ? toIsoOffset(event.end) : undefined,
            type: event.allDay ? 'other' : 'other',
            label: event.title,
          });
        }
      }
    }
  } catch {
    // Calendar is optional; skip if the feed cannot be read.
  }
  items.sort((a, b) => a.at.localeCompare(b.at));
  return { student_id: studentId, from, to, items };
}

function parseKind(value: unknown, fallback?: McpKind): McpKind {
  const kind = str(value) ?? fallback;
  if (kind !== 'practice' && kind !== 'paper') throw invalid('kind', 'kind must be practice or paper');
  return kind;
}

function parseConfidence(value: unknown): McpConfidence | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'low' || value === 'okay' || value === 'high') return value;
  if (value === 'struggled') return 'low';
  if (value === 'confident') return 'high';
  throw invalid('confidence', 'confidence must be low, okay, or high');
}

function parseProgress(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = num(value);
  if (n === undefined || n < 0 || n > 1) throw invalid('progress', 'progress must be between 0 and 1');
  return n;
}

function parseMinutes(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = num(value);
  if (n === undefined || n < 1 || n > 600) throw invalid('minutes', 'minutes must be 1–600');
  return Math.floor(n);
}

async function logSession(auth: McpAuth, args: Json, kindOverride?: McpKind) {
  const studentId = resolveStudentId(auth, args.student_id, 'write');
  return idempotent(auth, args, async () => {
    const kind = parseKind(args.kind, kindOverride);
    const subject = bounded(args.subject, 'subject');
    const topic = bounded(args.topic, 'topic');
    if (!(await topicExists(studentId, subject, topic))) {
      throw invalid('topic', 'subject/topic must exist in list_topics. Call add_topic first.');
    }
    const resolves = str(args.resolves_log_id);
    if (resolves) {
      const original = await getLog(resolves);
      if (!original || original.student_id !== studentId) throw invalid('resolves_log_id', 'Original session not found for this student');
    }
    const log = await insertLog(studentId, {
      kind,
      subject,
      topic,
      title: optionalBounded(args.title, 'title') ?? null,
      item_ref: optionalBounded(args.item_ref, 'item_ref') ?? null,
      started_at: str(args.started_at) ?? null,
      minutes: parseMinutes(args.minutes) ?? null,
      score: optionalBounded(args.score, 'score', 40) ?? null,
      progress: parseProgress(args.progress) ?? null,
      confidence: parseConfidence(args.confidence) ?? null,
      note: optionalBounded(args.note, 'note', NOTE_MAX) ?? null,
      fix_next: optionalBounded(args.fix_next, 'fix_next') ?? null,
      redo_after: optionalYmd(args.redo_after, 'redo_after') ?? null,
      resolves_log_id: resolves ?? null,
    });
    return { student_id: studentId, ...log };
  });
}

async function patchSession(auth: McpAuth, args: Json) {
  const id = bounded(args.log_id ?? args.id, 'log_id', 64);
  const current = await getLog(id);
  if (!current) throw notFound('Session not found');
  resolveStudentId(auth, current.student_id, 'write');
  return idempotent(auth, args, async () => {
    if (args.subject || args.topic) {
      const subject = str(args.subject) ?? current.subject;
      const topic = str(args.topic) ?? current.topic;
      if (!(await topicExists(current.student_id, subject, topic))) {
        throw invalid('topic', 'subject/topic must exist in list_topics');
      }
    }
    const log = await updateLog(id, {
      subject: str(args.subject),
      topic: str(args.topic),
      title: args.title === undefined ? undefined : optionalBounded(args.title, 'title') ?? null,
      item_ref: args.item_ref === undefined ? undefined : optionalBounded(args.item_ref, 'item_ref') ?? null,
      started_at: str(args.started_at),
      minutes: parseMinutes(args.minutes),
      score: args.score === undefined ? undefined : optionalBounded(args.score, 'score', 40) ?? null,
      progress: parseProgress(args.progress),
      confidence: parseConfidence(args.confidence),
      note: args.note === undefined ? undefined : optionalBounded(args.note, 'note', NOTE_MAX) ?? '',
      fix_next: args.fix_next === undefined ? undefined : optionalBounded(args.fix_next, 'fix_next') ?? null,
      redo_after: args.redo_after === undefined ? undefined : optionalYmd(args.redo_after, 'redo_after') ?? null,
      resolves_log_id: str(args.resolves_log_id),
    });
    return { student_id: log.student_id, ...log };
  });
}

async function setReview(auth: McpAuth, args: Json) {
  const id = bounded(args.log_id, 'log_id', 64);
  const current = await getLog(id);
  if (!current) throw notFound('Session not found');
  resolveStudentId(auth, current.student_id, 'write');
  const status = str(args.status);
  if (status !== 'pending' && status !== 'done' && status !== 'dismissed') {
    throw invalid('status', 'status must be pending, done, or dismissed');
  }
  return idempotent(auth, args, async () => {
    const log = await markReview(id, status as ReviewStatus, optionalYmd(args.redo_after, 'redo_after') ?? undefined);
    return { student_id: log.student_id, ...log };
  });
}

async function removeSession(auth: McpAuth, args: Json) {
  const id = bounded(args.log_id ?? args.id, 'log_id', 64);
  const current = await getLogRow(id);
  if (!current) throw notFound('Session not found');
  resolveStudentId(auth, current.student_id, 'write');
  if (current.created_by !== 'claude') throw forbidden('Claude can only delete sessions it created');
  await softDeleteLog(id);
  return { student_id: current.student_id, ok: true, id };
}

async function addTopicTool(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'write');
  const subject = bounded(args.subject, 'subject');
  const topic = bounded(args.topic, 'topic');
  return idempotent(auth, args, async () => {
    await addTopic(studentId, subject, topic);
    return { student_id: studentId, subject, topic, subjects: await listTopics(studentId) };
  });
}

function parseNextEvent(value: unknown): NextEvent | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object') throw invalid('next_event', 'next_event must be an object or null');
  const raw = value as Json;
  const type = str(raw.type);
  if (type !== 'deadline' && type !== 'test_window' && type !== 'interview' && type !== 'other') {
    throw invalid('next_event', 'next_event.type is invalid');
  }
  const at = str(raw.at);
  if (!at) throw invalid('next_event', 'next_event.at is required');
  return {
    type,
    at,
    ends_at: str(raw.ends_at),
    label: optionalBounded(raw.label, 'next_event.label') ?? undefined,
  };
}

async function createApp(auth: McpAuth, args: Json) {
  const studentId = resolveStudentId(auth, args.student_id, 'write');
  return idempotent(auth, args, async () => {
    const stageRaw = str(args.stage) ?? 'applied';
    if (!isStage(stageRaw)) throw invalid('stage', 'Unknown stage');
    const app = await createApplication({
      studentId,
      company: bounded(args.company, 'company'),
      role: bounded(args.role, 'role'),
      stage: stageRaw,
      nextEvent: parseNextEvent(args.next_event) ?? null,
      url: optionalBounded(args.url, 'url') ?? null,
      notes: optionalBounded(args.notes, 'notes', NOTE_MAX) ?? '',
    });
    return { student_id: studentId, ...app };
  });
}

async function patchApp(auth: McpAuth, args: Json) {
  const id = bounded(args.application_id, 'application_id', 64);
  const current = await getApplication(id);
  if (!current) throw notFound('Application not found');
  resolveStudentId(auth, current.student_id, 'write');
  if (args.stage !== undefined && !isStage(args.stage)) throw invalid('stage', 'Unknown stage');
  return idempotent(auth, args, async () => {
    const app = await updateApplication(id, {
      stage: isStage(args.stage) ? args.stage : undefined,
      nextEvent: parseNextEvent(args.next_event),
      url: args.url === undefined ? undefined : optionalBounded(args.url, 'url') ?? null,
      notes: args.notes === undefined ? undefined : optionalBounded(args.notes, 'notes', NOTE_MAX) ?? '',
      appendNote: optionalBounded(args.append_note, 'append_note', NOTE_MAX),
    });
    return { student_id: app.student_id, ...app };
  });
}

export type { McpAuth };
export { ToolError, forbidden };
