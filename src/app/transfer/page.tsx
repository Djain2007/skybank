'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import { useSession } from '../components/Session';
import { AlertIcon, CheckIcon } from '../components/Icons';
import {
  canonicalizeTransaction,
  generateAESKey,
  encryptAESGCM,
  encryptAESKeyWithServerRSA,
  signData
} from '@/lib/crypto/client';
import { formatAmount, formatDateTime } from '@/lib/format';
import styles from './page.module.css';

type Step = 1 | 2 | 3 | 4; // 1 = details, 2 = review, 3 = verifying, 4 = sent

const stepLabels = ['Details', 'Review', 'Verify', 'Sent'];

interface SentTransfer {
  transactionId: string;
  timestamp: string;
  recipient: string;
  amount: number;
}

function newTransactionId(): string {
  return 'TX-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
}

export default function TransferPage() {
  return (
    <DashboardLayout>
      <Transfer />
    </DashboardLayout>
  );
}

function Transfer() {
  const { session, refresh } = useSession();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [serverPublicKey, setServerPublicKey] = useState('');
  const [sent, setSent] = useState<SentTransfer | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setServerPublicKey(data.publicKey));
  }, []);

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (parseFloat(amount) > session.account.balance) {
      setError('That amount is more than your available balance.');
      return;
    }
    setError('');
    setStep(2);
  };

  const executeTransfer = async () => {
    setStep(3);
    setStatusSteps([]);
    setError('');

    const addStatus = (msg: string) => setStatusSteps(prev => [...prev, msg]);

    try {
      const transactionId = newTransactionId();
      const timestamp = new Date().toISOString();
      const amountNum = parseFloat(amount);

      addStatus('Loading your signing key');
      const jwkStr = localStorage.getItem(`skybank_priv_${session.user.username}`);
      if (!jwkStr) throw new Error('Your signing key is not in this browser. Register again, or use the browser you registered with.');
      const jwk = JSON.parse(jwkStr);
      const privateKey = await window.crypto.subtle.importKey(
        'jwk', jwk, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign']
      );

      addStatus('Generating a one-time AES-256 key');
      const aesKey = await generateAESKey();

      addStatus('Encrypting the transfer with AES-GCM');
      const payloadString = JSON.stringify({
        sender: session.account.accountNumber,
        recipient,
        amount: amountNum,
        description,
        timestamp,
        transactionId
      });

      const { ciphertext, iv: aesNonce, authTag } = await encryptAESGCM(payloadString, aesKey);

      addStatus('Signing the transaction with RSA-PSS');
      const canonicalData = canonicalizeTransaction(
        session.account.accountNumber,
        recipient,
        amountNum,
        timestamp,
        aesNonce,
        description
      );
      const signature = await signData(canonicalData, privateKey);

      addStatus('Wrapping the AES key with the server’s RSA-OAEP key');
      const encryptedAesKey = await encryptAESKeyWithServerRSA(aesKey, serverPublicKey);

      addStatus('Sending to SkyBank for verification');
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext,
          nonce: aesNonce,
          authTag,
          encryptedAesKey,
          signature,
          transactionId,
          timestamp,
          senderAccount: session.account.accountNumber,
          recipientAccount: recipient,
          amount: amountNum,
          description
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      setSent({ transactionId, timestamp, recipient, amount: amountNum });
      setStep(4);
      await refresh();

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep(2); // Back to review so the transfer can be changed or retried
    }
  };

  const resetForm = () => {
    setRecipient('');
    setAmount('');
    setDescription('');
    setSent(null);
    setStep(1);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Transfer"
        description="Send SKY to another account. The transfer is encrypted and signed in your browser before it is sent."
      />

      <ol className={styles.stepper} aria-label="Transfer progress">
        {stepLabels.map((label, i) => {
          const index = (i + 1) as Step;
          const state = index < step || step === 4 ? 'done' : index === step ? 'current' : 'todo';
          return (
            <li key={label} className={styles.stepItem} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className={styles.stepDot}>
                {state === 'done' ? <CheckIcon size={12} /> : index}
              </span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className={`alert alert-error ${styles.alert}`} role="alert">
          <AlertIcon size={18} />
          <div>
            <strong>The transfer was not sent</strong>
            {error}
          </div>
        </div>
      )}

      <div className="card">
        {step === 1 && (
          <form onSubmit={handleReview} className="card-body">
            <div className={styles.fromBlock}>
              <div className={styles.fromLabel}>From</div>
              <div className={styles.fromRow}>
                <span className="mono">{session.account.accountNumber}</span>
                <span className={`${styles.fromBalance} num`}>
                  {formatAmount(session.account.balance)} SKY available
                </span>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="recipient">To account number</label>
              <input
                id="recipient"
                type="text"
                className="input mono"
                placeholder="SKY-10002"
                autoComplete="off"
                spellCheck={false}
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="amount">Amount</label>
              <div className="input-group">
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className="input num"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
                <span className="input-suffix">SKY</span>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="description">
                Description <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="description"
                type="text"
                className="input"
                placeholder="What is this for?"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary btn-lg">Review transfer</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="card-body">
            <h2 className={styles.sectionTitle}>Check the details</h2>

            <dl className={styles.summary}>
              <div className={styles.summaryRow}>
                <dt>From</dt>
                <dd className="mono">{session.account.accountNumber}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>To</dt>
                <dd className="mono">{recipient}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Amount</dt>
                <dd className={`${styles.summaryAmount} num`}>{formatAmount(parseFloat(amount))} SKY</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Description</dt>
                <dd>{description || <span className="text-secondary">None</span>}</dd>
              </div>
            </dl>

            <p className={styles.reviewNote}>
              Confirming signs this exact data with your private key. Any change to it afterwards
              would invalidate the signature.
            </p>

            {!serverPublicKey && (
              <div className={styles.keyWait} role="status">
                <span className="spinner" aria-hidden="true" />
                Fetching the server&apos;s public key
              </div>
            )}

            <div className={styles.actions}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary btn-lg">
                Back
              </button>
              <button
                type="button"
                onClick={executeTransfer}
                className="btn btn-primary btn-lg"
                disabled={!serverPublicKey}
                title={serverPublicKey ? undefined : 'Waiting for the server\u2019s public key'}
              >
                Confirm and send
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card-body" aria-live="polite">
            <h2 className={styles.sectionTitle}>Securing your transfer</h2>
            <ol className={styles.timeline}>
              {statusSteps.map((status, index) => {
                const active = index === statusSteps.length - 1;
                return (
                  <li key={index} className={styles.timelineItem} data-state={active ? 'active' : 'done'}>
                    <span className={styles.timelineMarker}>
                      {active ? <span className="spinner" aria-hidden="true" /> : <CheckIcon size={13} />}
                    </span>
                    <span>{status}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {step === 4 && sent && (
          <div className="card-body">
            <div className={styles.successHead}>
              <span className={styles.successIcon}><CheckIcon size={20} /></span>
              <div>
                <h2 className={styles.sectionTitle} style={{ marginBottom: 2 }}>Transfer sent</h2>
                <p className="text-secondary" style={{ fontSize: 14 }}>
                  Verified by the server and recorded with its cryptographic envelope.
                </p>
              </div>
            </div>

            <div className={`${styles.sentAmount} num`}>{formatAmount(sent.amount)} SKY</div>

            <dl className={styles.summary}>
              <div className={styles.summaryRow}>
                <dt>To</dt>
                <dd className="mono">{sent.recipient}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Transaction ID</dt>
                <dd className="mono">{sent.transactionId}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Date</dt>
                <dd>{formatDateTime(sent.timestamp)}</dd>
              </div>
            </dl>

            <div className={styles.actions}>
              <Link href="/transactions" className="btn btn-secondary btn-lg">View transactions</Link>
              <button type="button" onClick={resetForm} className="btn btn-primary btn-lg">
                Make another transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
