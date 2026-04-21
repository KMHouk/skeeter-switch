import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { isAuthError, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { getCo2Tracker, getLastDecision, getState, getSystemHealth } from '../../shared/storage';
import { StatusResponse } from '../../shared/types';

const corsHeaders = getCorsHeaders('GET,OPTIONS');

app.http('status', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'status',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const authResult = requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult;
    try {
      const [state, lastDecision, systemHealth, co2Tracker] = await Promise.all([
        getState(),
        getLastDecision(),
        getSystemHealth(),
        getCo2Tracker(),
      ]);
      const response: StatusResponse = { state, lastDecision, systemHealth, co2Tracker };
      return { status: 200, jsonBody: response, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown status error';
      console.error(JSON.stringify({ event: 'status_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to load status' },
        headers: corsHeaders,
      };
    }
  },
});
