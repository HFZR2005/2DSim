import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentAccess } from '../../../../../study/auth/session';
import { createTest, getStudent } from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { createTestSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function POST(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentAccess(context.locals, studentId);
    if (!(await getStudent(studentId))) {
      return json({ error: 'Student not found' }, 404);
    }

    const parsed = createTestSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid test' }, 400);
    }

    const score = parsed.data.score?.trim() ? parsed.data.score.trim() : null;
    const test = await createTest({
      studentId,
      subject: parsed.data.subject,
      track: parsed.data.track,
      title: parsed.data.title,
      score,
      confidence: score ? null : (parsed.data.confidence ?? null),
      note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
    });
    return json({ test }, 201);
  });
}
