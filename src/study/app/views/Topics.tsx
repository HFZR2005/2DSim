import type { SessionRecord, SubjectStat, TestRecord } from '../api';
import {
  daysSince,
  formatPercent,
  formatRecency,
  formatWeek,
  lastWeeks,
  recencyKind,
  weekVisited,
} from '../format';
import { signalColor } from '../../signal';

type Props = {
  studentId: string | null;
  subjects: SubjectStat[];
  sessions: SessionRecord[];
  tests: TestRecord[];
};

const TREND: Record<string, string> = {
  up: 'Up',
  down: 'Down',
  flat: 'Flat',
};

const WEEK_COUNT = 8;

function topicDates(sessions: SessionRecord[], subject: string, name: string): string[] {
  return sessions
    .filter((session) => session.subject === subject && session.topic === name)
    .map((session) => session.created_at);
}

function trackDates(tests: TestRecord[], subject: string, name: string): string[] {
  return tests
    .filter((test) => test.subject === subject && test.track === name)
    .map((test) => test.created_at);
}

function StatsTable({
  rows,
  nameHeader,
  countHeader,
}: {
  rows: SubjectStat['topics'];
  nameHeader: string;
  countHeader: string;
}) {
  if (rows.length === 0) {
    return <p class="empty">None yet.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>{nameHeader}</th>
          <th>{countHeader}</th>
          <th>Average</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>{row.name}</td>
            <td>{row.count}</td>
            <td>
              <span class="signal-inline">
                <span class="signal-dot" style={{ background: signalColor(row.averageSignal) }} />
                {formatPercent(row.averageSignal)}
              </span>
            </td>
            <td>{TREND[row.trend]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RecencyGrid({
  label,
  nameHeader,
  items,
  datesFor,
}: {
  label: string;
  nameHeader: string;
  items: SubjectStat['topics'];
  datesFor: (name: string) => string[];
}) {
  const weeks = lastWeeks(WEEK_COUNT);
  const rows = [...items]
    .map((item) => {
      const days = daysSince(item.lastStudied);
      return {
        name: item.name,
        days,
        kind: recencyKind(days),
        visited: weekVisited(datesFor(item.name), weeks),
      };
    })
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));

  if (rows.length === 0) return null;

  return (
    <div class="recency-grid" role="table" aria-label={label}>
      <div class="recency-row recency-head" role="row">
        <span role="columnheader">{nameHeader}</span>
        <span class="recency-weeks" role="columnheader">
          {weeks.map((week) => (
            <span key={week}>{formatWeek(week)}</span>
          ))}
        </span>
        <span class="recency-last" role="columnheader">
          Last
        </span>
      </div>
      {rows.map((row) => (
        <div class="recency-row" role="row" key={row.name}>
          <span role="cell">{row.name}</span>
          <span
            class="recency-weeks"
            role="cell"
            aria-label={
              row.visited.some(Boolean)
                ? `Visited ${weeks
                    .filter((_, index) => row.visited[index])
                    .map((week) => formatWeek(week))
                    .join(', ')}`
                : 'No visits in eight weeks'
            }
          >
            {weeks.map((week, index) => (
              <i
                key={week}
                class={row.visited[index] ? 'on' : undefined}
                title={`${formatWeek(week)}${row.visited[index] ? ' · visited' : ''}`}
              />
            ))}
          </span>
          <span class={`recency-chip is-${row.kind}`} role="cell">
            {formatRecency(row.days)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Topics({ studentId, subjects, sessions, tests }: Props) {
  if (!studentId) {
    return (
      <section class="page">
        <h1>Progress</h1>
        <p class="empty">Select a student to see topics and tracks.</p>
      </section>
    );
  }

  if (subjects.length === 0) {
    return (
      <section class="page">
        <h1>Progress</h1>
        <p class="empty">No practice or tests yet for this student.</p>
      </section>
    );
  }

  return (
    <section class="page">
      <h1>Progress</h1>

      <section class="progress-block">
        <h2>Retrospective</h2>
        {subjects.map((subject) => {
          if (subject.topics.length === 0 && subject.tracks.length === 0) return null;
          return (
            <article key={`recency-${subject.subject}`} class="topic-card recency-card">
              <h3>{subject.subject}</h3>
              <RecencyGrid
                label={`${subject.subject} topic recency`}
                nameHeader="Topic"
                items={subject.topics}
                datesFor={(name) => topicDates(sessions, subject.subject, name)}
              />
              <RecencyGrid
                label={`${subject.subject} paper recency`}
                nameHeader="Track"
                items={subject.tracks}
                datesFor={(name) => trackDates(tests, subject.subject, name)}
              />
            </article>
          );
        })}
      </section>

      <section class="progress-block">
        <h2>Results</h2>
        {subjects.map((subject) => {
          const practiceCount = subject.topics.reduce((sum, topic) => sum + topic.count, 0);
          const testCount = subject.tracks.reduce((sum, track) => sum + track.count, 0);
          return (
            <article key={`results-${subject.subject}`} class="topic-card">
              <header class="topic-card-head">
                <div>
                  <h3>{subject.subject}</h3>
                  <p class="muted">
                    {practiceCount} practice
                    {' · '}
                    {testCount} test{testCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span class="signal-badge" style={{ background: signalColor(subject.averageSignal) }}>
                  {formatPercent(subject.averageSignal)}
                </span>
              </header>
              <h4 class="section-label">Topics</h4>
              <StatsTable rows={subject.topics} nameHeader="Topic" countHeader="Practice" />
              <h4 class="section-label">Tracks</h4>
              <StatsTable rows={subject.tracks} nameHeader="Track" countHeader="Tests" />
            </article>
          );
        })}
      </section>
    </section>
  );
}
