export type PowerState = 'on' | 'off';
export type OverrideState = 'on' | 'off' | 'auto';

export interface SwitchState {
  desiredState: PowerState | null;
  lastCommandedState: PowerState | null;
  lastCommandTime: string | null;
  lastResult: 'success' | 'failure' | 'dry_run' | null;
  lastError: string | null;
  activeOverride: OverrideRecord | null;
}

export interface OverrideRecord {
  state: PowerState;
  expiresAt: string;
  setBy: string;
  setAt: string;
}

export interface WeatherConditions {
  currentlyRaining: boolean;
  precipProbability: number;
  windSpeedMph: number;
  temperatureF: number;
  description: string;
  fetchedAt: string;
}

export interface DecisionResult {
  timestamp: string;
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
  timestamp: string;
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

export interface PlanBlock {
  start: string;
  end: string;
  state: PowerState;
  reasons: string[];
}

export interface AppConfig {
  runWindowStart: string;
  runWindowEnd: string;
  timezone: string;
  precipProbThreshold: number;
  windSpeedThreshold: number;
  temperatureFloorF: number;
  debounceMinutes: number;
  pollIntervalMinutes: number;
  location: { lat: number; lon: number };
  weatherProvider: 'azure-maps' | 'openweather';
  dryRun: boolean;
  kasaDeviceAlias: string;
  winterMode: boolean;
}

export interface UserInfo {
  clientPrincipal: {
    userId: string;
    userRoles: string[];
    claims: Array<{ typ: string; val: string }>;
    identityProvider: string;
    userDetails: string;
  } | null;
}

export interface Co2Tracker {
  runtimeHoursSinceSwap: number;
  lastSwapAt: string;
  lastUpdatedAt: string;
}

export interface SystemHealth {
  lastEvaluationAt: string | null;
  lastWeatherFetchAt: string | null;
  alertStatus: 'ok' | 'warning' | 'error';
}

export interface StatusResponse {
  state: SwitchState;
  lastDecision: DecisionResult | null;
  systemHealth: SystemHealth;
  co2Tracker: Co2Tracker | null;
}

export interface PlanResponse {
  from: string;
  to: string;
  blocks: PlanBlock[];
  actuals: Record<string, number>;
  generatedAt: string;
}
