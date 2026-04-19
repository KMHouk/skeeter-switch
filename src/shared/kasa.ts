import { WebhookResult } from './types';
import { getTpLinkCredentials } from './keyvault';

// Ambient types for tplink-cloud-api (no @types package available)
interface TpLinkDeviceInfo {
  alias: string;
  deviceId: string;
  deviceModel: string;
}
interface TpLinkDevice {
  powerOn(): Promise<unknown>;
  powerOff(): Promise<unknown>;
  getSysInfo(): Promise<{
    children?: Array<{ id: string; state: number; alias: string }>;
    [key: string]: unknown;
  }>;
}
interface TpLinkCloud {
  getDeviceList(): Promise<TpLinkDeviceInfo[]>;
  getHS100(alias: string): TpLinkDevice;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const tplinkCloudApi = require('tplink-cloud-api') as { login: (u: string, p: string) => Promise<TpLinkCloud> };

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function toggleDevice(state: 'on' | 'off', deviceAlias: string, dryRun: boolean): Promise<WebhookResult> {
  if (dryRun) {
    return { success: true, statusCode: 200, latencyMs: 0, retries: 0, responseBody: 'dry_run' };
  }

  const credentials = await getTpLinkCredentials();
  let lastError: string | undefined;
  let lastLatency = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const start = Date.now();
    try {
      const cloud = await tplinkCloudApi.login(credentials.username, credentials.password);
      const devices = await cloud.getDeviceList();

      // Find the parent device that contains the target child outlet alias
      let targetDevice: TpLinkDevice | undefined;
      for (const info of devices) {
        const dev = cloud.getHS100(info.alias);
        const sysInfo = await dev.getSysInfo();
        if (sysInfo.children) {
          const child = sysInfo.children.find(
            (c) => c.alias.toLowerCase() === deviceAlias.toLowerCase()
          );
          if (child) {
            targetDevice = dev;
            break;
          }
        }
        // Also match by parent alias
        if (info.alias.toLowerCase() === deviceAlias.toLowerCase()) {
          targetDevice = dev;
          break;
        }
      }

      if (!targetDevice) {
        throw new Error(`Device with alias "${deviceAlias}" not found in TP-Link account`);
      }

      if (state === 'on') {
        await targetDevice.powerOn();
      } else {
        await targetDevice.powerOff();
      }

      lastLatency = Date.now() - start;
      return {
        success: true,
        statusCode: 200,
        latencyMs: lastLatency,
        retries: attempt,
        responseBody: state === 'on' ? 'device_on' : 'device_off',
      };
    } catch (err) {
      lastLatency = Date.now() - start;
      lastError = err instanceof Error ? err.message : 'Unknown Kasa API error';
    }

    if (attempt < MAX_RETRIES - 1) {
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
      const jitter = 0.8 + Math.random() * 0.4;
      await delay(backoff * jitter);
    }
  }

  return {
    success: false,
    statusCode: 500,
    latencyMs: lastLatency,
    retries: MAX_RETRIES - 1,
    responseBody: '',
    error: lastError,
  };
}
