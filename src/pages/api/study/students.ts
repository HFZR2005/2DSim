import { withViewer } from '../../../study/auth/guard';
import { requireStaff, requireViewer } from '../../../study/auth/session';
import { createStudent, studentSummaries } from '../../../study/db';
import { json, readJson } from '../../../study/http';
import { createStudentSchema } from '../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request; url: URL }) {
  return withViewer(context, async () => {
    const viewer = requireViewer(context.locals);
    const requested = context.url.searchParams.get('student') ?? undefined;
    if (requested) {
      if (viewer.role === 'student' && viewer.studentId !== requested) {
        return json({ error: 'Not allowed for this student' }, 403);
      }
      return json({ students: await studentSummaries(requested) });
    }
    if (viewer.role === 'student') {
      return json({ students: await studentSummaries(viewer.studentId) });
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
