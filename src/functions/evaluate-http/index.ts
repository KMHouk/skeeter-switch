import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { isAuthError, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { runEvaluationCycle } from '../../shared/evaluation';

const corsHeaders = getCorsHeaders('POST,OPTIONS');

app.http('evaluate-http', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'evaluate',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const authResult = requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult;
    try {
      const { decision } = await runEvaluationCycle('http');
      return { status: 200, jsonBody: decision, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown evaluation error';
      console.error(JSON.stringify({ event: 'evaluate_http_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to evaluate' },
        headers: corsHeaders,
      };
    }
  },
});
