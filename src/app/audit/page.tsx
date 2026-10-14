'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import type { AuditLog } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import styles from './page.module.css';

export default function AuditPage() {
  return (
    <DashboardLayout>
      <AuditLogs />
    </DashboardLayout>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);

  useEffect(() => {
    fetch('/api/audit')
      .then(res => res.json())
      .then(data => setLogs(data.logs ?? []))
      .catch(() => setLogs([]));
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Audit log"
        description="Security events recorded by the server: sign-ins, completed transfers, and every rejected attempt with the reason it was refused."
      />

      <section className="card" aria-label="Audit events">
        {logs === null ? (
          <div className={styles.loadingRows} aria-busy="true">
            {[0, 1, 2, 3, 4].map(i => <span key={i} className="skeleton" style={{ height: 14 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="table-empty">
            Nothing recorded yet. Events appear here as you sign in, transfer, or run a security test.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Result</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className={styles.timeCell}>{formatTime(log.timestamp)}</td>
                    <td><span className={`${styles.event} mono`}>{log.event_type}</span></td>
                    <td><StatusBadge status={log.result} /></td>
                    <td className={styles.detailsCell}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.note}>
        Showing the most recent 100 events for your account. Timestamps are recorded by the server.
      </p>
    </div>
  );
}

function formatTime(value: string): string {
  // SQLite's CURRENT_TIMESTAMP is UTC without a zone marker; treat it as such.
  const iso = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : value.replace(' ', 'T') + 'Z';
  return formatDateTime(iso);
}
