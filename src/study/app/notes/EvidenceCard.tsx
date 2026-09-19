import { useState } from 'preact/hooks';
import { signalColor } from '../../signal';
import { updateSessionNote, updateTestNote, type SessionRecord, type TestRecord } from '../api';
import { notePreview } from './markdown';
import { NotePad } from './NotePad';

export type EvidenceKind = 'practice' | 'test';

type Props = {
  kind: EvidenceKind;
  item: SessionRecord | TestRecord;
  dateText: string;
  onNoteSaved: (kind: EvidenceKind, item: SessionRecord | TestRecord) => void;
};

export function EvidenceCard({ kind, item, dateText, onNoteSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = draft !== (item.note ?? '');
  const title =
    kind === 'practice'
      ? `Practice · ${item.subject} · ${(item as SessionRecord).topic}`
      : `Test · ${item.subject} · ${(item as TestRecord).track} · ${(item as TestRecord).title}`;

  async function save() {
    setSaving(true);
    setError('');
    try {
      const next =
        kind === 'practice'
          ? (await updateSessionNote(item.student_id, item.id, draft)).session
          : (await updateTestNote(item.student_id, item.id, draft)).test;
      onNoteSaved(kind, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article class={open ? 'evidence-card is-open' : 'evidence-card'}>
      <button
        type="button"
        class="evidence-head"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => {
            if (!value && !dirty) setDraft(item.note ?? '');
            return !value;
          });
        }}
      >
        <span class="signal-dot" style={{ background: signalColor(item.signal) }} aria-hidden="true" />
        <span class="evidence-copy">
          <span class="session-title">{title}</span>
          <span class="session-meta">
            {dateText}
            {' · '}
            {item.score ?? item.confidence}
            {item.note
              ? ` · ${notePreview(item.note)}`
              : open
                ? ''
                : ' · Add a note'}
          </span>
        </span>
        <span class="evidence-caret" aria-hidden="true">
          {open ? 'Hide' : 'Note'}
        </span>
      </button>
      {open && (
        <div class="evidence-note">
          <div
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && dirty && !saving) {
                event.preventDefault();
                void save();
              }
            }}
          >
            <NotePad
              value={draft}
              onInput={setDraft}
              autoFocus={!item.note}
              initialMode={item.note ? 'preview' : 'write'}
              placeholder="What clicked, what stalled, what to try next."
            />
          </div>
          <div class="evidence-actions">
            {error && <p class="study-error">{error}</p>}
            <button type="button" class="primary" disabled={saving || !dirty} onClick={save}>
              {saving ? 'Saving' : dirty ? 'Save note' : 'Saved'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
