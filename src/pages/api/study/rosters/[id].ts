import { withViewer } from '../../../../study/auth/guard';
import { requireUser } from '../../../../study/auth/session';
import { deleteRoster, getRoster, learnerStudentId, removeRosterMember } from '../../../../study/db';
import { json } from '../../../../study/http';

export const prerender = false;

export async function DELETE(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    const roster = await getRoster(context.params.id);
    if (!roster) {
      return json({ error: 'Roster not found' }, 404);
    }
    if (roster.owner_user_id === viewer.userId) {
      const removed = await deleteRoster(roster.id, viewer.userId);
      return json({ ok: removed });
    }
    const studentId =
      viewer.role === 'student'
        ? viewer.studentId
        : viewer.role === 'supervisor'
          ? viewer.studentId
          : await learnerStudentId(viewer.userId);
    if (!studentId) {
      return json({ error: 'Not allowed' }, 403);
    }
    const left = await removeRosterMember(roster.id, studentId);
    if (!left) {
      return json({ error: 'You are not in this roster' }, 404);
    }
    return json({ ok: true });
  });
}
