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

  const runAction = async (label: string, action: () => Promise<void>, successMessage: string) => {
    const confirmed = window.confirm(`Confirm: ${label}?`);
    if (!confirmed) {
      return;
    }
    setIsWorking(true);
    try {
      await action();
      showToast({ message: successMessage, type: 'success' });
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

  const handleTempOverride = (state: OverrideState) => {
    if (state === 'auto') {
      return runAction(
        'Clear override — return to AUTO',
        () => postOverride('auto'),
        'Override cleared. Returned to AUTO.'
      );
    }
    return runAction(
      `Temporary override ${state.toUpperCase()} for ${ttlMinutes} minutes`,
      () => postOverride(state, ttlMinutes),
      `Temporary override ${state.toUpperCase()} active for ${ttlMinutes} minutes.`
    );
  };

  const handleCommand = (state: PowerState) => {
    return runAction(
      `Direct command ${state.toUpperCase()} (permanent)`,
      () => postCommand(state),
      `Direct command ${state.toUpperCase()} sent — active indefinitely.`
    );
  };

  const handleReturnToAuto = () => {
    return runAction(
      'Return to AUTO — clears any override or command',
      () => postOverride('auto'),
      'Returned to AUTO. Automation schedule is active.'
    );
  };

  return (
    <div className="card">
      <div className="card-header">Manual Controls</div>

      <div className="manual-section">
        <div className="manual-section-title">Temporary Override</div>
        <div className="manual-section-subtitle muted">
          Bypasses the automation schedule for a set duration, then returns to AUTO.
        </div>
        <div className="controls-row" style={{ marginBottom: '0.75rem' }}>
          <button
            className="button button-primary"
            onClick={() => handleTempOverride('on')}
            disabled={isWorking}
          >
            🟢 Temporary ON
          </button>
          <button
            className="button button-danger"
            onClick={() => handleTempOverride('off')}
            disabled={isWorking}
          >
            🔴 Temporary OFF
          </button>
          <button
            className="button"
            onClick={() => handleTempOverride('auto')}
            disabled={isWorking}
          >
            ⬜ Clear Override
          </button>
        </div>
        <div className="controls-row">
          <label>
            Duration:
            <select
              style={{ marginLeft: '0.5rem' }}
              value={ttlOption}
              onChange={(event) => setTtlOption(event.target.value)}
            >
              {ttlOptions.map((option) => (
                <option key={option} value={option.toString()}>
                  {option} min
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
              style={{ width: '80px' }}
            />
          )}
        </div>
      </div>

      <hr className="manual-divider" />

      <div className="manual-section">
        <div className="manual-section-title">Direct Command</div>
        <div className="manual-section-subtitle muted">
          Sends a command directly to the device. Stays active indefinitely until you change it.
        </div>
        <div className="manual-permanent-badge">⚠️ Permanent — ignores schedule</div>
        <div className="controls-row">
          <button
            className="button button-primary"
            onClick={() => handleCommand('on')}
            disabled={isWorking}
          >
            🟢 Command ON
          </button>
          <button
            className="button button-danger"
            onClick={() => handleCommand('off')}
            disabled={isWorking}
          >
            🔴 Command OFF
          </button>
          <button className="button" onClick={handleReturnToAuto} disabled={isWorking}>
            ⬜ Return to AUTO
          </button>
        </div>
      </div>

      {isWorking && (
        <div style={{ marginTop: '0.75rem' }}>
          <span className="spinner" />
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
};
