import { env } from 'cloudflare:workers';

export type StudyBindings = {
  DB: D1Database;
  STUDY_PIN: string;
};

export function getBindings(): StudyBindings {
  const bindings = env as unknown as StudyBindings;
  if (!bindings.DB) {
    throw new Error('D1 binding DB is not configured');
  }
  return bindings;
}

export function getStudyPin(): string {
  const pin = (env as unknown as StudyBindings).STUDY_PIN;
  if (!pin) {
    throw new Error('STUDY_PIN is not configured');
  }
  return pin;
}
