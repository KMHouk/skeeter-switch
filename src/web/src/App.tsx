import { useCallback, useEffect, useState } from 'react';
import { fetchConfig, putConfig } from './api/client';
import { ActivityLog } from './components/ActivityLog';
import { CalendarView } from './components/CalendarView';
import { ConfigEditor } from './components/ConfigEditor';
import { DecisionPanel } from './components/DecisionPanel';
import { DryRunBanner } from './components/DryRunBanner';
import { ManualControls } from './components/ManualControls';
import { StatusCard } from './components/StatusCard';
import { SystemHealth } from './components/SystemHealth';
import { WeatherPanel } from './components/WeatherPanel';
import { useAuth } from './hooks/useAuth';
import { useStatus } from './hooks/useStatus';
import { AppConfig } from './types';

const App = () => {
  const { user, isLoading: authLoading, isAdmin, isAuthenticated } = useAuth();
  const { status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useStatus();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await fetchConfig();
      setConfig(data);
      setConfigError(null);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadConfig();
    }
  }, [isAuthenticated, loadConfig]);

  const handleSaveConfig = useCallback(
    async (nextConfig: AppConfig) => {
      await putConfig(nextConfig);
      await loadConfig();
    },
    [loadConfig]
  );

  if (authLoading) {
    return (
      <div className="centered">
        <div className="spinner" />
        <div>Loading authentication…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="centered">
        <div className="card login-panel">
          <div className="card-header">Skeeter Switch</div>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Sign in with Azure Active Directory to access the dashboard.
          </p>
          <a className="button button-primary" href="/.auth/login/aad?post_login_redirect_uri=/">
            Login
          </a>
        </div>
      </div>
    );
  }

  const displayName = user?.clientPrincipal?.userDetails ?? user?.clientPrincipal?.userId ?? 'User';
  const isDryRun = Boolean(status?.lastDecision?.dryRun || config?.dryRun);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">🦟 Skeeter Switch</div>
        <div className="app-user">
          <span>{displayName}</span>
          <a className="button" href="/.auth/logout">
            Logout
          </a>
        </div>
      </header>
      <div className="app-main">
        <DryRunBanner isDryRun={isDryRun} />
        <div className="grid-two">
          <StatusCard
            status={status?.state ?? null}
            lastDecision={status?.lastDecision ?? null}
            isLoading={statusLoading}
            error={statusError}
            onRetry={refetchStatus}
          />
          <DecisionPanel
            decision={status?.lastDecision ?? null}
            config={config}
            isLoading={statusLoading}
            error={statusError}
            onRetry={refetchStatus}
          />
        </div>
        <div className="grid-two">
          <WeatherPanel
            weather={status?.lastDecision?.weather ?? null}
            isLoading={statusLoading}
            error={statusError}
            onRetry={refetchStatus}
          />
          <SystemHealth
            health={status?.systemHealth ?? null}
            isLoading={statusLoading}
            error={statusError}
            onRetry={refetchStatus}
          />
        </div>
        <CalendarView config={config} />
        <ManualControls onActionComplete={refetchStatus} />
        <ActivityLog />
        <ConfigEditor
          config={config}
          isAdmin={isAdmin}
          isLoading={configLoading}
          error={configError}
          onRefresh={loadConfig}
          onSave={handleSaveConfig}
        />
      </div>
    </div>
  );
};

export default App;
