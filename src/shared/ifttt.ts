import { WebhookResult } from './types';

const MAX_RETRIES = 4; // 1 initial attempt + 3 retries
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 10000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callWebhook(event: string, key: string, dryRun: boolean): Promise<WebhookResult> {
  if (dryRun) {
    return {
      success: true,
      statusCode: 200,
      latencyMs: 0,
      retries: 0,
      responseBody: 'dry_run',
    };
  }

  const url = `https://maker.ifttt.com/trigger/${encodeURIComponent(event)}/with/key/${encodeURIComponent(
    key
  )}`;
  let lastError: string | undefined;
  let lastStatus = 0;
  let lastBody = '';
  let lastLatency = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { method: 'POST', signal: controller.signal });
      const body = await response.text();
      lastLatency = Date.now() - start;
      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          latencyMs: lastLatency,
          retries: attempt,
          responseBody: body,
        };
      }
      lastStatus = response.status;
      lastBody = body;
      lastError = `IFTTT webhook returned ${response.status}`;
    } catch (err) {
      lastLatency = Date.now() - start;
      lastError = err instanceof Error ? err.message : 'Unknown webhook error';
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < MAX_RETRIES - 1) {
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
      const jitter = 0.8 + Math.random() * 0.4;
      await delay(backoff * jitter);
    }
  }

  return {
    success: false,
    statusCode: lastStatus,
    latencyMs: lastLatency,
    retries: MAX_RETRIES - 1,
    responseBody: lastBody,
    error: lastError,
  };
}
