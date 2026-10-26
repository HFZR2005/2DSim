import { useMemo, useState } from 'preact/hooks';
import {
  APPLICATION_EVENT_TYPES,
  APPLICATION_STAGES,
  createApplication,
  updateApplication,
  type ApplicationEvent,
  type ApplicationEventType,
  type ApplicationRecord,
  type ApplicationStage,
} from '../api';
import { CLOSED_APPLICATION_STAGES, EVENT_LABEL, STAGE_LABEL, eventUrgency } from '../applicationLabels';
import { ActionButton, useActionStatus } from '../ActionButton';
import { formatLoggedAt } from '../format';

type Props = {
  studentId: string | null;
  studentName?: string;
  applications: ApplicationRecord[];
  canWrite: boolean;
  onChanged: (rows: ApplicationRecord[]) => void;
};

export function Applications({ studentId, studentName, applications, canWrite, onChanged }: Props) {
  const [showClosed, setShowClosed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const closedCount = applications.filter((row) => CLOSED_APPLICATION_STAGES.has(row.stage)).length;
  const visible = useMemo(() => {
    const rows = showClosed
      ? applications
      : applications.filter((row) => !CLOSED_APPLICATION_STAGES.has(row.stage));
    return [...rows].sort((a, b) => {
      const aClosed = CLOSED_APPLICATION_STAGES.has(a.stage) ? 1 : 0;
      const bClosed = CLOSED_APPLICATION_STAGES.has(b.stage) ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      const at = a.next_event?.at;
      const bt = b.next_event?.at;
      if (at && bt) return at.localeCompare(bt);
      if (at) return -1;
      if (bt) return 1;
      return a.company.localeCompare(b.company);
    });
  }, [applications, showClosed]);

  if (!studentId) {
    return (
      <section class="page applications-page">
        <h1>Applications</h1>
        <p class="empty">Select a student first. Applications belong to one person.</p>
      </section>
    );
  }

  function replace(updated: ApplicationRecord) {
    onChanged(applications.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <section class="page applications-page">
      <div class="page-head">
        <div>
          <h1>Applications</h1>
          <p class="lede">
            {studentName ? `${studentName}. ` : ''}
            {visible.length} {visible.length === 1 ? 'row' : 'rows'}
            {closedCount > 0 && !showClosed ? ` · ${closedCount} closed` : ''}
          </p>
        </div>
        {closedCount > 0 && (
          <button type="button" class="chip" onClick={() => setShowClosed((open) => !open)}>
            {showClosed ? 'Hide closed' : `Show closed (${closedCount})`}
          </button>
        )}
      </div>
      {error && <p class="study-error">{error}</p>}

      <div class="app-db">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Stage</th>
              <th>Next</th>
              <th>Notes</th>
              <th class="app-col-link">Link</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <ApplicationRow
                key={row.id}
                studentId={studentId}
                application={row}
                canWrite={canWrite}
                open={openId === row.id}
                onToggle={() => setOpenId((id) => (id === row.id ? null : row.id))}
                onSaved={replace}
                onError={setError}
              />
            ))}
            {visible.length === 0 && !canWrite && (
              <tr>
                <td class="app-empty" colSpan={6}>
                  {applications.length === 0 ? 'No applications yet.' : 'No open applications.'}
                </td>
              </tr>
            )}
            {canWrite && (
              <ComposerRow
                studentId={studentId}
                onCreated={(row) => {
                  onChanged([row, ...applications]);
                  setError('');
                }}
                onError={setError}
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApplicationRow({
  studentId,
  application,
  canWrite,
  open,
  onToggle,
  onSaved,
  onError,
}: {
  studentId: string;
  application: ApplicationRecord;
  canWrite: boolean;
  open: boolean;
  onToggle: () => void;
  onSaved: (row: ApplicationRecord) => void;
  onError: (message: string) => void;
}) {
  const [notes, setNotes] = useState(application.notes);
  const [url, setUrl] = useState(application.url ?? '');
  const [eventType, setEventType] = useState<ApplicationEventType>(
    application.next_event?.type ?? 'deadline',
  );
  const [eventAt, setEventAt] = useState(toLocalInput(application.next_event?.at));
  const [editingNext, setEditingNext] = useState(false);
  const detail = useActionStatus();
  const closed = CLOSED_APPLICATION_STAGES.has(application.stage);
  const urgency = eventUrgency(application.next_event?.at);

  async function patch(body: Parameters<typeof updateApplication>[2]) {
    onError('');
    try {
      const result = await updateApplication(studentId, application.id, body);
      onSaved(result.application);
      return result.application;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save');
      throw err;
    }
  }

  async function onStage(stage: ApplicationStage) {
    if (stage === application.stage) return;
    await patch({ stage });
  }

  async function saveNext() {
    const next = await patch({ next_event: eventFromInputs(eventType, eventAt) });
    setEventType(next.next_event?.type ?? 'deadline');
    setEventAt(toLocalInput(next.next_event?.at));
    setEditingNext(false);
  }

  async function saveDetail(event: Event) {
    event.preventDefault();
    try {
      const next = await detail.run(() =>
        patch({
          notes,
          url: url.trim() || null,
        }),
      );
      setNotes(next.notes);
      setUrl(next.url ?? '');
    } catch {
      return;
    }
  }

  return (
    <>
      <tr class={[closed ? 'is-closed' : '', open ? 'is-open' : ''].filter(Boolean).join(' ')}>
        <td>
          <button type="button" class="app-company" onClick={onToggle}>
            {application.company}
          </button>
        </td>
        <td class="app-role">{application.role}</td>
        <td>
          <StageSelect value={application.stage} disabled={!canWrite} onChange={onStage} />
        </td>
        <td>
          {canWrite && editingNext ? (
            <div class="app-next-edit">
              <select
                value={eventType}
                onChange={(event) => setEventType(event.currentTarget.value as ApplicationEventType)}
              >
                {APPLICATION_EVENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {EVENT_LABEL[value]}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={eventAt}
                onInput={(event) => setEventAt(event.currentTarget.value)}
              />
              <button type="button" onClick={() => void saveNext()}>
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              class={`app-next is-${urgency}`}
              onClick={() => (canWrite ? setEditingNext(true) : onToggle())}
            >
              {application.next_event
                ? `${formatLoggedAt(application.next_event.at)} · ${EVENT_LABEL[application.next_event.type]}`
                : '—'}
            </button>
          )}
        </td>
        <td>
          <button type="button" class="app-notes-cell" onClick={onToggle}>
            {application.notes.trim() || (canWrite ? 'Add note' : '—')}
          </button>
        </td>
        <td class="app-col-link">
          {application.url ? (
            <a href={application.url} target="_blank" rel="noreferrer" class="app-link">
              Open
            </a>
          ) : (
            <span class="muted">—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr class="app-detail">
          <td colSpan={6}>
            <form class="app-detail-form" onSubmit={saveDetail}>
              <label>
                Notes
                {canWrite ? (
                  <textarea rows={3} value={notes} onInput={(event) => setNotes(event.currentTarget.value)} />
                ) : (
                  <p>{application.notes.trim() || 'No notes.'}</p>
                )}
              </label>
              <label>
                Link
                {canWrite ? (
                  <input value={url} placeholder="https://" onInput={(event) => setUrl(event.currentTarget.value)} />
                ) : application.url ? (
                  <a href={application.url} target="_blank" rel="noreferrer">
                    {application.url}
                  </a>
                ) : (
                  <p class="muted">No link.</p>
                )}
              </label>
              {canWrite && (
                <ActionButton
                  type="submit"
                  class="primary"
                  status={detail.status}
                  idle="Save"
                  loading="Saving"
                  ok="Saved"
                  error="Couldn't save"
                />
              )}
            </form>
            {application.history.length > 0 && (
              <ol class="app-history">
                {application.history
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <span class={`app-stage is-${entry.stage}`}>{STAGE_LABEL[entry.stage]}</span>
                      <span class="muted">
                        {formatLoggedAt(entry.at)} · {entry.note}
                      </span>
                    </li>
                  ))}
              </ol>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function ComposerRow({
  studentId,
  onCreated,
  onError,
}: {
  studentId: string;
  onCreated: (row: ApplicationRecord) => void;
  onError: (message: string) => void;
}) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [stage, setStage] = useState<ApplicationStage>('applied');
  const [eventType, setEventType] = useState<ApplicationEventType>('deadline');
  const [eventAt, setEventAt] = useState('');
  const [notes, setNotes] = useState('');
  const save = useActionStatus();

  async function onSubmit() {
    if (!company.trim() || !role.trim()) {
      onError('Company and role are required.');
      return;
    }
    onError('');
    try {
      const created = await save.run(() =>
        createApplication(studentId, {
          company: company.trim(),
          role: role.trim(),
          stage,
          next_event: eventFromInputs(eventType, eventAt),
          notes: notes.trim(),
        }),
      );
      onCreated(created.application);
      setCompany('');
      setRole('');
      setStage('applied');
      setEventType('deadline');
      setEventAt('');
      setNotes('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save');
    }
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void onSubmit();
    }
  }

  return (
    <tr class="app-new">
      <td>
        <input
          value={company}
          placeholder="New company"
          onInput={(event) => setCompany(event.currentTarget.value)}
          onKeyDown={onKey}
        />
      </td>
      <td>
        <input
          value={role}
          placeholder="Role"
          onInput={(event) => setRole(event.currentTarget.value)}
          onKeyDown={onKey}
        />
      </td>
      <td>
        <StageSelect value={stage} onChange={setStage} />
      </td>
      <td>
        <div class="app-next-edit">
          <select
            value={eventType}
            onChange={(event) => setEventType(event.currentTarget.value as ApplicationEventType)}
          >
            {APPLICATION_EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {EVENT_LABEL[value]}
              </option>
            ))}
          </select>
          <input type="datetime-local" value={eventAt} onInput={(event) => setEventAt(event.currentTarget.value)} />
        </div>
      </td>
      <td>
        <input
          value={notes}
          placeholder="Note"
          onInput={(event) => setNotes(event.currentTarget.value)}
          onKeyDown={onKey}
        />
      </td>
      <td class="app-col-link">
        <ActionButton
          type="button"
          class="text-btn"
          status={save.status}
          idle="Add"
          loading="Adding"
          ok="Added"
          error="Couldn't add"
          onClick={() => void onSubmit()}
        />
      </td>
    </tr>
  );
}

function StageSelect({
  value,
  disabled,
  onChange,
}: {
  value: ApplicationStage;
  disabled?: boolean;
  onChange: (stage: ApplicationStage) => void;
}) {
  return (
    <label class={`app-stage is-${value}`}>
      <select
        value={value}
        disabled={disabled}
        aria-label="Stage"
        onChange={(event) => onChange(event.currentTarget.value as ApplicationStage)}
      >
        {APPLICATION_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABEL[stage]}
          </option>
        ))}
      </select>
    </label>
  );
}

function eventFromInputs(type: ApplicationEventType, local: string): ApplicationEvent | null {
  if (!local.trim()) return null;
  const at = new Date(local).toISOString();
  if (Number.isNaN(new Date(at).getTime())) return null;
  return { type, at };
}

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
