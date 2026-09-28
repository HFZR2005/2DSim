import { withViewer } from '../../../../../../study/auth/guard';
import { requireStudentSelf } from '../../../../../../study/auth/session';
import { deleteShare } from '../../../../../../study/db';
import { json } from '../../../../../../study/http';

export const prerender = false;

export async function DELETE(context: {
  locals: App.Locals;
  params: { id: string; shareId: string };
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentSelf(context.locals, studentId);
    const removed = await deleteShare(studentId, context.params.shareId);
    if (!removed) {
      return json({ error: 'Share not found' }, 404);
    }
    return json({ ok: true });
  });
}
