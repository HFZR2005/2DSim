import { z } from 'zod';
import { CONFIDENCE } from './signal';
import { TYPE_MAX } from './taskType';

export const NOTE_MAX = 8000;

export const createStudentSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

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

export const loginSchema = z.object({
  pin: z.string().min(1).max(80),
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

export const grantAccessSchema = z
  .object({
    email: z.email().max(160),
    kind: z.enum(['staff', 'adult', 'self']),
    studentId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== 'staff' && !value.studentId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose a student',
        path: ['studentId'],
      });
    }
  });
