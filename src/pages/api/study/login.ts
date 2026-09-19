import { createStaffToken, serializeStudyCookie } from '../../../study/auth/cookie';
import { hasStaffAccess } from '../../../study/db';
import { getStudyPin } from '../../../study/env';
import { handleApi, json, readJson } from '../../../study/http';
import { loginSchema } from '../../../study/schemas';

export const prerender = false;

export async function POST({ request, url }: { request: Request; url: URL }) {
  return handleApi(async () => {
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return json({ error: 'Enter the PIN' }, 400);
    }

    let pin: string;
    try {
      pin = getStudyPin();
    } catch {
      return json({ error: 'STUDY_PIN is not configured' }, 503);
    }

    if (await hasStaffAccess()) {
      return json({ error: 'Use Google to sign in' }, 403);
    }

    if (parsed.data.pin !== pin) {
      return json({ error: 'Incorrect PIN' }, 401);
    }

    const token = await createStaffToken(pin);
    const secure = url.protocol === 'https:';
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': serializeStudyCookie(token, secure),
      },
    });
  });
}
