import { AppConfig, WeatherConditions } from './types';
import { getAzureMapsKey } from './keyvault';

interface AzureMapsCurrentResponse {
  results?: Array<{
    precipitationType?: string;
    iconCode?: number;
    windSpeed?: { value?: number; unit?: string };
    temperature?: { value?: number; unit?: string };
    phrase?: string;
    shortPhrase?: string;
  }>;
}

interface AzureMapsHourlyResponse {
  forecasts?: Array<{
    precipitationProbability?: number;
  }>;
}

const CACHE_MS = 10 * 60 * 1000;
let cachedWeather: WeatherConditions | null = null;
let cachedAt: number | null = null;

function isCacheValid(): boolean {
  if (!cachedWeather || cachedAt === null) {
    return false;
  }
  return Date.now() - cachedAt < CACHE_MS;
}

function mapCurrentConditions(data: AzureMapsCurrentResponse): {
  currentlyRaining: boolean;
  windSpeedMph: number;
  temperatureF: number;
  description: string;
} {
  const current = data.results?.[0];
  if (!current) {
    throw new Error('Azure Maps current conditions returned no results');
  }
  const precipitationType = (current.precipitationType || '').toLowerCase();
  const rainingByType = ['rain', 'drizzle', 'sleet', 'snow', 'hail', 'ice'].some((token) =>
    precipitationType.includes(token)
  );
  const iconCode = current.iconCode ?? 0;
  const rainingByIcon = iconCode >= 12 && iconCode <= 18;
  const windSpeedKmh = current.windSpeed?.value ?? 0;
  const windSpeedMph = windSpeedKmh * 0.621371;
  const description = current.phrase || current.shortPhrase || 'Unknown';

  // Azure Maps returns temperature in Celsius by default (metric). Convert to °F.
  let temperatureF: number;
  if (current.temperature?.value !== undefined && current.temperature.value !== null) {
    temperatureF = (current.temperature.value * 9) / 5 + 32;
  } else {
    console.warn('Azure Maps temperature unavailable; defaulting to 60°F (safe fallback)');
    temperatureF = 60;
  }

  return {
    currentlyRaining: rainingByType || rainingByIcon,
    windSpeedMph,
    temperatureF,
    description,
  };
}

export async function fetchWeather(config: AppConfig): Promise<WeatherConditions> {
  if (isCacheValid() && cachedWeather) {
    return cachedWeather;
  }

  const key = await getAzureMapsKey();
  const query = `${config.location.lat},${config.location.lon}`;
  const currentUrl = `https://atlas.microsoft.com/weather/currentConditions/json?api-version=1.1&query=${query}&subscription-key=${encodeURIComponent(
    key
  )}`;
  const hourlyUrl = `https://atlas.microsoft.com/weather/forecast/hourly/json?api-version=1.1&query=${query}&duration=1&subscription-key=${encodeURIComponent(
    key
  )}`;

  const [currentResponse, hourlyResponse] = await Promise.all([fetch(currentUrl), fetch(hourlyUrl)]);
  if (!currentResponse.ok) {
    throw new Error(`Azure Maps current conditions failed (${currentResponse.status})`);
  }
  if (!hourlyResponse.ok) {
    throw new Error(`Azure Maps hourly forecast failed (${hourlyResponse.status})`);
  }

  const currentData = (await currentResponse.json()) as AzureMapsCurrentResponse;
  const hourlyData = (await hourlyResponse.json()) as AzureMapsHourlyResponse;
  const mappedCurrent = mapCurrentConditions(currentData);
  const precipProbability = hourlyData.forecasts?.[0]?.precipitationProbability ?? 0;

  const result: WeatherConditions = {
    currentlyRaining: mappedCurrent.currentlyRaining,
    precipProbability,
    windSpeedMph: mappedCurrent.windSpeedMph,
    temperatureF: mappedCurrent.temperatureF,
    description: mappedCurrent.description,
    fetchedAt: new Date().toISOString(),
  };

  cachedWeather = result;
  cachedAt = Date.now();
  return result;
}
