import { mcpCorsHeaders, wellKnownResponse } from '../../../study/mcp/oauth';

export const prerender = false;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: mcpCorsHeaders() });
}

export function GET({ url }: { url: URL }) {
  return wellKnownResponse('/.well-known/oauth-protected-resource/mcp', url.origin) as Response;
}
