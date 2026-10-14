'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import { useSession } from '../components/Session';
import { PlayIcon } from '../components/Icons';
import {
  canonicalizeTransaction,
  generateAESKey,
  encryptAESGCM,
  encryptAESKeyWithServerRSA,
  signData
} from '@/lib/crypto/client';
import styles from './page.module.css';

type TestType = 'Amount Tampering' | 'Signature Tampering' | 'Ciphertext Tampering' | 'Replay Attack';

interface TestCase {
  type: TestType;
  name: string;
  attack: string;
  defence: string;
}

const tests: TestCase[] = [
  {
    type: 'Amount Tampering',
    name: 'Amount tampering',
    attack: 'Sign a transfer of 5,000 SKY, then change the submitted amount to 50,000.',
    defence: 'The RSA-PSS signature covers the amount, so verification fails.',
  },
  {
    type: 'Signature Tampering',
    name: 'Forged signature',
    attack: 'Flip one character inside an otherwise valid signature.',
    defence: 'Signature verification against your public key rejects it.',
  },
  {
    type: 'Ciphertext Tampering',
    name: 'Modified ciphertext',
    attack: 'Flip one character of the AES-GCM ciphertext in transit.',
    defence: 'The GCM authentication tag no longer matches and decryption is refused.',
  },
  {
    type: 'Replay Attack',
    name: 'Replay attack',
    attack: 'Send a valid 5,000 SKY transfer to your own account, then send the identical message again.',
    defence: 'The nonce was already recorded by the first send, so the second copy is rejected.',
  },
];

/** Replace one character of a Base64 string with a different one, so the data is always altered. */
function flipCharacter(value: string, index = 10): string {
  const replacement = value[index] === 'A' ? 'B' : 'A';
  return value.substring(0, index) + replacement + value.substring(index + 1);
}

function testTransactionId(): string {
  return 'TX-TEST-' + Math.floor(Math.random() * 900000);
}

export default function SecurityTestsPage() {
  return (
    <DashboardLayout>
      <SecurityTests />
    </DashboardLayout>
  );
}

