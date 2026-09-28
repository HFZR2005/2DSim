import { useState } from 'preact/hooks';
import { signalColor, hasMeasuredSignal } from '../../signal';
import {
  deleteSession,
  deleteTest,
  updateSessionNote,
  updateTestNote,
  type SessionRecord,
  type TestRecord,
} from '../api';
import { ActionButton, useActionStatus } from '../ActionButton';
import { notePreview } from './markdown';
import { NotePad } from './NotePad';

export type EvidenceKind = 'practice' | 'test';

type Props = {
  kind: EvidenceKind;
  item: SessionRecord | TestRecord;
  dateText: string;
  onNoteSaved: (kind: EvidenceKind, item: SessionRecord | TestRecord) => void;
  onDeleted?: (kind: EvidenceKind, id: string) => void;
};

export function EvidenceCard({ kind, item, dateText, onNoteSaved, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.note ?? '');
  const save = useActionStatus();
  const removeAction = useActionStatus();
  const busy = save.busy || removeAction.busy;
  const dirty = draft !== (item.note ?? '');
  const title =
    kind === 'practice'
      ? `${item.type} · ${item.subject} · ${(item as SessionRecord).topic}`
      : `${item.type} · ${item.subject} · ${(item as TestRecord).track} · ${(item as TestRecord).title}`;

  async function saveNote() {
    try {
      const next = await save.run(async () =>
        kind === 'practice'
          ? (await updateSessionNote(item.student_id, item.id, draft)).session
          : (await updateTestNote(item.student_id, item.id, draft)).test,
      );
      onNoteSaved(kind, next);
    } catch {
      return;
    }
  }

  async function remove() {
    const label = item.type.toLowerCase();
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    try {
      await removeAction.runAndHoldOk(async () => {
        if (kind === 'practice') {
          await deleteSession(item.student_id, item.id);
        } else {
          await deleteTest(item.student_id, item.id);
        }
      });
      onDeleted?.(kind, item.id);
    } catch {
      return;
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
        <span class="signal-dot" style={{ background: hasMeasuredSignal(item) ? signalColor(item.signal) : 'var(--study-line)' }} aria-hidden="true" />
        <span class="evidence-copy">
          <span class="session-title">{title}</span>
          <span class="session-meta">
            {dateText}
            {item.score || item.confidence ? ` · ${item.score ?? item.confidence}` : ''}
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
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && dirty && !busy) {
                event.preventDefault();
                void saveNote();
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
          {onDeleted && (
          <div class="evidence-actions">
            <ActionButton
              type="button"
              class="text-btn danger"
              status={removeAction.status}
              idle="Delete"
              loading="Deleting"
              ok="Deleted"
              error="Couldn't delete"
              disabled={save.busy}
              onClick={() => void remove()}
            />
            <ActionButton
              type="button"
              class="primary"
              status={save.status}
              idle={dirty ? 'Save note' : 'Saved'}
              loading="Saving"
              ok="Saved"
              error="Couldn't save"
              disabled={removeAction.busy || (!dirty && save.status === 'idle')}
              onClick={() => void saveNote()}
            />
          </div>
          )}
        </div>
      )}
    </article>
  );
}
