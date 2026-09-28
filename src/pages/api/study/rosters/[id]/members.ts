import { withViewer } from '../../../../../study/auth/guard';
import { requireUser } from '../../../../../study/auth/session';
import {
  addRosterMember,
  getRoster,
  getStudent,
  learnerIdForEmail,
  learnerStudentId,
  removeRosterMember,
} from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { rosterMemberSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function POST(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    const roster = await getRoster(context.params.id);
    if (!roster || roster.owner_user_id !== viewer.userId) {
      return json({ error: 'Roster not found' }, 404);
    }
    const parsed = rosterMemberSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Enter a student email' }, 400);
    }
    const studentId = await learnerIdForEmail(parsed.data.email);
    if (!studentId || !(await getStudent(studentId))) {
      return json({ error: 'That email has not signed up as a student yet. Share the join code instead.' }, 404);
    }
    await addRosterMember(roster.id, studentId);
    return json({ ok: true }, 201);
  });
}

export async function DELETE(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    const body = (await readJson(context.request)) as { studentId?: string } | null;
    const studentId = body?.studentId?.trim();
    if (!studentId) {
      return json({ error: 'Choose a student' }, 400);
    }
    const roster = await getRoster(context.params.id);
    if (!roster) {
      return json({ error: 'Roster not found' }, 404);
    }
    const ownId =
      viewer.role === 'student'
        ? viewer.studentId
        : viewer.role === 'supervisor'
          ? viewer.studentId
          : await learnerStudentId(viewer.userId);
    if (roster.owner_user_id !== viewer.userId && ownId !== studentId) {
      return json({ error: 'Not allowed' }, 403);
    }
    const removed = await removeRosterMember(context.params.id, studentId);
    if (!removed) {
      return json({ error: 'Student not on this roster' }, 404);
    }
    return json({ ok: true });
  });
}
