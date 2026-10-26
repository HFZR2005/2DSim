import { defineMiddleware } from 'astro:middleware';
import { isSignedStudyToken, parseCookie, STUDY_COOKIE } from './study/auth/cookie';
import { getAuthSecret } from './study/env';
import {
  handleRegister,
  handleToken,
  mcpCorsHeaders,
  oauthError,
  wellKnownResponse,
} from './study/mcp/oauth';
import { handleMcp } from './study/mcp/protocol';

const TRACKER_PAGES = new Set(['/', '/log', '/topics', '/subjects', '/history', '/people', '/applications']);

function isProtectedPath(pathname: string): boolean {
  return TRACKER_PAGES.has(pathname) || pathname.startsWith('/api/study');
}

function isPublicApi(pathname: string): boolean {
  return (
    pathname === '/api/study/auth/google' ||
    pathname === '/api/study/auth/google/callback'
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (
    context.request.method === 'OPTIONS' &&
    (pathname.startsWith('/.well-known/') || pathname === '/mcp' || pathname === '/mcp/' || pathname.startsWith('/mcp/oauth/'))
  ) {
    return new Response(null, { status: 204, headers: mcpCorsHeaders() });
  }
  const metadata = wellKnownResponse(pathname, context.url.origin);
  if (metadata) return metadata;
  if (pathname === '/mcp' || pathname === '/mcp/') {
    return handleMcp(context.request, context.url);
  }
  if (pathname === '/mcp/oauth/register' || pathname === '/mcp/oauth/register/') {
    if (context.request.method === 'POST') return handleRegister(context.request);
    return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...mcpCorsHeaders() } });
  }
  if (pathname === '/mcp/oauth/token' || pathname === '/mcp/oauth/token/') {
    if (context.request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...mcpCorsHeaders() } });
    }
    try {
      return await handleToken(context.request, context.url.origin, getAuthSecret());
    } catch (error) {
      if (error instanceof Error && error.message.includes('AUTH_SECRET')) {
        return oauthError('server_error', 'AUTH_SECRET is not configured', 500);
      }
      return oauthError('server_error', 'Token exchange failed', 500);
    }
  }
  if (!isProtectedPath(pathname) || isPublicApi(pathname)) {
    return next();
  }

  const token = parseCookie(context.request.headers.get('cookie'), STUDY_COOKIE);
  if (isSignedStudyToken(token)) {
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Sign in required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nextPath = `${pathname}${context.url.search}`;
  return context.redirect(`/login?next=${encodeURIComponent(nextPath)}`);
});
