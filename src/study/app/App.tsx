import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  fetchApplications,
  fetchCalendar,
  fetchMe,
  fetchRosters,
  fetchSessions,
  fetchStudents,
  fetchTests,
  fetchTopics,
  logout,
  type ApplicationRecord,
  type CalendarFeed,
  type OwnedRoster,
  type SessionRecord,
  type StudentSummary,
  type SubjectStat,
  type TestRecord,
  type ViewerInfo,
} from './api';
import { ActionButton, useActionStatus } from './ActionButton';
import { Avatar } from './Avatar';
import { dayKey, streakFromDates } from './format';
import type { EvidenceKind } from './notes/EvidenceCard';
import { Applications } from './views/Applications';
import { History } from './views/History';
import { Home } from './views/Home';
import { Log } from './views/Log';
import { Onboarding } from './views/Onboarding';
import { People } from './views/People';
import { Topics } from './views/Topics';

export type View = 'home' | 'log' | 'topics' | 'history' | 'people' | 'applications';

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
  if (pathname === '/applications' || pathname.startsWith('/applications/')) return 'applications';
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
  const [rosters, setRosters] = useState<OwnedRoster[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [topics, setTopics] = useState<SubjectStat[]>([]);
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [picture, setPicture] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarFeed | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  );
  const signOutAction = useActionStatus();
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  function syncUrl(next: { view?: View; studentId?: string | null; subject?: string | null }) {
    const nextView = next.view ?? view;
    const nextStudent = next.studentId === undefined ? studentId : next.studentId;
    const nextSubject = next.subject === undefined ? subject : next.subject;
    const url = new URL(pathFor(nextView), window.location.origin);
    if (nextStudent) url.searchParams.set('student', nextStudent);
    if (nextSubject && nextView !== 'log' && nextView !== 'people' && nextView !== 'applications') {
      url.searchParams.set('subject', nextSubject);
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setView(nextView);
    setStudentId(nextStudent);
    setSubject(nextView === 'log' || nextView === 'people' || nextView === 'applications' ? nextSubject : nextSubject);
    setMenuOpen(false);
    setPickerOpen(false);
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

  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setPickerOpen(false);
      }
    }
    function onPointer(event: MouseEvent) {
      const node = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(node)) setMenuOpen(false);
      if (pickerRef.current && !pickerRef.current.contains(node)) setPickerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, []);

  async function reload() {
    const me = await fetchMe();
    setViewer(me.viewer);
    setDisplayName(me.displayName);
    setPicture(me.picture);
    const studentList = await fetchStudents();
    setStudents(studentList.students);
    if (me.viewer.role === 'staff' || me.viewer.role === 'supervisor') {
      try {
        setRosters((await fetchRosters()).owned);
      } catch {
        setRosters([]);
      }
    } else {
      setRosters([]);
    }
    let nextStudent = studentId;
    if (me.viewer.role === 'student') {
      nextStudent = me.viewer.studentId;
    } else if (me.viewer.role === 'pending') {
      nextStudent = null;
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
      try {
        setApplications((await fetchApplications(nextStudent, true)).applications);
      } catch {
        setApplications([]);
      }
    } else {
      setTopics([]);
      setCalendar(null);
      setApplications([]);
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
  const switcher = canSwitchStudents(viewer);
  const showLogTab = writable;
  const showPills =
    !pending && view !== 'log' && view !== 'people' && view !== 'applications' && Boolean(studentId);

  function go(next: View) {
    if (next === 'log' && !writable) return;
    syncUrl({ view: next });
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

  const tabs = (
    <>
      <a
        href="/"
        class={view === 'home' ? 'is-active' : undefined}
        onClick={(event) => {
          event.preventDefault();
          go('home');
        }}
      >
        Home
      </a>
      {showLogTab && (
        <a
          href="/log"
          class={view === 'log' ? 'is-active' : undefined}
          onClick={(event) => {
            event.preventDefault();
            go('log');
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
          go('history');
        }}
      >
        History
      </a>
      <a
        href="/applications"
        class={view === 'applications' ? 'is-active' : undefined}
        onClick={(event) => {
          event.preventDefault();
          go('applications');
        }}
      >
        Applications
      </a>
    </>
  );

  return (
    <div class="study-shell">
      <header class="study-top">
        <button
          type="button"
          class="brand-btn"
          onClick={() => {
            if (pending) return;
            syncUrl({ view: 'home', studentId: switcher ? null : studentId });
          }}
        >
          Study Tracker
        </button>
        {!pending && !compact && (
          <nav class="study-tabs" aria-label="Study">
            {tabs}
          </nav>
        )}
        <div class="study-top-end">
          {!pending && (switcher || selectedStudent) && (
            <div class="student-picker" ref={pickerRef}>
              {switcher ? (
                <button
                  type="button"
                  class="context-chip"
                  aria-expanded={pickerOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setPickerOpen((open) => !open);
                    setMenuOpen(false);
                  }}
                >
                  {selectedStudent?.display_name ?? 'Classes'}
                  {studentId && streak > 0 ? ` · ${streak}d` : ''}
                </button>
              ) : (
                <span class="context-chip is-static">
                  {selectedStudent?.display_name}
                  {streak > 0 ? ` · ${streak}d` : ''}
                </span>
              )}
              {pickerOpen && switcher && (
                <div class="study-menu" role="listbox" aria-label="Choose a student">
                  <button
                    type="button"
                    class={!studentId ? 'is-active' : undefined}
                    role="option"
                    aria-selected={!studentId}
                    onClick={() => syncUrl({ view: 'home', studentId: null })}
                  >
                    All classes
                  </button>
                  {students.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      class={student.id === studentId ? 'is-active' : undefined}
                      role="option"
                      aria-selected={student.id === studentId}
                      onClick={() => syncUrl({ studentId: student.id, view: 'home' })}
                    >
                      <Avatar name={student.display_name} src={student.picture} size="sm" />
                      {student.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div class="avatar-wrap" ref={menuRef}>
            <button
              type="button"
              class="study-avatar"
              aria-label="Account menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setMenuOpen((open) => !open);
                setPickerOpen(false);
              }}
            >
              <Avatar name={displayName} src={picture} />
            </button>
            {menuOpen && (
              <div class="study-menu study-menu-end" role="menu">
                {displayName && <p class="study-menu-label">{displayName}</p>}
                {!pending && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => syncUrl({ view: 'people' })}
                  >
                    People
                  </button>
                )}
                <ActionButton
                  type="button"
                  class="text-btn"
                  role="menuitem"
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
              </div>
            )}
          </div>
        </div>
      </header>

      <div class="study-content">
        {pending ? (
          <Onboarding name={displayName} onChosen={() => reload()} />
        ) : (
          <>
            {showPills && (
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
                rosters={rosters}
                sessions={visibleSessions}
                tests={visibleTests}
                canManage={viewer?.role === 'staff' || viewer?.role === 'supervisor'}
                pending={false}
                canWrite={writable}
                onLog={() => syncUrl({ view: 'log' })}
                onOpenPeople={() => syncUrl({ view: 'people' })}
                onOpenHistory={() => syncUrl({ view: 'history' })}
                onOpenApplications={() => syncUrl({ view: 'applications' })}
                applications={applications}
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
            {view === 'history' &&
              (studentId ? (
                <History
                  sessions={visibleSessions}
                  tests={visibleTests}
                  onNoteSaved={onNoteSaved}
                  onDeleted={writable ? onEvidenceDeleted : undefined}
                />
              ) : (
                <section class="page">
                  <h1>History</h1>
                  <p class="empty">Open a student from Home to see their history.</p>
                </section>
              ))}
            {view === 'people' && viewer && (
              <People viewer={viewer} displayName={displayName} onChanged={() => reload()} />
            )}
            {view === 'applications' && (
              <Applications
                studentId={studentId}
                studentName={selectedStudent?.display_name}
                applications={applications}
                canWrite={writable}
                onChanged={setApplications}
              />
            )}
          </>
        )}
      </div>

      {!pending && compact && (
        <nav class="study-tabbar" aria-label="Study">
          {tabs}
        </nav>
      )}
    </div>
  );
}
