'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from './components/DashboardLayout';
import PageHeader from './components/PageHeader';
import TransactionTable from './components/TransactionTable';
import CopyButton from './components/CopyButton';
import { useSession } from './components/Session';
import {
  ChipIcon,
  ContactlessIcon,
  TransferIcon,
  ShieldIcon,
  FlaskIcon,
  FileIcon,
  ArrowRightIcon,
  LockIcon,
  SparklesIcon,
} from './components/Icons';
import type { Transaction } from '@/lib/types';
import { formatAmount } from '@/lib/format';
import styles from './page.module.css';

const protections = [
  { label: 'Transfer payload encryption', value: 'AES-256-GCM', status: 'Sealed' },
  { label: 'Key exchange mechanism', value: 'RSA-OAEP 4096', status: 'Secured' },
  { label: 'Transaction digital signatures', value: 'RSA-PSS 4096', status: 'Enforced' },
  { label: 'Credential hashing algorithm', value: 'Argon2id', status: 'Hardened' },
  { label: 'Replay protection system', value: 'Nonce + Timestamp', status: 'Active' },
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
        description="Your account is protected with client-side RSA-PSS signatures and hybrid encryption."
      />

      <div className={styles.grid}>
        {/* Main Column */}
        <div className={styles.primary}>
          {/* Executive Digital Bank Card */}
          <section className={styles.cardHero} aria-labelledby="balance-label">
            {/* Background metallic shimmer overlay */}
            <div className={styles.cardShimmer} aria-hidden="true" />

            <div className={styles.cardHeader}>
              <div className={styles.cardBrand}>
                <span className={styles.bankName}>SkyBank</span>
                <span className={styles.cardTier}>TITANIUM CIPHER</span>
              </div>
              <div className={styles.cardIcons}>
                <ContactlessIcon size={20} />
                <span className={styles.statusLive}>
                  <span className={styles.statusLiveDot} /> Live
                </span>
              </div>
            </div>

            <div className={styles.chipRow}>
              <ChipIcon size={34} />
              <div className={styles.cipherTag}>
                <LockIcon size={12} />
                <span>WebCrypto API Verified</span>
              </div>
            </div>

            <div className={styles.balanceArea}>
              <span id="balance-label" className={styles.balanceLabel}>
                Total Available Balance
              </span>
              <div className={`${styles.balanceAmount} num`}>
                {formatAmount(session.account.balance)}
                <span className={styles.balanceUnit}>SKY</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.accountBlock}>
                <span className={styles.accountLabel}>Account Number</span>
                <div className={styles.accountNumRow}>
                  <span className={`${styles.accountNumber} mono`}>{session.account.accountNumber}</span>
                  <CopyButton
                    value={session.account.accountNumber}
                    toastLabel="Account number copied"
                    size="sm"
                    className={styles.cardCopyBtn}
                  />
                </div>
              </div>

              <div className={styles.cardActions}>
                <Link href="/transfer" className="btn btn-on-dark btn-sm">
                  <TransferIcon size={16} />
                  <span>Send SKY</span>
                </Link>
                <Link href="/transactions" className="btn btn-on-dark-ghost btn-sm">
                  <span>History</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Quick Action Tiles */}
          <div className={styles.quickGrid}>
            <Link href="/transfer" className={styles.quickTile}>
              <div className={`${styles.quickIconWrap} ${styles.blueIcon}`}>
                <TransferIcon size={18} />
              </div>
              <div className={styles.quickText}>
                <span className={styles.quickTitle}>Make Transfer</span>
                <span className={styles.quickDesc}>Hybrid encrypted payload</span>
              </div>
              <ArrowRightIcon size={15} className={styles.quickArrow} />
            </Link>

            <Link href="/crypto-lab" className={styles.quickTile}>
              <div className={`${styles.quickIconWrap} ${styles.purpleIcon}`}>
                <FlaskIcon size={18} />
              </div>
              <div className={styles.quickText}>
                <span className={styles.quickTitle}>Crypto Lab</span>
                <span className={styles.quickDesc}>Test SHA-256 & HMAC</span>
              </div>
              <ArrowRightIcon size={15} className={styles.quickArrow} />
            </Link>

            <Link href="/security-tests" className={styles.quickTile}>
              <div className={`${styles.quickIconWrap} ${styles.amberIcon}`}>
                <ShieldIcon size={18} />
              </div>
              <div className={styles.quickText}>
                <span className={styles.quickTitle}>Security Tests</span>
                <span className={styles.quickDesc}>Simulate real attacks</span>
              </div>
              <ArrowRightIcon size={15} className={styles.quickArrow} />
            </Link>

            <Link href="/audit" className={styles.quickTile}>
              <div className={`${styles.quickIconWrap} ${styles.greenIcon}`}>
                <FileIcon size={18} />
              </div>
              <div className={styles.quickText}>
                <span className={styles.quickTitle}>Audit Log</span>
                <span className={styles.quickDesc}>Server-side events</span>
              </div>
              <ArrowRightIcon size={15} className={styles.quickArrow} />
            </Link>
          </div>

          {/* Recent Activity Card */}
          <section className="card" aria-labelledby="recent-title">
            <div className="card-header">
              <div className={styles.recentHead}>
                <h2 id="recent-title" className="card-title">
                  Recent Activity
                </h2>
                {recent.length > 0 && (
                  <span className={styles.countBadge}>{recent.length} recent</span>
                )}
              </div>
              {recent.length > 0 && (
                <Link href="/transactions" className={styles.cardLink}>
                  View all transactions
                  <ArrowRightIcon size={14} />
                </Link>
              )}
            </div>

            {transactions === null ? (
              <div className={styles.loadingRows} aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="table-empty">
                <p>No transactions recorded yet.</p>
                <p style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>
                  Send your first transfer to inspect the real AES ciphertext, nonce, tag, and RSA signature.
                </p>
                <div style={{ marginTop: 16 }}>
                  <Link href="/transfer" className="btn btn-primary btn-sm">
                    Make a transfer
                  </Link>
                </div>
              </div>
            ) : (
              <TransactionTable transactions={recent} mine={session.account.accountNumber} />
            )}
          </section>
        </div>

        {/* Sidebar: Protection Stack */}
        <aside className={styles.secondary}>
          <section className="card" aria-labelledby="protection-title">
            <div className="card-header">
              <div className={styles.shieldHead}>
                <ShieldIcon size={18} />
                <h2 id="protection-title" className="card-title">
                  Security Architecture
                </h2>
              </div>
              <span className={styles.activePill}>
                <SparklesIcon size={12} />
                5 Layers
              </span>
            </div>

            <div className={styles.shieldIntro}>
              Every simulated transaction undergoes local hybrid envelope encryption before network transmission.
            </div>

            <dl className={styles.protections}>
              {protections.map((item) => (
                <div key={item.label} className={styles.protectionRow}>
                  <dt>
                    <span className={styles.protDot} />
                    <span className={styles.protLabel}>{item.label}</span>
                  </dt>
                  <dd>
                    <span className="tag">{item.value}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className={styles.cardFoot}>
              <span>Want to verify the defenses?</span>
              <div className={styles.footLinks}>
                <Link href="/crypto-lab" className={styles.footLink}>
                  Open Crypto Lab &rarr;
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
