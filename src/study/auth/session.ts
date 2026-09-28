import type { APIContext } from 'astro';
import {
  getUser,
  hasStaffAccess,
  learnerStudentId,
  listAccessForEmail,
  listAccessForUser,
  listShareStudentIdsForEmail,
  listUserRoles,
  rosterStudentIdsForOwner,
  type AccessRow,
} from '../db';
import { getAuthSecret, getStudyPin } from '../env';
import { parseCookie, STUDY_COOKIE, tokenIsStaff, userIdFromToken } from './cookie';
import {
  canAccessStudent,
  canManageRosters,
  canManageStudents,
  canWriteStudent,
  visibleStudentIds,
  type Viewer,
} from './viewer';

export function viewerFromAccess(userId: string, access: AccessRow[]): Viewer {
  if (access.some((row) => row.kind === 'staff')) {
    return { role: 'staff', userId };
  }
  const self = access.find((row) => row.kind === 'self' && row.student_id);
  if (self?.student_id) {
    return { role: 'student', userId, studentId: self.student_id };
  }
  const studentIds = [
    ...new Set(access.filter((row) => row.kind === 'adult' && row.student_id).map((row) => row.student_id as string)),
  ];
  if (studentIds.length > 0) {
    return { role: 'supervisor', userId, studentIds, writableIds: studentIds };
  }
  return { role: 'pending', userId };
}

export async function resolveViewer(userId: string, email: string, access: AccessRow[]): Promise<Viewer> {
  if (access.some((row) => row.kind === 'staff')) {
    return { role: 'staff', userId };
  }

  const [roles, ownId, rosterIds, shareIds] = await Promise.all([
    listUserRoles(userId),
    learnerStudentId(userId),
    rosterStudentIdsForOwner(userId),
    listShareStudentIdsForEmail(email),
  ]);
  const adultIds = [
    ...new Set(access.filter((row) => row.kind === 'adult' && row.student_id).map((row) => row.student_id as string)),
  ];
  const isSupervisor = roles.includes('supervisor') || rosterIds.length > 0 || adultIds.length > 0;
  const writableIds = [...new Set([...rosterIds, ...adultIds, ...(ownId ? [ownId] : [])])];
  const viewIds = [...new Set([...writableIds, ...shareIds])];

  if (isSupervisor) {
    return {
      role: 'supervisor',
      userId,
      studentId: ownId ?? undefined,
      studentIds: viewIds,
      writableIds,
    };
  }
  if (ownId) {
    return { role: 'student', userId, studentId: ownId };
  }
  if (shareIds.length > 0) {
    return { role: 'viewer', userId, studentIds: shareIds };
  }
  return { role: 'pending', userId };
}

export function requireViewer(locals: App.Locals): Viewer {
  if (!locals.viewer) {
    throw new Response(JSON.stringify({ error: 'Sign in required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return locals.viewer;
}

export function requireStaff(locals: App.Locals): Viewer {
  const viewer = requireViewer(locals);
  if (!canManageStudents(viewer)) {
    throw new Response(JSON.stringify({ error: 'Staff only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return viewer;
}

export function requireUser(locals: App.Locals): Viewer & { userId: string } {
  const viewer = requireViewer(locals);
  if (!viewer.userId) {
    throw new Response(JSON.stringify({ error: 'Sign in with Google to continue' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return viewer as Viewer & { userId: string };
}

export function requireStudentAccess(locals: App.Locals, studentId: string): Viewer {
  const viewer = requireViewer(locals);
  if (!canAccessStudent(viewer, studentId)) {
    throw new Response(JSON.stringify({ error: 'Not allowed for this student' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return viewer;
}

export function requireStudentWrite(locals: App.Locals, studentId: string): Viewer {
  const viewer = requireViewer(locals);
  if (!canWriteStudent(viewer, studentId)) {
    throw new Response(JSON.stringify({ error: 'Not allowed to change this student' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return viewer;
}

export function requireStudentSelf(locals: App.Locals, studentId: string): Viewer {
  const viewer = requireViewer(locals);
  const ownId =
    viewer.role === 'student'
      ? viewer.studentId
      : viewer.role === 'supervisor'
        ? viewer.studentId
        : undefined;
  if (!ownId || ownId !== studentId) {
    throw new Response(JSON.stringify({ error: 'Only this student can add their timetable' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return viewer;
}

export { canManageRosters, canWriteStudent, visibleStudentIds };

export async function attachViewer(context: APIContext): Promise<Viewer | null> {
  const token = parseCookie(context.request.headers.get('cookie'), STUDY_COOKIE);
  try {
    const secret = getAuthSecret();
    const userId = await userIdFromToken(secret, token);
    if (userId) {
      const user = await getUser(userId);
      if (!user) {
        context.locals.viewer = null;
        return null;
      }
      const access = [...(await listAccessForUser(user.id)), ...(await listAccessForEmail(user.email))];
      const unique = new Map(access.map((row) => [row.id, row]));
      context.locals.viewer = await resolveViewer(user.id, user.email, [...unique.values()]);
      return context.locals.viewer;
    }
  } catch {
    // AUTH_SECRET missing — fall through
  }

  try {
    if (!(await hasStaffAccess())) {
      const pin = getStudyPin();
      if (await tokenIsStaff(pin, token)) {
        context.locals.viewer = { role: 'staff' };
        return context.locals.viewer;
      }
    }
  } catch {
    context.locals.viewer = null;
    return null;
  }

  context.locals.viewer = null;
  return null;
}
