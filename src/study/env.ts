import { env } from 'cloudflare:workers';

export type StudyBindings = {
  DB: D1Database;
  NOTES: R2Bucket;
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export function getBindings(): StudyBindings {
  const bindings = env as unknown as StudyBindings;
  if (!bindings.DB) {
    throw new Error('D1 binding DB is not configured');
  }
  return bindings;
}

export function getAuthSecret(): string {
  const secret = (env as unknown as StudyBindings).AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return secret;
}

export function getNotesBucket(): R2Bucket {
  const bucket = (env as unknown as StudyBindings).NOTES;
  if (!bucket) {
    throw new Error('R2 binding NOTES is not configured');
  }
  return bucket;
}

export function getGoogleOAuth(): { clientId: string; clientSecret: string } | null {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } =
    env as unknown as StudyBindings;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
