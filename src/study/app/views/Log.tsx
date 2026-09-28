import { useMemo, useState } from 'preact/hooks';
import { CONFIDENCE, type Confidence } from '../../signal';
import { SUGGESTED_TYPES } from '../../taskType';
import { createSession, createTest, type SessionRecord, type TestRecord } from '../api';
import { ActionButton, useActionStatus } from '../ActionButton';
import { NotePad } from '../notes/NotePad';

type Kind = 'practice' | 'test';

type Props = {
  studentId: string | null;
  studentName?: string;
  sessions: SessionRecord[];
  tests: TestRecord[];
  onSaved: (kind: Kind) => void | Promise<void>;
};

export function Log({ studentId, studentName, sessions, tests, onSaved }: Props) {
  const subjects = useMemo(
    () =>
      [...new Set([...sessions.map((row) => row.subject), ...tests.map((row) => row.subject)])].sort(),
    [sessions, tests],
  );
  const [kind, setKind] = useState<Kind>('practice');
  const [taskType, setTaskType] = useState('Practice');
  const [newType, setNewType] = useState('');
  const [subject, setSubject] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [series, setSeries] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [confidence, setConfidence] = useState<Confidence | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const save = useActionStatus();

  const chosenSubject = subject || newSubject.trim();
  const topics = useMemo(
    () =>
      [...new Set(sessions.filter((row) => row.subject === chosenSubject).map((row) => row.topic))].sort(),
    [sessions, chosenSubject],
  );
  const seriesNames = useMemo(
    () => [...new Set(tests.filter((row) => row.subject === chosenSubject).map((row) => row.track))].sort(),
    [tests, chosenSubject],
  );
  const chosenTopic = topic || newTopic.trim();
  const chosenSeries = series || newSeries.trim();
  const chosenType = newType.trim() || taskType;
  const hasScore = score.trim().length > 0;
  const types = useMemo(() => {
    const used = [...sessions.map((row) => row.type), ...tests.map((row) => row.type)];
    return [...new Set([...SUGGESTED_TYPES, ...used])].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [sessions, tests]);

  if (!studentId) {
    return (
      <section class="page">
        <h1>Log</h1>
        <p class="empty">Select a student first. Logs are always attached to one person.</p>
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
    if (kind === 'test' && (!chosenSeries || !title.trim())) {
      setError('Choose a series and name the paper.');
      return;
    }
    if (kind === 'test' && !hasScore) {
      setError('Add a score.');
      return;
    }
    if (!chosenType) {
      setError('Choose a type, or type a new one.');
      return;
    }
    try {
      await save.runAndHoldOk(async () => {
        const evidence = hasScore
          ? { score: score.trim() }
          : confidence
            ? { confidence: confidence as Confidence }
            : {};
        const extra = {
          type: chosenType,
          ...(note.trim() ? { note: note.trim() } : {}),
        };
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
            track: chosenSeries,
            title: title.trim(),
            score: score.trim(),
            ...extra,
          });
        }
      });
      await onSaved(kind);
    } catch {
      return;
    }
  }

  return (
    <section class="page">
      <h1>Log</h1>
      <p class="lede">For {studentName ?? 'this student'}.</p>
      <form class="log-form" onSubmit={onSubmit}>
        <fieldset>
          <legend>Type</legend>
          <div class="chips">
            {types.map((name) => (
              <button
                key={name}
                type="button"
                class={taskType === name && !newType.trim() ? 'chip is-active' : 'chip'}
                aria-pressed={taskType === name && !newType.trim()}
                onClick={() => {
                  setTaskType(name);
                  setNewType('');
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <label>
            New type
            <input
              value={newType}
              onInput={(event) => {
                setNewType(event.currentTarget.value);
                setTaskType('');
              }}
            />
          </label>
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
                  setSeries('');
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
                setSeries('');
              }}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>About</legend>
          <div class="chips">
            <button
              type="button"
              class={kind === 'practice' ? 'chip is-active' : 'chip'}
              aria-pressed={kind === 'practice'}
              onClick={() => setKind('practice')}
            >
              Topic
            </button>
            <button
              type="button"
              class={kind === 'test' ? 'chip is-active' : 'chip'}
              aria-pressed={kind === 'test'}
              onClick={() => setKind('test')}
            >
              Paper
            </button>
          </div>
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
              <legend>Series</legend>
              <p class="muted">A course or paper series, such as GCSE Maths, Core Pure Maths, or UKMT.</p>
              <div class="chips">
                {seriesNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    class={series === name ? 'chip is-active' : 'chip'}
                    aria-pressed={series === name}
                    onClick={() => {
                      setSeries(name);
                      setNewSeries('');
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <label>
                New series
                <input
                  value={newSeries}
                  onInput={(event) => {
                    setNewSeries(event.currentTarget.value);
                    setSeries('');
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
          {kind === 'practice' ? 'Score (optional)' : 'Score'}
          <input
            value={score}
            placeholder="8/10"
            required={kind === 'test'}
            onInput={(event) => setScore(event.currentTarget.value)}
          />
        </label>

        {kind === 'practice' && !hasScore && (
          <fieldset>
            <legend>Confidence</legend>
            <div class="confidence-grid">
              {CONFIDENCE.map((value) => (
                <button
                  key={value}
                  type="button"
                  class={confidence === value ? 'confidence-card is-active' : 'confidence-card'}
                  aria-pressed={confidence === value}
                  onClick={() => setConfidence((current) => (current === value ? '' : value))}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset class="note-field">
          <legend>Reflection</legend>
          <p class="muted">What clicked, what stalled, what to try next. Markdown is fine.</p>
          <NotePad
            value={note}
            onInput={setNote}
            placeholder="The last two questions were the same idea in disguise. Next time, start by naming the method."
          />
        </fieldset>

        {error && <p class="study-error">{error}</p>}
        <ActionButton
          type="submit"
          class="primary"
          status={save.status}
          idle="Save"
          loading="Saving"
          ok="Saved"
          error="Couldn't save"
        />
      </form>
    </section>
  );
}
