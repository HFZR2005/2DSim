import { useState } from 'preact/hooks';
import { initials } from '../picture';

type Props = {
  name: string | null | undefined;
  src?: string | null;
  size?: 'sm' | 'md';
};

export function Avatar({ name, src, size = 'md' }: Props) {
  const [failed, setFailed] = useState(false);
  const photo = src && !failed ? src : null;
  return (
    <span class={`avatar avatar-${size}${photo ? ' has-photo' : ''}`} aria-hidden="true">
      {photo ? (
        <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
