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
  subject?: string;
}): Promise<SessionRecord[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.studentId) {
    clauses.push('student_id = ?');
    values.push(filters.studentId);
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
  subject?: string;
}): Promise<TestRecord[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.studentId) {
    clauses.push('student_id = ?');
    values.push(filters.studentId);
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

export async function studentSummaries(studentId?: string): Promise<StudentSummary[]> {
  const students = studentId
    ? (await getStudent(studentId).then((row) => (row ? [row] : [])))
    : await listStudents();
  const sessions = await listSessions({ studentId });
  const tests = await listTests({ studentId });
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

export async function distinctSubjects(studentId?: string): Promise<string[]> {
  const [sessions, tests] = await Promise.all([
    listSessions({ studentId }),
    listTests({ studentId }),
  ]);
  return [
    ...new Set([...sessions.map((session) => session.subject), ...tests.map((test) => test.subject)]),
  ].sort((a, b) => a.localeCompare(b));
}
