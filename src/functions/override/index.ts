import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { isAuthError, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { toggleDevice } from '../../shared/kasa';
import { clearOverride, getConfig, logEvent, setOverride, updateLastDecision, updateState } from '../../shared/storage';
import { OverrideRecord, OverrideState, PowerState } from '../../shared/types';

const corsHeaders = getCorsHeaders('POST,OPTIONS');

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
    const authResult = requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult;
    const timestamp = new Date().toISOString();
    try {
      const body = (await req.json()) as { state?: string; ttlMinutes?: number };
      if (!body.state || !isOverrideState(body.state)) {
        return { status: 400, jsonBody: { error: 'Invalid override state' }, headers: corsHeaders };
      }
      if (body.state === 'auto') {
        await clearOverride();
        await updateState({
          desiredState: null,
          lastCommandedState: null,
          lastCommandTime: null,
          lastResult: null,
          lastError: null,
        });
        await updateLastDecision({
          timestamp,
          desiredState: 'off',
          reasons: ['Override cleared — returned to AUTO.'],
          weatherOk: true,
          withinTimeWindow: false,
          debounceOk: true,
          overrideActive: false,
          weather: { currentlyRaining: false, precipProbability: 0, windSpeedMph: 0, temperatureF: 70, description: 'N/A', fetchedAt: timestamp },
          dryRun: false,
        });
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

      // Immediately toggle the device to match the override
      const config = await getConfig();
      const result = await toggleDevice(body.state as PowerState, config.kasaDeviceAlias, config.dryRun);
      const lastResult = config.dryRun ? 'dry_run' : result.success ? 'success' : 'failure';
      await updateState({
        desiredState: body.state as PowerState,
        lastCommandedState: body.state as PowerState,
        lastCommandTime: timestamp,
        lastResult,
        lastError: result.success ? null : result.error ?? 'Override toggle failed',
      });
      await logEvent({
        id: '',
        timestamp,
        type: 'override_set',
        desiredState: body.state,
        commandedState: body.state,
        webhookEvent: `kasa:${body.state}`,
        webhookStatusCode: result.statusCode,
        webhookLatencyMs: result.latencyMs,
        webhookRetries: result.retries,
        success: result.success,
        error: result.error,
        dryRun: config.dryRun,
      });
      return { status: 200, jsonBody: { ...override, toggleResult: result }, headers: corsHeaders };
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
