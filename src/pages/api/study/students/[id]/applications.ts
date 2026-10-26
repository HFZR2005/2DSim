import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentAccess, requireStudentWrite } from '../../../../../study/auth/session';
import { getStudent } from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { createApplication, isStage, listApplications } from '../../../../../study/mcp/applications';
import { createApplicationSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; params: { id: string }; url: URL }) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentAccess(context.locals, studentId);
    const includeClosed = context.url.searchParams.get('include_closed') === '1';
    const stageParam = context.url.searchParams.get('stage');
    const stage = stageParam && isStage(stageParam) ? stageParam : undefined;
    return json({ applications: await listApplications(studentId, stage, includeClosed) });
  });
}

export async function POST(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentWrite(context.locals, studentId);
    if (!(await getStudent(studentId))) {
      return json({ error: 'Student not found' }, 404);
    }

    const parsed = createApplicationSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid application' }, 400);
    }

    const application = await createApplication({
      studentId,
      company: parsed.data.company,
      role: parsed.data.role,
      stage: parsed.data.stage ?? 'applied',
      nextEvent: parsed.data.next_event ?? null,
      url: parsed.data.url?.trim() ? parsed.data.url.trim() : null,
      notes: parsed.data.notes?.trim() ?? '',
    });
    return json({ application }, 201);
  });
}
