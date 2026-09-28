export const SUGGESTED_TYPES = ['Practice', 'Homework', 'Assignment', 'Test', 'Marking'] as const;

export const TYPE_MAX = 40;

export function normalizeType(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return fallback;
  return trimmed.slice(0, TYPE_MAX);
}
