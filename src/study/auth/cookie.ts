export const STUDY_COOKIE = 'study_auth';
const COOKIE_PREFIX = 'v1.';

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoded = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoded.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoded.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function createStaffToken(pin: string): Promise<string> {
  return `${COOKIE_PREFIX}${await hmacHex(pin, 'staff')}`;
}

export async function tokenIsStaff(pin: string, token: string | undefined): Promise<boolean> {
  if (!token?.startsWith(COOKIE_PREFIX)) return false;
  const expected = await createStaffToken(pin);
  return timingSafeEqual(token, expected);
}

export function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

export function serializeStudyCookie(token: string, secure: boolean): string {
  const parts = [
    `${STUDY_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 30}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearStudyCookie(secure: boolean): string {
  const parts = [`${STUDY_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
