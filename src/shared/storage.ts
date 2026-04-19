import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'crypto';
import { getDefaultConfig } from './config';
import {
  AppConfig,
  DecisionResult,
  EventLogEntry,
  OverrideRecord,
  SwitchState,
} from './types';

interface StateEntity {
  partitionKey: string;
  rowKey: string;
  desiredState?: SwitchState['desiredState'];
  lastCommandedState?: SwitchState['lastCommandedState'];
  lastCommandTime?: SwitchState['lastCommandTime'];
  lastResult?: SwitchState['lastResult'];
  lastError?: SwitchState['lastError'];
  lastDecision?: string;
  lastEvaluationAt?: string | null;
  lastWeatherFetchAt?: string | null;
  alertStatus?: 'ok' | 'warning' | 'error';
}

interface OverrideEntity {
  partitionKey: string;
  rowKey: string;
  state: OverrideRecord['state'];
  expiresAt: string;
  setBy: string;
  setAt: string;
}

interface ConfigEntity {
  partitionKey: string;
  rowKey: string;
  runWindowStart: string;
  runWindowEnd: string;
  timezone: string;
  precipProbThreshold: number;
  windSpeedThreshold: number;
  debounceMinutes: number;
  pollIntervalMinutes: number;
  locationLat: number;
  locationLon: number;
  weatherProvider: AppConfig['weatherProvider'];
  dryRun: boolean;
  kasaDeviceAlias: string;
}

interface EventLogEntity {
  partitionKey: string;
  rowKey: string;
  id: string;
  timestamp: string;
  type: EventLogEntry['type'];
  desiredState?: EventLogEntry['desiredState'];
  commandedState?: EventLogEntry['commandedState'];
  webhookEvent?: string;
  webhookStatusCode?: number;
  webhookLatencyMs?: number;
  webhookRetries?: number;
  success: boolean;
  error?: string;
  reasons?: string;
  dryRun?: boolean;
}

export interface SystemHealth {
  lastEvaluationAt: string | null;
  lastWeatherFetchAt: string | null;
  alertStatus: 'ok' | 'warning' | 'error';
}

const STATE_TABLE = 'SwitchStateTable';
const OVERRIDES_TABLE = 'OverridesTable';
const CONFIG_TABLE = 'ConfigTable';
const EVENT_LOG_TABLE = 'EventLogTable';

const STATE_PARTITION = 'state';
const STATE_ROW = 'current';
const OVERRIDE_PARTITION = 'override';
const OVERRIDE_ROW = 'active';
const CONFIG_PARTITION = 'config';
const CONFIG_ROW = 'current';

const clients: Record<string, TableClient | undefined> = {};
const initialized = new Set<string>();

function getConnectionString(): string {
  const connection = process.env.TABLE_STORAGE_CONNECTION_STRING;
  if (!connection) {
    throw new Error('TABLE_STORAGE_CONNECTION_STRING is not set');
  }
  return connection;
}

async function ensureTable(client: TableClient): Promise<void> {
  try {
    await client.createTable();
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 409) {
      throw err;
    }
  }
}

async function getTableClient(tableName: string): Promise<TableClient> {
  if (!clients[tableName]) {
    clients[tableName] = TableClient.fromConnectionString(getConnectionString(), tableName);
  }
  const client = clients[tableName];
  if (!client) {
    throw new Error(`Failed to initialize TableClient for ${tableName}`);
  }
  if (!initialized.has(tableName)) {
    await ensureTable(client);
    initialized.add(tableName);
  }
  return client;
}

function defaultSwitchState(): SwitchState {
  return {
    desiredState: null,
    lastCommandedState: null,
    lastCommandTime: null,
    lastResult: null,
    lastError: null,
    activeOverride: null,
  };
}

function toConfig(entity: ConfigEntity | null): AppConfig {
  const defaults = getDefaultConfig();
  if (!entity) {
    return defaults;
  }
  return {
    ...defaults,
    runWindowStart: entity.runWindowStart ?? defaults.runWindowStart,
    runWindowEnd: entity.runWindowEnd ?? defaults.runWindowEnd,
    timezone: entity.timezone ?? defaults.timezone,
    precipProbThreshold: entity.precipProbThreshold ?? defaults.precipProbThreshold,
    windSpeedThreshold: entity.windSpeedThreshold ?? defaults.windSpeedThreshold,
    debounceMinutes: entity.debounceMinutes ?? defaults.debounceMinutes,
    pollIntervalMinutes: entity.pollIntervalMinutes ?? defaults.pollIntervalMinutes,
    location: {
      lat: entity.locationLat ?? defaults.location.lat,
      lon: entity.locationLon ?? defaults.location.lon,
    },
    weatherProvider: entity.weatherProvider ?? defaults.weatherProvider,
    dryRun: entity.dryRun ?? defaults.dryRun,
    kasaDeviceAlias: entity.kasaDeviceAlias ?? defaults.kasaDeviceAlias,
  };
}

