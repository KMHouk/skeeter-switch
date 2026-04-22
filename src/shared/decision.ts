import { differenceInMinutes, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { AppConfig, DecisionResult, SwitchState, WeatherConditions } from './types';

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time format: ${value}`);
  }
  return hours * 60 + minutes;
}

export function evaluateDecision(
  config: AppConfig,
  weather: WeatherConditions,
  currentState: SwitchState,
  now: Date
): DecisionResult {
  const zonedNow = toZonedTime(now, config.timezone);
  const nowMinutes = zonedNow.getHours() * 60 + zonedNow.getMinutes();
  const startMinutes = parseTimeToMinutes(config.runWindowStart);
  const endMinutes = parseTimeToMinutes(config.runWindowEnd);
  const withinTimeWindow =
    startMinutes <= endMinutes
      ? nowMinutes >= startMinutes && nowMinutes < endMinutes
      : nowMinutes >= startMinutes || nowMinutes < endMinutes;

  // Temperature is evaluated separately — weatherOk only reflects precip/wind/rain conditions
  const temperatureOk = weather.temperatureF >= config.temperatureFloorF;
  const weatherOk =
    !weather.currentlyRaining &&
    weather.precipProbability < config.precipProbThreshold &&
    weather.windSpeedMph < config.windSpeedThreshold;

  const lastCommandTime = currentState.lastCommandTime ? parseISO(currentState.lastCommandTime) : null;
  const debounceOk =
    !lastCommandTime ||
    differenceInMinutes(now, lastCommandTime) >= config.debounceMinutes;

  const override = currentState.activeOverride;
  const overrideActive = !!override && parseISO(override.expiresAt) > now;

  const reasons: string[] = [];
  if (overrideActive && override) {
    reasons.push(`Override active until ${override.expiresAt}, forcing ${override.state}.`);
  } else {
    reasons.push('No active override.');
  }
  reasons.push(
    withinTimeWindow
      ? `Within run window ${config.runWindowStart}-${config.runWindowEnd} (${config.timezone}).`
      : `Outside run window ${config.runWindowStart}-${config.runWindowEnd} (${config.timezone}).`
  );
  if (weather.currentlyRaining) {
    reasons.push('Currently raining — mosquitoes shelter during rain and are not active (hard stop).');
  }
  if (weather.temperatureF < config.temperatureFloorF) {
    reasons.push(
      `Temperature ${weather.temperatureF.toFixed(1)}°F below floor ${config.temperatureFloorF}°F — mosquitoes dormant, device skipped.`
    );
  }
  reasons.push(
    weatherOk
      ? `Weather OK: no rain, precip ${weather.precipProbability}%, wind ${weather.windSpeedMph.toFixed(
          1
        )} mph.`
      : `Weather not OK: rain=${weather.currentlyRaining}, precip ${weather.precipProbability}%, wind ${weather.windSpeedMph.toFixed(
          1
        )} mph.`
  );
  reasons.push(
    debounceOk
      ? `Debounce OK (${config.debounceMinutes} min).`
      : `Debounce active: last command ${currentState.lastCommandTime ?? 'unknown'}.`
  );

  const shouldRun = withinTimeWindow && temperatureOk && weatherOk && debounceOk;
  const desiredState = overrideActive && override ? override.state : shouldRun ? 'on' : 'off';

  return {
    timestamp: now.toISOString(),
    desiredState,
    reasons,
    weatherOk,
    withinTimeWindow,
    debounceOk,
    overrideActive,
    weather,
    dryRun: config.dryRun,
  };
}
