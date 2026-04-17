import { AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  runWindowStart: '18:00',
  runWindowEnd: '06:00',
  timezone: 'America/New_York',
  precipProbThreshold: 30,
  windSpeedThreshold: 12,
  debounceMinutes: 10,
  pollIntervalMinutes: 5,
  location: {
    lat: parseFloat(process.env.LOCATION_LAT || '40.7128'),
    lon: parseFloat(process.env.LOCATION_LON || '-74.0060'),
  },
  weatherProvider: 'azure-maps',
  dryRun: process.env.DRY_RUN === 'true',
  iftttEventOn: process.env.IFTTT_EVENT_ON || 'skeeter_switch_on',
  iftttEventOff: process.env.IFTTT_EVENT_OFF || 'skeeter_switch_off',
};

export function getDefaultConfig(): AppConfig {
  return { ...DEFAULT_CONFIG };
}
