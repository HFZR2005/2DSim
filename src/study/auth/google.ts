import { getGoogleOAuth } from '../env';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function googleRedirectUri(origin: string): string {
  return `${origin}/api/study/auth/google/callback`;
}

export function googleAuthorizeUrl(origin: string, state: string): string | null {
  const google = getGoogleOAuth();
  if (!google) return null;
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', google.clientId);
  url.searchParams.set('redirect_uri', googleRedirectUri(origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function googleProfile(
  origin: string,
  code: string,
): Promise<{ email: string; name: string; sub: string }> {
  const google = getGoogleOAuth();
  if (!google) {
    throw new Error('Google OAuth is not configured');
  }

  const body = new URLSearchParams({
    code,
    client_id: google.clientId,
    client_secret: google.clientSecret,
    redirect_uri: googleRedirectUri(origin),
    grant_type: 'authorization_code',
  });
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const token = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(token.error ?? 'Google token exchange failed');
  }

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    sub?: string;
  };
  if (!profileResponse.ok || !profile.email || !profile.sub) {
    throw new Error('Google profile was incomplete');
  }
  if (profile.email_verified === false) {
    throw new Error('Google email is not verified');
  }
  return {
    email: profile.email,
    name: profile.name?.trim() || profile.email,
    sub: profile.sub,
  };
}

export function safeNextPath(value: string | undefined, fallback = '/'): string {
  if (!value) return fallback;
  return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
