import { withViewer } from '../../../study/auth/guard';
import { requireStudentAccess, requireViewer, visibleStudentIds } from '../../../study/auth/session';
import { listTests } from '../../../study/db';
import { json } from '../../../study/http';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request; url: URL }) {
  return withViewer(context, async () => {
    const viewer = requireViewer(context.locals);
    const studentId = context.url.searchParams.get('student') ?? undefined;
    const subject = context.url.searchParams.get('subject') ?? undefined;

    if (studentId) {
      requireStudentAccess(context.locals, studentId);
      return json({ tests: await listTests({ studentId, subject }) });
    }

    const allowed = visibleStudentIds(viewer);
    return json({ tests: await listTests({ studentIds: allowed ?? undefined, subject }) });
  });
}
