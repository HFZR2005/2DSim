import { handleRegister, mcpCorsHeaders } from '../../../study/mcp/oauth';

export const prerender = false;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: mcpCorsHeaders() });
}

export function POST({ request }: { request: Request }) {
  return handleRegister(request);
}
