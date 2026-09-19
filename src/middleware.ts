import { defineMiddleware } from 'astro:middleware';
import { parseCookie, STUDY_COOKIE } from './study/auth/cookie';

const TRACKER_PAGES = new Set(['/', '/log', '/topics', '/history']);

function isProtectedPath(pathname: string): boolean {
  return TRACKER_PAGES.has(pathname) || pathname.startsWith('/api/study');
}

function isPublicApi(pathname: string): boolean {
  return pathname === '/api/study/login';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!isProtectedPath(pathname) || isPublicApi(pathname)) {
    return next();
  }

  const token = parseCookie(context.request.headers.get('cookie'), STUDY_COOKIE);
  if (token?.startsWith('v1.')) {
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
