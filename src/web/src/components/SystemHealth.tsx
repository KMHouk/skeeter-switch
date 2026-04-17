import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { SystemHealth as SystemHealthType } from '../types';

interface SystemHealthProps {
  health: SystemHealthType | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const formatTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  const date = parseISO(value);
  return (
    <span title={format(date, 'PPpp')}>{formatDistanceToNow(date, { addSuffix: true })}</span>
  );
};

export const SystemHealth = ({ health, isLoading, error, onRetry }: SystemHealthProps) => {
  if (isLoading && !health) {
    return (
      <div className="card">
        <div className="card-header">System Health</div>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">System Health</div>
        <p className="muted">Error: {error}</p>
        <button className="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="card">
        <div className="card-header">System Health</div>
        <p className="muted">Health data not available.</p>
      </div>
    );
  }

  const lastEval = health.lastEvaluation ?? health.lastEvaluationTime ?? null;
  const lastWeather = health.lastWeatherFetch ?? health.lastWeatherFetchTime ?? null;
  const alertStatus = health.alertStatus ?? 'unknown';
  const statusIcon = alertStatus === 'ok' ? '✅' : alertStatus === 'warning' ? '⚠️' : '❌';

  return (
    <div className="card">
      <div className="card-header">System Health</div>
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <div>
          Last Evaluation: {formatTime(lastEval)} {lastEval ? '✅' : ''}
        </div>
        <div>
          Last Weather Fetch: {formatTime(lastWeather)} {lastWeather ? '✅' : ''}
        </div>
        <div>
          Alert Status: {alertStatus.toUpperCase()} {statusIcon}
        </div>
        {health.alertMessage && <div className="muted">{health.alertMessage}</div>}
      </div>
    </div>
  );
};
