import { withViewer } from '../../../../study/auth/guard';
import { requireUser } from '../../../../study/auth/session';
import { addRosterMember, getRosterByCode, learnerStudentId } from '../../../../study/db';
import { json, readJson } from '../../../../study/http';
import { normalizeJoinCode } from '../../../../study/joinCode';
import { joinRosterSchema } from '../../../../study/schemas';

export const prerender = false;

export async function POST(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    const studentId =
      viewer.role === 'student'
        ? viewer.studentId
        : viewer.role === 'supervisor'
          ? viewer.studentId
          : await learnerStudentId(viewer.userId);
    if (!studentId) {
      return json({ error: 'Create a student account first, then join a class' }, 403);
    }
    const parsed = joinRosterSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Enter a class code' }, 400);
    }
    const roster = await getRosterByCode(normalizeJoinCode(parsed.data.code));
    if (!roster) {
      return json({ error: 'That code does not match a roster' }, 404);
    }
    await addRosterMember(roster.id, studentId);
    return json({ roster: { id: roster.id, name: roster.name } }, 201);
  });
}
