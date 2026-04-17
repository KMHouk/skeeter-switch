import {
  AppConfig,
  DecisionResult,
  EventLogEntry,
  OverrideState,
  PlanResponse,
  PowerState,
  StatusResponse,
  UserInfo,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const buildUrl = (path: string) => `${API_BASE}${path}`;

const parseJson = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || response.statusText);
  }
  return parseJson<T>(response);
};

export const fetchStatus = async (): Promise<StatusResponse> => {
  const response = await fetch(buildUrl('/api/status'));
  return handleResponse<StatusResponse>(response);
};

export const postOverride = async (
  state: OverrideState,
  ttlMinutes?: number
): Promise<void> => {
  const response = await fetch(buildUrl('/api/override'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ttlMinutes ? { state, ttlMinutes } : { state }),
  });
  await handleResponse<void>(response);
};

export const postEvaluate = async (): Promise<DecisionResult> => {
  const response = await fetch(buildUrl('/api/evaluate'), { method: 'POST' });
  return handleResponse<DecisionResult>(response);
};

export const postCommand = async (state: PowerState): Promise<void> => {
  const response = await fetch(buildUrl('/api/command'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  await handleResponse<void>(response);
};

export const fetchPlan = async (from: string, to: string): Promise<PlanResponse> => {
  const response = await fetch(buildUrl(`/api/plan?from=${from}&to=${to}`));
  return handleResponse<PlanResponse>(response);
};

export const fetchConfig = async (): Promise<AppConfig> => {
  const response = await fetch(buildUrl('/api/config'));
  return handleResponse<AppConfig>(response);
};

export const putConfig = async (config: AppConfig): Promise<void> => {
  const response = await fetch(buildUrl('/api/config'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse<void>(response);
};

export const fetchLogs = async (limit = 50): Promise<EventLogEntry[]> => {
  const response = await fetch(buildUrl(`/api/logs?limit=${limit}`));
  return handleResponse<EventLogEntry[]>(response);
};

export const fetchUserInfo = async (): Promise<UserInfo> => {
  const response = await fetch(buildUrl('/.auth/me'));
  return handleResponse<UserInfo>(response);
};
