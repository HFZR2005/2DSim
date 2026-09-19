import type { SessionRecord, TestRecord } from '../api';
import { daySignals, formatDayLong, lastDays } from '../format';
import { EvidenceCard, type EvidenceKind } from '../notes/EvidenceCard';
import { signalColor } from '../../signal';

type Props = {
  sessions: SessionRecord[];
  tests: TestRecord[];
  onNoteSaved: (kind: EvidenceKind, item: SessionRecord | TestRecord) => void;
};

type Entry =
  | { kind: 'practice'; at: string; item: SessionRecord }
  | { kind: 'test'; at: string; item: TestRecord };

export function History({ sessions, tests, onNoteSaved }: Props) {
  const entries: Entry[] = [
    ...sessions.map((item) => ({ kind: 'practice' as const, at: item.created_at, item })),
    ...tests.map((item) => ({ kind: 'test' as const, at: item.created_at, item })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const days = lastDays(42);
  const byDay = daySignals(entries.map((entry) => entry.item));

  return (
    <section class="page">
      <h1>History</h1>
      <div class="consistency-grid" aria-label="Six-week consistency">
        {days.map((day) => {
          const signal = byDay.get(day);
          return (
            <span
              key={day}
              class="grid-cell"
              title={day}
              style={{ background: signal === undefined ? '#E1E4EA' : signalColor(signal) }}
            />
          );
        })}
      </div>
      {entries.length === 0 ? (
        <p class="empty">No practice or tests match this filter.</p>
      ) : (
        <ol class="history-list">
          {entries.map((entry) => (
            <li key={`${entry.kind}-${entry.item.id}`}>
              <EvidenceCard
                kind={entry.kind}
                item={entry.item}
                dateText={formatDayLong(entry.item.created_at)}
                onNoteSaved={onNoteSaved}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
