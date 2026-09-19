import type { APIContext } from 'astro';
import {
  getUser,
  hasStaffAccess,
  listAccessForEmail,
  listAccessForUser,
  type AccessRow,
} from '../db';
import { getAuthSecret, getStudyPin } from '../env';
import { parseCookie, STUDY_COOKIE, tokenIsStaff, userIdFromToken } from './cookie';
import {
  canAccessStudent,
  canManageStudents,
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
    return { role: 'adult', userId, studentIds };
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

export { visibleStudentIds };

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
      context.locals.viewer = viewerFromAccess(user.id, [...unique.values()]);
      return context.locals.viewer;
    }
  } catch {
    // AUTH_SECRET missing — fall through to PIN bootstrap
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
