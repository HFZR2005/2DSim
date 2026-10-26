import { getAuthSecret } from '../env';
import { viewerForUserId } from '../auth/session';
import { mcpAuth } from './access';
import { ToolError } from './errors';
import { bearerToken, mcpCorsHeaders, parseAccessToken, unauthorizedMcp } from './oauth';
import { callMcpTool, mcpTools } from './tools';

const PROTOCOL = '2025-03-26';
const SUPPORTED = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);

type Rpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

function rpcHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': PROTOCOL,
    ...mcpCorsHeaders(),
  };
}

function result(id: Rpc['id'], value: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result: value };
}

function rpcError(id: Rpc['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

async function handleOne(
  auth: Awaited<ReturnType<typeof mcpAuth>>,
  message: Rpc,
): Promise<unknown | null> {
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    if (message.id === undefined) return null;
    return rpcError(message.id, -32600, 'Invalid request');
  }
  const id = message.id;
  const notify = id === undefined;
  const params = message.params ?? {};

  switch (message.method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL;
      return result(id, {
        protocolVersion: SUPPORTED.has(requested) ? requested : PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'MechLab', version: '2.0.0' },
        instructions:
          'MechLab study tracker for one person: the signed-in account. Omit student_id to use that record. Call who_am_i, then list_topics before log_session. Use get_summary and get_review_queue to plan. Progress is 0–1. Do not invent marks. Do not pass another student_id unless the token includes students:write.',
      });
    }
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;
    case 'ping':
      return notify ? null : result(id, {});
    case 'tools/list':
      return notify ? null : result(id, { tools: mcpTools });
    case 'tools/call': {
      if (notify) return null;
      const name = typeof params.name === 'string' ? params.name : '';
      const args =
        params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
          ? (params.arguments as Record<string, unknown>)
          : {};
      try {
        const data = await callMcpTool(auth, name, args);
        return result(id, {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        });
      } catch (error) {
        const text = error instanceof ToolError ? error.toJson() : JSON.stringify({ code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Tool failed' });
        return result(id, {
          content: [{ type: 'text', text }],
          isError: true,
        });
      }
    }
    default:
      return notify ? null : rpcError(id, -32601, `Unknown method: ${message.method}`);
  }
}

export async function handleMcp(request: Request, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: mcpCorsHeaders() });
  }

  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return unauthorizedMcp(url.origin);
  }

  const parsed = await parseAccessToken(secret, bearerToken(request));
  if (!parsed) return unauthorizedMcp(url.origin);
  const viewer = await viewerForUserId(parsed.userId);
  if (!viewer) return unauthorizedMcp(url.origin);
  const auth = await mcpAuth(parsed.userId, viewer, parsed.scopes);

  if (request.method === 'GET') {
    return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...mcpCorsHeaders() } });
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...mcpCorsHeaders() } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }), {
      status: 400,
      headers: rpcHeaders(),
    });
  }

  if (Array.isArray(body)) {
    const replies: unknown[] = [];
    for (const item of body) {
      const reply = await handleOne(auth, (item ?? {}) as Rpc);
      if (reply) replies.push(reply);
    }
    if (replies.length === 0) return new Response(null, { status: 202, headers: mcpCorsHeaders() });
    return new Response(JSON.stringify(replies), { status: 200, headers: rpcHeaders() });
  }

  const reply = await handleOne(auth, (body ?? {}) as Rpc);
  if (!reply) return new Response(null, { status: 202, headers: mcpCorsHeaders() });
  return new Response(JSON.stringify(reply), { status: 200, headers: rpcHeaders() });
}
