import { marked } from 'marked';

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'EM', 'B', 'I', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'CODE', 'PRE', 'BLOCKQUOTE', 'A']);

marked.setOptions({ gfm: true, breaks: true });

function sanitize(html: string): string {
  const box = document.createElement('div');
  box.innerHTML = html;

  const clean = (node: Element) => {
    for (const child of [...node.children]) {
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      if (child.tagName === 'A') {
        const href = child.getAttribute('href') ?? '';
        [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
        if (/^https?:\/\//i.test(href)) {
          child.setAttribute('href', href);
          child.setAttribute('rel', 'noopener noreferrer');
          child.setAttribute('target', '_blank');
        }
      } else {
        [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
      }
      clean(child);
    }
  };

  clean(box);
  return box.innerHTML;
}

export function renderNote(markdown: string): string {
  const raw = marked.parse(markdown, { async: false }) as string;
  return sanitize(raw);
}

export function notePreview(markdown: string, max = 90): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>[\]]/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trimEnd()}…`;
}
