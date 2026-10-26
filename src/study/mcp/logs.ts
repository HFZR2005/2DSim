import { getBindings } from '../env';
import { hasMeasuredSignal, sessionSignal } from '../signal';
import { notFound } from './errors';
import { addDaysYmd, londonDayStart, toIsoOffset, ymdInLondon } from './time';

export type McpKind = 'practice' | 'paper';
export type McpConfidence = 'low' | 'okay' | 'high';
export type ReviewStatus = 'none' | 'pending' | 'done' | 'dismissed';

export type McpLog = {
  id: string;
  student_id: string;
  kind: McpKind;
  subject: string;
  topic: string;
  item_ref: string | null;
  title: string | null;
  started_at: string;
  minutes: number | null;
  score: string | null;
  progress: number | null;
  confidence: McpConfidence | null;
  note: string;
  note_truncated?: boolean;
  fix_next: string | null;
  redo_after: string | null;
  review_status: ReviewStatus;
  resolves_log_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: 'user' | 'claude';
};

type LogRow = {
  id: string;
  student_id: string;
  kind: McpKind;
  subject: string;
  topic: string;
  item_ref: string | null;
  title: string | null;
  started_at: string | null;
  minutes: number | null;
  score: string | null;
  progress: number | null;
  confidence: string | null;
  note: string | null;
  fix_next: string | null;
  redo_after: string | null;
  review_status: string | null;
  resolves_log_id: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
};

const SELECT_PRACTICE = `SELECT id, student_id, 'practice' AS kind, subject, topic, item_ref, title, started_at, minutes, score, progress, confidence, note, fix_next, redo_after, review_status, resolves_log_id, created_at, updated_at, created_by FROM sessions`;
const SELECT_PAPER = `SELECT id, student_id, 'paper' AS kind, subject, track AS topic, item_ref, title, started_at, minutes, score, progress, confidence, note, fix_next, redo_after, review_status, resolves_log_id, created_at, updated_at, created_by FROM tests`;

