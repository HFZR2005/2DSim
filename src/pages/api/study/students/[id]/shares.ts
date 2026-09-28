import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentSelf } from '../../../../../study/auth/session';
import { createShare, listSharesForStudent } from '../../../../../study/db';
import { json, readJson } from '../../../../../study/http';
import { createShareSchema } from '../../../../../study/schemas';

export const prerender = false;

export async function GET(context: { locals: App.Locals; params: { id: string } }) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentSelf(context.locals, studentId);
    return json({ shares: await listSharesForStudent(studentId) });
  });
}

export async function POST(context: {
  locals: App.Locals;
  params: { id: string };
  request: Request;
}) {
  return withViewer(context, async () => {
    const studentId = context.params.id;
    requireStudentSelf(context.locals, studentId);
    const parsed = createShareSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Enter an email' }, 400);
    }
    const share = await createShare(studentId, parsed.data.email);
    return json({ share }, 201);
  });
}
