import { attachViewer } from '../../../study/auth/session';
import { completeAuthorize } from '../../../study/mcp/oauth';

export const prerender = false;

export async function POST(context: { request: Request; url: URL; locals: App.Locals }) {
  await attachViewer(context);
  const form = await context.request.formData();
  const userId = context.locals.viewer?.userId;
  if (!userId) {
    const next = new URL('/mcp/oauth/authorize', context.url.origin);
    for (const key of ['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'resource', 'scope']) {
      const value = form.get(key);
      if (typeof value === 'string' && value) next.searchParams.set(key, value);
    }
    return new Response(null, {
      status: 302,
      headers: { Location: `/api/study/auth/google?next=${encodeURIComponent(next.pathname + next.search)}` },
    });
  }
  return completeAuthorize(context.url.origin, form, userId);
}
