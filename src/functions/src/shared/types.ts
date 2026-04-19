// Shared types for skeeter-switch
// Used by both Azure Functions and referenced by frontend API client

export type PowerState = 'on' | 'off';
export type OverrideState = 'on' | 'off' | 'auto';

export interface SwitchState {
  desiredState: PowerState | null;
  lastCommandedState: PowerState | null;
  lastCommandTime: string | null; // ISO 8601
  lastResult: 'success' | 'failure' | 'dry_run' | null;
  lastError: string | null;
  activeOverride: OverrideRecord | null;
}

export interface OverrideRecord {
  state: PowerState;
  expiresAt: string; // ISO 8601
  setBy: string;
  setAt: string; // ISO 8601
}

export interface AppConfig {
  runWindowStart: string; // "HH:MM" e.g. "18:00"
  runWindowEnd: string;   // "HH:MM" e.g. "06:00"
  timezone: string;       // e.g. "America/New_York"
  precipProbThreshold: number; // default 30
  windSpeedThreshold: number;  // mph, default 12
  debounceMinutes: number;     // default 10
  pollIntervalMinutes: number; // default 5
  location: { lat: number; lon: number };
  weatherProvider: 'azure-maps' | 'openweather';
  dryRun: boolean;
  kasaDeviceAlias: string;
}

export interface WeatherConditions {
  currentlyRaining: boolean;
  precipProbability: number; // 0-100
  windSpeedMph: number;
  description: string;
  fetchedAt: string; // ISO 8601
}

export interface DecisionResult {
  timestamp: string; // ISO 8601
  desiredState: PowerState;
  reasons: string[];
  weatherOk: boolean;
  withinTimeWindow: boolean;
  debounceOk: boolean;
  overrideActive: boolean;
  weather: WeatherConditions;
  dryRun: boolean;
}

export interface EventLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  type: 'evaluation' | 'webhook_call' | 'override_set' | 'manual_command' | 'config_change';
  desiredState?: PowerState;
  commandedState?: PowerState;
  webhookEvent?: string;
  webhookStatusCode?: number;
  webhookLatencyMs?: number;
  webhookRetries?: number;
  success: boolean;
  error?: string;
  reasons?: string[];
  dryRun?: boolean;
}

export interface StatusResponse {
  state: SwitchState;
  lastDecision: DecisionResult | null;
  systemHealth: {
    lastEvaluationAt: string | null;
    lastWeatherFetchAt: string | null;
    alertStatus: 'ok' | 'warning' | 'error';
  };
}

export interface PlanBlock {
  start: string; // ISO 8601
  end: string;   // ISO 8601
  state: PowerState;
  reasons: string[];
}

export interface PlanResponse {
  from: string;
  to: string;
  blocks: PlanBlock[];
  generatedAt: string;
}

export interface WebhookResult {
  success: boolean;
  statusCode: number;
  latencyMs: number;
  retries: number;
  responseBody: string;
  error?: string;
}
