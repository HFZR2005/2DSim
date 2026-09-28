import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentWrite } from '../../../../../study/auth/session';
import { deleteSubjectLogs, getStudent } from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { deleteSubjectSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function DELETE(context: { locals: App.Locals; params: { id: string }; request: Request }) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentWrite(context.locals, studentId);
    if (!(await getStudent(studentId))) {
      return json({ error: 'Student not found' }, 404);
    }

    const parsed = deleteSubjectSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid subject' }, 400);
    }

    const removed = await deleteSubjectLogs(studentId, parsed.data.subject);
    if (removed.sessions === 0 && removed.tests === 0) {
      return json({ error: 'Subject not found' }, 404);
    }
    return json({ ok: true, ...removed });
  });
}
