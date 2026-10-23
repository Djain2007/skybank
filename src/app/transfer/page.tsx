'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import CopyButton from '../components/CopyButton';
import { useSession } from '../components/Session';
import {
  AlertIcon,
  CheckIcon,
  LockIcon,
  ShieldIcon,
  ArrowRightIcon,
} from '../components/Icons';
import {
  canonicalizeTransaction,
  generateAESKey,
  encryptAESGCM,
  encryptAESKeyWithServerRSA,
  signData,
} from '@/lib/crypto/client';
import { formatAmount, formatDateTime } from '@/lib/format';
import styles from './page.module.css';

type Step = 1 | 2 | 3 | 4; // 1 = details, 2 = review, 3 = verifying, 4 = sent

const stepLabels = ['Details', 'Review', 'Verify & Sign', 'Receipt'];

interface SentTransfer {
  transactionId: string;
  timestamp: string;
  recipient: string;
  amount: number;
  description: string;
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
      .then((res) => res.json())
      .then((data) => setServerPublicKey(data.publicKey));
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const remainingBalance = session.account.balance - numAmount;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (numAmount > session.account.balance) {
      setError('That amount exceeds your available balance.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleAmountPreset = (addVal: number) => {
    setAmount(addVal.toString());
  };

  const handleMaxAmount = () => {
    setAmount(session.account.balance.toString());
  };

  const executeTransfer = async () => {
    setStep(3);
    setStatusSteps([]);
    setError('');

    const addStatus = (msg: string) => setStatusSteps((prev) => [...prev, msg]);

    try {
      const transactionId = newTransactionId();
      const timestamp = new Date().toISOString();
      const amountNum = parseFloat(amount);

      addStatus('Loading browser-held RSA-PSS signing key');
      const jwkStr = localStorage.getItem(`skybank_priv_${session.user.username}`);
      if (!jwkStr) {
        throw new Error(
          'Your signing key is not in this browser. Please register again in this browser.'
        );
      }
      const jwk = JSON.parse(jwkStr);
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSA-PSS', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Brief delay so student/evaluator can visually observe cryptographic steps
      await new Promise((r) => setTimeout(r, 220));

      addStatus('Generating one-time 256-bit AES-GCM session key & nonce');
      const aesKey = await generateAESKey();

      await new Promise((r) => setTimeout(r, 220));

      addStatus('Encrypting transaction payload with AES-256-GCM');
      const payloadString = JSON.stringify({
        sender: session.account.accountNumber,
        recipient,
        amount: amountNum,
        description,
        timestamp,
        transactionId,
      });

      const { ciphertext, iv: aesNonce, authTag } = await encryptAESGCM(payloadString, aesKey);

      await new Promise((r) => setTimeout(r, 240));

      addStatus('Signing canonical transaction data with RSA-PSS (4096-bit)');
      const canonicalData = canonicalizeTransaction(
        session.account.accountNumber,
        recipient,
        amountNum,
        timestamp,
        aesNonce,
        description
      );
      const signature = await signData(canonicalData, privateKey);

      await new Promise((r) => setTimeout(r, 220));

      addStatus("Wrapping session key with SkyBank server's RSA-OAEP public key");
      const encryptedAesKey = await encryptAESKeyWithServerRSA(aesKey, serverPublicKey);

      await new Promise((r) => setTimeout(r, 220));

      addStatus('Transmitting sealed envelope to SkyBank server for verification');
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
          description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      setSent({ transactionId, timestamp, recipient, amount: amountNum, description });
      setStep(4);
      await refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep(2);
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
        title="Send Transfer"
        description="Encrypted and digitally signed in your browser with AES-256-GCM and RSA-PSS before hitting the network."
      />

      {/* Responsive Progress Stepper */}
      <ol className={styles.stepper} aria-label="Transfer progress">
        {stepLabels.map((label, i) => {
          const index = (i + 1) as Step;
          const isDone = index < step || step === 4;
          const isCurrent = index === step;
          const state = isDone ? 'done' : isCurrent ? 'current' : 'todo';
          return (
            <li
              key={label}
              className={styles.stepItem}
              data-state={state}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className={styles.stepDot}>
                {isDone ? <CheckIcon size={12} /> : index}
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
            <strong>Transaction Could Not Be Sent</strong>
            {error}
          </div>
        </div>
      )}

      <div className="card">
        {/* STEP 1: Details */}
        {step === 1 && (
          <form onSubmit={handleReview} className="card-body">
            {/* From Account Summary Box */}
            <div className={styles.fromCard}>
              <div className={styles.fromTop}>
                <span className={styles.fromLabel}>Source Account</span>
                <span className={styles.fromSecureBadge}>
                  <LockIcon size={12} /> Key in Browser
                </span>
              </div>
              <div className={styles.fromRow}>
                <span className={`${styles.fromAccNum} mono`}>{session.account.accountNumber}</span>
                <span className={`${styles.fromBalance} num`}>
                  {formatAmount(session.account.balance)} SKY available
                </span>
              </div>
            </div>

            {/* Recipient Account Field */}
            <div className="field">
              <label className="label" htmlFor="recipient">
                <span>To Account Number</span>
                <span className={styles.hintTag}>Format: SKY-XXXXX</span>
              </label>
              <input
                id="recipient"
                type="text"
                className="input mono"
                placeholder="SKY-10002"
                autoComplete="off"
                spellCheck={false}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
              {/* Quick Select demo pills */}
              <div className={styles.quickRecipients}>
                <span className={styles.quickRecLabel}>Quick Select:</span>
                <button
                  type="button"
                  className={styles.recPill}
                  onClick={() => setRecipient('SKY-10002')}
                >
                  Jash (SKY-10002)
                </button>
                <button
                  type="button"
                  className={styles.recPill}
                  onClick={() => setRecipient('SKY-10001')}
                >
                  Daksh (SKY-10001)
                </button>
                <button
                  type="button"
                  className={styles.recPill}
                  onClick={() => setRecipient(session.account.accountNumber)}
                >
                  Self
                </button>
              </div>
            </div>

            {/* Amount Field */}
            <div className="field">
              <label className="label" htmlFor="amount">
                <span>Transfer Amount</span>
                {numAmount > 0 && (
                  <span
                    className={`${styles.remainingEst} ${
                      remainingBalance < 0 ? styles.remainingNegative : ''
                    } num`}
                  >
                    Remaining: {formatAmount(Math.max(0, remainingBalance))} SKY
                  </span>
                )}
              </label>
              <div className="input-group">
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={session.account.balance}
                  inputMode="decimal"
                  className="input num"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="input-suffix">SKY</span>
              </div>

              {/* Amount preset shortcuts */}
              <div className={styles.amountPresets}>
                {[100, 500, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={styles.presetBtn}
                    onClick={() => handleAmountPreset(val)}
                  >
                    +{val.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.presetBtn} ${styles.presetMax}`}
                  onClick={handleMaxAmount}
                >
                  Max Balance
                </button>
              </div>
            </div>

            {/* Description Field */}
            <div className="field">
              <label className="label" htmlFor="description">
                Description <span className={styles.optional}>(Optional)</span>
              </label>
              <input
                id="description"
                type="text"
                className="input"
                placeholder="e.g. Project milestone payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary btn-lg">
                Continue to Review
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Review */}
        {step === 2 && (
          <div className="card-body">
            <h2 className={styles.sectionTitle}>Review Transfer Details</h2>

            {/* Visual transfer flow diagram */}
            <div className={styles.flowDiagram}>
              <div className={styles.flowNode}>
                <span className={styles.flowLabel}>From Account</span>
                <span className="mono">{session.account.accountNumber}</span>
              </div>
              <div className={styles.flowArrow}>
                <div className={styles.flowArrowLine} />
                <span className={`${styles.flowBadge} num`}>{formatAmount(numAmount)} SKY</span>
              </div>
              <div className={styles.flowNode}>
                <span className={styles.flowLabel}>To Account</span>
                <span className="mono">{recipient}</span>
              </div>
            </div>

            <dl className={styles.summary}>
              <div className={styles.summaryRow}>
                <dt>Transfer Amount</dt>
                <dd className={`${styles.summaryAmount} num`}>
                  {formatAmount(numAmount)} SKY
                </dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Recipient</dt>
                <dd className="mono">{recipient}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Description</dt>
                <dd>{description || <span className="text-secondary">None</span>}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Network Transfer Fee</dt>
                <dd className="num" style={{ color: 'var(--green)' }}>
                  0.00 SKY (Simulated Free)
                </dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>New Available Balance</dt>
                <dd className="num" style={{ fontWeight: 600 }}>
                  {formatAmount(remainingBalance)} SKY
                </dd>
              </div>
            </dl>

            <div className={styles.cryptoNotice}>
              <ShieldIcon size={18} />
              <div>
                <strong>Client-Side Cryptographic Guarantee</strong>
                <span>
                  By confirming, this exact payload is canonicalized, hashed with SHA-256, and signed
                  with your browser&apos;s RSA-PSS private key. Any modification in transit will cause the server to reject it.
                </span>
              </div>
            </div>

            {!serverPublicKey && (
              <div className={styles.keyWait} role="status">
                <span className="spinner" aria-hidden="true" />
                Retrieving server public encryption key...
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary btn-lg"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={executeTransfer}
                className="btn btn-primary btn-lg"
                disabled={!serverPublicKey}
              >
                <LockIcon size={16} />
                Confirm & Seal Transfer
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Cryptographic Pipeline (Execution) */}
        {step === 3 && (
          <div className={styles.executingBody} aria-live="polite">
            <div className={styles.executingHeader}>
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <div>
                <h2 className={styles.sectionTitle} style={{ marginBottom: 2 }}>
                  Sealing & Verifying
                </h2>
                <p className="text-secondary" style={{ fontSize: 13.5 }}>
                  Executing client-side cryptographic pipeline in your browser.
                </p>
              </div>
            </div>

            <ol className={styles.timeline}>
              {statusSteps.map((status, index) => {
                const isLast = index === statusSteps.length - 1;
                return (
                  <li
                    key={index}
                    className={styles.timelineItem}
                    data-state={isLast ? 'active' : 'done'}
                  >
                    <span className={styles.timelineMarker}>
                      {isLast ? (
                        <span className="spinner" aria-hidden="true" />
                      ) : (
                        <CheckIcon size={13} />
                      )}
                    </span>
                    <span className={styles.timelineText}>{status}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* STEP 4: Receipt */}
        {step === 4 && sent && (
          <div className="card-body">
            <div className={styles.receiptCard}>
              <div className={styles.receiptTop}>
                <span className={styles.successIcon}>
                  <CheckIcon size={24} />
                </span>
                <h2 className={styles.receiptTitle}>Transfer Completed</h2>
                <span className={styles.receiptSub}>Verified & Settled on SkyBank Ledger</span>
                <div className={`${styles.receiptAmount} num`}>
                  {formatAmount(sent.amount)} <span className={styles.receiptCurrency}>SKY</span>
                </div>
              </div>

              <div className={styles.receiptDivider} />

              <dl className={styles.summary}>
                <div className={styles.summaryRow}>
                  <dt>Transaction ID</dt>
                  <dd className={styles.receiptCopyRow}>
                    <span className="mono">{sent.transactionId}</span>
                    <CopyButton value={sent.transactionId} toastLabel="Transaction ID copied" size="sm" />
                  </dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>Recipient Account</dt>
                  <dd className="mono">{sent.recipient}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>Timestamp</dt>
                  <dd>{formatDateTime(sent.timestamp)}</dd>
                </div>
                {sent.description && (
                  <div className={styles.summaryRow}>
                    <dt>Description</dt>
                    <dd>{sent.description}</dd>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <dt>Security Record</dt>
                  <dd>
                    <span className="tag">AES-GCM + RSA-PSS</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className={styles.actions} style={{ marginTop: 24 }}>
              <Link href="/transactions" className="btn btn-secondary btn-lg">
                View in Transaction Inspector
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-primary btn-lg"
              >
                Send Another Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
