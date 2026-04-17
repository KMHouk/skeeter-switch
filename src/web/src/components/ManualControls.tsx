import { useMemo, useState } from 'react';
import { postCommand, postOverride } from '../api/client';
import { OverrideState, PowerState } from '../types';

interface ManualControlsProps {
  onActionComplete?: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

const ttlOptions = [30, 60, 120, 240];

export const ManualControls = ({ onActionComplete }: ManualControlsProps) => {
  const [ttlOption, setTtlOption] = useState<string>('60');
  const [customTtl, setCustomTtl] = useState('60');
  const [isWorking, setIsWorking] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const ttlMinutes = useMemo(() => {
    if (ttlOption === 'custom') {
      const parsed = Number(customTtl);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
    }
    return Number(ttlOption);
  }, [ttlOption, customTtl]);

  const showToast = (next: ToastState) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 4000);
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    const confirmed = window.confirm(`Confirm: ${label}?`);
    if (!confirmed) {
      return;
    }
    setIsWorking(true);
    try {
      await action();
      showToast({ message: `${label} succeeded.`, type: 'success' });
      onActionComplete?.();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : `${label} failed.`,
        type: 'error',
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleOverride = (state: OverrideState) => {
    return runAction(`Override ${state.toUpperCase()}`, () =>
      postOverride(state, state === 'auto' ? undefined : ttlMinutes)
    );
  };

  const handleCommand = (state: PowerState) => {
    return runAction(`Command ${state.toUpperCase()}`, () => postCommand(state));
  };

  return (
    <div className="card">
      <div className="card-header">Manual Controls</div>
      <div className="controls-row" style={{ marginBottom: '0.75rem' }}>
        <button className="button button-primary" onClick={() => handleOverride('on')} disabled={isWorking}>
          Force ON
        </button>
        <button className="button button-danger" onClick={() => handleOverride('off')} disabled={isWorking}>
          Force OFF
        </button>
        <button className="button" onClick={() => handleOverride('auto')} disabled={isWorking}>
          Return to AUTO
        </button>
      </div>
      <div className="controls-row">
        <label>
          Override duration:
          <select
            style={{ marginLeft: '0.5rem' }}
            value={ttlOption}
            onChange={(event) => setTtlOption(event.target.value)}
          >
            {ttlOptions.map((option) => (
              <option key={option} value={option.toString()}>
                {option} minutes
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {ttlOption === 'custom' && (
          <input
            type="number"
            min={1}
            value={customTtl}
            onChange={(event) => setCustomTtl(event.target.value)}
            style={{ width: '100px' }}
          />
        )}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <div className="muted" style={{ marginBottom: '0.4rem' }}>
          Direct command (bypasses logic):
        </div>
        <div className="controls-row">
          <button className="button button-warning" onClick={() => handleCommand('on')} disabled={isWorking}>
            Command ON
          </button>
          <button className="button button-warning" onClick={() => handleCommand('off')} disabled={isWorking}>
            Command OFF
          </button>
          {isWorking && <span className="spinner" />}
        </div>
      </div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
};
