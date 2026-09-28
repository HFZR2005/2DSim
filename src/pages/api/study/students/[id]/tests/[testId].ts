import { withViewer } from '../../../../../../study/auth/guard';
import { requireStudentWrite } from '../../../../../../study/auth/session';
import { deleteTest, updateTestNote } from '../../../../../../study/db';
import { json, readJson } from '../../../../../../study/http';
import { updateNoteSchema } from '../../../../../../study/schemas';

export const prerender = false;

export async function PATCH(context: {
  locals: App.Locals;
  params: { id: string; testId: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentWrite(context.locals, studentId);
    const parsed = updateNoteSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid note' }, 400);
    }
    const note = parsed.data.note.trim() ? parsed.data.note.trim() : null;
    const test = await updateTestNote(studentId, context.params.testId, note);
    if (!test) {
      return json({ error: 'Test not found' }, 404);
    }
    return json({ test });
  });
}

export async function DELETE(context: {
  locals: App.Locals;
  params: { id: string; testId: string };
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentWrite(context.locals, studentId);
    const removed = await deleteTest(studentId, context.params.testId);
    if (!removed) {
      return json({ error: 'Test not found' }, 404);
    }
    return json({ ok: true });
  });
}
