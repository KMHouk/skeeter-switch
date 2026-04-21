import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { isAuthError, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { getCo2Tracker, resetCo2Tank } from '../../shared/storage';

const corsHeaders = getCorsHeaders('POST,OPTIONS');

app.http('co2-reset', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'co2-reset',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const authResult = requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult;
    try {
      await resetCo2Tank();
      const tracker = await getCo2Tracker();
      console.log(JSON.stringify({ event: 'co2_tank_reset' }));
      return { status: 200, jsonBody: { success: true, tracker }, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(JSON.stringify({ event: 'co2_reset_error', error: message }));
      return { status: 500, jsonBody: { error: 'Failed to reset CO2 tracker' }, headers: corsHeaders };
    }
  },
});
