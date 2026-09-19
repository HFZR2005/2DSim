export const STUDY_COOKIE = 'study_auth';
export const OAUTH_STATE_COOKIE = 'study_oauth';
export const OAUTH_NEXT_COOKIE = 'study_oauth_next';
const PIN_PREFIX = 'v1.';
const USER_PREFIX = 'v2.';

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
  return `${PIN_PREFIX}${await hmacHex(pin, 'staff')}`;
}

export async function tokenIsStaff(pin: string, token: string | undefined): Promise<boolean> {
  if (!token?.startsWith(PIN_PREFIX)) return false;
  const expected = await createStaffToken(pin);
  return timingSafeEqual(token, expected);
}

export async function createUserToken(secret: string, userId: string): Promise<string> {
  return `${USER_PREFIX}${userId}.${await hmacHex(secret, `v2:${userId}`)}`;
}

export async function userIdFromToken(secret: string, token: string | undefined): Promise<string | null> {
  if (!token?.startsWith(USER_PREFIX)) return null;
  const body = token.slice(USER_PREFIX.length);
  const dot = body.lastIndexOf('.');
  if (dot <= 0) return null;
  const userId = body.slice(0, dot);
  const signature = body.slice(dot + 1);
  const expected = await hmacHex(secret, `v2:${userId}`);
  return timingSafeEqual(signature, expected) ? userId : null;
}

export function isSignedStudyToken(token: string | undefined): boolean {
  return Boolean(token?.startsWith(PIN_PREFIX) || token?.startsWith(USER_PREFIX));
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

function serializeNamedCookie(name: string, value: string, secure: boolean, maxAge: number): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function serializeOauthCookies(state: string, next: string, secure: boolean): string[] {
  return [
    serializeNamedCookie(OAUTH_STATE_COOKIE, state, secure, 600),
    serializeNamedCookie(OAUTH_NEXT_COOKIE, next, secure, 600),
  ];
}

export function clearOauthCookies(secure: boolean): string[] {
  return [
    serializeNamedCookie(OAUTH_STATE_COOKIE, '', secure, 0),
    serializeNamedCookie(OAUTH_NEXT_COOKIE, '', secure, 0),
  ];
}
