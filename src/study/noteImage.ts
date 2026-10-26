export const NOTE_IMAGE_MAX_BYTES = 1_500_000;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const TOKEN = new RegExp(`^note-image:(${UUID})$`, 'i');
const FETCH = new RegExp(`^/api/study/notes/images/(${UUID})$`, 'i');
const EMBEDDED = new RegExp(`(?:note-image:|/api/study/notes/images/)(${UUID})`, 'gi');

export function noteImageKey(id: string): string {
  return `notes/${id}`;
}

export function noteImageToken(id: string): string {
  return `note-image:${id}`;
}

export function imageSrcFor(id: string): string {
  return `/api/study/notes/images/${id}`;
}

export function imageMarkdown(id: string, alt = 'image'): string {
  return `![${alt}](${noteImageToken(id)})`;
}

export function parseNoteImageRef(value: string): string | null {
  const trimmed = value.trim();
  const token = TOKEN.exec(trimmed);
  if (token) return token[1].toLowerCase();
  const fetch = FETCH.exec(trimmed);
  return fetch ? fetch[1].toLowerCase() : null;
}

export function noteImageIds(markdown: string): string[] {
  EMBEDDED.lastIndex = 0;
  const ids = [...markdown.matchAll(EMBEDDED)].map((match) => match[1].toLowerCase());
  return [...new Set(ids)];
}

export function expandNoteImageTokens(markdown: string): string {
  EMBEDDED.lastIndex = 0;
  return markdown.replace(EMBEDDED, (_full, id: string) => imageSrcFor(id.toLowerCase()));
}

export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}
