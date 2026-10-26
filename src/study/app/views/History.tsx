import { useState } from 'preact/hooks';
import type { SessionRecord, TestRecord } from '../api';
import {
  dayKey,
  dayOccupied,
  daySignals,
  formatDayTitle,
  formatLoggedAtLong,
  heatmapMonthLabels,
  heatmapWeeks,
} from '../format';
import { EvidenceCard, type EvidenceKind } from '../notes/EvidenceCard';
import { signalColor } from '../../signal';

type Props = {
  sessions: SessionRecord[];
  tests: TestRecord[];
  onNoteSaved: (kind: EvidenceKind, item: SessionRecord | TestRecord) => void;
  onDeleted?: (kind: EvidenceKind, id: string) => void;
};

type Entry =
  | { kind: 'practice'; at: string; item: SessionRecord }
  | { kind: 'test'; at: string; item: TestRecord };

const WEEK_COUNT = 53;
const DOW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function History({ sessions, tests, onNoteSaved, onDeleted }: Props) {
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const entries: Entry[] = [
    ...sessions.map((item) => ({ kind: 'practice' as const, at: item.created_at, item })),
    ...tests.map((item) => ({ kind: 'test' as const, at: item.created_at, item })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const weeks = heatmapWeeks(WEEK_COUNT);
  const months = heatmapMonthLabels(weeks);
  const byDay = daySignals(entries.map((entry) => entry.item));
  const occupied = dayOccupied(entries.map((entry) => entry.item));
  const shown = focusDay
    ? entries.filter((entry) => dayKey(entry.item.created_at) === focusDay)
    : entries;

  function cellColor(day: string): string {
    const signal = byDay.get(day);
    if (signal === undefined) {
      return occupied.has(day) ? '#C5C9D4' : '#E1E4EA';
    }
    return signalColor(signal);
  }

  return (
    <section class="page">
      <h1>History</h1>
      <div class="heatmap" aria-label="Past year of logs">
        <div class="heatmap-months" aria-hidden="true">
          {months.map((label, index) => (
            <span key={weeks[index][0]}>{label}</span>
          ))}
        </div>
        <div class="heatmap-dows" aria-hidden="true">
          {DOW_LABELS.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
        <div class="heatmap-weeks">
          {weeks.map((week) => (
            <div key={week[0]} class="heatmap-week">
              {week.map((day) => (
                <button
                  type="button"
                  key={day}
                  class={focusDay === day ? 'heatmap-cell is-active' : 'heatmap-cell'}
                  title={formatDayTitle(day)}
                  aria-pressed={focusDay === day}
                  style={{ background: cellColor(day) }}
                  onClick={() => setFocusDay((current) => (current === day ? null : day))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {focusDay && (
        <div class="page-head">
          <h2>{formatDayTitle(focusDay)}</h2>
          <button type="button" class="text-btn" onClick={() => setFocusDay(null)}>
            Show all
          </button>
        </div>
      )}
      {shown.length === 0 ? (
        <p class="empty">{focusDay ? 'Nothing logged on that day.' : 'No logs match this filter.'}</p>
      ) : (
        <ol class="history-list">
          {shown.map((entry) => (
            <li key={`${entry.kind}-${entry.item.id}`}>
              <EvidenceCard
                kind={entry.kind}
                item={entry.item}
                dateText={formatLoggedAtLong(entry.item.created_at)}
                onNoteSaved={onNoteSaved}
                onDeleted={onDeleted}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
