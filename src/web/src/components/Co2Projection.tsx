import { format, parseISO } from 'date-fns';
import { Co2Tracker } from '../types';

interface Co2ProjectionProps {
  co2Tracker: Co2Tracker | null;
  onReset: () => void;
  isResetting: boolean;
}

const CAPACITY_HOURS = 252;

export const Co2Projection = ({ co2Tracker, onReset, isResetting }: Co2ProjectionProps) => {
  if (!co2Tracker) {
    return (
      <div className="card">
        <div className="card-header">CO2 Tank Projection</div>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Press "Tank Swapped" to start tracking runtime.
        </p>
        <button className="button button-primary" onClick={onReset} disabled={isResetting}>
          {isResetting ? 'Resetting...' : '🔄 Tank Swapped'}
        </button>
      </div>
    );
  }

  const usedHours = Math.min(co2Tracker.runtimeHoursSinceSwap, CAPACITY_HOURS);
  const pct = Math.min(100, (usedHours / CAPACITY_HOURS) * 100);
  const remainingHours = Math.max(0, CAPACITY_HOURS - usedHours);
  const remainingPct = 100 - pct;

  const barColor = remainingPct > 50 ? '#16a34a' : remainingPct > 20 ? '#d97706' : '#dc2626';

  return (
    <div className="card">
      <div className="card-header">CO2 Tank Projection</div>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>
        ~{remainingPct.toFixed(0)}% remaining ({remainingHours.toFixed(1)}h of {CAPACITY_HOURS}h left)
      </div>
      <div className="co2-bar-outer">
        <div
          className="co2-bar-inner"
          style={{
            width: `${remainingPct}%`,
            background: barColor,
          }}
        />
      </div>
      <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Tracking since {format(parseISO(co2Tracker.lastSwapAt), 'MMM d, yyyy')}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button className="button" onClick={onReset} disabled={isResetting}>
          {isResetting ? 'Resetting...' : '🔄 Tank Swapped'}
        </button>
      </div>
      <div className="muted" style={{ fontSize: '0.75rem', marginTop: '1rem', lineHeight: '1.4' }}>
        Best estimate based on planned runtime. Actual CO2 consumption varies with temperature and
        usage patterns. CO2 tank capacity: ~252 hours continuous operation (ARCTIC® MKS-1 20 lb tank,
        ~3 weeks at 12h/night).
      </div>
    </div>
  );
};