function SecurityTests() {
  const { session, refresh } = useSession();
  const [running, setRunning] = useState<TestType | null>(null);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [serverPublicKey, setServerPublicKey] = useState('');

  useEffect(() => {
    fetch('/api/config').then(res => res.json()).then(data => setServerPublicKey(data.publicKey));
  }, []);

  const runTest = async (testType: TestType) => {
    setRunning(testType);
    setStatus(`Running ${testType.toLowerCase()}`);
    setResult('');

    try {
      const transactionId = testTransactionId();
      const timestamp = new Date().toISOString();
      const amount = 5000;
      // The tampering tests are rejected by the cryptographic checks before the recipient
      // is ever looked up, so a non-existent recipient is fine for them. The replay test
      // needs its first send to succeed, so it targets the sender's own account: a
      // net-zero transfer that lets the duplicate be refused for nonce reuse.
      const recipient = testType === 'Replay Attack' ? session.account.accountNumber : 'SKY-99999';

      const jwkStr = localStorage.getItem(`skybank_priv_${session.user.username}`);
      if (!jwkStr) throw new Error('Your signing key is not in this browser.');
      const privateKey = await window.crypto.subtle.importKey('jwk', JSON.parse(jwkStr), { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign']);

      const aesKey = await generateAESKey();

      const payloadObj = { sender: session.account.accountNumber, recipient, amount, description: 'Test', timestamp, transactionId };

      // TEST 1: Amount Tampering
      if (testType === 'Amount Tampering') payloadObj.amount = 50000;

      const payloadString = JSON.stringify(payloadObj);
      const encrypted = await encryptAESGCM(payloadString, aesKey);
      let ciphertext = encrypted.ciphertext;
      const aesNonce = encrypted.iv;
      const authTag = encrypted.authTag;

      const canonicalData = canonicalizeTransaction(session.account.accountNumber, recipient, 5000, timestamp, aesNonce, 'Test');
      let signature = await signData(canonicalData, privateKey);

      // TEST 2: Signature Tampering
      if (testType === 'Signature Tampering') signature = flipCharacter(signature);

      // TEST 3: Ciphertext Tampering
      if (testType === 'Ciphertext Tampering') ciphertext = flipCharacter(ciphertext);

      const encryptedAesKey = await encryptAESKeyWithServerRSA(aesKey, serverPublicKey);

      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext, nonce: aesNonce, authTag, encryptedAesKey, signature, transactionId, timestamp,
          senderAccount: session.account.accountNumber, recipientAccount: recipient,
          amount: testType === 'Amount Tampering' ? 50000 : 5000, description: 'Test'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(`BLOCKED: ${data.error}`);
      } else {
        setResult('WARNING: Transaction succeeded when it should have failed!');
      }

      // TEST 4: Replay Attack
      if (testType === 'Replay Attack' && res.ok) {
        setStatus('Running replay attack: sending the duplicate');
        const replayRes = await fetch('/api/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ciphertext, nonce: aesNonce, authTag, encryptedAesKey, signature, transactionId, timestamp, senderAccount: session.account.accountNumber, recipientAccount: recipient, amount: 5000, description: 'Test' })
        });
        const replayData = await replayRes.json();
        if (!replayRes.ok) {
          setResult(`BLOCKED (REPLAY): ${replayData.error}`);
        } else {
          setResult('WARNING: Replay succeeded!');
        }
        await refresh();
      }

    } catch (err) {
      setResult(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
    setStatus(`Finished: ${tests.find(t => t.type === testType)?.name ?? testType}.`);
    setRunning(null);
  };

  const blocked = result.startsWith('BLOCKED');

  return (
    <div className={styles.page}>
      <PageHeader
        title="Security tests"
        description="Run a real attack against your own account and watch the server refuse it. Each test builds a genuine transfer, breaks one thing, and sends it."
      />

      <section className={`card ${styles.tests}`} aria-label="Attack simulations">
        {tests.map(test => {
          const isRunning = running === test.type;
          return (
            <div key={test.type} className={styles.test}>
              <div className={styles.testText}>
                <div className={styles.testName}>{test.name}</div>
                <dl className={styles.testMeta}>
                  <div>
                    <dt>Attack</dt>
                    <dd>{test.attack}</dd>
                  </div>
                  <div>
                    <dt>Expected defence</dt>
                    <dd>{test.defence}</dd>
                  </div>
                </dl>
              </div>
              <button
                type="button"
                onClick={() => runTest(test.type)}
                className="btn btn-secondary"
                disabled={running !== null || !serverPublicKey}
              >
                {isRunning ? <span className="spinner" aria-hidden="true" /> : <PlayIcon size={16} />}
                {isRunning ? 'Running' : 'Run test'}
              </button>
            </div>
          );
        })}
      </section>

      <section className={`card ${styles.console}`} aria-label="Test output" aria-live="polite">
        <div className="card-header">
          <h2 className="card-title">Output</h2>
          {result && (
            <span className={`badge ${blocked ? 'badge-success' : 'badge-error'}`}>
              {blocked ? 'Attack blocked' : 'Attention'}
            </span>
          )}
        </div>
        <div className={styles.consoleBody}>
          <div className={styles.consoleStatus}>
            {status || 'Choose a test above. The server’s response will appear here.'}
          </div>
          {result && (
            <pre className={`${styles.consoleResult} ${blocked ? styles.consoleOk : styles.consoleBad}`}>{result}</pre>
          )}
        </div>
      </section>

      <p className={styles.note}>
        Every blocked attempt is written to the <Link href="/audit">audit log</Link> with the reason the
        server gave. The replay test&apos;s first send is a transfer to yourself, so your balance does
        not change.
      </p>
    </div>
  );
}
