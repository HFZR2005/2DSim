import { withViewer } from '../../../study/auth/guard';
import { requireStudentAccess, requireViewer, visibleStudentIds } from '../../../study/auth/session';
import { studentSummaries } from '../../../study/db';
import { json } from '../../../study/http';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request; url: URL }) {
  return withViewer(context, async () => {
    const viewer = requireViewer(context.locals);
    const requested = context.url.searchParams.get('student') ?? undefined;
    if (requested) {
      requireStudentAccess(context.locals, requested);
      return json({ students: await studentSummaries(requested) });
    }
    const allowed = visibleStudentIds(viewer);
    if (allowed) {
      return json({ students: await studentSummaries(undefined, allowed) });
    }
    return json({ students: await studentSummaries() });
  });
}
