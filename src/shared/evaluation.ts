import { toggleDevice } from './kasa';
import { evaluateDecision } from './decision';
import { fetchWeather } from './weather';
import {
  getConfig,
  getState,
  logEvent,
  updateCo2Runtime,
  updateLastDecision,
  updateState,
  updateSystemHealth,
} from './storage';
import { DecisionResult, WebhookResult } from './types';

export interface EvaluationOutcome {
  decision: DecisionResult;
  webhookResult: WebhookResult | null;
}

export async function runEvaluationCycle(reason: string): Promise<EvaluationOutcome | null> {
  const now = new Date();
  const config = await getConfig();

  if (config.winterMode) {
    console.log(JSON.stringify({ event: 'winter_mode_skip', reason }));
    return null;
  }
  const weather = await fetchWeather(config);
  await updateSystemHealth({ lastWeatherFetchAt: weather.fetchedAt, alertStatus: 'ok' });

  const state = await getState();
  const decision = evaluateDecision(config, weather, state, now);
  await updateState({ desiredState: decision.desiredState });

  let webhookResult: WebhookResult | null = null;
  const shouldCommand = decision.desiredState !== state.lastCommandedState && decision.debounceOk;

  if (shouldCommand) {
    webhookResult = await toggleDevice(decision.desiredState, config.kasaDeviceAlias, decision.dryRun);
    const lastResult = decision.dryRun ? 'dry_run' : webhookResult.success ? 'success' : 'failure';
    await updateState({
      lastCommandedState: decision.desiredState,
      lastCommandTime: decision.timestamp,
      lastResult,
      lastError: webhookResult.success ? null : webhookResult.error ?? 'Webhook call failed',
    });
    await logEvent({
      id: '',
      timestamp: decision.timestamp,
      type: 'webhook_call',
      desiredState: decision.desiredState,
      commandedState: decision.desiredState,
      webhookEvent: `kasa:${decision.desiredState}`,
      webhookStatusCode: webhookResult.statusCode,
      webhookLatencyMs: webhookResult.latencyMs,
      webhookRetries: webhookResult.retries,
      success: webhookResult.success,
      error: webhookResult.error,
      dryRun: decision.dryRun,
    });
  }

  await updateLastDecision(decision);
  await updateSystemHealth({
    lastEvaluationAt: decision.timestamp,
    alertStatus: webhookResult && !webhookResult.success ? 'warning' : 'ok',
  });
  await logEvent({
    id: '',
    timestamp: decision.timestamp,
    type: 'evaluation',
    desiredState: decision.desiredState,
    success: webhookResult ? webhookResult.success : true,
    reasons: decision.reasons,
    dryRun: decision.dryRun,
  });

  if (decision.desiredState === 'on') {
    await updateCo2Runtime(config.pollIntervalMinutes / 60);
  }

  console.log(JSON.stringify({ event: 'evaluation_cycle', reason, decision, webhookResult }));
  return { decision, webhookResult };
}
