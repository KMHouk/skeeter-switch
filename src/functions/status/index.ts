import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getLastDecision, getState, getSystemHealth } from '../../shared/storage';
import { StatusResponse } from '../../shared/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

app.http('status', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'status',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    try {
      const [state, lastDecision, systemHealth] = await Promise.all([
        getState(),
        getLastDecision(),
        getSystemHealth(),
      ]);
      const response: StatusResponse = { state, lastDecision, systemHealth };
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
