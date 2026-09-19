import { withViewer } from '../../../study/auth/guard';
import { requireStudentAccess, requireViewer } from '../../../study/auth/session';
import { subjectOverview } from '../../../study/db';
import { json } from '../../../study/http';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request; url: URL }) {
  return withViewer(context, async () => {
    const viewer = requireViewer(context.locals);
    const studentId =
      context.url.searchParams.get('student') ?? (viewer.role === 'student' ? viewer.studentId : null);
    if (!studentId) {
      return json({ error: 'Select a student' }, 400);
    }
    requireStudentAccess(context.locals, studentId);
    const subject = context.url.searchParams.get('subject') ?? undefined;
    return json({ subjects: await subjectOverview(studentId, subject) });
  });
}
