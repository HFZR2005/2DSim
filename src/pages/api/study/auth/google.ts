import { parseCookie, OAUTH_NEXT_COOKIE, serializeOauthCookies } from '../../../../study/auth/cookie';
import { googleAuthorizeUrl, randomState, safeNextPath } from '../../../../study/auth/google';
import { handleApi, json } from '../../../../study/http';

export const prerender = false;

export async function GET({ request, url }: { request: Request; url: URL }) {
  return handleApi(async () => {
    const next = safeNextPath(
      url.searchParams.get('next') ?? parseCookie(request.headers.get('cookie'), OAUTH_NEXT_COOKIE),
    );
    const state = randomState();
    const redirect = googleAuthorizeUrl(url.origin, state);
    if (!redirect) {
      return json({ error: 'Google sign-in is not configured' }, 503);
    }
    const headers = new Headers({ Location: redirect });
    for (const cookie of serializeOauthCookies(state, next, url.protocol === 'https:')) {
      headers.append('Set-Cookie', cookie);
    }
    return new Response(null, { status: 302, headers });
  });
}
