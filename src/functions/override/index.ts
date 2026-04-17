import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { clearOverride, logEvent, setOverride } from '../../shared/storage';
import { OverrideRecord, OverrideState } from '../../shared/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function isOverrideState(value: string): value is OverrideState {
  return value === 'on' || value === 'off' || value === 'auto';
}

app.http('override', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'override',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const timestamp = new Date().toISOString();
    try {
      const body = (await req.json()) as { state?: string; ttlMinutes?: number };
      if (!body.state || !isOverrideState(body.state)) {
        return { status: 400, jsonBody: { error: 'Invalid override state' }, headers: corsHeaders };
      }
      if (body.state === 'auto') {
        await clearOverride();
        await logEvent({
          id: '',
          timestamp,
          type: 'override_set',
          success: true,
        });
        return { status: 200, jsonBody: null, headers: corsHeaders };
      }

      const ttlMinutes = body.ttlMinutes ?? 60;
      if (typeof ttlMinutes !== 'number' || ttlMinutes <= 0) {
        return { status: 400, jsonBody: { error: 'Invalid ttlMinutes' }, headers: corsHeaders };
      }
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      const override: OverrideRecord = {
        state: body.state,
        expiresAt,
        setBy: req.headers.get('x-ms-client-principal-name') ?? 'unknown',
        setAt: timestamp,
      };
      await setOverride(override);
      await logEvent({
        id: '',
        timestamp,
        type: 'override_set',
        desiredState: body.state,
        success: true,
      });
      return { status: 200, jsonBody: override, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown override error';
      console.error(JSON.stringify({ event: 'override_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to set override' },
        headers: corsHeaders,
      };
    }
  },
});
