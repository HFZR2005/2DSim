import type { SubjectStat } from '../api';
import { formatDay, formatPercent } from '../format';
import { signalColor } from '../../signal';

type Props = {
  studentId: string | null;
  subjects: SubjectStat[];
};

const TREND: Record<string, string> = {
  up: 'Up',
  down: 'Down',
  flat: 'Flat',
};

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
          <th>Last</th>
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
            <td>{formatDay(row.lastStudied)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Topics({ studentId, subjects }: Props) {
  if (!studentId) {
    return (
      <section class="page">
        <h1>Progress</h1>
        <p class="empty">Select a student to see topics and tracks.</p>
      </section>
    );
  }

  return (
    <section class="page">
      <h1>Progress</h1>
      {subjects.length === 0 ? (
        <p class="empty">No practice or tests yet for this student.</p>
      ) : (
        subjects.map((subject) => {
          const practiceCount = subject.topics.reduce((sum, topic) => sum + topic.count, 0);
          const testCount = subject.tracks.reduce((sum, track) => sum + track.count, 0);
          return (
          <article key={subject.subject} class="topic-card">
            <header class="topic-card-head">
              <div>
                <h2>{subject.subject}</h2>
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
            <h3 class="section-label">Topics</h3>
            <StatsTable rows={subject.topics} nameHeader="Topic" countHeader="Practice" />
            <h3 class="section-label">Tracks</h3>
            <StatsTable rows={subject.tracks} nameHeader="Track" countHeader="Tests" />
          </article>
          );
        })
      )}
    </section>
  );
}
