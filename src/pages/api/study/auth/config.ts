import { getGoogleOAuth } from '../../../../study/env';
import { hasStaffAccess } from '../../../../study/db';
import { handleApi, json } from '../../../../study/http';

export const prerender = false;

export async function GET() {
  return handleApi(async () => {
    return json({
      googleEnabled: Boolean(getGoogleOAuth()),
      pinEnabled: !(await hasStaffAccess()),
    });
  });
}
