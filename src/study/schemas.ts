import { z } from 'zod';
import { CONFIDENCE } from './signal';

export const createStudentSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export const createSessionSchema = z
  .object({
    subject: z.string().trim().min(1).max(80),
    topic: z.string().trim().min(1).max(120),
    score: z.string().trim().max(40).optional(),
    confidence: z.enum(CONFIDENCE).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    const score = value.score?.trim() ? value.score.trim() : null;
    if (!score && !value.confidence) {
      ctx.addIssue({
        code: 'custom',
        message: 'Add a score or a confidence rating',
        path: ['confidence'],
      });
    }
  });

export const createTestSchema = z
  .object({
    subject: z.string().trim().min(1).max(80),
    track: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(160),
    score: z.string().trim().max(40).optional(),
    confidence: z.enum(CONFIDENCE).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    const score = value.score?.trim() ? value.score.trim() : null;
    if (!score && !value.confidence) {
      ctx.addIssue({
        code: 'custom',
        message: 'Add a score or a confidence rating',
        path: ['confidence'],
      });
    }
  });

export const loginSchema = z.object({
  pin: z.string().min(1).max(80),
});
