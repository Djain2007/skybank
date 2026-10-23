'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import CopyButton from '../components/CopyButton';
import { ShieldIcon, FileIcon, CheckIcon, AlertIcon } from '../components/Icons';
import type { AuditLog } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import styles from './page.module.css';

type AuditFilter = 'all' | 'blocks' | 'transfers' | 'auth';

export default function AuditPage() {
  return (
    <DashboardLayout>
      <AuditLogs />
    </DashboardLayout>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [filter, setFilter] = useState<AuditFilter>('all');

  useEffect(() => {
    fetch('/api/audit')
      .then((res) => res.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => setLogs([]));
  }, []);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    return logs.filter((log) => {
      if (filter === 'blocks') {
        return log.result === 'FAILURE' || log.event_type.includes('BLOCKED');
      }
      if (filter === 'transfers') {
        return log.event_type.includes('TRANSFER');
      }
      if (filter === 'auth') {
        return log.event_type.includes('LOGIN') || log.event_type.includes('REGISTER');
      }
      return true;
    });
  }, [logs, filter]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Security & Audit Log"
        description="Immutable record of security events logged by the server: cryptographic verifications, sign-ins, and all blocked attack attempts."
      />

      {/* Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.filterPills}>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All Events
            {logs && <span className={styles.pillCount}>{logs.length}</span>}
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'blocks' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('blocks')}
          >
            Blocked Attacks
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'transfers' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('transfers')}
          >
            Transfers
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'auth' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('auth')}
          >
            Authentication
          </button>
        </div>
      </div>

      <section className="card" aria-label="Audit events">
        {logs === null ? (
          <div className={styles.loadingRows} aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="table-empty">
            <p>No audit events recorded yet.</p>
            <p style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>
              Events appear here automatically as transfers are verified, or when security tests are simulated.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="table-empty">
            <p>No events found for this filter.</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => setFilter('all')}
            >
              Show all events
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={`table-wrap ${styles.desktopTable}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Security Event</th>
                    <th>Result</th>
                    <th>Verification Details</th>
                    <th className="cell-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className={styles.timeCell}>{formatTime(log.timestamp)}</td>
                      <td>
                        <span className={`${styles.eventTag} mono`}>{log.event_type}</span>
                      </td>
                      <td>
                        <StatusBadge status={log.result} />
                      </td>
                      <td className={styles.detailsCell}>{log.details}</td>
                      <td className="cell-right">
                        {log.details && (
                          <CopyButton value={log.details} toastLabel="Event details copied" size="sm" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed (Prevents horizontal scrolling on phones) */}
            <ul className={styles.mobileFeed} aria-label="Audit events mobile feed">
              {filteredLogs.map((log) => {
                const isFail = log.result === 'FAILURE';
                return (
                  <li key={log.id} className={styles.mobileCard}>
                    <div className={styles.mobileCardHeader}>
                      <div className={styles.mobileCardTitleRow}>
                        <span className={`${styles.eventTag} mono`}>{log.event_type}</span>
                        <StatusBadge status={log.result} />
                      </div>
                      <span className={styles.mobileTime}>{formatTime(log.timestamp)}</span>
                    </div>

                    <div className={styles.mobileDetails}>
                      <span>{log.details}</span>
                    </div>

                    {log.details && (
                      <div className={styles.mobileCardFooter}>
                        <CopyButton value={log.details} label="Copy Log Details" size="sm" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <p className={styles.note}>
        Showing server-verified audit log entries for your account. SQLite UTC timestamps formatted to local timezone.
      </p>
    </div>
  );
}

function formatTime(value: string): string {
  const iso = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : value.replace(' ', 'T') + 'Z';
  return formatDateTime(iso);
}
