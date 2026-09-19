import type { APIContext } from 'astro';
import { getStudyPin } from '../env';
import { canAccessStudent, canManageStudents, type Viewer } from './viewer';
import { parseCookie, STUDY_COOKIE, tokenIsStaff } from './cookie';

export function readViewer(request: Request, pin: string): Promise<Viewer | null> {
  const token = parseCookie(request.headers.get('cookie'), STUDY_COOKIE);
  return tokenIsStaff(pin, token).then((ok) => (ok ? { role: 'staff' } : null));
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

export async function attachViewer(context: APIContext): Promise<Viewer | null> {
  try {
    const pin = getStudyPin();
    const viewer = await readViewer(context.request, pin);
    context.locals.viewer = viewer;
    return viewer;
  } catch {
    context.locals.viewer = null;
    return null;
  }
}
