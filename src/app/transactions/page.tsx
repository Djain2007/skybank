'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TransactionTable from '../components/TransactionTable';
import { useSession } from '../components/Session';
import { CloseIcon } from '../components/Icons';
import type { Transaction } from '@/lib/types';
import { formatAmount, formatDateTime } from '@/lib/format';
import styles from './page.module.css';

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <Transactions />
    </DashboardLayout>
  );
}

function Transactions() {
  const { session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, []);

  const mine = session.account.accountNumber;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Transactions"
        description="Every transfer on your account, with the cryptographic record the server verified before it moved money."
      />

      <div className={`${styles.layout} ${selected ? styles.hasInspector : ''}`}>
        <section className={`card ${styles.list}`} aria-label="Transaction list">
          {transactions === null ? (
            <div className={styles.loadingRows} aria-busy="true">
              {[0, 1, 2, 3].map(i => <span key={i} className="skeleton" style={{ height: 14 }} />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="table-empty">
              No transactions yet. <Link href="/transfer">Send a transfer</Link> to create the first one.
            </div>
          ) : (
            <TransactionTable
              transactions={transactions}
              mine={mine}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          )}
        </section>

        {selected && (
          <Inspector transaction={selected} mine={mine} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

function Inspector({ transaction: tx, mine, onClose }: { transaction: Transaction; mine: string; onClose: () => void }) {
  const sent = tx.sender_number === mine;

  return (
    <aside className={`card ${styles.inspector}`} aria-label="Transaction details">
      <div className="card-header">
        <div>
          <div className={styles.inspectorKicker}>{sent ? 'Sent' : 'Received'}</div>
          <h2 className={`${styles.inspectorAmount} num`}>{formatAmount(tx.amount)} SKY</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="card-body">
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Transaction ID</dt>
            <dd className="mono">{tx.id}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Date</dt>
            <dd>{formatDateTime(tx.timestamp)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>From</dt>
            <dd className="mono">{tx.sender_number}</dd>
          </div>
          <div className={styles.fact}>
            <dt>To</dt>
            <dd className="mono">{tx.recipient_number}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Description</dt>
            <dd>{tx.description || <span className="text-secondary">None</span>}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Status</dt>
            <dd><StatusBadge status={tx.status} /></dd>
          </div>
        </dl>

        <h3 className={styles.envelopeTitle}>Cryptographic envelope</h3>
        <p className={styles.envelopeLead}>
          What the server received and checked. The plaintext was never sent.
        </p>

        <div className={styles.algos}>
          <div className={styles.algo}>
            <span>Payload encryption</span>
            <span className="tag">AES-256-GCM</span>
          </div>
          <div className={styles.algo}>
            <span>Key exchange</span>
            <span className="tag">RSA-OAEP</span>
          </div>
          <div className={styles.algo}>
            <span>Signature</span>
            <span className="tag">RSA-PSS</span>
          </div>
        </div>

        <Field label="Nonce" note="96-bit, unique per transfer">
          <code className="code-block">{tx.nonce}</code>
        </Field>

        <Field label="Authentication tag" status="Verified">
          <code className="code-block">{tx.auth_tag}</code>
        </Field>

        <Field label="Digital signature" status="Verified">
          <code className="code-block is-scroll">{tx.rsa_signature}</code>
        </Field>

        <Field label="Encrypted AES key" note="Wrapped with the server's public key">
          <code className="code-block is-scroll">{tx.encrypted_aes_key}</code>
        </Field>

        <Field label="Ciphertext">
          <code className="code-block is-scroll">{tx.ciphertext}</code>
        </Field>

        <div className={styles.replay}>
          <span>Replay protection</span>
          <span className="badge badge-success">Passed</span>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, note, status, children }: { label: string; note?: string; status?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>{label}</span>
        {status && <span className="badge badge-success">{status}</span>}
      </div>
      {children}
      {note && <div className={styles.fieldNote}>{note}</div>}
    </div>
  );
}
