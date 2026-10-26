import { CLAUDE_SCOPES } from './access';
import { base64Url, hmacHex, pkceChallenge, randomToken, timingSafeEqual } from './crypto';
import {
  findMcpClientByRedirects,
  getMcpClient,
  insertMcpClient,
  saveMcpCode,
  saveMcpRefresh,
  takeMcpCode,
  takeMcpRefresh,
} from './store';

const ACCESS_PREFIX = 'm1.';
const ACCESS_TTL = 60 * 60;
const REFRESH_TTL = 60 * 60 * 24 * 30;
const CODE_TTL = 10 * 60;
const SCOPE = CLAUDE_SCOPES.join(' ');
const SCOPES = ['self:read', 'self:write', 'students:read', 'students:write'] as const;
const HOSTED_CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const HOSTED_CALLBACK_COM = 'https://claude.com/api/mcp/auth_callback';
const CIMD_HOSTS = new Set(['claude.ai', 'www.claude.ai', 'claude.com', 'www.claude.com']);

export type ResolvedClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
};

export type AuthorizePage = {
  clientName: string;
  redirectHost: string;
  hidden: Record<string, string>;
};

export function mcpResourceUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/mcp`;
}

export function protectedResourceMetadata(origin: string) {
  const resource = mcpResourceUrl(origin);
  return {
    resource,
    authorization_servers: [origin.replace(/\/$/, '')],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ['header'],
  };
}

export function authorizationServerMetadata(origin: string) {
  const issuer = origin.replace(/\/$/, '');
  return {
    issuer,
    authorization_endpoint: `${issuer}/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/mcp/oauth/token`,
    registration_endpoint: `${issuer}/mcp/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    client_id_metadata_document_supported: true,
    scopes_supported: [...SCOPES],
  };
}

export function mcpCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, MCP-Protocol-Version',
    'Access-Control-Expose-Headers': 'WWW-Authenticate',
    'Access-Control-Max-Age': '86400',
  };
}