function toConfigEntity(config: AppConfig): ConfigEntity {
  return {
    partitionKey: CONFIG_PARTITION,
    rowKey: CONFIG_ROW,
    runWindowStart: config.runWindowStart,
    runWindowEnd: config.runWindowEnd,
    timezone: config.timezone,
    precipProbThreshold: config.precipProbThreshold,
    windSpeedThreshold: config.windSpeedThreshold,
    debounceMinutes: config.debounceMinutes,
    pollIntervalMinutes: config.pollIntervalMinutes,
    locationLat: config.location.lat,
    locationLon: config.location.lon,
    weatherProvider: config.weatherProvider,
    dryRun: config.dryRun,
    kasaDeviceAlias: config.kasaDeviceAlias,
  };
}

export async function getState(): Promise<SwitchState> {
  const client = await getTableClient(STATE_TABLE);
  let state = defaultSwitchState();
  try {
    const entity = await client.getEntity<StateEntity>(STATE_PARTITION, STATE_ROW);
    state = {
      desiredState: entity.desiredState ?? null,
      lastCommandedState: entity.lastCommandedState ?? null,
      lastCommandTime: entity.lastCommandTime ?? null,
      lastResult: entity.lastResult ?? null,
      lastError: entity.lastError ?? null,
      activeOverride: null,
    };
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 404) {
      throw err;
    }
  }
  const activeOverride = await getActiveOverride();
  return { ...state, activeOverride };
}

export async function updateState(update: Partial<SwitchState>): Promise<void> {
  const client = await getTableClient(STATE_TABLE);
  const entity: StateEntity = {
    partitionKey: STATE_PARTITION,
    rowKey: STATE_ROW,
  };
  if (update.desiredState !== undefined) {
    entity.desiredState = update.desiredState;
  }
  if (update.lastCommandedState !== undefined) {
    entity.lastCommandedState = update.lastCommandedState;
  }
  if (update.lastCommandTime !== undefined) {
    entity.lastCommandTime = update.lastCommandTime;
  }
  if (update.lastResult !== undefined) {
    entity.lastResult = update.lastResult;
  }
  if (update.lastError !== undefined) {
    entity.lastError = update.lastError;
  }
  await client.upsertEntity(entity, 'Merge');
}

export async function getActiveOverride(): Promise<OverrideRecord | null> {
  const client = await getTableClient(OVERRIDES_TABLE);
  try {
    const entity = await client.getEntity<OverrideEntity>(OVERRIDE_PARTITION, OVERRIDE_ROW);
    const override: OverrideRecord = {
      state: entity.state,
      expiresAt: entity.expiresAt,
      setBy: entity.setBy,
      setAt: entity.setAt,
    };
    if (new Date(override.expiresAt) <= new Date()) {
      await clearOverride();
      return null;
    }
    return override;
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function setOverride(override: OverrideRecord): Promise<void> {
  const client = await getTableClient(OVERRIDES_TABLE);
  const entity: OverrideEntity = {
    partitionKey: OVERRIDE_PARTITION,
    rowKey: OVERRIDE_ROW,
    state: override.state,
    expiresAt: override.expiresAt,
    setBy: override.setBy,
    setAt: override.setAt,
  };
  await client.upsertEntity(entity, 'Replace');
}

export async function clearOverride(): Promise<void> {
  const client = await getTableClient(OVERRIDES_TABLE);
  try {
    await client.deleteEntity(OVERRIDE_PARTITION, OVERRIDE_ROW);
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 404) {
      throw err;
    }
  }
}

export async function getConfig(): Promise<AppConfig> {
  const client = await getTableClient(CONFIG_TABLE);
  let entity: ConfigEntity | null = null;
  try {
    entity = await client.getEntity<ConfigEntity>(CONFIG_PARTITION, CONFIG_ROW);
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 404) {
      throw err;
    }
  }
  const config = toConfig(entity);
  if (!entity) {
    await client.upsertEntity(toConfigEntity(config), 'Replace');
  }
  return config;
}

