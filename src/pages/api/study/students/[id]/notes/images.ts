import { withViewer } from '../../../../../../study/auth/guard';
import { requireStudentWrite } from '../../../../../../study/auth/session';
import { createNoteImage, getStudent } from '../../../../../../study/db';
import { getNotesBucket } from '../../../../../../study/env';
import { json } from '../../../../../../study/http';
import { NOTE_IMAGE_MAX_BYTES, noteImageKey, sniffImageMime } from '../../../../../../study/noteImage';

export const prerender = false;

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

    const buffer = await context.request.arrayBuffer();
    if (buffer.byteLength === 0) {
      return json({ error: 'Choose an image' }, 400);
    }
    if (buffer.byteLength > NOTE_IMAGE_MAX_BYTES) {
      return json({ error: 'That image is too large' }, 413);
    }

    const bytes = new Uint8Array(buffer);
    const mime = sniffImageMime(bytes);
    if (!mime) {
      return json({ error: 'Use a JPEG, PNG, WebP, or GIF' }, 400);
    }

    const image = await createNoteImage({ studentId, mime, bytes: bytes.byteLength });
    await getNotesBucket().put(noteImageKey(image.id), bytes, {
      httpMetadata: { contentType: mime },
    });
    return json({ id: image.id }, 201);
  });
}
