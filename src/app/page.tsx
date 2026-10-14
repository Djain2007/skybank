'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from './components/DashboardLayout';
import PageHeader from './components/PageHeader';
import TransactionTable from './components/TransactionTable';
import { useSession } from './components/Session';
import type { Transaction } from '@/lib/types';
import { formatAmount } from '@/lib/format';
import styles from './page.module.css';

const protections = [
  { label: 'Transfer payload', value: 'AES-256-GCM' },
  { label: 'Key exchange', value: 'RSA-OAEP 4096' },
  { label: 'Signatures', value: 'RSA-PSS 4096' },
  { label: 'Passwords', value: 'Argon2id' },
  { label: 'Replay protection', value: 'Nonce + timestamp' },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Overview />
    </DashboardLayout>
  );
}

function Overview() {
  const { session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, []);

  const firstName = session.user.fullName.split(' ')[0];
  const recent = transactions?.slice(0, 5) ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is where your account stands."
      />

      <div className={styles.grid}>
        <div className={styles.primary}>
          <section className={styles.balanceCard} aria-labelledby="balance-label">
            <div className={styles.balanceTop}>
              <span id="balance-label" className={styles.balanceLabel}>Available balance</span>
              <span className={styles.balanceMeta}>Primary account</span>
            </div>
            <div className={`${styles.balanceAmount} num`}>
              {formatAmount(session.account.balance)}
              <span className={styles.balanceUnit}>SKY</span>
            </div>
            <div className={styles.balanceBottom}>
              <div>
                <div className={styles.balanceMeta}>Account number</div>
                <div className={`${styles.accountNumber} mono`}>{session.account.accountNumber}</div>
              </div>
              <div className={styles.balanceActions}>
                <Link href="/transfer" className="btn btn-on-dark">Transfer funds</Link>
                <Link href="/transactions" className="btn btn-on-dark-ghost">All transactions</Link>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="recent-title">
            <div className="card-header">
              <h2 id="recent-title" className="card-title">Recent transactions</h2>
              {recent.length > 0 && <Link href="/transactions" className={styles.cardLink}>View all</Link>}
            </div>

            {transactions === null ? (
              <div className={styles.loadingRows} aria-busy="true">
                {[0, 1, 2].map(i => <span key={i} className="skeleton" style={{ height: 14 }} />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="table-empty">
                No transactions yet. <Link href="/transfer">Send your first transfer</Link> and it
                will show up here, along with its cryptographic record.
              </div>
            ) : (
              <TransactionTable transactions={recent} mine={session.account.accountNumber} />
            )}
          </section>
        </div>

        <aside className={styles.secondary}>
          <section className="card" aria-labelledby="protection-title">
            <div className="card-header">
              <h2 id="protection-title" className="card-title">How this account is protected</h2>
            </div>
            <dl className={styles.protections}>
              {protections.map(item => (
                <div key={item.label} className={styles.protectionRow}>
                  <dt>{item.label}</dt>
                  <dd className="tag">{item.value}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.cardFoot}>
              Try the primitives yourself in the <Link href="/crypto-lab">cryptography lab</Link>, or
              attack a transfer in <Link href="/security-tests">security tests</Link>.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
