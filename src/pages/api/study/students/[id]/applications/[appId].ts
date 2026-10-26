import { withViewer } from '../../../../../../study/auth/guard';
import { requireStudentAccess, requireStudentWrite } from '../../../../../../study/auth/session';
import { json, readJson } from '../../../../../../study/http';
import { getApplication, updateApplication } from '../../../../../../study/mcp/applications';
import { ToolError } from '../../../../../../study/mcp/errors';
import { updateApplicationSchema } from '../../../../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; params: { id: string; appId: string } }) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentAccess(context.locals, studentId);
    const application = await getApplication(context.params.appId);
    if (!application || application.student_id !== studentId) {
      return json({ error: 'Application not found' }, 404);
    }
    return json({ application });
  });
}

export async function PATCH(context: {
  locals: App.Locals;
  params: { id: string; appId: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentWrite(context.locals, studentId);
    const current = await getApplication(context.params.appId);
    if (!current || current.student_id !== studentId) {
      return json({ error: 'Application not found' }, 404);
    }

    const parsed = updateApplicationSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? 'Invalid update' }, 400);
    }

    try {
      const application = await updateApplication(current.id, {
        stage: parsed.data.stage,
        nextEvent: parsed.data.next_event,
        url: parsed.data.url === undefined ? undefined : parsed.data.url?.trim() ? parsed.data.url.trim() : null,
        notes: parsed.data.notes,
        appendNote: parsed.data.append_note,
      });
      return json({ application });
    } catch (error) {
      if (error instanceof ToolError) {
        return json({ error: error.message }, error.code === 'NOT_FOUND' ? 404 : 400);
      }
      throw error;
    }
  });
}
