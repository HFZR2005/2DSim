import type { CalendarFeed, SessionRecord, StudentSummary, TestRecord } from '../api';
import { dayOccupied, daySignals, formatLoggedAt, formatPercent, lastDays } from '../format';
import { EvidenceCard, type EvidenceKind } from '../notes/EvidenceCard';
import { signalColor } from '../../signal';
import { Schedule } from './Schedule';

type Props = {
  studentId: string | null;
  students: StudentSummary[];
  sessions: SessionRecord[];
  tests: TestRecord[];
  calendar: CalendarFeed | null;
  calendarLoading: boolean;
  canManage: boolean;
  pending: boolean;
  canWrite?: boolean;
  onLog: () => void;
  onSelectStudent: (id: string) => void;
  onNoteSaved: (kind: EvidenceKind, item: SessionRecord | TestRecord) => void;
  onDeleted: (kind: EvidenceKind, id: string) => void;
  onCalendarChanged: () => void;
};

type Recent =
  | { kind: 'practice'; at: string; item: SessionRecord }
  | { kind: 'test'; at: string; item: TestRecord };

export function Home({
  studentId,
  students,
  sessions,
  tests,
  calendar,
  calendarLoading,
  canManage,
  pending,
  canWrite = true,
  onLog,
  onSelectStudent,
  onNoteSaved,
  onDeleted,
  onCalendarChanged,
}: Props) {
  if (!studentId) {
    return (
      <section class="page">
        <h1>Students</h1>
        {pending ? (
          <p class="empty">Choose Student or Supervisor to get started.</p>
        ) : students.length === 0 ? (
          <p class="empty">
            {canManage
              ? 'Open People to create a roster and share a join code.'
              : 'Open People to join a class, or wait for a supervisor to add you.'}
          </p>
        ) : (
          <ul class="student-grid">
            {students.map((student) => (
              <li>
                <button type="button" class="student-card" onClick={() => onSelectStudent(student.id)}>
                  <span class="student-card-name">{student.display_name}</span>
                  <span class="student-card-meta">
                    {student.sessionCount} topic
                    {' · '}
                    {student.testCount} paper{student.testCount === 1 ? '' : 's'}
                  </span>
                  {student.averageSignal !== null ? (
                    <span class="signal-badge" style={{ background: signalColor(student.averageSignal) }}>
                      {formatPercent(student.averageSignal)}
                    </span>
                  ) : student.lastStudied ? null : (
                    <span class="muted">Nothing logged yet</span>
                  )}
                  {student.lastStudied && (
                    <span class="student-card-meta">Last {formatLoggedAt(student.lastStudied)}</span>
                  )}
                  {student.hasCalendar && <span class="student-card-meta">Timetable</span>}
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
  const occupied = dayOccupied(recent.map((entry) => entry.item));

  return (
    <section class="page">
      <div class="page-head">
        <h1>{student?.display_name ?? 'Home'}</h1>
        {canWrite && (
          <button type="button" class="primary" onClick={onLog}>
            Log
          </button>
        )}
      </div>
      <div class="week-strip" role="list" aria-label="Last seven days">
        {days.map((day) => {
          const signal = byDay.get(day);
          return (
            <div key={day} class="week-cell" role="listitem" title={day}>
              <span
                class="week-swatch"
                style={{
                  background:
                    signal === undefined
                      ? occupied.has(day)
                        ? '#C5C9D4'
                        : 'var(--study-line)'
                      : signalColor(signal),
                }}
              />
              <span>{day.slice(8)}</span>
            </div>
          );
        })}
      </div>
      <Schedule
        studentId={studentId}
        calendar={calendar}
        loading={calendarLoading}
        onChanged={onCalendarChanged}
      />
      <h2>Recent</h2>
      {recent.length === 0 ? (
        <p class="empty">No logs yet for this filter.</p>
      ) : (
        <div class="session-grid">
          {recent.slice(0, 8).map((entry) => (
            <EvidenceCard
              key={`${entry.kind}-${entry.item.id}`}
              kind={entry.kind}
              item={entry.item}
              dateText={formatLoggedAt(entry.item.created_at)}
              onNoteSaved={onNoteSaved}
              onDeleted={canWrite ? onDeleted : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
