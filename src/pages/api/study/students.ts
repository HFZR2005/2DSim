import { withViewer } from '../../../study/auth/guard';
import { requireStaff, requireStudentAccess, requireViewer, visibleStudentIds } from '../../../study/auth/session';
import { createStudent, studentSummaries } from '../../../study/db';
import { json, readJson } from '../../../study/http';
import { createStudentSchema } from '../../../study/schemas';

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

export async function POST(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    requireStaff(context.locals);
    const parsed = createStudentSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Name is required' }, 400);
    }
    const student = await createStudent(parsed.data.displayName);
    return json({ student }, 201);
  });
}
