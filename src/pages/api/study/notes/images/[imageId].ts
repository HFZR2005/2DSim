import { withViewer } from '../../../../../study/auth/guard';
import { requireStudentAccess } from '../../../../../study/auth/session';
import { getNoteImage } from '../../../../../study/db';
import { getNotesBucket } from '../../../../../study/env';
import { json } from '../../../../../study/http';
import { noteImageKey } from '../../../../../study/noteImage';

export const prerender = false;

export async function GET(context: { locals: App.Locals; params: { imageId: string }; request: Request }) {
  return withViewer(context, async () => {
    const image = await getNoteImage(context.params.imageId);
    if (!image) {
      return json({ error: 'Image not found' }, 404);
    }
    requireStudentAccess(context.locals, image.student_id);
    const object = await getNotesBucket().get(noteImageKey(image.id));
    if (!object) {
      return json({ error: 'Image not found' }, 404);
    }
    return new Response(object.body as BodyInit, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? image.mime,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  });
}
