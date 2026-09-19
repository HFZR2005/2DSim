import { withViewer } from '../../../study/auth/guard';
import { requireStudentAccess, requireViewer, visibleStudentIds } from '../../../study/auth/session';
import { distinctSubjects, listSessions } from '../../../study/db';
import { json } from '../../../study/http';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request; url: URL }) {
  return withViewer(context, async () => {
    const viewer = requireViewer(context.locals);
    const studentId = context.url.searchParams.get('student') ?? undefined;
    const subject = context.url.searchParams.get('subject') ?? undefined;

    if (studentId) {
      requireStudentAccess(context.locals, studentId);
      return json({
        sessions: await listSessions({ studentId, subject }),
        subjects: await distinctSubjects(studentId),
      });
    }

    const allowed = visibleStudentIds(viewer);
    return json({
      sessions: await listSessions({ studentIds: allowed ?? undefined, subject }),
      subjects: await distinctSubjects(undefined, allowed ?? undefined),
    });
  });
}
