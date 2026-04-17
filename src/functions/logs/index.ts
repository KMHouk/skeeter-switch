import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getRecentLogs } from '../../shared/storage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

app.http('logs', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'logs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    try {
      const limitParam = req.query.get('limit');
      const parsedLimit = limitParam ? Number(limitParam) : 50;
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        return { status: 400, jsonBody: { error: 'Invalid limit' }, headers: corsHeaders };
      }
      const limit = Math.min(parsedLimit, 200);
      const logs = await getRecentLogs(limit);
      return { status: 200, jsonBody: logs, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown logs error';
      console.error(JSON.stringify({ event: 'logs_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to load logs' },
        headers: corsHeaders,
      };
    }
  },
});
