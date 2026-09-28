import { chooseRole } from '../api';
import { useActionStatus } from '../ActionButton';

type Props = {
  name?: string | null;
  onChosen: () => void | Promise<void>;
};

export function Onboarding({ name, onChosen }: Props) {
  const student = useActionStatus();
  const supervisor = useActionStatus();

  async function choose(role: 'learner' | 'supervisor') {
    const action = role === 'learner' ? student : supervisor;
    try {
      await action.runAndHoldOk(() => chooseRole(role));
      await onChosen();
    } catch {
      return;
    }
  }

  const hello = name ? `Hello, ${name.split(' ')[0]}.` : 'Hello.';

  return (
    <section class="page onboarding">
      <p class="eyebrow">Study Tracker</p>
      <h1>{hello}</h1>
      <p class="lede">How will you use it? You can add the other later.</p>
      <div class="role-cards">
        <button
          type="button"
          class="role-card"
          disabled={student.busy || supervisor.busy}
          onClick={() => void choose('learner')}
        >
          <h2>Student</h2>
          <p>Track your own work. Join a class with a code if a teacher gives you one.</p>
          <span class="role-card-action">
            {student.status === 'loading' ? 'Creating…' : student.status === 'ok' ? 'Ready' : 'Continue'}
          </span>
        </button>
        <button
          type="button"
          class="role-card"
          disabled={student.busy || supervisor.busy}
          onClick={() => void choose('supervisor')}
        >
          <h2>Supervisor</h2>
          <p>See a group’s progress. You’ll get a join code to share with students.</p>
          <span class="role-card-action">
            {supervisor.status === 'loading' ? 'Creating…' : supervisor.status === 'ok' ? 'Ready' : 'Continue'}
          </span>
        </button>
      </div>
      {(student.status === 'error' || supervisor.status === 'error') && (
        <p class="study-error">Couldn't set up this account. Try again.</p>
      )}
    </section>
  );
}