function db(): D1Database {
  return getBindings().DB;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapConfidence(value: string | null): McpConfidence | null {
  if (value === 'struggled' || value === 'low') return 'low';
  if (value === 'okay') return 'okay';
  if (value === 'confident' || value === 'high') return 'high';
  return null;
}

function dbConfidence(value: McpConfidence | null): string | null {
  if (value === 'low') return 'struggled';
  if (value === 'high') return 'confident';
  return value;
}

function asReview(value: string | null): ReviewStatus {
  if (value === 'pending' || value === 'done' || value === 'dismissed' || value === 'none') return value;
  return 'none';
}

export function toLog(row: LogRow, truncateNote = false): McpLog {
  const derived = sessionSignal({ score: row.score, confidence: row.confidence });
  const measured = row.progress != null && Number.isFinite(row.progress) ? row.progress : hasMeasuredSignal(row) ? derived : null;
  const note = row.note ?? '';
  const truncated = truncateNote && note.length > 200;
  return {
    id: row.id,
    student_id: row.student_id,
    kind: row.kind,
    subject: row.subject,
    topic: row.topic,
    item_ref: row.item_ref,
    title: row.title,
    started_at: toIsoOffset(row.started_at || row.created_at),
    minutes: row.minutes,
    score: row.score,
    progress: measured,
    confidence: mapConfidence(row.confidence),
    note: truncated ? `${note.slice(0, 200).trimEnd()}…` : note,
    ...(truncateNote ? { note_truncated: truncated } : {}),
    fix_next: row.fix_next,
    redo_after: row.redo_after,
    review_status: asReview(row.review_status),
    resolves_log_id: row.resolves_log_id,
    created_at: toIsoOffset(row.created_at),
    updated_at: toIsoOffset(row.updated_at || row.created_at),
    created_by: row.created_by === 'claude' ? 'claude' : 'user',
  };
}

export async function getLogRow(id: string): Promise<LogRow | null> {
  const practice = await db()
    .prepare(`${SELECT_PRACTICE} WHERE id = ? AND deleted_at IS NULL`)
    .bind(id)
    .first<LogRow>();
  if (practice) return practice;
  return db()
    .prepare(`${SELECT_PAPER} WHERE id = ? AND deleted_at IS NULL`)
    .bind(id)
    .first<LogRow>();
}

export async function getLog(id: string): Promise<McpLog | null> {
  const row = await getLogRow(id);
  return row ? toLog(row, false) : null;
}

const UNION = `SELECT * FROM (${SELECT_PRACTICE} WHERE student_id = ? AND deleted_at IS NULL UNION ALL ${SELECT_PAPER} WHERE student_id = ? AND deleted_at IS NULL)`;

export async function listLogsForStudent(studentId: string): Promise<McpLog[]> {
  const result = await db()
    .prepare(`${UNION} AS logs ORDER BY created_at DESC, id DESC`)
    .bind(studentId, studentId)
    .all<LogRow>();
  return result.results.map((row) => toLog(row, false));
}

export async function listLogsPage(input: {
  studentId: string;
  since?: string;
  until?: string;
  subject?: string;
  topic?: string;
  itemRef?: string;
  limit: number;
  cursor?: string;
}): Promise<{ items: McpLog[]; next_cursor: string | null }> {
  function build(kind: McpKind): { sql: string; values: Array<string | number> } {
    const local: string[] = ['student_id = ?', 'deleted_at IS NULL'];
    const bind: Array<string | number> = [input.studentId];
    if (input.since) {
      local.push('created_at >= ?');
      bind.push(londonDayStart(input.since).toISOString());
    }
    if (input.until) {
      local.push('created_at < ?');
      bind.push(londonDayStart(addDaysYmd(input.until, 1)).toISOString());
    }
    if (input.subject) {
      local.push('subject = ?');
      bind.push(input.subject);
    }
    if (input.topic) {
      local.push(kind === 'paper' ? 'track = ?' : 'topic = ?');
      bind.push(input.topic);
    }
    if (input.itemRef) {
      local.push('item_ref = ?');
      bind.push(input.itemRef);
    }
    if (input.cursor) {
      const parsed = decodeCursor(input.cursor);
      if (parsed) {
        local.push('(created_at < ? OR (created_at = ? AND id < ?))');
        bind.push(parsed.t, parsed.t, parsed.id);
      }
    }
    const sql = `${kind === 'paper' ? SELECT_PAPER : SELECT_PRACTICE} WHERE ${local.join(' AND ')}`;
    return { sql, values: bind };
  }

  const practice = build('practice');
  const paper = build('paper');
  const result = await db()
    .prepare(
      `SELECT * FROM (${practice.sql} UNION ALL ${paper.sql}) AS logs ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(...practice.values, ...paper.values, input.limit + 1)
    .all<LogRow>();
  const rows = result.results;
  const extra = rows.length > input.limit;
  const slice = extra ? rows.slice(0, input.limit) : rows;
  const last = slice[slice.length - 1];
  return {
    items: slice.map((row) => toLog(row, true)),
    next_cursor: extra && last ? encodeCursor(last.created_at, last.id) : null,
  };
}

function encodeCursor(createdAt: string, id: string): string {
  return btoa(`${createdAt}\t${id}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeCursor(cursor: string): { t: string; id: string } | null {
  try {
    const padded = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const extra = padded.length % 4;
    const text = atob(extra ? `${padded}${'='.repeat(4 - extra)}` : padded);
    const tab = text.indexOf('\t');
    if (tab < 0) return null;
    return { t: text.slice(0, tab), id: text.slice(tab + 1) };
  } catch {
    return null;
  }
}

export async function listTopics(studentId: string): Promise<{ name: string; topics: string[] }[]> {
  const [explicit, practice, papers] = await Promise.all([
    db()
      .prepare('SELECT subject, topic FROM student_topics WHERE student_id = ?')
      .bind(studentId)
      .all<{ subject: string; topic: string }>(),
    db()
      .prepare('SELECT DISTINCT subject, topic FROM sessions WHERE student_id = ? AND deleted_at IS NULL')
      .bind(studentId)
      .all<{ subject: string; topic: string }>(),
    db()
      .prepare('SELECT DISTINCT subject, track AS topic FROM tests WHERE student_id = ? AND deleted_at IS NULL')
      .bind(studentId)
      .all<{ subject: string; topic: string }>(),
  ]);
  const bySubject = new Map<string, Set<string>>();
  for (const row of [...explicit.results, ...practice.results, ...papers.results]) {
    const set = bySubject.get(row.subject) ?? new Set<string>();
    set.add(row.topic);
    bySubject.set(row.subject, set);
  }
  return [...bySubject.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, topics]) => ({ name, topics: [...topics].sort((a, b) => a.localeCompare(b)) }));
}

export async function topicExists(studentId: string, subject: string, topic: string): Promise<boolean> {
  const subjects = await listTopics(studentId);
  return subjects.some((item) => item.name === subject && item.topics.includes(topic));
}

export async function addTopic(studentId: string, subject: string, topic: string): Promise<void> {
  await db()
    .prepare('INSERT OR IGNORE INTO student_topics (student_id, subject, topic) VALUES (?, ?, ?)')
    .bind(studentId, subject, topic)
    .run();
}

export type LogWrite = {
  kind: McpKind;
  subject: string;
  topic: string;
  title?: string | null;
  item_ref?: string | null;
  started_at?: string | null;
  minutes?: number | null;
  score?: string | null;
  progress?: number | null;
  confidence?: McpConfidence | null;
  note?: string | null;
  fix_next?: string | null;
  redo_after?: string | null;
  resolves_log_id?: string | null;
};

function reviewFrom(input: LogWrite, current?: ReviewStatus): ReviewStatus {
  if (input.fix_next || input.redo_after) return 'pending';
  return current ?? 'none';
}

export async function insertLog(studentId: string, input: LogWrite): Promise<McpLog> {
  const id = crypto.randomUUID();
  const created = nowIso();
  const started = input.started_at ?? created;
  const review = reviewFrom(input);
  const confidence = dbConfidence(input.confidence ?? null);
  const note = input.note ?? '';
  if (input.kind === 'practice') {
    await db()
      .prepare(
        `INSERT INTO sessions (id, student_id, subject, topic, type, score, confidence, note, item_ref, title, started_at, minutes, progress, fix_next, redo_after, review_status, resolves_log_id, created_by, updated_at, created_at)
         VALUES (?, ?, ?, ?, 'Practice', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claude', ?, ?)`,
      )
      .bind(
        id,
        studentId,
        input.subject,
        input.topic,
        input.score ?? null,
        confidence,
        note || null,
        input.item_ref ?? null,
        input.title ?? null,
        started,
        input.minutes ?? null,
        input.progress ?? null,
        input.fix_next ?? null,
        input.redo_after ?? null,
        review,
        input.resolves_log_id ?? null,
        created,
        created,
      )
      .run();
  } else {
    await db()
      .prepare(
        `INSERT INTO tests (id, student_id, subject, track, title, type, score, confidence, note, item_ref, started_at, minutes, progress, fix_next, redo_after, review_status, resolves_log_id, created_by, updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'Test', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claude', ?, ?)`,
      )
      .bind(
        id,
        studentId,
        input.subject,
        input.topic,
        input.title || input.topic,
        input.score ?? null,
        confidence,
        note || null,
        input.item_ref ?? null,
        started,
        input.minutes ?? null,
        input.progress ?? null,
        input.fix_next ?? null,
        input.redo_after ?? null,
        review,
        input.resolves_log_id ?? null,
        created,
        created,
      )
      .run();
  }
  if (input.resolves_log_id) await markReview(input.resolves_log_id, 'done');
  const log = await getLog(id);
  if (!log) throw new Error('Log insert failed');
  return log;
}

export async function updateLog(id: string, patch: Partial<LogWrite>): Promise<McpLog> {
  const current = await getLogRow(id);
  if (!current) throw notFound('Session not found');
  const table = current.kind === 'practice' ? 'sessions' : 'tests';
  const topicCol = current.kind === 'practice' ? 'topic' : 'track';
  const next: LogWrite = {
    kind: current.kind,
    subject: patch.subject ?? current.subject,
    topic: patch.topic ?? current.topic,
    title: patch.title === undefined ? current.title : patch.title,
    item_ref: patch.item_ref === undefined ? current.item_ref : patch.item_ref,
    started_at: patch.started_at === undefined ? current.started_at : patch.started_at,
    minutes: patch.minutes === undefined ? current.minutes : patch.minutes,
    score: patch.score === undefined ? current.score : patch.score,
    progress: patch.progress === undefined ? current.progress : patch.progress,
    confidence: patch.confidence === undefined ? mapConfidence(current.confidence) : patch.confidence,
    note: patch.note === undefined ? current.note : patch.note,
    fix_next: patch.fix_next === undefined ? current.fix_next : patch.fix_next,
    redo_after: patch.redo_after === undefined ? current.redo_after : patch.redo_after,
    resolves_log_id: patch.resolves_log_id === undefined ? current.resolves_log_id : patch.resolves_log_id,
  };
  const review = reviewFrom(next, asReview(current.review_status));
  await db()
    .prepare(
      `UPDATE ${table} SET subject = ?, ${topicCol} = ?, title = ?, item_ref = ?, started_at = ?, minutes = ?, score = ?, progress = ?, confidence = ?, note = ?, fix_next = ?, redo_after = ?, review_status = ?, resolves_log_id = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(
      next.subject,
      next.topic,
      next.title ?? (current.kind === 'paper' ? current.title : next.title),
      next.item_ref,
      next.started_at,
      next.minutes,
      next.score,
      next.progress,
      dbConfidence(next.confidence ?? null),
      next.note,
      next.fix_next,
      next.redo_after,
      review,
      next.resolves_log_id,
      nowIso(),
      id,
    )
    .run();
  if (next.resolves_log_id && next.resolves_log_id !== current.resolves_log_id) {
    await markReview(next.resolves_log_id, 'done');
  }
  const log = await getLog(id);
  if (!log) throw notFound('Session not found');
  return log;
}

export async function markReview(id: string, status: ReviewStatus, redoAfter?: string | null): Promise<McpLog> {
  const current = await getLogRow(id);
  if (!current) throw notFound('Session not found');
  const table = current.kind === 'practice' ? 'sessions' : 'tests';
  if (redoAfter === undefined) {
    await db().prepare(`UPDATE ${table} SET review_status = ?, updated_at = ? WHERE id = ?`).bind(status, nowIso(), id).run();
  } else {
    await db()
      .prepare(`UPDATE ${table} SET review_status = ?, redo_after = ?, updated_at = ? WHERE id = ?`)
      .bind(status, redoAfter, nowIso(), id)
      .run();
  }
  const log = await getLog(id);
  if (!log) throw notFound('Session not found');
  return log;
}

export async function softDeleteLog(id: string): Promise<void> {
  const current = await getLogRow(id);
  if (!current) throw notFound('Session not found');
  const table = current.kind === 'practice' ? 'sessions' : 'tests';
  await db().prepare(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`).bind(nowIso(), nowIso(), id).run();
}

export async function reviewQueue(studentId: string, date: string): Promise<McpLog[]> {
  const logs = await listLogsForStudent(studentId);
  const resolved = new Set(logs.map((log) => log.resolves_log_id).filter((id): id is string => Boolean(id)));
  const strongRefs = new Set(
    logs.filter((log) => log.item_ref && log.progress != null && log.progress >= 0.7).map((log) => log.item_ref as string),
  );
  const dueLimit = londonDayStart(addDaysYmd(date, 1)).getTime();
  return logs
    .filter((log) => {
      if (log.review_status !== 'pending') return false;
      if (resolved.has(log.id)) return false;
      if (log.item_ref && strongRefs.has(log.item_ref) && log.progress != null && log.progress < 0.7) return false;
      const due = log.redo_after
        ? londonDayStart(log.redo_after)
        : log.fix_next
          ? londonDayStart(addDaysYmd(ymdInLondon(new Date(log.started_at)), 3))
          : null;
      if (!due) return false;
      return due.getTime() < dueLimit;
    })
    .sort((a, b) => (a.redo_after || a.started_at).localeCompare(b.redo_after || b.started_at));
}
