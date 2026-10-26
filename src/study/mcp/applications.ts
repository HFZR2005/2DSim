import { getBindings } from '../env';
import { notFound } from './errors';
import { toIsoOffset } from './time';

export const STAGES = [
  'considering',
  'applied',
  'online_test',
  'interview',
  'final',
  'offer',
  'rejected',
  'withdrawn',
] as const;
export type Stage = (typeof STAGES)[number];
export const CLOSED_STAGES = new Set<Stage>(['rejected', 'withdrawn']);

export const EVENT_TYPES = ['deadline', 'test_window', 'interview', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type NextEvent = {
  type: EventType;
  at: string;
  ends_at?: string;
  label?: string;
};

export type Application = {
  id: string;
  student_id: string;
  company: string;
  role: string;
  stage: Stage;
  next_event: NextEvent | null;
  url: string | null;
  notes: string;
  history: { at: string; stage: Stage; note: string }[];
  created_at: string;
  updated_at: string;
};

type AppRow = {
  id: string;
  student_id: string;
  company: string;
  role: string;
  stage: string;
  next_event: string | null;
  url: string | null;
  notes: string;
  history: string;
  created_at: string;
  updated_at: string;
};

function db(): D1Database {
  return getBindings().DB;
}

function parseEvent(raw: string | null): NextEvent | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NextEvent;
  } catch {
    return null;
  }
}

function parseHistory(raw: string): Application['history'] {
  try {
    const parsed = JSON.parse(raw) as Application['history'];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toApp(row: AppRow): Application {
  return {
    id: row.id,
    student_id: row.student_id,
    company: row.company,
    role: row.role,
    stage: STAGES.includes(row.stage as Stage) ? (row.stage as Stage) : 'applied',
    next_event: parseEvent(row.next_event),
    url: row.url,
    notes: row.notes ?? '',
    history: parseHistory(row.history),
    created_at: toIsoOffset(row.created_at),
    updated_at: toIsoOffset(row.updated_at),
  };
}

export async function getApplication(id: string): Promise<Application | null> {
  const row = await db()
    .prepare(
      'SELECT id, student_id, company, role, stage, next_event, url, notes, history, created_at, updated_at FROM mcp_applications WHERE id = ?',
    )
    .bind(id)
    .first<AppRow>();
  return row ? toApp(row) : null;
}

export async function listApplications(
  studentId: string,
  stage?: Stage,
  includeClosed = false,
): Promise<Application[]> {
  const result = await db()
    .prepare(
      'SELECT id, student_id, company, role, stage, next_event, url, notes, history, created_at, updated_at FROM mcp_applications WHERE student_id = ?',
    )
    .bind(studentId)
    .all<AppRow>();
  let items = result.results.map(toApp);
  if (stage) items = items.filter((item) => item.stage === stage);
  if (!includeClosed) items = items.filter((item) => !CLOSED_STAGES.has(item.stage));
  return items.sort((a, b) => {
    const at = a.next_event?.at;
    const bt = b.next_event?.at;
    if (at && bt) return at.localeCompare(bt);
    if (at) return -1;
    if (bt) return 1;
    return a.company.localeCompare(b.company);
  });
}

export async function createApplication(input: {
  studentId: string;
  company: string;
  role: string;
  stage: Stage;
  nextEvent: NextEvent | null;
  url: string | null;
  notes: string;
}): Promise<Application> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const history = JSON.stringify([{ at: now, stage: input.stage, note: 'created' }]);
  await db()
    .prepare(
      `INSERT INTO mcp_applications (id, student_id, company, role, stage, next_event, url, notes, history, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.studentId,
      input.company,
      input.role,
      input.stage,
      input.nextEvent ? JSON.stringify(input.nextEvent) : null,
      input.url,
      input.notes,
      history,
      now,
      now,
    )
    .run();
  const row = await getApplication(id);
  if (!row) throw new Error('Application insert failed');
  return row;
}

export async function updateApplication(
  id: string,
  patch: {
    stage?: Stage;
    nextEvent?: NextEvent | null;
    url?: string | null;
    notes?: string;
    appendNote?: string;
  },
): Promise<Application> {
  const current = await getApplication(id);
  if (!current) throw notFound('Application not found');
  const now = new Date().toISOString();
  const stage = patch.stage ?? current.stage;
  const history = [...current.history];
  if (patch.stage && patch.stage !== current.stage) {
    history.push({ at: now, stage: patch.stage, note: `stage ${current.stage} → ${patch.stage}` });
  }
  let notes = patch.notes ?? current.notes;
  if (patch.appendNote) {
    notes = `${notes}${notes ? '\n' : ''}${ymdStamp(now)} ${patch.appendNote}`.slice(0, 4000);
  }
  const nextEvent = patch.nextEvent === undefined ? current.next_event : patch.nextEvent;
  const url = patch.url === undefined ? current.url : patch.url;
  await db()
    .prepare(
      'UPDATE mcp_applications SET stage = ?, next_event = ?, url = ?, notes = ?, history = ?, updated_at = ? WHERE id = ?',
    )
    .bind(stage, nextEvent ? JSON.stringify(nextEvent) : null, url, notes, JSON.stringify(history), now, id)
    .run();
  const row = await getApplication(id);
  if (!row) throw notFound('Application not found');
  return row;
}

function ymdStamp(iso: string): string {
  return iso.slice(0, 10);
}

export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}
