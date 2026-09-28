import { withViewer } from '../../../../study/auth/guard';
import { requireUser } from '../../../../study/auth/session';
import { becomeLearner, becomeSupervisor, getUser } from '../../../../study/db';
import { json, readJson } from '../../../../study/http';
import { chooseRoleSchema } from '../../../../study/schemas';

export const prerender = false;

export async function POST(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    const viewer = requireUser(context.locals);
    const user = await getUser(viewer.userId);
    if (!user) {
      return json({ error: 'Sign in with Google to continue' }, 403);
    }
    const parsed = chooseRoleSchema.safeParse(await readJson(context.request));
    if (!parsed.success) {
      return json({ error: 'Choose student or supervisor' }, 400);
    }
    if (parsed.data.role === 'learner') {
      await becomeLearner(user);
    } else {
      await becomeSupervisor(user.id);
    }
    return json({ ok: true });
  });
}
