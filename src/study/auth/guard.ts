import { attachViewer } from './session';
import { handleApi } from '../http';

export function withViewer(
  context: { request: Request; locals: App.Locals },
  run: () => Promise<Response>,
): Promise<Response> {
  return handleApi(async () => {
    await attachViewer(context);
    return run();
  });
}