export async function updateConfig(config: Partial<AppConfig>): Promise<void> {
  const current = await getConfig();
  const updated: AppConfig = {
    ...current,
    ...config,
    location: {
      ...current.location,
      ...(config.location ?? {}),
    },
  };
  const client = await getTableClient(CONFIG_TABLE);
  await client.upsertEntity(toConfigEntity(updated), 'Replace');
}

export async function logEvent(entry: EventLogEntry): Promise<void> {
  const client = await getTableClient(EVENT_LOG_TABLE);
  const timestamp = entry.timestamp || new Date().toISOString();
  const id = entry.id || `${timestamp}-${randomUUID()}`;
  const partitionKey = timestamp.slice(0, 10);
  const entity: EventLogEntity = {
    partitionKey,
    rowKey: id,
    id,
    timestamp,
    type: entry.type,
    desiredState: entry.desiredState,
    commandedState: entry.commandedState,
    webhookEvent: entry.webhookEvent,
    webhookStatusCode: entry.webhookStatusCode,
    webhookLatencyMs: entry.webhookLatencyMs,
    webhookRetries: entry.webhookRetries,
    success: entry.success,
    error: entry.error,
    reasons: entry.reasons ? JSON.stringify(entry.reasons) : undefined,
    dryRun: entry.dryRun,
  };
  await client.upsertEntity(entity, 'Replace');
}

export async function getRecentLogs(limit: number): Promise<EventLogEntry[]> {
  const client = await getTableClient(EVENT_LOG_TABLE);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startPartition = startDate.toISOString().slice(0, 10);
  const entities = client.listEntities<EventLogEntity>({
    queryOptions: { filter: `PartitionKey ge '${startPartition}'` },
  });
  const logs: EventLogEntry[] = [];
  for await (const entity of entities) {
    logs.push({
      id: entity.id ?? entity.rowKey,
      timestamp: entity.timestamp,
      type: entity.type,
      desiredState: entity.desiredState,
      commandedState: entity.commandedState,
      webhookEvent: entity.webhookEvent,
      webhookStatusCode:
        typeof entity.webhookStatusCode === 'number' ? entity.webhookStatusCode : undefined,
      webhookLatencyMs:
        typeof entity.webhookLatencyMs === 'number' ? entity.webhookLatencyMs : undefined,
      webhookRetries: typeof entity.webhookRetries === 'number' ? entity.webhookRetries : undefined,
      success: entity.success,
      error: entity.error,
      reasons: entity.reasons ? (JSON.parse(entity.reasons) as string[]) : undefined,
      dryRun: entity.dryRun,
    });
  }
  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return logs.slice(0, limit);
}

export async function updateLastDecision(decision: DecisionResult): Promise<void> {
  const client = await getTableClient(STATE_TABLE);
  const entity: StateEntity = {
    partitionKey: STATE_PARTITION,
    rowKey: STATE_ROW,
    lastDecision: JSON.stringify(decision),
  };
  await client.upsertEntity(entity, 'Merge');
}

export async function getLastDecision(): Promise<DecisionResult | null> {
  const client = await getTableClient(STATE_TABLE);
  try {
    const entity = await client.getEntity<StateEntity>(STATE_PARTITION, STATE_ROW);
    if (!entity.lastDecision) {
      return null;
    }
    return JSON.parse(entity.lastDecision) as DecisionResult;
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function updateSystemHealth(update: Partial<SystemHealth>): Promise<void> {
  const client = await getTableClient(STATE_TABLE);
  const entity: StateEntity = {
    partitionKey: STATE_PARTITION,
    rowKey: STATE_ROW,
  };
  if (update.lastEvaluationAt !== undefined) {
    entity.lastEvaluationAt = update.lastEvaluationAt;
  }
  if (update.lastWeatherFetchAt !== undefined) {
    entity.lastWeatherFetchAt = update.lastWeatherFetchAt;
  }
  if (update.alertStatus !== undefined) {
    entity.alertStatus = update.alertStatus;
  }
  await client.upsertEntity(entity, 'Merge');
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const client = await getTableClient(STATE_TABLE);
  try {
    const entity = await client.getEntity<StateEntity>(STATE_PARTITION, STATE_ROW);
    return {
      lastEvaluationAt: entity.lastEvaluationAt ?? null,
      lastWeatherFetchAt: entity.lastWeatherFetchAt ?? null,
      alertStatus: entity.alertStatus ?? 'ok',
    };
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 404) {
      return { lastEvaluationAt: null, lastWeatherFetchAt: null, alertStatus: 'ok' };
    }
    throw err;
  }
}
