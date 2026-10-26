import { getAuthSecret } from '../../../study/env';
import { handleToken, mcpCorsHeaders, oauthError } from '../../../study/mcp/oauth';

export const prerender = false;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: mcpCorsHeaders() });
}

export async function POST({ request, url }: { request: Request; url: URL }) {
  try {
    return await handleToken(request, url.origin, getAuthSecret());
  } catch (error) {
    if (error instanceof Error && error.message.includes('AUTH_SECRET')) {
      return oauthError('server_error', 'AUTH_SECRET is not configured', 500);
    }
    return oauthError('server_error', 'Token exchange failed', 500);
  }
}
