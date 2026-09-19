import { withViewer } from '../../../study/auth/guard';
import { requireStudentAccess, requireViewer } from '../../../study/auth/session';
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
    } else if (viewer.role === 'student') {
      return json({
        sessions: await listSessions({ studentId: viewer.studentId, subject }),
        subjects: await distinctSubjects(viewer.studentId),
      });
    }

    return json({
      sessions: await listSessions({ studentId, subject }),
      subjects: await distinctSubjects(studentId),
    });
  });
}