export function unauthorizedMcp(origin: string): Response {
  const metadata = `${origin.replace(/\/$/, '')}/.well-known/oauth-protected-resource/mcp`;
  return new Response(JSON.stringify({ error: 'Sign in required' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer realm="Study Tracker", resource_metadata="${metadata}", scope="${SCOPE}"`,
      ...mcpCorsHeaders(),
    },
  });
}

export function oauthJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...mcpCorsHeaders(),
    },
  });
}

export function wellKnownResponse(pathname: string, origin: string): Response | null {
  const resourceMeta =
    pathname === '/.well-known/oauth-protected-resource' ||
    pathname === '/.well-known/oauth-protected-resource/' ||
    pathname === '/.well-known/oauth-protected-resource/mcp';
  const asMeta =
    pathname === '/.well-known/oauth-authorization-server' ||
    pathname === '/.well-known/oauth-authorization-server/' ||
    pathname === '/.well-known/openid-configuration' ||
    pathname === '/.well-known/openid-configuration/';
  if (!resourceMeta && !asMeta) return null;
  const body = asMeta ? authorizationServerMetadata(origin) : protectedResourceMetadata(origin);
  return oauthJson(body);
}

export function oauthError(error: string, description: string, status = 400): Response {
  return oauthJson({ error, error_description: description }, status);
}

export function allowedRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.href === HOSTED_CALLBACK || url.href === HOSTED_CALLBACK_COM) return true;
    if (url.protocol !== 'http:') return false;
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return false;
    return url.pathname === '/callback';
  } catch {
    return false;
  }
}

export function redirectHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function redirectMatches(registered: string[], requested: string): boolean {
  if (registered.includes(requested)) return true;
  let requestedUrl: URL;
  try {
    requestedUrl = new URL(requested);
  } catch {
    return false;
  }
  if (requestedUrl.hostname !== 'localhost' && requestedUrl.hostname !== '127.0.0.1') return false;
  if (requestedUrl.pathname !== '/callback') return false;
  return registered.some((entry) => {
    try {
      const url = new URL(entry);
      return (
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
        url.pathname === '/callback' &&
        url.protocol === requestedUrl.protocol
      );
    } catch {
      return false;
    }
  });
}

function encodeScopes(scopes: readonly string[]): string {
  return base64Url(new TextEncoder().encode(scopes.join(' ')));
}

function decodeScopes(encoded: string): string[] {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const extra = padded.length % 4;
    const binary = atob(extra ? `${padded}${'='.repeat(4 - extra)}` : padded);
    return binary.split(' ').filter(Boolean);
  } catch {
    return [...CLAUDE_SCOPES];
  }
}

export async function createAccessToken(
  secret: string,
  userId: string,
  ttl = ACCESS_TTL,
  scopes: readonly string[] = CLAUDE_SCOPES,
): Promise<{ token: string; expiresIn: number; scopes: string[] }> {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const rnd = randomToken(16);
  const scopeStr = scopes.join(' ');
  const packed = encodeScopes(scopes);
  const mac = await hmacHex(secret, `m1:${userId}:${exp}:${rnd}:${scopeStr}`);
  return {
    token: `${ACCESS_PREFIX}${userId}.${exp}.${rnd}.${packed}.${mac}`,
    expiresIn: ttl,
    scopes: [...scopes],
  };
}

export async function parseAccessToken(
  secret: string,
  token: string | undefined,
): Promise<{ userId: string; scopes: string[] } | null> {
  if (!token?.startsWith(ACCESS_PREFIX)) return null;
  const parts = token.slice(ACCESS_PREFIX.length).split('.');
  if (parts.length === 4) {
    const [userId, expRaw, rnd, mac] = parts;
    const exp = Number(expRaw);
    if (!userId || !rnd || !mac || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const expected = await hmacHex(secret, `m1:${userId}:${exp}:${rnd}`);
    return timingSafeEqual(mac, expected) ? { userId, scopes: [...CLAUDE_SCOPES] } : null;
  }
  if (parts.length !== 5) return null;
  const [userId, expRaw, rnd, packed, mac] = parts;
  const exp = Number(expRaw);
  if (!userId || !rnd || !packed || !mac || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const scopes = decodeScopes(packed);
  const expected = await hmacHex(secret, `m1:${userId}:${exp}:${rnd}:${scopes.join(' ')}`);
  return timingSafeEqual(mac, expected) ? { userId, scopes } : null;
}

export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return undefined;
  return header.slice(7).trim() || undefined;
}

export async function handleRegister(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: mcpCorsHeaders() });
  }
  let body: { client_name?: string; redirect_uris?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return oauthError('invalid_client_metadata', 'Expected JSON');
  }
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((item): item is string => typeof item === 'string')
    : [];
  if (redirectUris.length === 0 || redirectUris.some((uri) => !allowedRedirectUri(uri))) {
    return oauthError('invalid_redirect_uri', 'Redirect URI is not allowed');
  }
  const existing = await findMcpClientByRedirects(redirectUris);
  const clientId = existing?.client_id ?? `mcp.${randomToken(16)}`;
  if (!existing) {
    await insertMcpClient({
      client_id: clientId,
      client_name: body.client_name?.trim() || 'Claude',
      redirect_uris: JSON.stringify(redirectUris),
    });
  }
  return oauthJson(
    {
      client_id: clientId,
      client_name: body.client_name?.trim() || existing?.client_name || 'Claude',
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    existing ? 200 : 201,
  );
}

export async function resolveClient(clientId: string): Promise<ResolvedClient | null> {
  if (clientId.startsWith('https://')) return fetchCimd(clientId);
  const row = await getMcpClient(clientId);
  if (!row) return null;
  let redirectUris: string[] = [];
  try {
    const parsed = JSON.parse(row.redirect_uris) as unknown;
    if (Array.isArray(parsed)) redirectUris = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return null;
  }
  return { clientId: row.client_id, clientName: row.client_name || 'Claude', redirectUris };
}

async function fetchCimd(clientId: string): Promise<ResolvedClient | null> {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !CIMD_HOSTS.has(url.hostname)) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const doc = (await response.json()) as { client_id?: string; client_name?: string; redirect_uris?: unknown };
  if (doc.client_id !== clientId) return null;
  const redirectUris = Array.isArray(doc.redirect_uris)
    ? doc.redirect_uris.filter((item): item is string => typeof item === 'string')
    : [];
  if (redirectUris.length === 0) return null;
  return { clientId, clientName: doc.client_name?.trim() || 'Claude', redirectUris };
}

function sameResource(origin: string, resource: string | null): boolean {
  if (!resource) return true;
  return resource.replace(/\/$/, '') === mcpResourceUrl(origin).replace(/\/$/, '');
}

function oauthParams(source: URLSearchParams | FormData) {
  const get = (name: string) => {
    const value = source.get(name);
    return typeof value === 'string' ? value : '';
  };
  return {
    clientId: get('client_id'),
    redirectUri: get('redirect_uri'),
    responseType: get('response_type') || 'code',
    challenge: get('code_challenge'),
    method: get('code_challenge_method') || 'S256',
    state: get('state'),
    resource: get('resource') || null,
    scope: get('scope') || SCOPE,
  };
}

function failToRedirect(origin: string, redirectUri: string, state: string, error: string, description: string): Response {
  if (allowedRedirectUri(redirectUri)) {
    const target = new URL(redirectUri);
    target.searchParams.set('error', error);
    target.searchParams.set('error_description', description);
    if (state) target.searchParams.set('state', state);
    target.searchParams.set('iss', origin);
    return new Response(null, { status: 302, headers: { Location: target.toString() } });
  }
  return oauthError(error, description);
}

export async function readAuthorizeRequest(
  origin: string,
  source: URLSearchParams | FormData,
): Promise<Response | { client: ResolvedClient; params: ReturnType<typeof oauthParams> }> {
  const params = oauthParams(source);
  if (params.responseType !== 'code') {
    return failToRedirect(origin, params.redirectUri, params.state, 'unsupported_response_type', 'Use response_type=code');
  }
  if (params.method !== 'S256' || !params.challenge) {
    return failToRedirect(origin, params.redirectUri, params.state, 'invalid_request', 'PKCE S256 is required');
  }
  if (!sameResource(origin, params.resource)) {
    return failToRedirect(origin, params.redirectUri, params.state, 'invalid_target', 'resource does not match this server');
  }
  const client = await resolveClient(params.clientId);
  if (!client) {
    return failToRedirect(origin, params.redirectUri, params.state, 'invalid_client', 'Unknown client');
  }
  if (!allowedRedirectUri(params.redirectUri) || !redirectMatches(client.redirectUris, params.redirectUri)) {
    return oauthError('invalid_request', 'Redirect URI is not allowed');
  }
  return { client, params };
}

export function authorizePageFrom(client: ResolvedClient, params: ReturnType<typeof oauthParams>): AuthorizePage {
  return {
    clientName: client.clientName,
    redirectHost: redirectHostname(params.redirectUri),
    hidden: {
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: params.responseType,
      code_challenge: params.challenge,
      code_challenge_method: params.method,
      state: params.state,
      resource: params.resource ?? '',
      scope: params.scope,
    },
  };
}

export async function completeAuthorize(origin: string, form: FormData, userId: string): Promise<Response> {
  const parsed = await readAuthorizeRequest(origin, form);
  if (parsed instanceof Response) return parsed;
  const decision = String(form.get('decision') ?? '');
  if (decision !== 'allow') {
    return failToRedirect(origin, parsed.params.redirectUri, parsed.params.state, 'access_denied', 'The user declined');
  }
  const code = randomToken(32);
  await saveMcpCode({
    code,
    clientId: parsed.client.clientId,
    userId,
    redirectUri: parsed.params.redirectUri,
    codeChallenge: parsed.params.challenge,
    expiresAt: Math.floor(Date.now() / 1000) + CODE_TTL,
  });
  const target = new URL(parsed.params.redirectUri);
  target.searchParams.set('code', code);
  if (parsed.params.state) target.searchParams.set('state', parsed.params.state);
  target.searchParams.set('iss', origin);
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
}

async function issueTokens(secret: string, clientId: string, userId: string): Promise<Response> {
  const access = await createAccessToken(secret, userId);
  const refresh = randomToken(32);
  await saveMcpRefresh({
    token: refresh,
    clientId,
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TTL,
  });
  return oauthJson({
    access_token: access.token,
    token_type: 'Bearer',
    expires_in: access.expiresIn,
    refresh_token: refresh,
    scope: SCOPE,
  });
}

export async function handleToken(request: Request, origin: string, secret: string): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: mcpCorsHeaders() });
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return oauthError('invalid_request', 'Use application/x-www-form-urlencoded', 415);
  }
  const form = await request.formData();
  const grant = String(form.get('grant_type') ?? '');
  const clientId = String(form.get('client_id') ?? '');
  const resource = String(form.get('resource') ?? '') || null;
  if (!sameResource(origin, resource)) {
    return oauthError('invalid_target', 'resource does not match this server');
  }
  const client = await resolveClient(clientId);
  if (!client) return oauthError('invalid_client', 'Unknown client', 401);

  if (grant === 'authorization_code') {
    const code = String(form.get('code') ?? '');
    const redirectUri = String(form.get('redirect_uri') ?? '');
    const verifier = String(form.get('code_verifier') ?? '');
    const row = await takeMcpCode(code);
    if (!row || row.client_id !== client.clientId || row.redirect_uri !== redirectUri) {
      return oauthError('invalid_grant', 'Authorization code is invalid');
    }
    const expected = await pkceChallenge(verifier);
    if (!timingSafeEqual(expected, row.code_challenge)) {
      return oauthError('invalid_grant', 'PKCE verification failed');
    }
    return issueTokens(secret, client.clientId, row.user_id);
  }

  if (grant === 'refresh_token') {
    const refresh = String(form.get('refresh_token') ?? '');
    const row = await takeMcpRefresh(refresh);
    if (!row || row.client_id !== client.clientId) {
      return oauthError('invalid_grant', 'Refresh token is invalid');
    }
    return issueTokens(secret, client.clientId, row.user_id);
  }

  return oauthError('unsupported_grant_type', 'Use authorization_code or refresh_token');
}
