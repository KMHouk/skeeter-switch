import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { differenceInMinutes, parseISO } from 'date-fns';
import { isAuthError, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { callWebhook } from '../../shared/ifttt';
import { getIftttKey } from '../../shared/keyvault';
import { getConfig, getState, logEvent, updateState } from '../../shared/storage';
import { PowerState, WebhookResult } from '../../shared/types';

const corsHeaders = getCorsHeaders('POST,OPTIONS');

function isPowerState(value: string): value is PowerState {
  return value === 'on' || value === 'off';
}

function buildSkippedResult(reason: string): WebhookResult {
  return {
    success: true,
    statusCode: 200,
    latencyMs: 0,
    retries: 0,
    responseBody: reason,
  };
}

app.http('command', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'command',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const authResult = requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult;
    const timestamp = new Date().toISOString();
    try {
      const body = (await req.json()) as { state?: string };
      if (!body.state || !isPowerState(body.state)) {
        return { status: 400, jsonBody: { error: 'Invalid command state' }, headers: corsHeaders };
      }
      const [config, state] = await Promise.all([getConfig(), getState()]);
      const lastCommandTime = state.lastCommandTime ? parseISO(state.lastCommandTime) : null;
      const debounceOk =
        !lastCommandTime ||
        differenceInMinutes(new Date(), lastCommandTime) >= config.debounceMinutes;
      const stateDiffers = body.state !== state.lastCommandedState;

      if (!stateDiffers && !debounceOk) {
        return { status: 409, jsonBody: { error: 'Debounce active' }, headers: corsHeaders };
      }
      if (!stateDiffers) {
        const result = buildSkippedResult('already_in_state');
        await logEvent({
          id: '',
          timestamp,
          type: 'manual_command',
          desiredState: body.state,
          commandedState: body.state,
          success: true,
        });
        return { status: 200, jsonBody: result, headers: corsHeaders };
      }

      const key = await getIftttKey();
      const event = body.state === 'on' ? config.iftttEventOn : config.iftttEventOff;
      const result = await callWebhook(event, key, config.dryRun);
      const lastResult = config.dryRun ? 'dry_run' : result.success ? 'success' : 'failure';
      await updateState({
        desiredState: body.state,
        lastCommandedState: body.state,
        lastCommandTime: timestamp,
        lastResult,
        lastError: result.success ? null : result.error ?? 'Webhook call failed',
      });
      await logEvent({
        id: '',
        timestamp,
        type: 'manual_command',
        desiredState: body.state,
        commandedState: body.state,
        webhookEvent: event,
        webhookStatusCode: result.statusCode,
        webhookLatencyMs: result.latencyMs,
        webhookRetries: result.retries,
        success: result.success,
        error: result.error,
        dryRun: config.dryRun,
      });
      return { status: 200, jsonBody: result, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown command error';
      console.error(JSON.stringify({ event: 'command_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to run command' },
        headers: corsHeaders,
      };
    }
  },
});
