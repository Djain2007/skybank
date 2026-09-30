'use client';

import DashboardLayout from './components/DashboardLayout';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(d => {
        if (!d.error) setData(d);
      });
  }, []);

  if (!data) return <DashboardLayout><div style={{ padding: '2rem' }}>Loading overview...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 500 }}>
          Welcome back, {data.user.fullName.split(' ')[0]}
        </h2>
        <p style={{ color: 'var(--skybank-text-secondary)', marginBottom: '3rem' }}>
          Here is your financial overview.
        </p>

        <div className="card" style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--skybank-text-secondary)', fontWeight: 500, marginBottom: '1rem' }}>
            Primary Account
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '3rem', color: 'var(--skybank-navy)', fontWeight: 600, lineHeight: 1 }}>
                {data.account.balance.toLocaleString()} <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>SKY</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', color: 'var(--skybank-text-secondary)' }}>
                Account: {data.account.accountNumber}
              </div>
            </div>
            <a href="/transfer" className="btn btn-primary" style={{ minWidth: '160px' }}>
              Transfer Funds
            </a>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 500 }}>Recent Transactions</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--skybank-text-secondary)' }}>
                    No recent transactions. View all in the Transactions tab.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
