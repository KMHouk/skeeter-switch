import { AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  runWindowStart: '16:00',
  runWindowEnd: '08:00',
  timezone: 'America/New_York',
  precipProbThreshold: 35,
  windSpeedThreshold: 12,
  temperatureFloorF: 50,
  debounceMinutes: 15,
  pollIntervalMinutes: 5,
  location: {
    lat: parseFloat(process.env.LOCATION_LAT || '38.8816'),
    lon: parseFloat(process.env.LOCATION_LON || '-77.1311'),
  },
  weatherProvider: 'azure-maps',
  dryRun: process.env.DRY_RUN === 'true',
  iftttEventOn: process.env.IFTTT_EVENT_ON || 'skeeter_switch_on',
  iftttEventOff: process.env.IFTTT_EVENT_OFF || 'skeeter_switch_off',
};

export function getDefaultConfig(): AppConfig {
  return { ...DEFAULT_CONFIG };
}
