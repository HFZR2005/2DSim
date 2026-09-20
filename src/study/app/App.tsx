import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  createStudent,
  fetchAccess,
  fetchCalendar,
  fetchMe,
  fetchSessions,
  fetchStudents,
  fetchTests,
  fetchTopics,
  grantAccess,
  logout,
  type AccessRecord,
  type CalendarFeed,
  type SessionRecord,
  type StudentSummary,
  type SubjectStat,
  type TestRecord,
  type ViewerInfo,
} from './api';
import { dayKey, streakFromDates } from './format';
import type { EvidenceKind } from './notes/EvidenceCard';
import { History } from './views/History';
import { Home } from './views/Home';
import { Log } from './views/Log';
import { Topics } from './views/Topics';

export type View = 'home' | 'log' | 'topics' | 'history';

function viewFromPath(pathname: string): View {
  if (pathname === '/log' || pathname.startsWith('/log/')) return 'log';
  if (pathname === '/topics' || pathname.startsWith('/topics/')) return 'topics';
  if (pathname === '/history' || pathname.startsWith('/history/')) return 'history';
  return 'home';
}

function pathFor(view: View): string {
  if (view === 'home') return '/';
  return `/${view}`;
}

function readParam(name: string): string | null {
  const value = new URL(window.location.href).searchParams.get(name);
  return value && value.length > 0 ? value : null;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [topics, setTopics] = useState<SubjectStat[]>([]);
  const [newStudent, setNewStudent] = useState('');
  const [allowEmail, setAllowEmail] = useState('');
  const [allowKind, setAllowKind] = useState<'adult' | 'self'>('adult');
  const [accessRows, setAccessRows] = useState<AccessRecord[]>([]);
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [calendar, setCalendar] = useState<CalendarFeed | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');

  function syncUrl(next: { view?: View; studentId?: string | null; subject?: string | null }) {
    const nextView = next.view ?? view;
    const nextStudent = next.studentId === undefined ? studentId : next.studentId;
    const nextSubject = next.subject === undefined ? subject : next.subject;
    const url = new URL(pathFor(nextView), window.location.origin);
    if (nextStudent) url.searchParams.set('student', nextStudent);
    if (nextSubject && nextView !== 'log') url.searchParams.set('subject', nextSubject);
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setView(nextView);
    setStudentId(nextStudent);
    setSubject(nextView === 'log' ? nextSubject : nextSubject);
  }

  useEffect(() => {
    setView(viewFromPath(window.location.pathname));
    setStudentId(readParam('student'));
    setSubject(readParam('subject'));
    setReady(true);

    const onPop = () => {
      setView(viewFromPath(window.location.pathname));
      setStudentId(readParam('student'));
      setSubject(readParam('subject'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  async function reload() {
    const me = await fetchMe();
    setViewer(me.viewer);
    const studentList = await fetchStudents();
    setStudents(studentList.students);
    let nextStudent = studentId;
    if (me.viewer.role === 'student') {
      nextStudent = me.viewer.studentId;
    } else if (me.viewer.role !== 'staff' && !nextStudent && studentList.students[0]) {
      nextStudent = studentList.students[0].id;
    }
    if (nextStudent !== studentId) {
      syncUrl({ studentId: nextStudent });
    }
    const sessionData = await fetchSessions(nextStudent ?? undefined);
    setSessions(sessionData.sessions);
    const testData = await fetchTests(nextStudent ?? undefined);
    setTests(testData.tests);
    if (nextStudent) {
      const topicData = await fetchTopics(nextStudent);
      setTopics(topicData.subjects);
      setCalendarLoading(true);
      try {
        setCalendar(await fetchCalendar(nextStudent));
      } catch {
        setCalendar(null);
      } finally {
        setCalendarLoading(false);
      }
      if (me.viewer.role === 'staff') {
        const accessData = await fetchAccess(nextStudent);
        setAccessRows(accessData.access);
      } else {
        setAccessRows([]);
      }
    } else {
      setTopics([]);
      setAccessRows([]);
      setCalendar(null);
    }
  }

  useEffect(() => {
    if (!ready) return;
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Could not load'));
  }, [studentId, ready]);

  const subjects = useMemo(
    () =>
      [...new Set([...sessions.map((session) => session.subject), ...tests.map((test) => test.subject)])].sort(),
    [sessions, tests],
  );
  const visibleSessions = useMemo(
    () => (subject ? sessions.filter((session) => session.subject === subject) : sessions),
    [sessions, subject],
  );
  const visibleTests = useMemo(
    () => (subject ? tests.filter((test) => test.subject === subject) : tests),
    [tests, subject],
  );
  const visibleTopics = useMemo(
    () => (subject ? topics.filter((item) => item.subject === subject) : topics),
    [topics, subject],
  );
  const selectedStudent = students.find((student) => student.id === studentId);
  const streak = studentId
    ? streakFromDates(
        [
          ...sessions.filter((session) => session.student_id === studentId),
          ...tests.filter((test) => test.student_id === studentId),
        ].map((item) => dayKey(item.created_at)),
      )
    : 0;

  async function onAddStudent(event: Event) {
    event.preventDefault();
    if (!newStudent.trim()) return;
    const created = await createStudent(newStudent.trim());
    setNewStudent('');
    const list = await fetchStudents();
    setStudents(list.students);
    syncUrl({ studentId: created.student.id, view: 'home' });
  }

  async function onAllowEmail(event: Event) {
    event.preventDefault();
    if (!studentId || !allowEmail.trim()) return;
    try {
      await grantAccess({ email: allowEmail.trim(), kind: allowKind, studentId });
      setAllowEmail('');
      const accessData = await fetchAccess(studentId);
      setAccessRows(accessData.access);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not allow email');
    }
  }

  function onNoteSaved(kind: EvidenceKind, item: SessionRecord | TestRecord) {
    if (kind === 'practice') {
      const session = item as SessionRecord;
      setSessions((rows) => rows.map((row) => (row.id === session.id ? session : row)));
    } else {
      const test = item as TestRecord;
      setTests((rows) => rows.map((row) => (row.id === test.id ? test : row)));
    }
  }

  const canManage = viewer?.role === 'staff';
  const showAllStudents = canManage;

  return (
    <div class="study-shell">
      <aside class="study-nav">
        <p class="brand">Study Tracker</p>
        {viewer?.role !== 'pending' && (
        <label class="student-switch">
          Student
          <select
            value={studentId ?? ''}
            disabled={viewer?.role === 'student'}
            onChange={(event) => syncUrl({ studentId: event.currentTarget.value || null })}
          >
            {showAllStudents && <option value="">All students</option>}
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.display_name}
              </option>
            ))}
          </select>
        </label>
        )}
        {studentId && <p class="streak">{streak} day streak</p>}
        <nav aria-label="Study">
          <a
            href="/"
            class={view === 'home' ? 'is-active' : undefined}
            onClick={(event) => {
              event.preventDefault();
              syncUrl({ view: 'home' });
            }}
          >
            Home
          </a>
          <a
            href="/log"
            class={view === 'log' ? 'is-active' : undefined}
            onClick={(event) => {
              event.preventDefault();
              syncUrl({ view: 'log' });
            }}
          >
            Log
          </a>
          <a
            href="/topics"
            class={view === 'topics' ? 'is-active' : undefined}
            onClick={(event) => {
              event.preventDefault();
              syncUrl({ view: 'topics' });
            }}
          >
            Progress
          </a>
          <a
            href="/history"
            class={view === 'history' ? 'is-active' : undefined}
            onClick={(event) => {
              event.preventDefault();
              syncUrl({ view: 'history' });
            }}
          >
            History
          </a>
          <a href="/lab">Mechanics lab</a>
        </nav>
        {canManage && (
          <div class="staff-tools">
            <form class="add-student" onSubmit={onAddStudent}>
              <label>
                Add student
                <input value={newStudent} onInput={(event) => setNewStudent(event.currentTarget.value)} />
              </label>
              <button type="submit">Add</button>
            </form>
            {studentId && (
              <form class="add-student" onSubmit={onAllowEmail}>
                <label>
                  Allow email
                  <input
                    type="email"
                    value={allowEmail}
                    placeholder="name@gmail.com"
                    onInput={(event) => setAllowEmail(event.currentTarget.value)}
                  />
                </label>
                <div class="chips">
                  <button
                    type="button"
                    class={allowKind === 'adult' ? 'chip is-active' : 'chip'}
                    onClick={() => setAllowKind('adult')}
                  >
                    Adult
                  </button>
                  <button
                    type="button"
                    class={allowKind === 'self' ? 'chip is-active' : 'chip'}
                    onClick={() => setAllowKind('self')}
                  >
                    Student
                  </button>
                </div>
                <button type="submit">Allow</button>
                {accessRows.length > 0 && (
                  <p class="nav-note">
                    {accessRows.map((row) => `${row.email} (${row.kind})`).join(' · ')}
                  </p>
                )}
              </form>
            )}
          </div>
        )}
        <button
          type="button"
          class="text-btn"
          onClick={async () => {
            await logout();
            window.location.assign('/login');
          }}
        >
          Sign out
        </button>
      </aside>

      <div class="study-content">
        {view !== 'log' && (
          <div class="subject-pills" role="group" aria-label="Subject filter">
            <button
              type="button"
              class={!subject ? 'chip is-active' : 'chip'}
              onClick={() => syncUrl({ subject: null })}
            >
              All
            </button>
            {subjects.map((name) => (
              <button
                key={name}
                type="button"
                class={subject === name ? 'chip is-active' : 'chip'}
                onClick={() => syncUrl({ subject: name })}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {error && <p class="study-error">{error}</p>}
        {view === 'home' && (
          <Home
            studentId={studentId}
            students={students}
            sessions={visibleSessions}
            tests={visibleTests}
            canManage={canManage}
            pending={viewer?.role === 'pending'}
            onLog={() => syncUrl({ view: 'log' })}
            onSelectStudent={(id) => syncUrl({ studentId: id, view: 'home' })}
            onNoteSaved={onNoteSaved}
            calendar={calendar}
            calendarLoading={calendarLoading}
            onCalendarChanged={() => {
              if (!studentId) return;
              fetchCalendar(studentId)
                .then((feed) => {
                  setCalendar(feed);
                  setStudents((rows) =>
                    rows.map((row) =>
                      row.id === studentId ? { ...row, hasCalendar: feed.connected } : row,
                    ),
                  );
                })
                .catch(() => setCalendar(null));
            }}
          />
        )}
        {view === 'log' && (
          <Log
            studentId={studentId}
            studentName={selectedStudent?.display_name}
            sessions={sessions}
            tests={tests}
            onSaved={async () => {
              await reload();
              syncUrl({ view: 'home' });
            }}
          />
        )}
        {view === 'topics' && (
          <Topics
            studentId={studentId}
            subjects={visibleTopics}
            sessions={visibleSessions}
            tests={visibleTests}
          />
        )}
        {view === 'history' && (
          <History sessions={visibleSessions} tests={visibleTests} onNoteSaved={onNoteSaved} />
        )}
      </div>
    </div>
  );
}
