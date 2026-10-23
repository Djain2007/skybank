'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from './components/DashboardLayout';
import PageHeader from './components/PageHeader';
import TransactionTable from './components/TransactionTable';
import CopyButton from './components/CopyButton';
import { useSession } from './components/Session';
import {
  TransferIcon,
  ShieldIcon,
  FlaskIcon,
  FileIcon,
  ArrowRightIcon,
  LockIcon,
} from './components/Icons';
import type { Transaction } from '@/lib/types';
import { formatAmount } from '@/lib/format';
import styles from './page.module.css';

interface SecurityLayer {
  purpose: string;
  algorithm: string;
  scope: string;
}

const securityLayers: SecurityLayer[] = [
  {
    purpose: 'Transfer Payload Encryption',
    algorithm: 'AES-256-GCM',
    scope: 'Seals transaction data in browser prior to transmission',
  },
  {
    purpose: 'Key Exchange Mechanism',
    algorithm: 'RSA-OAEP 4096',
    scope: "Wraps one-time AES key for server's public key only",
  },
  {
    purpose: 'Transaction Digital Signatures',
    algorithm: 'RSA-PSS 4096',
    scope: 'Client-signed canonical payload proves authenticity',
  },
  {
    purpose: 'Credential Hashing',
    algorithm: 'Argon2id',
    scope: 'Memory-hard password hashing with per-user salt',
  },
  {
    purpose: 'Replay Protection',
    algorithm: 'Nonce + Timestamp',
    scope: 'Unique 96-bit IV cache prevents message reuse',
  },
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
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, []);

  const firstName = session.user.fullName.split(' ')[0];
  const recent = transactions?.slice(0, 5) ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="SkyBank simulator balances are educational. All cryptographic encryption, signing, and verification are real."
        action={
          <Link href="/transfer" className="btn btn-primary">
            <TransferIcon size={16} />
            <span>New Transfer</span>
          </Link>
        }
      />

      {/* Primary Account Balance Panel */}
      <section className={styles.balancePanel} aria-labelledby="balance-heading">
        <div className={styles.balanceTop}>
          <div className={styles.accountIdentity}>
            <span className={styles.accountType}>Primary Educational Account</span>
            <div className={styles.accountNumRow}>
              <span className={`${styles.accountNumber} mono`}>{session.account.accountNumber}</span>
              <CopyButton
                value={session.account.accountNumber}
                toastLabel="Account number copied to clipboard"
                size="sm"
                className={styles.copyBtnOnDark}
              />
            </div>
          </div>

          <div className={styles.securityStatus}>
            <span className={styles.statusDot} />
            <span>WebCrypto Active</span>
          </div>
        </div>

        <div className={styles.balanceMain}>
          <div className={styles.balanceLabel} id="balance-heading">Available Balance</div>
          <div className={`${styles.balanceAmount} num`}>
            {formatAmount(session.account.balance)}
            <span className={styles.balanceUnit}>SKY</span>
          </div>
        </div>

        <div className={styles.balanceBottom}>
          <div className={styles.balanceSubtext}>
            1 SKY = 1 Simulated SkyCoin. No real-currency value.
          </div>
          <div className={styles.balanceActions}>
            <Link href="/transfer" className="btn btn-on-dark btn-sm">
              <TransferIcon size={15} />
              <span>Send Funds</span>
            </Link>
            <Link href="/transactions" className="btn btn-on-dark-ghost btn-sm">
              <span>View History</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Action Navigation Strip (No layout collision with sidebar) */}
      <nav className={styles.quickStrip} aria-label="Quick operations">
        <Link href="/transfer" className={styles.quickCard}>
          <div className={`${styles.quickIconWrap} ${styles.blueIcon}`}>
            <TransferIcon size={18} />
          </div>
          <div className={styles.quickContent}>
            <div className={styles.quickTitleRow}>
              <span className={styles.quickTitle}>Make a Transfer</span>
              <ArrowRightIcon size={14} className={styles.quickArrow} />
            </div>
            <span className={styles.quickDesc}>Hybrid AES-GCM + RSA-PSS flow</span>
          </div>
        </Link>

        <Link href="/crypto-lab" className={styles.quickCard}>
          <div className={`${styles.quickIconWrap} ${styles.purpleIcon}`}>
            <FlaskIcon size={18} />
          </div>
          <div className={styles.quickContent}>
            <div className={styles.quickTitleRow}>
              <span className={styles.quickTitle}>Cryptography Lab</span>
              <ArrowRightIcon size={14} className={styles.quickArrow} />
            </div>
            <span className={styles.quickDesc}>Test SHA-256 & HMAC algorithms</span>
          </div>
        </Link>

        <Link href="/security-tests" className={styles.quickCard}>
          <div className={`${styles.quickIconWrap} ${styles.amberIcon}`}>
            <ShieldIcon size={18} />
          </div>
          <div className={styles.quickContent}>
            <div className={styles.quickTitleRow}>
              <span className={styles.quickTitle}>Security Tests</span>
              <ArrowRightIcon size={14} className={styles.quickArrow} />
            </div>
            <span className={styles.quickDesc}>Simulate tampering & replay attacks</span>
          </div>
        </Link>

        <Link href="/audit" className={styles.quickCard}>
          <div className={`${styles.quickIconWrap} ${styles.greenIcon}`}>
            <FileIcon size={18} />
          </div>
          <div className={styles.quickContent}>
            <div className={styles.quickTitleRow}>
              <span className={styles.quickTitle}>Audit Log</span>
              <ArrowRightIcon size={14} className={styles.quickArrow} />
            </div>
            <span className={styles.quickDesc}>Inspect server-recorded security events</span>
          </div>
        </Link>
      </nav>

      {/* Lower Dashboard Content Grid */}
      <div className={styles.dashboardGrid}>
        {/* Left Column: Recent Activity */}
        <section className={`card ${styles.recentSection}`} aria-labelledby="recent-title">
          <div className="card-header">
            <div className={styles.recentTitleGroup}>
              <h2 id="recent-title" className="card-title">
                Recent Transactions
              </h2>
              {recent.length > 0 && (
                <span className={styles.countBadge}>{recent.length} recent</span>
              )}
            </div>
            {recent.length > 0 && (
              <Link href="/transactions" className={styles.viewAllLink}>
                <span>View all activity</span>
                <ArrowRightIcon size={13} />
              </Link>
            )}
          </div>

          {transactions === null ? (
            <div className={styles.loadingRows} aria-busy="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="skeleton" style={{ height: 42, borderRadius: 6 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="table-empty">
              <p>No transaction history recorded yet.</p>
              <p style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>
                Send a transfer to generate an authentic cryptographic envelope on the server.
              </p>
              <div style={{ marginTop: 14 }}>
                <Link href="/transfer" className="btn btn-primary btn-sm">
                  Send First Transfer
                </Link>
              </div>
            </div>
          ) : (
            <TransactionTable transactions={recent} mine={session.account.accountNumber} />
          )}
        </section>

        {/* Right Column: Security Architecture */}
        <aside className={styles.securitySidebar}>
          <section className="card" aria-labelledby="security-heading">
            <div className="card-header">
              <div className={styles.securityHeadTitle}>
                <LockIcon size={16} />
                <h2 id="security-heading" className="card-title">
                  Security Architecture
                </h2>
              </div>
              <span className="badge badge-crypto">5 Layers Active</span>
            </div>

            <div className={styles.securityIntro}>
              Every transfer is encrypted and digitally signed in the client browser before network transit.
            </div>

            <dl className={styles.securityList}>
              {securityLayers.map((layer) => (
                <div key={layer.purpose} className={styles.securityItem}>
                  <dt className={styles.securityItemHead}>
                    <span className={styles.securityPurpose}>{layer.purpose}</span>
                    <span className="tag">{layer.algorithm}</span>
                  </dt>
                  <dd className={styles.securityScope}>{layer.scope}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.securityFoot}>
              <span className={styles.footText}>Verify defense mechanics:</span>
              <div className={styles.footLinks}>
                <Link href="/crypto-lab" className={styles.footLink}>
                  Open Cryptography Lab &rarr;
                </Link>
                <Link href="/security-tests" className={styles.footLink}>
                  Run Security Attacks &rarr;
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
