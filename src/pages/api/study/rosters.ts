import { withViewer } from '../../../study/auth/guard';
import { canManageRosters, requireUser } from '../../../study/auth/session';
import {
  createRoster,
  learnerStudentId,
  listJoinedRosters,
  listOwnedRosters,
} from '../../../study/db';
import { json, readJson } from '../../../study/http';
import { createRosterSchema } from '../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    const owned = canManageRosters(viewer) ? await listOwnedRosters(viewer.userId) : [];
    const ownStudentId =
      viewer.role === 'student'
        ? viewer.studentId
        : viewer.role === 'supervisor'
          ? viewer.studentId
          : await learnerStudentId(viewer.userId);
    const joined = ownStudentId ? await listJoinedRosters(ownStudentId) : [];
    return json({
      owned: owned.map((roster) => ({
        ...roster,
        join_code: roster.join_code,
      })),
      joined: joined.map((roster) => ({
        id: roster.id,
        name: roster.name,
        owner_email: roster.owner_email,
        members: roster.members,
      })),
    });
  });
}

export async function POST(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    if (!canManageRosters(viewer) && viewer.role !== 'pending') {
      return json({ error: 'Only supervisors can create a roster' }, 403);
    }
    if (viewer.role === 'pending') {
      return json({ error: 'Choose how you will use the tracker first' }, 403);
    }
    const parsed = createRosterSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Name the roster' }, 400);
    }
    const roster = await createRoster(viewer.userId, parsed.data.name);
    return json({ roster }, 201);
  });
}
