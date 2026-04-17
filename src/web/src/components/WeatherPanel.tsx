import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { WeatherConditions } from '../types';

interface WeatherPanelProps {
  weather: WeatherConditions | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const WeatherPanel = ({ weather, isLoading, error, onRetry }: WeatherPanelProps) => {
  if (isLoading && !weather) {
    return (
      <div className="card">
        <div className="card-header">Weather</div>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">Weather</div>
        <p className="muted">Error: {error}</p>
        <button className="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="card">
        <div className="card-header">Weather</div>
        <p className="muted">No weather snapshot available yet.</p>
      </div>
    );
  }

  const fetched = parseISO(weather.fetchedAt);

  return (
    <div className="card">
      <div className="card-header">Weather</div>
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <div>🌤 {weather.description}</div>
        <div>💧 Precip probability: {Math.round(weather.precipProbability)}%</div>
        <div>💨 Wind: {Math.round(weather.windSpeedMph)} mph</div>
        <div title={format(fetched, 'PPpp')}>📍 Fetched: {formatDistanceToNow(fetched, { addSuffix: true })}</div>
      </div>
    </div>
  );
};
