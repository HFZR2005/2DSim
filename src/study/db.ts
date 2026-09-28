import { getBindings } from './env';
import { randomJoinCode } from './joinCode';
import { sessionSignal, hasMeasuredSignal, trendFromSignals, type Confidence } from './signal';
import { normalizeType } from './taskType';

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
  type: string;
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
  hasCalendar: boolean;
};

export type StudentCalendar = {
  url: string | null;
  ics: string | null;
};

export type TopicStat = {
  name: string;
  count: number;
  averageSignal: number | null;
  trend: 'up' | 'down' | 'flat';
  lastStudied: string;
};

export type SubjectStat = {
  subject: string;
  count: number;
  averageSignal: number | null;
  topics: TopicStat[];
  tracks: TopicStat[];
};

export type TestRow = {
  id: string;
  student_id: string;
  subject: string;
  track: string;
  title: string;
  type: string;
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
  items: { signal: number; created_at: string; score?: string | null; confidence?: string | null }[],
): TopicStat {
  const measured = items.filter((item) => hasMeasuredSignal(item));
  const signals = measured.map((item) => item.signal);
  return {
    name,
    count: items.length,
    averageSignal:
      signals.length === 0 ? null : signals.reduce((sum, value) => sum + value, 0) / signals.length,
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

export async function getStudentCalendar(id: string): Promise<StudentCalendar | null> {
  const row = await db()
    .prepare('SELECT calendar_url, calendar_ics FROM students WHERE id = ?')
    .bind(id)
    .first<{ calendar_url: string | null; calendar_ics: string | null }>();
  if (!row) return null;
  return { url: row.calendar_url, ics: row.calendar_ics };
}

export async function setStudentCalendar(id: string, calendar: StudentCalendar): Promise<void> {
  await db()
    .prepare('UPDATE students SET calendar_url = ?, calendar_ics = ? WHERE id = ?')
    .bind(calendar.url, calendar.ics, id)
    .run();
}

async function calendarFlags(ids: string[]): Promise<Map<string, boolean>> {
  if (ids.length === 0) return new Map();
  const result = await db()
    .prepare(
      `SELECT id, calendar_url, calendar_ics FROM students WHERE id IN (${ids.map(() => '?').join(', ')})`,
    )
    .bind(...ids)
    .all<{ id: string; calendar_url: string | null; calendar_ics: string | null }>();
  return new Map(
    result.results.map((row) => [row.id, Boolean(row.calendar_url || row.calendar_ics)]),
  );
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
      `SELECT id, student_id, subject, topic, type, score, confidence, note, created_at
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
  type: string;
  score: string | null;
  confidence: Confidence | null;
  note: string | null;
}): Promise<SessionRecord> {
  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO sessions (id, student_id, subject, topic, type, score, confidence, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.studentId,
      input.subject,
      input.topic,
      normalizeType(input.type, 'Practice'),
      input.score,
      input.confidence,
      input.note,
    )
    .run();

  const row = await db()
    .prepare(
      `SELECT id, student_id, subject, topic, type, score, confidence, note, created_at
       FROM sessions WHERE id = ?`,
    )
    .bind(id)
    .first<SessionRow>();
  if (!row) throw new Error('Session insert failed');
  return withSignal(row);
}

export async function getSession(studentId: string, sessionId: string): Promise<SessionRecord | null> {
  const row = await db()
    .prepare(
      `SELECT id, student_id, subject, topic, type, score, confidence, note, created_at
       FROM sessions WHERE id = ? AND student_id = ?`,
    )
    .bind(sessionId, studentId)
    .first<SessionRow>();
  return row ? withSignal(row) : null;
}

export async function updateSessionNote(
  studentId: string,
  sessionId: string,
  note: string | null,
): Promise<SessionRecord | null> {
  await db()
    .prepare('UPDATE sessions SET note = ? WHERE id = ? AND student_id = ?')
    .bind(note, sessionId, studentId)
    .run();
  return getSession(studentId, sessionId);
}

export async function deleteSession(studentId: string, sessionId: string): Promise<boolean> {
  const result = await db()
    .prepare('DELETE FROM sessions WHERE id = ? AND student_id = ?')
    .bind(sessionId, studentId)
    .run();
  return (result.meta.changes ?? 0) > 0;
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
      `SELECT id, student_id, subject, track, title, type, score, confidence, note, created_at
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
  type: string;
  score: string | null;
  confidence: Confidence | null;
  note: string | null;
}): Promise<TestRecord> {
  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO tests (id, student_id, subject, track, title, type, score, confidence, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.studentId,
      input.subject,
      input.track,
      input.title,
      normalizeType(input.type, 'Test'),
      input.score,
      input.confidence,
      input.note,
    )
    .run();

  const row = await db()
    .prepare(
      `SELECT id, student_id, subject, track, title, type, score, confidence, note, created_at
       FROM tests WHERE id = ?`,
    )
    .bind(id)
    .first<TestRow>();
  if (!row) throw new Error('Test insert failed');
  return withTestSignal(row);
}

export async function getTest(studentId: string, testId: string): Promise<TestRecord | null> {
  const row = await db()
    .prepare(
      `SELECT id, student_id, subject, track, title, type, score, confidence, note, created_at
       FROM tests WHERE id = ? AND student_id = ?`,
    )
    .bind(testId, studentId)
    .first<TestRow>();
  return row ? withTestSignal(row) : null;
}

export async function updateTestNote(
  studentId: string,
  testId: string,
  note: string | null,
): Promise<TestRecord | null> {
  await db()
    .prepare('UPDATE tests SET note = ? WHERE id = ? AND student_id = ?')
    .bind(note, testId, studentId)
    .run();
  return getTest(studentId, testId);
}

export async function deleteTest(studentId: string, testId: string): Promise<boolean> {
  const result = await db()
    .prepare('DELETE FROM tests WHERE id = ? AND student_id = ?')
    .bind(testId, studentId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteSubjectLogs(
  studentId: string,
  subject: string,
): Promise<{ sessions: number; tests: number }> {
  const practice = await db()
    .prepare('DELETE FROM sessions WHERE student_id = ? AND subject = ?')
    .bind(studentId, subject)
    .run();
  const papers = await db()
    .prepare('DELETE FROM tests WHERE student_id = ? AND subject = ?')
    .bind(studentId, subject)
    .run();
  return {
    sessions: practice.meta.changes ?? 0,
    tests: papers.meta.changes ?? 0,
  };
}

export async function studentSummaries(studentId?: string, studentIds?: string[]): Promise<StudentSummary[]> {
  const students = studentId
    ? (await getStudent(studentId).then((row) => (row ? [row] : [])))
    : studentIds
      ? (await listStudents()).filter((student) => studentIds.includes(student.id))
      : await listStudents();
  const sessions = await listSessions({ studentId, studentIds: studentId ? undefined : studentIds });
  const tests = await listTests({ studentId, studentIds: studentId ? undefined : studentIds });
  const flags = await calendarFlags(students.map((student) => student.id));
  return students.map((student) => {
    const practice = sessions.filter((session) => session.student_id === student.id);
    const papers = tests.filter((test) => test.student_id === student.id);
    const combined = [...practice, ...papers].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const measured = combined.filter((item) => hasMeasuredSignal(item));
    const averageSignal =
      measured.length === 0
        ? null
        : measured.reduce((sum, item) => sum + item.signal, 0) / measured.length;
    return {
      ...student,
      sessionCount: practice.length,
      testCount: papers.length,
      averageSignal,
      lastStudied: combined[0]?.created_at ?? null,
      hasCalendar: flags.get(student.id) ?? false,
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
    const measured = combined.filter((item) => hasMeasuredSignal(item));
    const signals = measured.map((item) => item.signal);
    return {
      subject: subjectName,
      count: combined.length,
      averageSignal:
        signals.length === 0 ? null : signals.reduce((sum, value) => sum + value, 0) / signals.length,
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

export type UserRole = 'learner' | 'supervisor';

export type RosterRecord = {
  id: string;
  owner_user_id: string;
  name: string;
  join_code: string;
  created_at: string;
};

export type RosterMember = {
  id: string;
  display_name: string;
};

export type RosterWithMembers = RosterRecord & {
  owner_email: string;
  members: RosterMember[];
};

export type ShareRecord = {
  id: string;
  student_id: string;
  email: string;
  user_id: string | null;
  created_at: string;
};

export async function listUserRoles(userId: string): Promise<UserRole[]> {
  const result = await db()
    .prepare('SELECT role FROM user_roles WHERE user_id = ?')
    .bind(userId)
    .all<{ role: UserRole }>();
  return result.results.map((row) => row.role);
}

export async function addUserRole(userId: string, role: UserRole): Promise<void> {
  await db()
    .prepare('INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)')
    .bind(userId, role)
    .run();
}

export async function learnerStudentId(userId: string): Promise<string | null> {
  const row = await db()
    .prepare(
      `SELECT student_id FROM user_access
       WHERE user_id = ? AND kind = 'self' AND student_id IS NOT NULL
       LIMIT 1`,
    )
    .bind(userId)
    .first<{ student_id: string }>();
  return row?.student_id ?? null;
}

export async function becomeLearner(user: UserRow): Promise<string> {
  const existing = await learnerStudentId(user.id);
  if (existing) {
    await addUserRole(user.id, 'learner');
    return existing;
  }
  const student = await createStudent(user.display_name);
  await grantAccess({
    email: user.email,
    kind: 'self',
    studentId: student.id,
    userId: user.id,
  });
  await addUserRole(user.id, 'learner');
  return student.id;
}

export async function becomeSupervisor(userId: string): Promise<void> {
  await addUserRole(userId, 'supervisor');
}

export async function listOwnedRosters(userId: string): Promise<RosterWithMembers[]> {
  const result = await db()
    .prepare(
      `SELECT r.id, r.owner_user_id, r.name, r.join_code, r.created_at, u.email AS owner_email
       FROM rosters r
       JOIN users u ON u.id = r.owner_user_id
       WHERE r.owner_user_id = ?
       ORDER BY r.created_at DESC`,
    )
    .bind(userId)
    .all<RosterRecord & { owner_email: string }>();
  return attachRosterMembers(result.results);
}

export async function listJoinedRosters(studentId: string): Promise<RosterWithMembers[]> {
  const result = await db()
    .prepare(
      `SELECT r.id, r.owner_user_id, r.name, r.join_code, r.created_at, u.email AS owner_email
       FROM roster_members m
       JOIN rosters r ON r.id = m.roster_id
       JOIN users u ON u.id = r.owner_user_id
       WHERE m.student_id = ?
       ORDER BY r.name COLLATE NOCASE`,
    )
    .bind(studentId)
    .all<RosterRecord & { owner_email: string }>();
  return attachRosterMembers(result.results);
}

async function attachRosterMembers(
  rows: (RosterRecord & { owner_email: string })[],
): Promise<RosterWithMembers[]> {
  const out: RosterWithMembers[] = [];
  for (const row of rows) {
    out.push({ ...row, members: await listRosterMembers(row.id) });
  }
  return out;
}

export async function listRosterMembers(rosterId: string): Promise<RosterMember[]> {
  const result = await db()
    .prepare(
      `SELECT s.id, s.display_name
       FROM roster_members m
       JOIN students s ON s.id = m.student_id
       WHERE m.roster_id = ?
       ORDER BY s.display_name COLLATE NOCASE`,
    )
    .bind(rosterId)
    .all<RosterMember>();
  return result.results;
}

export async function getRoster(id: string): Promise<RosterRecord | null> {
  return db()
    .prepare('SELECT id, owner_user_id, name, join_code, created_at FROM rosters WHERE id = ?')
    .bind(id)
    .first<RosterRecord>();
}

export async function getRosterByCode(code: string): Promise<RosterRecord | null> {
  return db()
    .prepare('SELECT id, owner_user_id, name, join_code, created_at FROM rosters WHERE join_code = ?')
    .bind(code)
    .first<RosterRecord>();
}

export async function createRoster(ownerUserId: string, name: string): Promise<RosterRecord> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = crypto.randomUUID();
    const joinCode = randomJoinCode();
    try {
      await db()
        .prepare('INSERT INTO rosters (id, owner_user_id, name, join_code) VALUES (?, ?, ?, ?)')
        .bind(id, ownerUserId, name, joinCode)
        .run();
      const row = await getRoster(id);
      if (!row) throw new Error('Roster insert failed');
      return row;
    } catch (error) {
      if (attempt === 7) throw error;
    }
  }
  throw new Error('Could not create roster');
}

export async function deleteRoster(id: string, ownerUserId: string): Promise<boolean> {
  await db().prepare('DELETE FROM roster_members WHERE roster_id = ?').bind(id).run();
  const result = await db()
    .prepare('DELETE FROM rosters WHERE id = ? AND owner_user_id = ?')
    .bind(id, ownerUserId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function addRosterMember(rosterId: string, studentId: string): Promise<void> {
  await db()
    .prepare('INSERT OR IGNORE INTO roster_members (roster_id, student_id) VALUES (?, ?)')
    .bind(rosterId, studentId)
    .run();
}

export async function removeRosterMember(
  rosterId: string,
  studentId: string,
  ownerUserId?: string,
): Promise<boolean> {
  if (ownerUserId) {
    const roster = await getRoster(rosterId);
    if (!roster || roster.owner_user_id !== ownerUserId) return false;
  }
  const result = await db()
    .prepare('DELETE FROM roster_members WHERE roster_id = ? AND student_id = ?')
    .bind(rosterId, studentId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function rosterStudentIdsForOwner(userId: string): Promise<string[]> {
  const result = await db()
    .prepare(
      `SELECT DISTINCT m.student_id AS id
       FROM rosters r
       JOIN roster_members m ON m.roster_id = r.id
       WHERE r.owner_user_id = ?`,
    )
    .bind(userId)
    .all<{ id: string }>();
  return result.results.map((row) => row.id);
}

export async function isRosterOwnerOfStudent(userId: string, studentId: string): Promise<boolean> {
  const row = await db()
    .prepare(
      `SELECT r.id
       FROM rosters r
       JOIN roster_members m ON m.roster_id = r.id
       WHERE r.owner_user_id = ? AND m.student_id = ?
       LIMIT 1`,
    )
    .bind(userId, studentId)
    .first<{ id: string }>();
  return Boolean(row);
}

export async function learnerIdForEmail(email: string): Promise<string | null> {
  const row = await db()
    .prepare(
      `SELECT student_id FROM user_access
       WHERE email = ? AND kind = 'self' AND student_id IS NOT NULL
       LIMIT 1`,
    )
    .bind(normalizeEmail(email))
    .first<{ student_id: string }>();
  return row?.student_id ?? null;
}

export async function listSharesForStudent(studentId: string): Promise<ShareRecord[]> {
  const result = await db()
    .prepare(
      `SELECT id, student_id, email, user_id, created_at
       FROM student_shares WHERE student_id = ?
       ORDER BY email COLLATE NOCASE`,
    )
    .bind(studentId)
    .all<ShareRecord>();
  return result.results;
}

export async function listShareStudentIdsForEmail(email: string): Promise<string[]> {
  const result = await db()
    .prepare('SELECT DISTINCT student_id AS id FROM student_shares WHERE email = ?')
    .bind(normalizeEmail(email))
    .all<{ id: string }>();
  return result.results.map((row) => row.id);
}

export async function createShare(
  studentId: string,
  email: string,
  userId?: string | null,
): Promise<ShareRecord> {
  const normalized = normalizeEmail(email);
  const existing = await db()
    .prepare('SELECT id, student_id, email, user_id, created_at FROM student_shares WHERE student_id = ? AND email = ?')
    .bind(studentId, normalized)
    .first<ShareRecord>();
  if (existing) {
    if (userId && existing.user_id !== userId) {
      await db().prepare('UPDATE student_shares SET user_id = ? WHERE id = ?').bind(userId, existing.id).run();
      return { ...existing, user_id: userId };
    }
    return existing;
  }
  const linked = userId ?? (await getUserByEmail(normalized))?.id ?? null;
  const id = crypto.randomUUID();
  await db()
    .prepare('INSERT INTO student_shares (id, student_id, email, user_id) VALUES (?, ?, ?, ?)')
    .bind(id, studentId, normalized, linked)
    .run();
  const row = await db()
    .prepare('SELECT id, student_id, email, user_id, created_at FROM student_shares WHERE id = ?')
    .bind(id)
    .first<ShareRecord>();
  if (!row) throw new Error('Share insert failed');
  return row;
}

export async function deleteShare(studentId: string, shareId: string): Promise<boolean> {
  const result = await db()
    .prepare('DELETE FROM student_shares WHERE id = ? AND student_id = ?')
    .bind(shareId, studentId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function linkSharesToUser(email: string, userId: string): Promise<void> {
  await db()
    .prepare('UPDATE student_shares SET user_id = ? WHERE email = ?')
    .bind(userId, normalizeEmail(email))
    .run();
}
