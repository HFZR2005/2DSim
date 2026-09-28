import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  fetchCalendar,
  fetchMe,
  fetchSessions,
  fetchStudents,
  fetchTests,
  fetchTopics,
  logout,
  type CalendarFeed,
  type SessionRecord,
  type StudentSummary,
  type SubjectStat,
  type TestRecord,
  type ViewerInfo,
} from './api';
import { ActionButton, useActionStatus } from './ActionButton';
import { dayKey, streakFromDates } from './format';
import type { EvidenceKind } from './notes/EvidenceCard';
import { History } from './views/History';
import { Home } from './views/Home';
import { Log } from './views/Log';
import { Onboarding } from './views/Onboarding';
import { People } from './views/People';
import { Topics } from './views/Topics';

export type View = 'home' | 'log' | 'topics' | 'history' | 'people';

function viewFromPath(pathname: string): View {
  if (pathname === '/log' || pathname.startsWith('/log/')) return 'log';
  if (
    pathname === '/topics' ||
    pathname.startsWith('/topics/') ||
    pathname === '/subjects' ||
    pathname.startsWith('/subjects/')
  ) {
    return 'topics';
  }
  if (pathname === '/history' || pathname.startsWith('/history/')) return 'history';
  if (pathname === '/people' || pathname.startsWith('/people/')) return 'people';
  return 'home';
}

function pathFor(view: View): string {
  if (view === 'home') return '/';
  if (view === 'topics') return '/subjects';
  return `/${view}`;
}

function readParam(name: string): string | null {
  const value = new URL(window.location.href).searchParams.get(name);
  return value && value.length > 0 ? value : null;
}

function canWriteStudent(viewer: ViewerInfo | null, studentId: string | null): boolean {
  if (!viewer || !studentId) return false;
  if (viewer.role === 'staff') return true;
  if (viewer.role === 'student') return viewer.studentId === studentId;
  if (viewer.role === 'supervisor') return viewer.writableIds.includes(studentId);
  return false;
}

function canSwitchStudents(viewer: ViewerInfo | null): boolean {
  return viewer?.role === 'staff' || viewer?.role === 'supervisor' || viewer?.role === 'viewer';
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
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarFeed | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');
  const signOutAction = useActionStatus();

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
    setDisplayName(me.displayName);
    const studentList = await fetchStudents();
    setStudents(studentList.students);
    let nextStudent = studentId;
    if (me.viewer.role === 'student') {
      nextStudent = me.viewer.studentId;
    } else if (me.viewer.role === 'pending') {
      nextStudent = null;
    } else if (!nextStudent && studentList.students[0]) {
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
    } else {
      setTopics([]);
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
  const writable = canWriteStudent(viewer, studentId);
  const pending = viewer?.role === 'pending';

  function onNoteSaved(kind: EvidenceKind, item: SessionRecord | TestRecord) {
    if (kind === 'practice') {
      const session = item as SessionRecord;
      setSessions((rows) => rows.map((row) => (row.id === session.id ? session : row)));
    } else {
      const test = item as TestRecord;
      setTests((rows) => rows.map((row) => (row.id === test.id ? test : row)));
    }
  }

  function onEvidenceDeleted(kind: EvidenceKind, id: string) {
    if (kind === 'practice') {
      setSessions((rows) => rows.filter((row) => row.id !== id));
    } else {
      setTests((rows) => rows.filter((row) => row.id !== id));
    }
    void refreshDerived();
  }

  function onSubjectDeleted(name: string) {
    setSessions((rows) => rows.filter((row) => row.subject !== name));
    setTests((rows) => rows.filter((row) => row.subject !== name));
    if (subject === name) syncUrl({ subject: null });
    void refreshDerived();
  }

  async function refreshDerived() {
    if (!studentId) return;
    try {
      const [topicData, studentList] = await Promise.all([fetchTopics(studentId), fetchStudents()]);
      setTopics(topicData.subjects);
      setStudents(studentList.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh');
    }
  }

  return (
    <div class="study-shell">
      <aside class="study-nav">
        <p class="brand">Study Tracker</p>
        {!pending && canSwitchStudents(viewer) && (
          <label class="student-switch">
            Student
            <select
              value={studentId ?? ''}
              onChange={(event) => syncUrl({ studentId: event.currentTarget.value || null })}
            >
              {viewer?.role === 'staff' && <option value="">All students</option>}
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.display_name}
                </option>
              ))}
            </select>
          </label>
        )}
        {studentId && !pending && <p class="streak">{streak} day streak</p>}
        {!pending && (
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
            {writable && (
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
            )}
            <a
              href="/subjects"
              class={view === 'topics' ? 'is-active' : undefined}
              onClick={(event) => {
                event.preventDefault();
                syncUrl({ view: 'topics' });
              }}
            >
              Subjects
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
            <a
              href="/people"
              class={view === 'people' ? 'is-active' : undefined}
              onClick={(event) => {
                event.preventDefault();
                syncUrl({ view: 'people' });
              }}
            >
              People
            </a>
            <a href="/lab">Mechanics lab</a>
          </nav>
        )}
        <ActionButton
          type="button"
          class="text-btn"
          status={signOutAction.status}
          idle="Sign out"
          loading="Signing out"
          ok="Signed out"
          error="Couldn't sign out"
          onClick={() => {
            void signOutAction.run(async () => {
              await logout();
              window.location.assign('/login');
            });
          }}
        />
      </aside>

      <div class="study-content">
        {pending ? (
          <Onboarding name={displayName} onChosen={() => reload()} />
        ) : (
          <>
            {view !== 'log' && view !== 'people' && (
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
                canManage={canSwitchStudents(viewer)}
                pending={false}
                canWrite={writable}
                onLog={() => syncUrl({ view: 'log' })}
                onSelectStudent={(id) => syncUrl({ studentId: id, view: 'home' })}
                onNoteSaved={onNoteSaved}
                onDeleted={onEvidenceDeleted}
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
                    .catch(() => {
                      setCalendar(null);
                      setError('Could not load timetable.');
                    });
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
                canWrite={writable}
                onSubjectDeleted={onSubjectDeleted}
              />
            )}
            {view === 'history' && (
              <History
                sessions={visibleSessions}
                tests={visibleTests}
                onNoteSaved={onNoteSaved}
                onDeleted={writable ? onEvidenceDeleted : undefined}
              />
            )}
            {view === 'people' && viewer && (
              <People viewer={viewer} displayName={displayName} onChanged={() => reload()} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
