import { randomUUID } from 'crypto';
import { WebhookResult } from './types';
import { getTpLinkCredentials } from './keyvault';

// Direct TP-Link Cloud API implementation (replaces unmaintained tplink-cloud-api package)
const TPLINK_API_URL = 'https://wap.tplinkcloud.com';
const APP_PARAMS: Record<string, string> = {
  appName: 'Kasa_Android',
  appVer: '2.2.0.0',
  ospf: 'Android+12',
  netType: 'wifi',
  locale: 'en_US',
};
const USER_AGENT = 'Dalvik/2.1.0 (Linux; U; Android 12; SM-G991B Build/SP1A.210812.016)';

interface TpLinkResponse {
  error_code: number;
  msg?: string;
  result?: Record<string, unknown>;
}

interface DeviceInfo {
  deviceId: string;
  alias: string;
  deviceModel: string;
  appServerUrl: string;
  deviceType: string;
}

interface SysInfoChild {
  id: string;
  state: number;
  alias: string;
}

interface SysInfo {
  children?: SysInfoChild[];
  relay_state?: number;
}

async function tplinkPost(url: string, termId: string, token: string | null, body: Record<string, unknown>): Promise<TpLinkResponse> {
  const params = new URLSearchParams({ ...APP_PARAMS, termID: termId, ...(token ? { token } : {}) });
  const response = await fetch(`${url}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as TpLinkResponse;
  if (data.error_code !== 0) {
    throw new Error(`TP-Link API error: code=${data.error_code}, msg=${data.msg ?? 'unknown'}`);
  }
  return data;
}

async function tplinkLogin(username: string, password: string, termId: string): Promise<string> {
  const data = await tplinkPost(TPLINK_API_URL, termId, null, {
    method: 'login',
    params: {
      appType: 'Kasa_Android',
      cloudPassword: password,
      cloudUserName: username,
      terminalUUID: termId,
    },
  });
  return (data.result as { token: string }).token;
}

async function getDeviceList(termId: string, token: string): Promise<DeviceInfo[]> {
  const data = await tplinkPost(TPLINK_API_URL, termId, token, { method: 'getDeviceList' });
  return (data.result as { deviceList: DeviceInfo[] }).deviceList;
}

async function passthroughCommand(
  device: DeviceInfo,
  termId: string,
  token: string,
  command: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const data = await tplinkPost(device.appServerUrl, termId, token, {
    method: 'passthrough',
    params: { deviceId: device.deviceId, requestData: JSON.stringify(command) },
  });
  const responseData = (data.result as { responseData: string }).responseData;
  return JSON.parse(responseData) as Record<string, unknown>;
}

async function getSysInfo(device: DeviceInfo, termId: string, token: string): Promise<SysInfo> {
  const result = await passthroughCommand(device, termId, token, {
    system: { get_sysinfo: null },
  });
  return (result as { system: { get_sysinfo: SysInfo } }).system.get_sysinfo;
}

async function setRelayState(
  device: DeviceInfo,
  termId: string,
  token: string,
  relayState: number,
  childId?: string,
): Promise<void> {
  const command: Record<string, unknown> = { system: { set_relay_state: { state: relayState } } };
  if (childId) {
    command.context = { child_ids: [childId] };
  }
  await passthroughCommand(device, termId, token, command);
}

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
      const termId = randomUUID();
      const token = await tplinkLogin(credentials.username, credentials.password, termId);
      const devices = await getDeviceList(termId, token);

      let targetDevice: DeviceInfo | undefined;
      let targetChildId: string | undefined;

      for (const device of devices) {
        // Match by parent alias
        if (device.alias.toLowerCase() === deviceAlias.toLowerCase()) {
          targetDevice = device;
          break;
        }
        // Check children (multi-outlet devices like EP40)
        const sysInfo = await getSysInfo(device, termId, token);
        if (sysInfo.children) {
          const child = sysInfo.children.find(
            (c) => c.alias.toLowerCase() === deviceAlias.toLowerCase(),
          );
          if (child) {
            targetDevice = device;
            targetChildId = child.id;
            break;
          }
        }
      }

      if (!targetDevice) {
        throw new Error(`Device with alias "${deviceAlias}" not found in TP-Link account`);
      }

      await setRelayState(targetDevice, termId, token, state === 'on' ? 1 : 0, targetChildId);

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
