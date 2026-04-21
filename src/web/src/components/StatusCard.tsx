import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { AppConfig, DecisionResult, SwitchState } from '../types';

interface StatusCardProps {
  status: SwitchState | null;
  lastDecision: DecisionResult | null;
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const formatRelative = (value: string | null): { label: string; tooltip?: string } => {
  if (!value) {
    return { label: '—' };
  }
  const date = parseISO(value);
  return {
    label: formatDistanceToNow(date, { addSuffix: true }),
    tooltip: format(date, 'PPpp'),
  };
};

const formatState = (value: string | null) => (value ? value.toUpperCase() : 'UNKNOWN');

export const StatusCard = ({ status, lastDecision, config, isLoading, error, onRetry }: StatusCardProps) => {
  if (isLoading && !status) {
    return (
      <div className="card">
        <div className="card-header">System Status</div>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">System Status</div>
        <p className="muted">Error: {error}</p>
        <button className="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="card">
        <div className="card-header">System Status</div>
        <p className="muted">No status data yet.</p>
      </div>
    );
  }

  const desiredState = status.desiredState ?? lastDecision?.desiredState ?? null;
  const lastCommanded = status.lastCommandedState;
  const lastCommandedTime = formatRelative(status.lastCommandTime);
  const lastResult = status.lastResult ?? '—';
  const override = status.activeOverride;

  const stateClass =
    desiredState === 'on' ? 'status-on' : desiredState === 'off' ? 'status-off' : 'status-unknown';

  return (
    <div className="card">
      <div className="card-header">System Status</div>
      {config?.winterMode && (
        <div style={{
          background: '#fef9c3',
          color: '#854d0e',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
          textAlign: 'center'
        }}>
          🏠 Winter Mode Active — Automation suspended. Device is stored for winter.
        </div>
      )}
      <div className={`status-indicator ${stateClass}`}>Desired: {formatState(desiredState)}</div>
      <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.4rem' }}>
        <div>
          <strong>Last Commanded:</strong> {formatState(lastCommanded)}
        </div>
        <div>
          <strong>Last Command Time:</strong>{' '}
          <span title={lastCommandedTime.tooltip}>{lastCommandedTime.label}</span>
        </div>
        <div>
          <strong>Last Result:</strong> {lastResult.replace('_', ' ').toUpperCase()}
        </div>
        <div>
          <strong>Active Override:</strong>{' '}
          {override
            ? `${override.state.toUpperCase()} until ${format(parseISO(override.expiresAt), 'p')}`
            : 'None'}
        </div>
      </div>
    </div>
  );
};
