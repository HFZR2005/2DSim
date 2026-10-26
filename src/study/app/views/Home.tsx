import type {
  ApplicationRecord,
  CalendarFeed,
  OwnedRoster,
  SessionRecord,
  StudentSummary,
  TestRecord,
} from '../api';
import { Avatar } from '../Avatar';
import { dayOccupied, daySignals, formatLoggedAt, formatPercent, lastDays } from '../format';
import { EvidenceCard, type EvidenceKind } from '../notes/EvidenceCard';
import { signalColor } from '../../signal';
import { CLOSED_APPLICATION_STAGES, EVENT_LABEL, STAGE_LABEL, eventUrgency } from '../applicationLabels';
import { Schedule } from './Schedule';

type Props = {
  studentId: string | null;
  students: StudentSummary[];
  rosters?: OwnedRoster[];
  sessions: SessionRecord[];
  tests: TestRecord[];
  calendar: CalendarFeed | null;
  calendarLoading: boolean;
  canManage: boolean;
  pending: boolean;
  canWrite?: boolean;
  onLog: () => void;
  onOpenPeople?: () => void;
  onOpenHistory?: () => void;
  onOpenApplications?: () => void;
  applications?: ApplicationRecord[];
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
  rosters = [],
  sessions,
  tests,
  calendar,
  calendarLoading,
  canManage,
  pending,
  canWrite = true,
  onLog,
  onOpenPeople,
  onOpenHistory,
  onOpenApplications,
  applications = [],
  onSelectStudent,
  onNoteSaved,
  onDeleted,
  onCalendarChanged,
}: Props) {
  if (!studentId) {
    const groupedIds = new Set(rosters.flatMap((roster) => roster.members.map((member) => member.id)));
    const ungrouped = students.filter((student) => !groupedIds.has(student.id));
    return (
      <section class="page">
        <div class="page-head">
          <h1>{canManage ? 'Classes' : 'Students'}</h1>
          {onOpenPeople && (
            <button type="button" class="primary" onClick={onOpenPeople}>
              People
            </button>
          )}
        </div>
        {pending ? (
          <p class="empty">Choose Student or Supervisor to get started.</p>
        ) : students.length === 0 ? (
          <div class="empty-action">
            <p class="empty">
              {canManage
                ? 'Create a roster and share the join code so students can appear here.'
                : 'Join a class with a code, or wait until someone shares their progress with you.'}
            </p>
            {onOpenPeople && (
              <button type="button" class="primary" onClick={onOpenPeople}>
                Open People
              </button>
            )}
          </div>
        ) : (
          <>
            {rosters.map((roster) => {
              const members = roster.members
                .map((member) => students.find((student) => student.id === member.id))
                .filter((student): student is StudentSummary => Boolean(student));
              if (members.length === 0) return null;
              return (
                <section key={roster.id} class="class-block">
                  <h2>{roster.name}</h2>
                  <ul class="student-grid">
                    {members.map((student) => (
                      <li key={student.id}>
                        <StudentCard student={student} onSelect={onSelectStudent} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {(ungrouped.length > 0 || rosters.length === 0) && (
              <section class="class-block">
                {rosters.length > 0 && <h2>Other students</h2>}
                <ul class="student-grid">
                  {(rosters.length > 0 ? ungrouped : students).map((student) => (
                    <li key={student.id}>
                      <StudentCard student={student} onSelect={onSelectStudent} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
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
  const openApplications = applications.filter((row) => !CLOSED_APPLICATION_STAGES.has(row.stage));
  const upcoming = openApplications
    .filter((row) => row.next_event?.at)
    .sort((a, b) => (a.next_event?.at ?? '').localeCompare(b.next_event?.at ?? ''))
    .slice(0, 4);

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
      <div class="week-strip" aria-label="Last seven days">
        {days.map((day) => {
          const signal = byDay.get(day);
          return (
            <button
              key={day}
              type="button"
              class="week-cell"
              title={`${day}${occupied.has(day) ? ' · logged' : ''}`}
              aria-label={`History for ${day}`}
              onClick={onOpenHistory}
            >
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
            </button>
          );
        })}
      </div>
      <Schedule
        studentId={studentId}
        calendar={calendar}
        loading={calendarLoading}
        onChanged={onCalendarChanged}
      />
      {(openApplications.length > 0 || (onOpenApplications && canWrite)) && (
        <>
          <div class="page-head">
            <h2>Applications</h2>
            {onOpenApplications && (
              <button type="button" onClick={onOpenApplications}>
                {openApplications.length > 0 ? 'All' : 'Add'}
              </button>
            )}
          </div>
          {upcoming.length > 0 ? (
            <div class="app-db app-db-home">
              <table>
                <tbody>
                  {upcoming.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" class="app-company" onClick={onOpenApplications}>
                          {row.company}
                        </button>
                      </td>
                      <td class="app-role">{row.role}</td>
                      <td>
                        <span class={`app-stage is-${row.stage}`}>{STAGE_LABEL[row.stage]}</span>
                      </td>
                      <td>
                        <span class={`app-next is-${eventUrgency(row.next_event?.at)}`}>
                          {row.next_event
                            ? `${formatLoggedAt(row.next_event.at)} · ${EVENT_LABEL[row.next_event.type]}`
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : openApplications.length > 0 ? (
            <p class="muted">
              {openApplications.length} open {openApplications.length === 1 ? 'application' : 'applications'}.
            </p>
          ) : (
            <p class="empty">No applications yet.</p>
          )}
        </>
      )}
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

function StudentCard({
  student,
  onSelect,
}: {
  student: StudentSummary;
  onSelect: (id: string) => void;
}) {
  return (
    <button type="button" class="student-card" onClick={() => onSelect(student.id)}>
      <Avatar name={student.display_name} src={student.picture} />
      <span class="student-card-body">
        <span class="student-card-name">{student.display_name}</span>
        <span class="student-card-meta">
          {student.sessionCount} {student.sessionCount === 1 ? 'topic' : 'topics'}
          {' · '}
          {student.testCount} {student.testCount === 1 ? 'paper' : 'papers'}
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
      </span>
    </button>
  );
}
