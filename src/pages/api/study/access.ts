import { withViewer } from '../../../study/auth/guard';
import { requireStaff, requireStudentAccess } from '../../../study/auth/session';
import { getStudent, grantAccess, listAccessForStudent } from '../../../study/db';
import { json, readJson } from '../../../study/http';
import { grantAccessSchema } from '../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request; url: URL }) {
  return withViewer(context, async () => {
    requireStaff(context.locals);
    const studentId = context.url.searchParams.get('student');
    if (!studentId) {
      return json({ error: 'Select a student' }, 400);
    }
    requireStudentAccess(context.locals, studentId);
    return json({ access: await listAccessForStudent(studentId) });
  });
}

export async function POST(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    requireStaff(context.locals);
    const parsed = grantAccessSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid access' }, 400);
    }
    if (parsed.data.kind !== 'staff') {
      const studentId = parsed.data.studentId;
      if (!studentId || !(await getStudent(studentId))) {
        return json({ error: 'Student not found' }, 404);
      }
    }
    const access = await grantAccess({
      email: parsed.data.email,
      kind: parsed.data.kind,
      studentId: parsed.data.studentId,
    });
    return json({ access }, 201);
  });
}
