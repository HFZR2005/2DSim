import type { Viewer } from '../auth/viewer';
import { canAccessStudent, canWriteStudent } from '../auth/viewer';
import { learnerStudentId } from '../db';
import { forbidden, noSelf } from './errors';

export const CLAUDE_SCOPES = ['self:read', 'self:write'] as const;

export type McpAuth = {
  userId: string;
  viewer: Viewer;
  scopes: string[];
  selfStudentId: string | null;
};

export async function mcpAuth(userId: string, viewer: Viewer, scopes: string[]): Promise<McpAuth> {
  return {
    userId,
    viewer,
    scopes,
    selfStudentId: await learnerStudentId(userId),
  };
}

export function hasScope(auth: McpAuth, scope: string): boolean {
  return auth.scopes.includes(scope);
}

export function resolveStudentId(auth: McpAuth, raw: unknown, need: 'read' | 'write'): string {
  const requested = typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
  if (!requested) {
    if (!auth.selfStudentId) throw noSelf();
    const scope = need === 'write' ? 'self:write' : 'self:read';
    if (!hasScope(auth, scope)) throw forbidden(`Token lacks ${scope}`);
    if (need === 'write' && !canWriteStudent(auth.viewer, auth.selfStudentId)) throw forbidden();
    if (need === 'read' && !canAccessStudent(auth.viewer, auth.selfStudentId)) throw forbidden();
    return auth.selfStudentId;
  }

  const other = requested !== auth.selfStudentId;
  const scope = other
    ? need === 'write'
      ? 'students:write'
      : 'students:read'
    : need === 'write'
      ? 'self:write'
      : 'self:read';
  if (!hasScope(auth, scope)) throw forbidden(`Token lacks ${scope}`);
  if (need === 'write' && !canWriteStudent(auth.viewer, requested)) throw forbidden();
  if (need === 'read' && !canAccessStudent(auth.viewer, requested)) throw forbidden();
  return requested;
}

export function assertLogAccess(auth: McpAuth, studentId: string, need: 'read' | 'write'): void {
  resolveStudentId(auth, studentId, need);
}
