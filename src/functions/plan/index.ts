import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { addHours, differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { isAuthError, requireAuth } from '../../shared/auth';
import { getCorsHeaders } from '../../shared/cors';
import { evaluateDecision } from '../../shared/decision';
import { fetchWeather } from '../../shared/weather';
import { getConfig, getDailyRuntimes } from '../../shared/storage';
import { PlanBlock, PlanResponse, SwitchState } from '../../shared/types';

const corsHeaders = getCorsHeaders('GET,OPTIONS');

const MAX_DAYS = 31;

function buildBaseState(): SwitchState {
  return {
    desiredState: null,
    lastCommandedState: null,
    lastCommandTime: null,
    lastResult: null,
    lastError: null,
    activeOverride: null,
  };
}

app.http('plan', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'plan',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }
    const authResult = requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult;
    try {
      const fromParam = req.query.get('from');
      const toParam = req.query.get('to');
      if (!fromParam || !toParam) {
        return { status: 400, jsonBody: { error: 'from and to are required' }, headers: corsHeaders };
      }
      const fromDate = parseISO(fromParam);
      const toDate = parseISO(toParam);
      if (!isValid(fromDate) || !isValid(toDate)) {
        return { status: 400, jsonBody: { error: 'Invalid date format' }, headers: corsHeaders };
      }
      const daySpan = differenceInCalendarDays(toDate, fromDate) + 1;
      if (daySpan > MAX_DAYS || daySpan <= 0) {
        return {
          status: 400,
          jsonBody: { error: 'Date range must be between 1 and 31 days' },
          headers: corsHeaders,
        };
      }
      const config = await getConfig();
      const weather = await fetchWeather(config);
      const baseState = buildBaseState();

      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 0, 0, 0);

      const blocks: PlanBlock[] = [];
      let currentBlock: PlanBlock | null = null;
      for (let cursor = new Date(start); cursor <= end; cursor = addHours(cursor, 1)) {
        const decision = evaluateDecision(config, weather, baseState, cursor);
        const blockStart = cursor.toISOString();
        const blockEnd = addHours(cursor, 1).toISOString();
        if (!currentBlock) {
          currentBlock = {
            start: blockStart,
            end: blockEnd,
            state: decision.desiredState,
            reasons: decision.reasons,
          };
          continue;
        }
        if (currentBlock.state === decision.desiredState) {
          currentBlock.end = blockEnd;
        } else {
          blocks.push(currentBlock);
          currentBlock = {
            start: blockStart,
            end: blockEnd,
            state: decision.desiredState,
            reasons: decision.reasons,
          };
        }
      }
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      const actuals = await getDailyRuntimes(fromParam, toParam);

      const response: PlanResponse = {
        from: fromParam,
        to: toParam,
        blocks,
        actuals,
        generatedAt: new Date().toISOString(),
      };
      return { status: 200, jsonBody: response, headers: corsHeaders };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown plan error';
      console.error(JSON.stringify({ event: 'plan_error', error: message }));
      return {
        status: 500,
        jsonBody: { error: 'Failed to generate plan' },
        headers: corsHeaders,
      };
    }
  },
});
