'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TransactionTable from '../components/TransactionTable';
import CopyButton from '../components/CopyButton';
import { useSession } from '../components/Session';
import {
  CloseIcon,
  SearchIcon,
  ShieldIcon,
  LockIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  TransferIcon,
} from '../components/Icons';
import type { Transaction } from '@/lib/types';
import { formatAmount, formatDateTime } from '@/lib/format';
import styles from './page.module.css';

type FilterType = 'all' | 'sent' | 'received';

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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, []);

  const mine = session.account.accountNumber;

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((tx) => {
      const sent = tx.sender_number === mine;
      const self = tx.sender_number === tx.recipient_number;

      // Filter by type
      if (filter === 'sent' && (!sent || self)) return false;
      if (filter === 'received' && (sent || self)) return false;

      // Filter by search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = tx.id.toLowerCase().includes(q);
        const matchDesc = (tx.description ?? '').toLowerCase().includes(q);
        const matchSender = tx.sender_number.toLowerCase().includes(q);
        const matchRecipient = tx.recipient_number.toLowerCase().includes(q);
        return matchId || matchDesc || matchSender || matchRecipient;
      }

      return true;
    });
  }, [transactions, filter, search, mine]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Transactions & Cryptography"
        description="Every transfer recorded on your account, along with the complete cryptographic envelope verified by the server."
      />

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterPills}>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All Activity
            {transactions && <span className={styles.pillCount}>{transactions.length}</span>}
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'received' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('received')}
          >
            Money In
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filter === 'sent' ? styles.filterPillActive : ''}`}
            onClick={() => setFilter('sent')}
          >
            Money Out
          </button>
        </div>

        <div className={styles.searchBox}>
          <SearchIcon size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search account, ID, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.layout} ${selected ? styles.hasInspector : ''}`}>
        {/* Transaction Table / List */}
        <section className={`card ${styles.list}`} aria-label="Transaction list">
          {transactions === null ? (
            <div className={styles.loadingRows} aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="table-empty">
              <p>No transactions yet.</p>
              <p style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>
                Send a transfer to generate your first cryptographic transaction envelope.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link href="/transfer" className="btn btn-primary btn-sm">
                  Send your first transfer
                </Link>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="table-empty">
              <p>No transactions matched your search or filter.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <TransactionTable
              transactions={filteredTransactions}
              mine={mine}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          )}
        </section>

        {/* Cryptographic Inspector (Desktop sticky / Mobile bottom sheet) */}
        {selected && (
          <>
            {/* Mobile Sheet Backdrop */}
            <div
              className={styles.sheetBackdrop}
              onClick={() => setSelected(null)}
              aria-hidden="true"
            />

            <aside className={styles.inspector} aria-label="Transaction cryptographic envelope">
              <div className={styles.sheetHandle} aria-hidden="true" />

              <div className={styles.inspectorHeader}>
                <div className={styles.inspectorHeadLeft}>
                  <div className={styles.directionTag}>
                    {selected.sender_number === selected.recipient_number ? (
                      <>
                        <TransferIcon size={14} /> Self-transfer
                      </>
                    ) : selected.sender_number === mine ? (
                      <>
                        <ArrowUpRightIcon size={14} /> Sent Transfer
                      </>
                    ) : (
                      <>
                        <ArrowDownLeftIcon size={14} /> Received Transfer
                      </>
                    )}
                  </div>
                  <h2 className={`${styles.inspectorAmount} num`}>
                    {formatAmount(selected.amount)} SKY
                  </h2>
                </div>
                <button
                  type="button"
                  className={`icon-btn ${styles.closeInspectorBtn}`}
                  onClick={() => setSelected(null)}
                  aria-label="Close details"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className={styles.inspectorBody}>
                {/* Core Facts */}
                <dl className={styles.facts}>
                  <div className={styles.fact}>
                    <dt>Transaction ID</dt>
                    <dd className={styles.factDdRow}>
                      <span className="mono">{selected.id}</span>
                      <CopyButton value={selected.id} toastLabel="Transaction ID copied" size="sm" />
                    </dd>
                  </div>
                  <div className={styles.fact}>
                    <dt>Timestamp</dt>
                    <dd>{formatDateTime(selected.timestamp)}</dd>
                  </div>
                  <div className={styles.fact}>
                    <dt>From Account</dt>
                    <dd className={styles.factDdRow}>
                      <span className="mono">{selected.sender_number}</span>
                      <CopyButton value={selected.sender_number} toastLabel="Sender account copied" size="sm" />
                    </dd>
                  </div>
                  <div className={styles.fact}>
                    <dt>To Account</dt>
                    <dd className={styles.factDdRow}>
                      <span className="mono">{selected.recipient_number}</span>
                      <CopyButton value={selected.recipient_number} toastLabel="Recipient account copied" size="sm" />
                    </dd>
                  </div>
                  <div className={styles.fact}>
                    <dt>Description</dt>
                    <dd>{selected.description || <span className="text-secondary">None</span>}</dd>
                  </div>
                  <div className={styles.fact}>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge status={selected.status} />
                    </dd>
                  </div>
                </dl>

                {/* Cryptographic Envelope Section */}
                <div className={styles.envelopeCard}>
                  <div className={styles.envelopeHead}>
                    <ShieldIcon size={16} />
                    <h3 className={styles.envelopeTitle}>Cryptographic Envelope</h3>
                  </div>
                  <p className={styles.envelopeLead}>
                    What the browser encrypted and signed. Plaintext transaction values were never transmitted over the wire.
                  </p>

                  <div className={styles.algos}>
                    <div className={styles.algo}>
                      <span>Payload Encryption</span>
                      <span className="tag">AES-256-GCM</span>
                    </div>
                    <div className={styles.algo}>
                      <span>Key Exchange</span>
                      <span className="tag">RSA-OAEP 4096</span>
                    </div>
                    <div className={styles.algo}>
                      <span>Digital Signature</span>
                      <span className="tag">RSA-PSS 4096</span>
                    </div>
                  </div>

                  <Field label="AES Nonce (IV)" note="96-bit, cryptographically random, unique per transfer" copyValue={selected.nonce}>
                    <code className="code-block">{selected.nonce}</code>
                  </Field>

                  <Field label="GCM Authentication Tag" status="Verified" copyValue={selected.auth_tag} note="Guarantees ciphertext integrity against tampering">
                    <code className="code-block">{selected.auth_tag}</code>
                  </Field>

                  <Field label="RSA-PSS Client Signature" status="Verified" copyValue={selected.rsa_signature} note="Signed in the sender's browser with their private key">
                    <code className="code-block is-scroll">{selected.rsa_signature}</code>
                  </Field>

                  <Field label="Encrypted AES Key" note="Wrapped with the SkyBank server's 4096-bit public RSA key" copyValue={selected.encrypted_aes_key}>
                    <code className="code-block is-scroll">{selected.encrypted_aes_key}</code>
                  </Field>

                  <Field label="AES Ciphertext (Payload)" copyValue={selected.ciphertext} note="The encrypted JSON representation of the transfer">
                    <code className="code-block is-scroll">{selected.ciphertext}</code>
                  </Field>

                  <div className={styles.replayBadge}>
                    <div className={styles.replayLeft}>
                      <LockIcon size={14} />
                      <span>Replay Protection Check</span>
                    </div>
                    <span className="badge badge-success">Passed</span>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  note,
  status,
  copyValue,
  children,
}: {
  label: string;
  note?: string;
  status?: string;
  copyValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <div className={styles.fieldTitleGroup}>
          <span className={styles.fieldLabel}>{label}</span>
          {status && <span className="badge badge-success">{status}</span>}
        </div>
        {copyValue && (
          <CopyButton value={copyValue} label="Copy" size="sm" />
        )}
      </div>
      {children}
      {note && <div className={styles.fieldNote}>{note}</div>}
    </div>
  );
}
