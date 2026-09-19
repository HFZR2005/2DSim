import {
  clearOauthCookies,
  createUserToken,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  parseCookie,
  serializeStudyCookie,
} from '../../../../../study/auth/cookie';
import { googleProfile, safeNextPath } from '../../../../../study/auth/google';
import {
  grantStaffAccess,
  hasStaffAccess,
  linkAccessToUser,
  upsertGoogleUser,
} from '../../../../../study/db';
import { getAuthSecret } from '../../../../../study/env';
import { handleApi } from '../../../../../study/http';

export const prerender = false;

export async function GET({ request, url }: { request: Request; url: URL }) {
  return handleApi(async () => {
    const cookies = request.headers.get('cookie');
    const expected = parseCookie(cookies, OAUTH_STATE_COOKIE);
    const next = safeNextPath(parseCookie(cookies, OAUTH_NEXT_COOKIE));
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const secure = url.protocol === 'https:';
    const clear = clearOauthCookies(secure);

    function fail(message: string) {
      const headers = new Headers({ Location: `/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}` });
      for (const cookie of clear) headers.append('Set-Cookie', cookie);
      return new Response(null, { status: 302, headers });
    }

    if (!code || !state || !expected || state !== expected) {
      return fail('Google sign-in was cancelled');
    }

    let secret: string;
    try {
      secret = getAuthSecret();
    } catch {
      return fail('AUTH_SECRET is not configured');
    }

    let profile: { email: string; name: string; sub: string };
    try {
      profile = await googleProfile(url.origin, code);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Google sign-in failed');
    }

    const user = await upsertGoogleUser({
      email: profile.email,
      displayName: profile.name,
      googleSub: profile.sub,
    });
    await linkAccessToUser(user.email, user.id);
    if (!(await hasStaffAccess())) {
      await grantStaffAccess(user.email, user.id);
    }

    const headers = new Headers({ Location: next });
    headers.append('Set-Cookie', serializeStudyCookie(await createUserToken(secret, user.id), secure));
    for (const cookie of clear) headers.append('Set-Cookie', cookie);
    return new Response(null, { status: 302, headers });
  });
}
