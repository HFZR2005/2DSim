import { clearStudyCookie } from '../../../study/auth/cookie';
import { handleApi } from '../../../study/http';

export const prerender = false;

export async function POST({ url }: { url: URL }) {
  return handleApi(async () => {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearStudyCookie(url.protocol === 'https:'),
      },
    });
  });
}
