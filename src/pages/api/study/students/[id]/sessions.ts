import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentWrite } from '../../../../../study/auth/session';
import { createSession, getStudent } from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { createSessionSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function POST(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentWrite(context.locals, studentId);
    if (!(await getStudent(studentId))) {
      return json({ error: 'Student not found' }, 404);
    }

    const parsed = createSessionSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid session' }, 400);
    }

    const score = parsed.data.score?.trim() ? parsed.data.score.trim() : null;
    const session = await createSession({
      studentId,
      subject: parsed.data.subject,
      topic: parsed.data.topic,
      type: parsed.data.type ?? 'Practice',
      score,
      confidence: score ? null : (parsed.data.confidence ?? null),
      note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
    });
    return json({ session }, 201);
  });
}
