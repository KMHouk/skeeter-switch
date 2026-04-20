import { DecisionResult, AppConfig } from '../types';

interface DecisionPanelProps {
  decision: DecisionResult | null;
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const indicator = (ok: boolean) => (ok ? '✅' : '❌');

export const DecisionPanel = ({ decision, config, isLoading, error, onRetry }: DecisionPanelProps) => {
  if (isLoading && !decision) {
    return (
      <div className="card">
        <div className="card-header">Decision Reasoning</div>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">Decision Reasoning</div>
        <p className="muted">Error: {error}</p>
        <button className="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="card">
        <div className="card-header">Decision Reasoning</div>
        <p className="muted">No evaluation data available yet.</p>
      </div>
    );
  }

  const windowLabel = config
    ? `${config.runWindowStart}–${config.runWindowEnd}`
    : 'configured window';
  const running = decision.desiredState === 'on';
  const tempFloor = config?.temperatureFloorF ?? null;
  const tempOk = tempFloor === null || decision.weather.temperatureF >= tempFloor;

  return (
    <div className="card">
      <div className="card-header">Decision Reasoning</div>
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <div>
          {indicator(decision.withinTimeWindow)} Within time window ({windowLabel})
        </div>
        <div>
          {indicator(tempOk)}{' '}
          Temperature {Math.round(decision.weather.temperatureF)}°F
          {tempFloor !== null ? ` (floor ${tempFloor}°F — mosquitoes dormant below this)` : ''}
        </div>
        <div>
          {indicator(decision.weatherOk)}{' '}
          {decision.weatherOk ? 'Weather favorable' : 'Weather unfavorable'} (precip{' '}
          {Math.round(decision.weather.precipProbability)}%, wind{' '}
          {Math.round(decision.weather.windSpeedMph)} mph)
        </div>
        <div>
          {indicator(decision.debounceOk)}{' '}
          {decision.debounceOk ? 'Debounce OK — enough time since last toggle' : 'Debounce blocking — too soon since last toggle'}
        </div>
        <div>{indicator(!decision.overrideActive)} Override active: {decision.overrideActive ? 'YES' : 'NO'}</div>
        <div>
          → Running: <strong>{running ? 'YES' : 'NO'}</strong>
        </div>
        {decision.dryRun && <div className="muted">Dry run mode is active for this evaluation.</div>}
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <strong>Reasons</strong>
        <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', display: 'grid', gap: '0.2rem' }}>
          {decision.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
