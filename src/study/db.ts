import { getBindings } from './env';
import { sessionSignal, trendFromSignals, type Confidence } from './signal';

export type StudentRow = {
  id: string;
  display_name: string;
  created_at: string;
};

export type SessionRow = {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  score: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
};

export type SessionRecord = SessionRow & { signal: number };

export type StudentSummary = StudentRow & {
  sessionCount: number;
  testCount: number;
  averageSignal: number | null;
  lastStudied: string | null;
};

export type TopicStat = {
  name: string;
  count: number;
  averageSignal: number;
  trend: 'up' | 'down' | 'flat';
  lastStudied: string;
};

export type SubjectStat = {
  subject: string;
  count: number;
  averageSignal: number;
  topics: TopicStat[];
  tracks: TopicStat[];
};

export type TestRow = {
  id: string;
  student_id: string;
  subject: string;
  track: string;
  title: string;
  score: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
};

export type TestRecord = TestRow & { signal: number };

export type AccessKind = 'staff' | 'adult' | 'self';

export type UserRow = {
  id: string;
  email: string;
  display_name: string;
  google_sub: string;
  created_at: string;
};

export type AccessRow = {
  id: string;
  user_id: string | null;
  email: string;
  student_id: string | null;
  kind: AccessKind;
  created_at: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function db(): D1Database {
  return getBindings().DB;
}

function withSignal(row: SessionRow): SessionRecord {
  return { ...row, signal: sessionSignal(row) };
}

function withTestSignal(row: TestRow): TestRecord {
  return { ...row, signal: sessionSignal(row) };
}

function namedStats(
  name: string,
  items: { signal: number; created_at: string }[],
): TopicStat {
  const signals = items.map((item) => item.signal);
  return {
    name,
    count: items.length,
    averageSignal: signals.reduce((sum, value) => sum + value, 0) / signals.length,
    trend: trendFromSignals(signals),
    lastStudied: items[items.length - 1].created_at,
  };
}

export async function listStudents(): Promise<StudentRow[]> {
  const result = await db()
    .prepare('SELECT id, display_name, created_at FROM students ORDER BY display_name COLLATE NOCASE')
    .all<StudentRow>();
  return result.results;
}

export async function getStudent(id: string): Promise<StudentRow | null> {
  return db()
    .prepare('SELECT id, display_name, created_at FROM students WHERE id = ?')
    .bind(id)
    .first<StudentRow>();
}

export async function createStudent(displayName: string): Promise<StudentRow> {
  const id = crypto.randomUUID();
  await db()
    .prepare('INSERT INTO students (id, display_name) VALUES (?, ?)')
    .bind(id, displayName)
    .run();
  const row = await getStudent(id);
  if (!row) throw new Error('Student insert failed');
  return row;
}

export async function listSessions(filters: {
  studentId?: string;
  studentIds?: string[];
  subject?: string;
}): Promise<SessionRecord[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.studentId) {
    clauses.push('student_id = ?');
    values.push(filters.studentId);
  } else if (filters.studentIds) {
    if (filters.studentIds.length === 0) return [];
    clauses.push(`student_id IN (${filters.studentIds.map(() => '?').join(', ')})`);
    values.push(...filters.studentIds);
  }
  if (filters.subject) {
    clauses.push('subject = ?');
    values.push(filters.subject);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await db()
    .prepare(
      `SELECT id, student_id, subject, topic, score, confidence, note, created_at
       FROM sessions ${where}
       ORDER BY created_at DESC`,
    )
    .bind(...values)
    .all<SessionRow>();
  return result.results.map(withSignal);
}

export async function createSession(input: {
  studentId: string;
  subject: string;
  topic: string;
  score: string | null;
  confidence: Confidence | null;
  note: string | null;
}): Promise<SessionRecord> {
  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO sessions (id, student_id, subject, topic, score, confidence, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.studentId,
      input.subject,
      input.topic,
      input.score,
      input.confidence,
      input.note,
    )
    .run();

  const row = await db()
    .prepare(
      `SELECT id, student_id, subject, topic, score, confidence, note, created_at
       FROM sessions WHERE id = ?`,
    )
    .bind(id)
    .first<SessionRow>();
  if (!row) throw new Error('Session insert failed');
  return withSignal(row);
}

export async function listTests(filters: {
  studentId?: string;
  studentIds?: string[];
  subject?: string;
}): Promise<TestRecord[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.studentId) {
    clauses.push('student_id = ?');
    values.push(filters.studentId);
  } else if (filters.studentIds) {
    if (filters.studentIds.length === 0) return [];
    clauses.push(`student_id IN (${filters.studentIds.map(() => '?').join(', ')})`);
    values.push(...filters.studentIds);
  }
  if (filters.subject) {
    clauses.push('subject = ?');
    values.push(filters.subject);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await db()
    .prepare(
      `SELECT id, student_id, subject, track, title, score, confidence, note, created_at
       FROM tests ${where}
       ORDER BY created_at DESC`,
    )
    .bind(...values)
    .all<TestRow>();
  return result.results.map(withTestSignal);
}

export async function createTest(input: {
  studentId: string;
  subject: string;
  track: string;
  title: string;
  score: string | null;
  confidence: Confidence | null;
  note: string | null;
}): Promise<TestRecord> {
  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO tests (id, student_id, subject, track, title, score, confidence, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.studentId,
      input.subject,
      input.track,
      input.title,
      input.score,
      input.confidence,
      input.note,
    )
    .run();

  const row = await db()
    .prepare(
      `SELECT id, student_id, subject, track, title, score, confidence, note, created_at
       FROM tests WHERE id = ?`,
    )
    .bind(id)
    .first<TestRow>();
  if (!row) throw new Error('Test insert failed');
  return withTestSignal(row);
}

export async function studentSummaries(studentId?: string, studentIds?: string[]): Promise<StudentSummary[]> {
  const students = studentId
    ? (await getStudent(studentId).then((row) => (row ? [row] : [])))
    : studentIds
      ? (await listStudents()).filter((student) => studentIds.includes(student.id))
      : await listStudents();
  const sessions = await listSessions({ studentId, studentIds: studentId ? undefined : studentIds });
  const tests = await listTests({ studentId, studentIds: studentId ? undefined : studentIds });
  return students.map((student) => {
    const practice = sessions.filter((session) => session.student_id === student.id);
    const papers = tests.filter((test) => test.student_id === student.id);
    const combined = [...practice, ...papers].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const averageSignal =
      combined.length === 0
        ? null
        : combined.reduce((sum, item) => sum + item.signal, 0) / combined.length;
    return {
      ...student,
      sessionCount: practice.length,
      testCount: papers.length,
      averageSignal,
      lastStudied: combined[0]?.created_at ?? null,
    };
  });
}

export async function subjectOverview(studentId: string, subject?: string): Promise<SubjectStat[]> {
  const [practice, tests] = await Promise.all([
    listSessions({ studentId, subject }),
    listTests({ studentId, subject }),
  ]);
  const names = [...new Set([...practice.map((row) => row.subject), ...tests.map((row) => row.subject)])].sort(
    (a, b) => a.localeCompare(b),
  );

  return names.map((subjectName) => {
    const subjectPractice = [...practice.filter((row) => row.subject === subjectName)].reverse();
    const subjectTests = [...tests.filter((row) => row.subject === subjectName)].reverse();
    const byTopic = new Map<string, SessionRecord[]>();
    for (const session of subjectPractice) {
      const list = byTopic.get(session.topic) ?? [];
      list.push(session);
      byTopic.set(session.topic, list);
    }
    const byTrack = new Map<string, TestRecord[]>();
    for (const test of subjectTests) {
      const list = byTrack.get(test.track) ?? [];
      list.push(test);
      byTrack.set(test.track, list);
    }
    const combined = [...subjectPractice, ...subjectTests];
    const signals = combined.map((item) => item.signal);
    return {
      subject: subjectName,
      count: combined.length,
      averageSignal:
        signals.length === 0 ? 0 : signals.reduce((sum, value) => sum + value, 0) / signals.length,
      topics: [...byTopic.entries()]
        .map(([name, items]) => namedStats(name, items))
        .sort((a, b) => a.name.localeCompare(b.name)),
      tracks: [...byTrack.entries()]
        .map(([name, items]) => namedStats(name, items))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}

export async function getUser(id: string): Promise<UserRow | null> {
  return db()
    .prepare('SELECT id, email, display_name, google_sub, created_at FROM users WHERE id = ?')
    .bind(id)
    .first<UserRow>();
}

export async function getUserByGoogleSub(googleSub: string): Promise<UserRow | null> {
  return db()
    .prepare('SELECT id, email, display_name, google_sub, created_at FROM users WHERE google_sub = ?')
    .bind(googleSub)
    .first<UserRow>();
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  return db()
    .prepare('SELECT id, email, display_name, google_sub, created_at FROM users WHERE email = ?')
    .bind(normalizeEmail(email))
    .first<UserRow>();
}

export async function upsertGoogleUser(input: {
  email: string;
  displayName: string;
  googleSub: string;
}): Promise<UserRow> {
  const email = normalizeEmail(input.email);
  const existing = (await getUserByGoogleSub(input.googleSub)) ?? (await getUserByEmail(email));
  if (existing) {
    await db()
      .prepare('UPDATE users SET email = ?, display_name = ?, google_sub = ? WHERE id = ?')
      .bind(email, input.displayName, input.googleSub, existing.id)
      .run();
    const row = await getUser(existing.id);
    if (!row) throw new Error('User update failed');
    return row;
  }

  const id = crypto.randomUUID();
  await db()
    .prepare('INSERT INTO users (id, email, display_name, google_sub) VALUES (?, ?, ?, ?)')
    .bind(id, email, input.displayName, input.googleSub)
    .run();
  const row = await getUser(id);
  if (!row) throw new Error('User insert failed');
  return row;
}

export async function listAccessForUser(userId: string): Promise<AccessRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, user_id, email, student_id, kind, created_at
       FROM user_access WHERE user_id = ?`,
    )
    .bind(userId)
    .all<AccessRow>();
  return result.results;
}

export async function listAccessForEmail(email: string): Promise<AccessRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, user_id, email, student_id, kind, created_at
       FROM user_access WHERE email = ?`,
    )
    .bind(normalizeEmail(email))
    .all<AccessRow>();
  return result.results;
}

export async function listAccessForStudent(studentId: string): Promise<AccessRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, user_id, email, student_id, kind, created_at
       FROM user_access WHERE student_id = ?
       ORDER BY email COLLATE NOCASE`,
    )
    .bind(studentId)
    .all<AccessRow>();
  return result.results;
}

export async function hasStaffAccess(): Promise<boolean> {
  const row = await db()
    .prepare('SELECT id FROM user_access WHERE kind = ? LIMIT 1')
    .bind('staff')
    .first<{ id: string }>();
  return Boolean(row);
}

export async function grantStaffAccess(email: string, userId?: string): Promise<AccessRow> {
  return grantAccess({ email, kind: 'staff', userId });
}

export async function grantAccess(input: {
  email: string;
  kind: AccessKind;
  studentId?: string | null;
  userId?: string | null;
}): Promise<AccessRow> {
  const email = normalizeEmail(input.email);
  const studentId = input.kind === 'staff' ? null : (input.studentId ?? null);
  if (input.kind !== 'staff' && !studentId) {
    throw new Error('Student is required');
  }

  let userId = input.userId ?? null;
  if (!userId) {
    userId = (await getUserByEmail(email))?.id ?? null;
  }

  const existing = await db()
    .prepare(
      `SELECT id, user_id, email, student_id, kind, created_at
       FROM user_access
       WHERE email = ? AND kind = ? AND COALESCE(student_id, '') = ?`,
    )
    .bind(email, input.kind, studentId ?? '')
    .first<AccessRow>();
  if (existing) {
    if (userId && existing.user_id !== userId) {
      await db().prepare('UPDATE user_access SET user_id = ? WHERE id = ?').bind(userId, existing.id).run();
      return { ...existing, user_id: userId };
    }
    return existing;
  }

  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO user_access (id, user_id, email, student_id, kind)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, email, studentId, input.kind)
    .run();
  const row = await db()
    .prepare(
      `SELECT id, user_id, email, student_id, kind, created_at
       FROM user_access WHERE id = ?`,
    )
    .bind(id)
    .first<AccessRow>();
  if (!row) throw new Error('Access insert failed');
  return row;
}

export async function linkAccessToUser(email: string, userId: string): Promise<void> {
  await db()
    .prepare('UPDATE user_access SET user_id = ? WHERE email = ?')
    .bind(userId, normalizeEmail(email))
    .run();
}

export async function distinctSubjects(studentId?: string, studentIds?: string[]): Promise<string[]> {
  const [sessions, tests] = await Promise.all([
    listSessions({ studentId, studentIds }),
    listTests({ studentId, studentIds }),
  ]);
  return [
    ...new Set([...sessions.map((session) => session.subject), ...tests.map((test) => test.subject)]),
  ].sort((a, b) => a.localeCompare(b));
}
