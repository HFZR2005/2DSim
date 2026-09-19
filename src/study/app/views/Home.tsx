import type { SessionRecord, StudentSummary, TestRecord } from '../api';
import { daySignals, formatDay, formatPercent, lastDays } from '../format';
import { signalColor } from '../../signal';

type Props = {
  studentId: string | null;
  students: StudentSummary[];
  sessions: SessionRecord[];
  tests: TestRecord[];
  canManage: boolean;
  pending: boolean;
  onLog: () => void;
  onSelectStudent: (id: string) => void;
};

type Recent =
  | { kind: 'practice'; at: string; item: SessionRecord }
  | { kind: 'test'; at: string; item: TestRecord };

function RecentRow({ entry }: { entry: Recent }) {
  const item = entry.item;
  const title =
    entry.kind === 'practice'
      ? `Practice · ${item.subject} · ${item.topic}`
      : `Test · ${item.subject} · ${item.track} · ${item.title}`;
  return (
    <article class="session-row">
      <span class="signal-dot" style={{ background: signalColor(item.signal) }} aria-hidden="true" />
      <div>
        <p class="session-title">{title}</p>
        <p class="session-meta">
          {formatDay(item.created_at)}
          {' · '}
          {item.score ?? item.confidence}
        </p>
      </div>
    </article>
  );
}

export function Home({ studentId, students, sessions, tests, canManage, pending, onLog, onSelectStudent }: Props) {
  if (!studentId) {
    return (
      <section class="page">
        <h1>Students</h1>
        {pending ? (
          <p class="empty">You are signed in. Ask staff to attach this Google email to a student.</p>
        ) : students.length === 0 ? (
          <p class="empty">
            {canManage
              ? 'Add a student in the sidebar to start logging practice and tests.'
              : 'No students are attached to this account yet.'}
          </p>
        ) : (
          <ul class="student-grid">
            {students.map((student) => (
              <li>
                <button type="button" class="student-card" onClick={() => onSelectStudent(student.id)}>
                  <span class="student-card-name">{student.display_name}</span>
                  <span class="student-card-meta">
                    {student.sessionCount} practice
                    {' · '}
                    {student.testCount} test{student.testCount === 1 ? '' : 's'}
                  </span>
                  {student.averageSignal !== null ? (
                    <span class="signal-badge" style={{ background: signalColor(student.averageSignal) }}>
                      {formatPercent(student.averageSignal)}
                    </span>
                  ) : (
                    <span class="muted">Nothing logged yet</span>
                  )}
                  {student.lastStudied && (
                    <span class="student-card-meta">Last {formatDay(student.lastStudied)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const student = students.find((item) => item.id === studentId);
  const days = lastDays(7);
  const recent: Recent[] = [
    ...sessions.map((item) => ({ kind: 'practice' as const, at: item.created_at, item })),
    ...tests.map((item) => ({ kind: 'test' as const, at: item.created_at, item })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const byDay = daySignals(recent.map((entry) => entry.item));

  return (
    <section class="page">
      <div class="page-head">
        <h1>{student?.display_name ?? 'Home'}</h1>
        <button type="button" class="primary" onClick={onLog}>
          Log
        </button>
      </div>
      <div class="week-strip" role="list" aria-label="Last seven days">
        {days.map((day) => {
          const signal = byDay.get(day);
          return (
            <div key={day} class="week-cell" role="listitem" title={day}>
              <span
                class="week-swatch"
                style={{ background: signal === undefined ? '#D5D8E0' : signalColor(signal) }}
              />
              <span>{day.slice(8)}</span>
            </div>
          );
        })}
      </div>
      <h2>Recent</h2>
      {recent.length === 0 ? (
        <p class="empty">No practice or tests yet for this filter.</p>
      ) : (
        <div class="session-grid">
          {recent.slice(0, 8).map((entry) => (
            <RecentRow key={`${entry.kind}-${entry.item.id}`} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
