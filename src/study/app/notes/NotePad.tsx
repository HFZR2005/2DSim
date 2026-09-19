import { useEffect, useRef, useState } from 'preact/hooks';
import { renderNote } from './markdown';

const NOTE_MAX = 8000;

type Props = {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  initialMode?: 'write' | 'preview';
};

export function NotePad({ value, onInput, placeholder, autoFocus, initialMode = 'write' }: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'write' | 'preview'>(initialMode);

  useEffect(() => {
    const node = area.current;
    if (!node || mode !== 'write') return;
    node.style.height = '0px';
    node.style.height = `${Math.max(180, node.scrollHeight)}px`;
  }, [value, mode]);

  useEffect(() => {
    if (autoFocus && mode === 'write') area.current?.focus();
  }, [autoFocus, mode]);

  function wrap(before: string, after = before) {
    const node = area.current;
    if (!node) {
      onInput(`${before}text${after}`);
      return;
    }
    const start = node.selectionStart;
    const end = node.selectionEnd;
    const selected = value.slice(start, end) || 'text';
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onInput(next);
    requestAnimationFrame(() => {
      node.focus();
      const cursor = start + before.length + selected.length;
      node.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div class="notepad">
      <div class="notepad-toolbar">
        <div class="notepad-modes" role="tablist" aria-label="Note view">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            class={mode === 'write' ? 'is-active' : undefined}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            class={mode === 'preview' ? 'is-active' : undefined}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
        {mode === 'write' && (
          <div class="notepad-format" role="toolbar" aria-label="Note formatting">
            <button type="button" onClick={() => wrap('**')}>
              Bold
            </button>
            <button type="button" onClick={() => wrap('_')}>
              Italic
            </button>
            <button type="button" onClick={() => onInput(value ? `${value.replace(/\s*$/, '')}\n- ` : '- ')}>
              List
            </button>
          </div>
        )}
        <span class="notepad-count">
          {value.length}/{NOTE_MAX}
        </span>
      </div>
      {mode === 'write' ? (
        <textarea
          ref={area}
          class="notepad-input"
          value={value}
          maxLength={NOTE_MAX}
          aria-label="Note"
          placeholder={placeholder}
          onInput={(event) => onInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
              event.preventDefault();
              wrap('**');
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
              event.preventDefault();
              wrap('_');
            }
          }}
        />
      ) : (
        <div class="notepad-preview">
          {value.trim() ? (
            <div class="note-prose" dangerouslySetInnerHTML={{ __html: renderNote(value) }} />
          ) : (
            <p class="muted">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
