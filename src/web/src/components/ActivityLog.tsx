import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { fetchLogs } from '../api/client';
import { EventLogEntry } from '../types';

const typeLabels: Record<EventLogEntry['type'], string> = {
  evaluation: 'Evaluation',
  webhook_call: 'Webhook',
  override_set: 'Override',
  manual_command: 'Manual',
  config_change: 'Config',
};

const PAGE_SIZE = 30;

export const ActivityLog = () => {
  const [logs, setLogs] = useState<EventLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const pagedLogs = logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchLogs(150);
      setLogs(data);
      setCurrentPage(1);
      setExpandedId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
    const interval = window.setInterval(() => {
      void loadLogs();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadLogs]);

  return (
    <div className="card">
      <div className="calendar-header">
        <div className="card-header">Activity Log</div>
        <button className="button" onClick={loadLogs} disabled={isLoading}>
          Refresh
        </button>
      </div>
      {isLoading && logs.length === 0 && <div className="spinner" />}
      {error && (
        <div>
          <p className="muted">Error: {error}</p>
          <button className="button" onClick={loadLogs}>
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && logs.length === 0 && <p className="muted">No activity yet.</p>}
      {logs.length > 0 && (
        <>
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>State</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((entry) => {
                const time = parseISO(entry.timestamp);
                const isExpanded = expandedId === entry.id;
                const statusLabel = entry.success
                  ? entry.webhookStatusCode
                    ? `✅ ${entry.webhookStatusCode}`
                    : '✅ OK'
                  : '❌ ERR';

                return (
                  <Fragment key={entry.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                      <td title={format(time, 'PPpp')}>{formatDistanceToNow(time, { addSuffix: true })}</td>
                      <td>{typeLabels[entry.type]}</td>
                      <td>{entry.desiredState?.toUpperCase() ?? entry.commandedState?.toUpperCase() ?? '—'}</td>
                      <td>{statusLabel}</td>
                      <td>{entry.webhookLatencyMs ? `${entry.webhookLatencyMs}ms` : '—'}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="log-row-expanded">
                        <td colSpan={5}>
                          <div style={{ display: 'grid', gap: '0.4rem' }}>
                            {entry.webhookEvent && <div>Webhook event: {entry.webhookEvent}</div>}
                            {entry.reasons && entry.reasons.length > 0 && (
                              <div>Reasons: {entry.reasons.join('; ')}</div>
                            )}
                            {entry.error && <div>Error: {entry.error}</div>}
                            {entry.dryRun && <div>Dry run: YES</div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                className="button"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className="button"
                  onClick={() => setCurrentPage(page)}
                  style={
                    page === currentPage
                      ? { fontWeight: 'bold', borderColor: '#2563eb', color: '#2563eb' }
                      : undefined
                  }
                >
                  {page}
                </button>
              ))}
              <button
                className="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '0.4rem' }}>
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
