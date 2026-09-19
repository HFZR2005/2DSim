import { withViewer } from '../../../study/auth/guard';
import { requireViewer } from '../../../study/auth/session';
import { getUser } from '../../../study/db';
import { json } from '../../../study/http';

export const prerender = false;

export async function GET(context: { locals: App.Locals; request: Request }) {
  return withViewer(context, async () => {
    const viewer = requireViewer(context.locals);
    const user = viewer.userId ? await getUser(viewer.userId) : null;
    return json({
      viewer,
      email: user?.email ?? null,
      displayName: user?.display_name ?? null,
    });
  });
}
