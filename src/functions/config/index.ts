import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { isAuthError, requireAdmin, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { getConfig, logEvent, updateConfig } from '../../shared/storage';
import { AppConfig } from '../../shared/types';

const corsHeaders = getCorsHeaders('GET,PUT,OPTIONS');

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function parseConfigUpdate(body: Record<string, unknown>): Partial<AppConfig> | string {
  const update: Partial<AppConfig> = {};
  if ('runWindowStart' in body) {
    if (!isTimeString(body.runWindowStart)) return 'Invalid runWindowStart';
    update.runWindowStart = body.runWindowStart;
  }
  if ('runWindowEnd' in body) {
    if (!isTimeString(body.runWindowEnd)) return 'Invalid runWindowEnd';
    update.runWindowEnd = body.runWindowEnd;
  }
  if ('timezone' in body) {
    if (typeof body.timezone !== 'string') return 'Invalid timezone';
    update.timezone = body.timezone;
  }
  if ('precipProbThreshold' in body) {
    if (!isNumber(body.precipProbThreshold)) return 'Invalid precipProbThreshold';
    update.precipProbThreshold = body.precipProbThreshold;
  }
  if ('windSpeedThreshold' in body) {
    if (!isNumber(body.windSpeedThreshold)) return 'Invalid windSpeedThreshold';
    update.windSpeedThreshold = body.windSpeedThreshold;
  }
  if ('debounceMinutes' in body) {
    if (!isNumber(body.debounceMinutes)) return 'Invalid debounceMinutes';
    update.debounceMinutes = body.debounceMinutes;
  }
  if ('pollIntervalMinutes' in body) {
    if (!isNumber(body.pollIntervalMinutes)) return 'Invalid pollIntervalMinutes';
    update.pollIntervalMinutes = body.pollIntervalMinutes;
  }
  if ('location' in body) {
    const location = body.location as { lat?: unknown; lon?: unknown };
    if (!location || !isNumber(location.lat) || !isNumber(location.lon)) {
      return 'Invalid location';
    }
    update.location = { lat: location.lat, lon: location.lon };
  }
  if ('weatherProvider' in body) {
    if (body.weatherProvider !== 'azure-maps' && body.weatherProvider !== 'openweather') {
      return 'Invalid weatherProvider';
    }
    update.weatherProvider = body.weatherProvider;
  }
  if ('dryRun' in body) {
    if (typeof body.dryRun !== 'boolean') return 'Invalid dryRun';
    update.dryRun = body.dryRun;
  }
  if ('kasaDeviceAlias' in body) {
    if (typeof body.kasaDeviceAlias !== 'string') return 'Invalid kasaDeviceAlias';
    update.kasaDeviceAlias = body.kasaDeviceAlias;
  }
  return update;
}

app.http('config', {
  methods: ['GET', 'PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'config',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const timestamp = new Date().toISOString();
    try {
      if (req.method === 'GET') {
        const authResult = requireAuth(req, corsHeaders);
        if (isAuthError(authResult)) return authResult;
        const config = await getConfig();
        return { status: 200, jsonBody: config, headers: corsHeaders };
      }
      const adminResult = requireAdmin(req, corsHeaders);
      if (isAuthError(adminResult)) return adminResult;
      const body = (await req.json()) as Record<string, unknown>;
      const update = parseConfigUpdate(body);
      if (typeof update === 'string') {
        return { status: 400, jsonBody: { error: update }, headers: corsHeaders };
      }
      await updateConfig(update);
      await logEvent({
        id: '',
        timestamp,
        type: 'config_change',
        success: true,
      });
      const updatedConfig = await getConfig();
      return { status: 200, jsonBody: updatedConfig, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown config error';
      console.error(JSON.stringify({ event: 'config_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to update config' },
        headers: corsHeaders,
      };
    }
  },
});
