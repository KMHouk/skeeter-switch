import { useEffect, useState } from 'react';
import { AppConfig } from '../types';

interface ConfigEditorProps {
  config: AppConfig | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSave: (config: AppConfig) => Promise<void>;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export const ConfigEditor = ({
  config,
  isAdmin,
  isLoading,
  error,
  onRefresh,
  onSave,
}: ConfigEditorProps) => {
  const [draft, setDraft] = useState<AppConfig | null>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleChange = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    if (!draft) {
      return;
    }
    setDraft({ ...draft, [key]: value });
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    const confirmed = window.confirm('Save configuration changes?');
    if (!confirmed) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setToast({ message: 'Configuration saved.', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to save configuration.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setToast(null), 4000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="card-header">Configuration</div>
        <p className="muted">You don't have admin access.</p>
      </div>
    );
  }

  if (isLoading && !config) {
    return (
      <div className="card">
        <div className="card-header">Configuration</div>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">Configuration</div>
        <p className="muted">Error: {error}</p>
        <button className="button" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="card">
        <div className="card-header">Configuration</div>
        <p className="muted">No configuration loaded.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="calendar-header">
        <div className="card-header">Configuration</div>
        <button className="button" onClick={onRefresh} disabled={isSaving}>
          Refresh
        </button>
      </div>
      <div className="form-grid">
        <div className="form-row">
          <label>Run Window Start</label>
          <input
            type="time"
            value={draft.runWindowStart}
            onChange={(event) => handleChange('runWindowStart', event.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Run Window End</label>
          <input
            type="time"
            value={draft.runWindowEnd}
            onChange={(event) => handleChange('runWindowEnd', event.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Timezone</label>
          <input
            type="text"
            value={draft.timezone}
            onChange={(event) => handleChange('timezone', event.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Precipitation Threshold (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.precipProbThreshold}
            onChange={(event) => handleChange('precipProbThreshold', Number(event.target.value))}
          />
        </div>
        <div className="form-row">
          <label>Wind Speed Threshold (mph)</label>
          <input
            type="number"
            min={0}
            value={draft.windSpeedThreshold}
            onChange={(event) => handleChange('windSpeedThreshold', Number(event.target.value))}
          />
        </div>
        <div className="form-row">
          <label>Debounce Minutes</label>
          <input
            type="number"
            min={0}
            value={draft.debounceMinutes}
            onChange={(event) => handleChange('debounceMinutes', Number(event.target.value))}
          />
        </div>
        <div className="form-row">
          <label>Poll Interval Minutes</label>
          <input
            type="number"
            min={1}
            value={draft.pollIntervalMinutes}
            onChange={(event) => handleChange('pollIntervalMinutes', Number(event.target.value))}
          />
        </div>
        <div className="form-row">
          <label>Location Latitude</label>
          <input
            type="number"
            value={draft.location.lat}
            onChange={(event) =>
              handleChange('location', { ...draft.location, lat: Number(event.target.value) })
            }
          />
        </div>
        <div className="form-row">
          <label>Location Longitude</label>
          <input
            type="number"
            value={draft.location.lon}
            onChange={(event) =>
              handleChange('location', { ...draft.location, lon: Number(event.target.value) })
            }
          />
        </div>
        <div className="form-row">
          <label>Weather Provider</label>
          <select
            value={draft.weatherProvider}
            onChange={(event) => handleChange('weatherProvider', event.target.value as AppConfig['weatherProvider'])}
          >
            <option value="azure-maps">Azure Maps</option>
            <option value="openweather">OpenWeather</option>
          </select>
        </div>
        <div className="form-row">
          <label>
            <input
              type="checkbox"
              checked={draft.dryRun}
              onChange={(event) => handleChange('dryRun', event.target.checked)}
            />
            &nbsp;Dry Run
          </label>
        </div>
        <div className="form-row">
          <label>IFTTT Event On</label>
          <input
            type="text"
            value={draft.iftttEventOn}
            onChange={(event) => handleChange('iftttEventOn', event.target.value)}
          />
        </div>
        <div className="form-row">
          <label>IFTTT Event Off</label>
          <input
            type="text"
            value={draft.iftttEventOff}
            onChange={(event) => handleChange('iftttEventOff', event.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button className="button button-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      </div>
    </div>
  );
};
