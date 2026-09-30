'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/audit')
      .then(res => res.json())
      .then(data => {
        if (data.logs) setLogs(data.logs);
      });
  }, []);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 500 }}>Audit Logs</h2>
        <p style={{ color: 'var(--skybank-text-secondary)', marginBottom: '3rem' }}>
          Immutable system and security event logs.
        </p>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Result</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--skybank-text-secondary)' }}>
                    No audit logs found.
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td data-label="Timestamp" style={{ fontSize: '0.75rem', color: 'var(--skybank-text-secondary)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td data-label="Event Type" style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    {log.event_type}
                  </td>
                  <td data-label="Result">
                    <span className={`status-badge ${log.result === 'SUCCESS' ? 'status-success' : 'status-error'}`}>
                      {log.result}
                    </span>
                  </td>
                  <td data-label="Details" style={{ fontSize: '0.875rem' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
