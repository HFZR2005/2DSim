import { useEffect, useState } from 'preact/hooks';
import {
  addRosterMember,
  chooseRole,
  createRoster,
  createShare,
  deleteRoster,
  deleteShare,
  fetchRosters,
  fetchShares,
  joinRoster,
  removeRosterMember,
  type JoinedRoster,
  type OwnedRoster,
  type ShareRecord,
  type ViewerInfo,
} from '../api';
import { ActionButton, useActionStatus } from '../ActionButton';

type Props = {
  viewer: ViewerInfo;
  displayName?: string | null;
  onChanged: () => void | Promise<void>;
};

export function People({ viewer, displayName, onChanged }: Props) {
  const ownStudentId =
    viewer.role === 'student' ? viewer.studentId : viewer.role === 'supervisor' ? viewer.studentId : null;
  const canSupervise = viewer.role === 'staff' || viewer.role === 'supervisor';
  const canLearn = Boolean(ownStudentId);

  const [owned, setOwned] = useState<OwnedRoster[]>([]);
  const [joined, setJoined] = useState<JoinedRoster[]>([]);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [error, setError] = useState('');
  const [rosterName, setRosterName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [memberEmail, setMemberEmail] = useState<{ [rosterId: string]: string }>({});
  const createRosterAction = useActionStatus();
  const joinAction = useActionStatus();
  const shareAction = useActionStatus();
  const hatStudent = useActionStatus();
  const hatSupervisor = useActionStatus();

  async function load() {
    setError('');
    try {
      const rosters = await fetchRosters();
      setOwned(rosters.owned);
      setJoined(rosters.joined);
      if (ownStudentId) {
        setShares((await fetchShares(ownStudentId)).shares);
      } else {
        setShares([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load people');
    }
  }

  useEffect(() => {
    void load();
  }, [ownStudentId, viewer.role]);

  if (viewer.role === 'viewer') {
    return (
      <section class="page people-page">
        <h1>People</h1>
        <p class="lede">
          A student invited this Google email. You can see their progress. You cannot log work or invite
          others.
        </p>
      </section>
    );
  }

  return (
    <section class="page people-page">
      <h1>People</h1>
      <p class="lede">
        {displayName ? `${displayName}. ` : ''}
        Classes you join, groups you supervise, and who can see your progress.
      </p>
      {error && <p class="study-error">{error}</p>}

      {canLearn && (
        <article class="people-panel">
          <h2>Join a class</h2>
          <p class="muted">If a supervisor gave you a code, enter it here.</p>
          <form
            class="people-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!joinCode.trim()) return;
              void joinAction
                .runAndHoldOk(() => joinRoster(joinCode.trim()))
                .then(() => {
                  setJoinCode('');
                  return Promise.all([load(), onChanged()]);
                })
                .catch(() => undefined);
            }}
          >
            <label>
              Class code
              <input
                value={joinCode}
                autocomplete="off"
                spellCheck={false}
                placeholder="K7MP2Q"
                onInput={(event) => setJoinCode(event.currentTarget.value.toUpperCase())}
              />
            </label>
            <ActionButton
              type="submit"
              class="primary"
              status={joinAction.status}
              idle="Join"
              loading="Joining"
              ok="Joined"
              error="Couldn't join"
            />
          </form>
          {joined.length > 0 && (
            <ul class="people-list">
              {joined.map((roster) => (
                <li key={roster.id}>
                  <div>
                    <strong>{roster.name}</strong>
                    <p class="muted">Supervisor {roster.owner_email}</p>
                  </div>
                  <button
                    type="button"
                    class="text-btn danger"
                    onClick={() => {
                      if (!ownStudentId) return;
                      void removeRosterMember(roster.id, ownStudentId)
                        .then(() => Promise.all([load(), onChanged()]))
                        .catch((err) => setError(err instanceof Error ? err.message : 'Could not leave'));
                    }}
                  >
                    Leave
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}

      {canLearn && ownStudentId && (
        <article class="people-panel">
          <h2>Who can see your progress</h2>
          <p class="muted">Share with a parent, tutor, or anyone you trust. They sign in with that Google email.</p>
          {joined.map((roster) => (
            <p class="people-via" key={roster.id}>
              {roster.name} <span class="muted">via class · {roster.owner_email}</span>
            </p>
          ))}
          <ul class="people-list">
            {shares.map((share) => (
              <li key={share.id}>
                <span>{share.email}</span>
                <button
                  type="button"
                  class="text-btn danger"
                  onClick={() => {
                    void deleteShare(ownStudentId, share.id)
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove'));
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form
            class="people-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!shareEmail.trim()) return;
              void shareAction
                .runAndHoldOk(() => createShare(ownStudentId, shareEmail.trim()))
                .then(() => {
                  setShareEmail('');
                  return load();
                })
                .catch(() => undefined);
            }}
          >
            <label>
              Invite email
              <input
                type="email"
                value={shareEmail}
                placeholder="name@gmail.com"
                onInput={(event) => setShareEmail(event.currentTarget.value)}
              />
            </label>
            <ActionButton
              type="submit"
              class="primary"
              status={shareAction.status}
              idle="Invite"
              loading="Inviting"
              ok="Invited"
              error="Couldn't invite"
            />
          </form>
        </article>
      )}

      {canSupervise && (
        <article class="people-panel">
          <h2>Your rosters</h2>
          <p class="muted">Each roster has a code. Students join themselves, or you add someone who already has a student account.</p>
          <form
            class="people-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!rosterName.trim()) return;
              void createRosterAction
                .runAndHoldOk(() => createRoster(rosterName.trim()))
                .then(() => {
                  setRosterName('');
                  return Promise.all([load(), onChanged()]);
                })
                .catch(() => undefined);
            }}
          >
            <label>
              New roster
              <input
                value={rosterName}
                placeholder="Year 12 Further"
                onInput={(event) => setRosterName(event.currentTarget.value)}
              />
            </label>
            <ActionButton
              type="submit"
              class="primary"
              status={createRosterAction.status}
              idle="Create"
              loading="Creating"
              ok="Created"
              error="Couldn't create"
            />
          </form>
          {owned.length === 0 ? (
            <p class="empty">No rosters yet. Create one to get a join code.</p>
          ) : (
            owned.map((roster) => (
              <RosterCard
                key={roster.id}
                roster={roster}
                memberEmail={memberEmail[roster.id] ?? ''}
                onMemberEmail={(value) => setMemberEmail((current) => ({ ...current, [roster.id]: value }))}
                onChanged={async () => {
                  await load();
                  await onChanged();
                }}
                onError={setError}
              />
            ))
          )}
        </article>
      )}

      <article class="people-panel people-hats">
        <h2>This account</h2>
        {!canLearn && (
          <p>
            You're set up as a supervisor.{' '}
            <ActionButton
              type="button"
              class="text-btn"
              status={hatStudent.status}
              idle="Also track my own work"
              loading="Setting up"
              ok="Ready"
              error="Couldn't add"
              onClick={() => {
                void hatStudent
                  .runAndHoldOk(() => chooseRole('learner'))
                  .then(() => onChanged())
                  .catch(() => undefined);
              }}
            />
          </p>
        )}
        {!canSupervise && canLearn && (
          <p>
            You're set up as a student.{' '}
            <ActionButton
              type="button"
              class="text-btn"
              status={hatSupervisor.status}
              idle="Also supervise a group"
              loading="Setting up"
              ok="Ready"
              error="Couldn't add"
              onClick={() => {
                void hatSupervisor
                  .runAndHoldOk(() => chooseRole('supervisor'))
                  .then(() => onChanged())
                  .catch(() => undefined);
              }}
            />
          </p>
        )}
        {canLearn && canSupervise && <p class="muted">This Google account is both a student and a supervisor.</p>}
      </article>
    </section>
  );
}

function RosterCard({
  roster,
  memberEmail,
  onMemberEmail,
  onChanged,
  onError,
}: {
  roster: OwnedRoster;
  memberEmail: string;
  onMemberEmail: (value: string) => void;
  onChanged: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const copy = useActionStatus();
  const addMember = useActionStatus();
  const remove = useActionStatus();

  return (
    <div class="roster-card">
      <header class="roster-card-head">
        <h3>{roster.name}</h3>
        <button
          type="button"
          class="text-btn danger"
          disabled={remove.busy}
          onClick={() => {
            void remove
              .runAndHoldOk(() => deleteRoster(roster.id))
              .then(() => onChanged())
              .catch((err) => onError(err instanceof Error ? err.message : 'Could not delete'));
          }}
        >
          Delete roster
        </button>
      </header>
      <div class="join-code">
        <span class="join-code-label">Join code</span>
        <code>{roster.join_code}</code>
        <ActionButton
          type="button"
          class="text-btn"
          status={copy.status}
          idle="Copy"
          loading="Copying"
          ok="Copied"
          error="Couldn't copy"
          onClick={() => {
            void copy.run(async () => {
              await navigator.clipboard.writeText(roster.join_code);
            });
          }}
        />
      </div>
      <ul class="people-list">
        {roster.members.length === 0 ? (
          <li class="muted">No students yet.</li>
        ) : (
          roster.members.map((member) => (
            <li key={member.id}>
              <span>{member.display_name}</span>
              <button
                type="button"
                class="text-btn danger"
                onClick={() => {
                  void removeRosterMember(roster.id, member.id)
                    .then(() => onChanged())
                    .catch((err) => onError(err instanceof Error ? err.message : 'Could not remove'));
                }}
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
      <form
        class="people-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!memberEmail.trim()) return;
          void addMember
            .runAndHoldOk(() => addRosterMember(roster.id, memberEmail.trim()))
            .then(() => {
              onMemberEmail('');
              return onChanged();
            })
            .catch(() => undefined);
        }}
      >
        <label>
          Add by email
          <input
            type="email"
            value={memberEmail}
            placeholder="Already signed up as a student"
            onInput={(event) => onMemberEmail(event.currentTarget.value)}
          />
        </label>
        <ActionButton
          type="submit"
          class="primary"
          status={addMember.status}
          idle="Add"
          loading="Adding"
          ok="Added"
          error="Couldn't add"
        />
      </form>
    </div>
  );
}
