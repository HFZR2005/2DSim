import { z } from 'zod';
import { EVENT_TYPES, STAGES } from './mcp/applications';
import { CONFIDENCE } from './signal';
import { TYPE_MAX } from './taskType';

export const NOTE_MAX = 8000;

export const createSessionSchema = z.object({
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(TYPE_MAX).optional(),
  score: z.string().trim().max(40).optional(),
  confidence: z.enum(CONFIDENCE).optional(),
  note: z.string().trim().max(NOTE_MAX).optional(),
});

export const createTestSchema = z.object({
  subject: z.string().trim().min(1).max(80),
  track: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  type: z.string().trim().min(1).max(TYPE_MAX).optional(),
  score: z.string().trim().min(1).max(40),
  confidence: z.enum(CONFIDENCE).optional(),
  note: z.string().trim().max(NOTE_MAX).optional(),
});

export const updateNoteSchema = z.object({
  note: z.string().max(NOTE_MAX),
});

export const deleteSubjectSchema = z.object({
  subject: z.string().trim().min(1).max(80),
});

export const ICS_MAX = 800_000;

export const updateCalendarSchema = z.object({
  url: z.string().trim().max(500).nullable(),
});

export const chooseRoleSchema = z.object({
  role: z.enum(['learner', 'supervisor']),
});

export const createRosterSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const joinRosterSchema = z.object({
  code: z.string().trim().min(4).max(12),
});

export const rosterMemberSchema = z.object({
  email: z.email().max(160),
});

export const createShareSchema = z.object({
  email: z.email().max(160),
});

const nextEventSchema = z
  .object({
    type: z.enum(EVENT_TYPES),
    at: z.string().trim().min(1).max(40),
    ends_at: z.string().trim().max(40).optional(),
    label: z.string().trim().max(160).optional(),
  })
  .nullable();

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  stage: z.enum(STAGES).optional(),
  next_event: nextEventSchema.optional(),
  url: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const updateApplicationSchema = z.object({
  stage: z.enum(STAGES).optional(),
  next_event: nextEventSchema.optional(),
  url: z.string().trim().max(500).nullable().optional(),
  notes: z.string().max(4000).optional(),
  append_note: z.string().trim().min(1).max(400).optional(),
});
