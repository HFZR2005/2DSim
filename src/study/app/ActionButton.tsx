import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';

export type ActionStatus = 'idle' | 'loading' | 'ok' | 'error';

const HOLD_OK_MS = 900;
const HOLD_ERROR_MS = 1600;

export function useActionStatus() {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function settle(next: 'ok' | 'error') {
    setStatus(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setStatus('idle'),
      next === 'ok' ? HOLD_OK_MS : HOLD_ERROR_MS,
    );
  }

  async function run<T>(work: () => Promise<T>): Promise<T> {
    window.clearTimeout(timer.current);
    setStatus('loading');
    try {
      const value = await work();
      settle('ok');
      return value;
    } catch (err) {
      settle('error');
      throw err;
    }
  }

  async function runAndHoldOk<T>(work: () => Promise<T>): Promise<T> {
    window.clearTimeout(timer.current);
    setStatus('loading');
    try {
      const value = await work();
      setStatus('ok');
      await new Promise<void>((resolve) => {
        timer.current = window.setTimeout(resolve, HOLD_OK_MS);
      });
      return value;
    } catch (err) {
      settle('error');
      throw err;
    }
  }

  return { status, run, runAndHoldOk, busy: status === 'loading' };
}

type Props = Omit<JSX.IntrinsicElements['button'], 'class'> & {
  status: ActionStatus;
  idle: string;
  loading: string;
  ok?: string;
  error?: string;
  class?: string;
};

export function ActionButton({
  status,
  idle,
  loading,
  ok = 'Saved',
  error = "Couldn't save",
  class: className,
  disabled,
  ...rest
}: Props) {
  const label = status === 'loading' ? loading : status === 'ok' ? ok : status === 'error' ? error : idle;
  return (
    <button
      {...rest}
      class={[className, 'action-btn', status !== 'idle' ? `is-${status}` : '']
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || status === 'loading'}
      aria-busy={status === 'loading'}
    >
      {label}
    </button>
  );
}
