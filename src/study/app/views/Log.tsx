import { useMemo, useState } from 'preact/hooks';
import { CONFIDENCE, type Confidence } from '../../signal';
import { createSession, createTest, type SessionRecord, type TestRecord } from '../api';

type Kind = 'practice' | 'test';

type Props = {
  studentId: string | null;
  studentName?: string;
  sessions: SessionRecord[];
  tests: TestRecord[];
  onSaved: () => void;
};

export function Log({ studentId, studentName, sessions, tests, onSaved }: Props) {
  const subjects = useMemo(
    () =>
      [...new Set([...sessions.map((row) => row.subject), ...tests.map((row) => row.subject)])].sort(),
    [sessions, tests],
  );
  const [kind, setKind] = useState<Kind>('practice');
  const [subject, setSubject] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [track, setTrack] = useState('');
  const [newTrack, setNewTrack] = useState('');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [confidence, setConfidence] = useState<Confidence | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const chosenSubject = subject || newSubject.trim();
  const topics = useMemo(
    () =>
      [...new Set(sessions.filter((row) => row.subject === chosenSubject).map((row) => row.topic))].sort(),
    [sessions, chosenSubject],
  );
  const tracks = useMemo(
    () => [...new Set(tests.filter((row) => row.subject === chosenSubject).map((row) => row.track))].sort(),
    [tests, chosenSubject],
  );
  const chosenTopic = topic || newTopic.trim();
  const chosenTrack = track || newTrack.trim();
  const hasScore = score.trim().length > 0;

  if (!studentId) {
    return (
      <section class="page">
        <h1>Log</h1>
        <p class="empty">Select a student first. Practice and tests are always attached to one person.</p>
      </section>
    );
  }

  async function onSubmit(event: Event) {
    event.preventDefault();
    if (!studentId) return;
    setError('');
    if (!chosenSubject) {
      setError('Choose a subject, or type a new one.');
      return;
    }
    if (kind === 'practice' && !chosenTopic) {
      setError('Choose a topic, or type a new one.');
      return;
    }
    if (kind === 'test' && (!chosenTrack || !title.trim())) {
      setError('Choose a track and name the paper.');
      return;
    }
    if (!hasScore && !confidence) {
      setError('Add a score or pick a confidence rating.');
      return;
    }
    setSaving(true);
    try {
      const evidence = hasScore
        ? { score: score.trim() }
        : { confidence: confidence as Confidence };
      const extra = note.trim() ? { note: note.trim() } : {};
      if (kind === 'practice') {
        await createSession(studentId, {
          subject: chosenSubject,
          topic: chosenTopic,
          ...evidence,
          ...extra,
        });
      } else {
        await createTest(studentId, {
          subject: chosenSubject,
          track: chosenTrack,
          title: title.trim(),
          ...evidence,
          ...extra,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section class="page">
      <h1>Log</h1>
      <p class="lede">For {studentName ?? 'this student'}.</p>
      <form class="log-form" onSubmit={onSubmit}>
        <fieldset>
          <legend>Kind</legend>
          <div class="chips">
            <button
              type="button"
              class={kind === 'practice' ? 'chip is-active' : 'chip'}
              aria-pressed={kind === 'practice'}
              onClick={() => setKind('practice')}
            >
              Practice
            </button>
            <button
              type="button"
              class={kind === 'test' ? 'chip is-active' : 'chip'}
              aria-pressed={kind === 'test'}
              onClick={() => setKind('test')}
            >
              Test
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Subject</legend>
          <div class="chips">
            {subjects.map((name) => (
              <button
                key={name}
                type="button"
                class={subject === name ? 'chip is-active' : 'chip'}
                aria-pressed={subject === name}
                onClick={() => {
                  setSubject(name);
                  setNewSubject('');
                  setTopic('');
                  setTrack('');
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <label>
            New subject
            <input
              value={newSubject}
              onInput={(event) => {
                setNewSubject(event.currentTarget.value);
                setSubject('');
                setTopic('');
                setTrack('');
              }}
            />
          </label>
        </fieldset>

        {kind === 'practice' ? (
          <fieldset>
            <legend>Topic</legend>
            <div class="chips">
              {topics.map((name) => (
                <button
                  key={name}
                  type="button"
                  class={topic === name ? 'chip is-active' : 'chip'}
                  aria-pressed={topic === name}
                  onClick={() => {
                    setTopic(name);
                    setNewTopic('');
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <label>
              New topic
              <input
                value={newTopic}
                onInput={(event) => {
                  setNewTopic(event.currentTarget.value);
                  setTopic('');
                }}
              />
            </label>
          </fieldset>
        ) : (
          <>
            <fieldset>
              <legend>Track</legend>
              <p class="muted">A course or paper series, such as GCSE, A Level, or UKMT.</p>
              <div class="chips">
                {tracks.map((name) => (
                  <button
                    key={name}
                    type="button"
                    class={track === name ? 'chip is-active' : 'chip'}
                    aria-pressed={track === name}
                    onClick={() => {
                      setTrack(name);
                      setNewTrack('');
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <label>
                New track
                <input
                  value={newTrack}
                  onInput={(event) => {
                    setNewTrack(event.currentTarget.value);
                    setTrack('');
                  }}
                />
              </label>
            </fieldset>
            <label>
              Paper
              <input
                value={title}
                placeholder="Paper 1, Intermediate 2024…"
                onInput={(event) => setTitle(event.currentTarget.value)}
              />
            </label>
          </>
        )}

        <label>
          Score (optional)
          <input
            value={score}
            placeholder="8/10"
            onInput={(event) => setScore(event.currentTarget.value)}
          />
        </label>

        {!hasScore && (
          <fieldset>
            <legend>Confidence</legend>
            <div class="confidence-grid">
              {CONFIDENCE.map((value) => (
                <button
                  key={value}
                  type="button"
                  class={confidence === value ? 'confidence-card is-active' : 'confidence-card'}
                  aria-pressed={confidence === value}
                  onClick={() => setConfidence(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label>
          Note (optional)
          <textarea value={note} rows={3} onInput={(event) => setNote(event.currentTarget.value)} />
        </label>

        {error && <p class="study-error">{error}</p>}
        <button type="submit" class="primary" disabled={saving}>
          {saving ? 'Saving' : 'Save'}
        </button>
      </form>
    </section>
  );
}
