import { useEffect, useRef, useState } from 'preact/hooks';
import { uploadNoteImage } from '../api';
import { imageMarkdown, imageSrcFor, noteImageIds, noteImageToken } from '../../noteImage';
import { imageFilesFromClipboard, imageFilesFromList, prepareNoteImage } from './imageFile';
import { renderNote } from './markdown';

const NOTE_MAX = 8000;

type Props = {
  value: string;
  onInput: (value: string) => void;
  studentId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  initialMode?: 'write' | 'preview';
};

export function NotePad({
  value,
  onInput,
  studentId,
  placeholder,
  autoFocus,
  initialMode = 'write',
}: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const [mode, setMode] = useState<'write' | 'preview'>(initialMode);
  const [dropping, setDropping] = useState(false);
  const uploadingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const images = noteImageIds(value);
  const canAddImages = Boolean(studentId);

  valueRef.current = value;

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

  function insertSnippet(snippet: string) {
    const node = area.current;
    const current = valueRef.current;
    if (!node || document.activeElement !== node) {
      const next = current ? `${current.replace(/\s*$/, '')}\n\n${snippet}\n` : `${snippet}\n`;
      valueRef.current = next;
      onInput(next);
      return;
    }
    const start = node.selectionStart;
    const end = node.selectionEnd;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const lead = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const next = `${before}${lead}${snippet}\n${after.replace(/^\n*/, '')}`;
    valueRef.current = next;
    onInput(next);
    requestAnimationFrame(() => {
      node.focus();
      const cursor = before.length + lead.length + snippet.length + 1;
      node.setSelectionRange(cursor, cursor);
    });
  }

  async function addImages(files: File[]) {
    if (!studentId || files.length === 0 || uploadingRef.current) return;
    uploadingRef.current = true;
    setError('');
    setUploading(true);
    try {
      for (const file of files) {
        const blob = await prepareNoteImage(file);
        const uploaded = await uploadNoteImage(studentId, blob);
        insertSnippet(imageMarkdown(uploaded.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add image');
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  function removeImage(id: string) {
    const token = noteImageToken(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fetch = imageSrcFor(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const next = value
      .replace(new RegExp(`!\\[[^\\]]*\\]\\((?:${token}|${fetch})\\)\\s*`, 'gi'), '')
      .replace(/\n{3,}/g, '\n\n')
      .trimStart();
    onInput(next);
  }

  function onPaste(event: ClipboardEvent) {
    const files = imageFilesFromClipboard(event.clipboardData);
    if (!canAddImages || files.length === 0) return;
    event.preventDefault();
    void addImages(files);
  }

  return (
    <div
      class={dropping ? 'notepad is-drop' : 'notepad'}
      onDragEnter={(event) => {
        if (!canAddImages) return;
        if (imageFilesFromList(event.dataTransfer?.items).length > 0) {
          event.preventDefault();
          setDropping(true);
        }
      }}
      onDragOver={(event) => {
        if (!canAddImages) return;
        if (imageFilesFromList(event.dataTransfer?.items).length > 0) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDropping(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDropping(false);
      }}
      onDrop={(event) => {
        if (!canAddImages) return;
        const files = imageFilesFromList(event.dataTransfer?.files);
        if (files.length === 0) return;
        event.preventDefault();
        setDropping(false);
        void addImages(files);
      }}
    >
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
            {canAddImages && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                Image
              </button>
            )}
          </div>
        )}
        <span class="notepad-count">
          {uploading ? 'Uploading' : `${value.length}/${NOTE_MAX}`}
        </span>
      </div>
      {canAddImages && (
        <input
          ref={fileRef}
          class="notepad-file"
          type="file"
          accept="image/*"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const files = imageFilesFromList(event.currentTarget.files);
            event.currentTarget.value = '';
            void addImages(files);
          }}
        />
      )}
      {mode === 'write' && images.length > 0 && (
        <ul class="notepad-thumbs">
          {images.map((id) => (
            <li key={id}>
              <img src={imageSrcFor(id)} alt="" />
              <button type="button" class="notepad-thumb-remove" onClick={() => removeImage(id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {mode === 'write' ? (
        <textarea
          ref={area}
          class="notepad-input"
          value={value}
          maxLength={NOTE_MAX}
          aria-label="Note"
          placeholder={placeholder}
          onInput={(event) => onInput(event.currentTarget.value)}
          onPaste={onPaste}
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
      {dropping && <div class="notepad-drop">Drop image to add it</div>}
      {error && <p class="notepad-error">{error}</p>}
    </div>
  );
}
