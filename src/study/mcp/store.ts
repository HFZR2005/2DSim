import { getBindings } from '../env';
import { sha256Hex } from './crypto';

export type McpClient = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string;
};

export type McpCode = {
  code_hash: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  expires_at: number;
};

export type McpRefresh = {
  token_hash: string;
  client_id: string;
  user_id: string;
  expires_at: number;
};

function db(): D1Database {
  return getBindings().DB;
}

export async function getMcpClient(clientId: string): Promise<McpClient | null> {
  return db()
    .prepare('SELECT client_id, client_name, redirect_uris FROM mcp_clients WHERE client_id = ?')
    .bind(clientId)
    .first<McpClient>();
}

export async function findMcpClientByRedirects(redirectUris: string[]): Promise<McpClient | null> {
  const encoded = JSON.stringify(redirectUris);
  return db()
    .prepare('SELECT client_id, client_name, redirect_uris FROM mcp_clients WHERE redirect_uris = ?')
    .bind(encoded)
    .first<McpClient>();
}

export async function insertMcpClient(client: McpClient): Promise<void> {
  await db()
    .prepare('INSERT INTO mcp_clients (client_id, client_name, redirect_uris) VALUES (?, ?, ?)')
    .bind(client.client_id, client.client_name, client.redirect_uris)
    .run();
}

export async function saveMcpCode(input: {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: number;
}): Promise<void> {
  await db()
    .prepare(
      'INSERT INTO mcp_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      await sha256Hex(input.code),
      input.clientId,
      input.userId,
      input.redirectUri,
      input.codeChallenge,
      input.expiresAt,
    )
    .run();
}

export async function takeMcpCode(code: string): Promise<McpCode | null> {
  const codeHash = await sha256Hex(code);
  const row = await db()
    .prepare(
      'SELECT code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at FROM mcp_codes WHERE code_hash = ?',
    )
    .bind(codeHash)
    .first<McpCode>();
  if (!row) return null;
  await db().prepare('DELETE FROM mcp_codes WHERE code_hash = ?').bind(codeHash).run();
  if (row.expires_at < Math.floor(Date.now() / 1000)) return null;
  return row;
}

export async function saveMcpRefresh(input: {
  token: string;
  clientId: string;
  userId: string;
  expiresAt: number;
}): Promise<void> {
  await db()
    .prepare('INSERT INTO mcp_refresh (token_hash, client_id, user_id, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(input.token), input.clientId, input.userId, input.expiresAt)
    .run();
}

export async function takeMcpRefresh(token: string): Promise<McpRefresh | null> {
  const tokenHash = await sha256Hex(token);
  const row = await db()
    .prepare('SELECT token_hash, client_id, user_id, expires_at FROM mcp_refresh WHERE token_hash = ?')
    .bind(tokenHash)
    .first<McpRefresh>();
  if (!row) return null;
  await db().prepare('DELETE FROM mcp_refresh WHERE token_hash = ?').bind(tokenHash).run();
  if (row.expires_at < Math.floor(Date.now() / 1000)) return null;
  return row;
}

export async function getIdempotent(userId: string, clientRequestId: string): Promise<unknown | null> {
  const row = await db()
    .prepare('SELECT result FROM mcp_idempotency WHERE user_id = ? AND client_request_id = ?')
    .bind(userId, clientRequestId)
    .first<{ result: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.result) as unknown;
  } catch {
    return null;
  }
}

export async function saveIdempotent(userId: string, clientRequestId: string, result: unknown): Promise<void> {
  await db()
    .prepare('INSERT OR IGNORE INTO mcp_idempotency (user_id, client_request_id, result) VALUES (?, ?, ?)')
    .bind(userId, clientRequestId, JSON.stringify(result))
    .run();
}
