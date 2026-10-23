'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import CopyButton from '../components/CopyButton';
import { useSession } from '../components/Session';
import {
  PlayIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../components/Icons';
import {
  canonicalizeTransaction,
  generateAESKey,
  encryptAESGCM,
  encryptAESKeyWithServerRSA,
  signData,
} from '@/lib/crypto/client';
import styles from './page.module.css';

type TestType = 'Amount Tampering' | 'Signature Tampering' | 'Ciphertext Tampering' | 'Replay Attack';

interface TestCase {
  type: TestType;
  name: string;
  category: string;
  attack: string;
  defence: string;
}

const tests: TestCase[] = [
  {
    type: 'Amount Tampering',
    name: 'Amount Tampering in Transit',
    category: 'Integrity Violation',
    attack: 'Sign a valid transfer of 5,000 SKY in the browser, but alter the transmitted amount to 50,000 SKY.',
    defence: 'The RSA-PSS signature verification validates the canonical amount. Since the transmitted amount differs from the signed digest, verification fails.',
  },
  {
    type: 'Signature Tampering',
    name: 'Forged / Corrupted Digital Signature',
    category: 'Authenticity Violation',
    attack: 'Flip a single byte inside the base64-encoded RSA-PSS digital signature string.',
    defence: "SkyBank server verifies the signature against the sender's public RSA key. The mathematical proof fails immediately.",
  },
  {
    type: 'Ciphertext Tampering',
    name: 'AES Ciphertext Manipulation',
    category: 'Confidentiality & Tag Violation',
    attack: 'Modify one character of the AES-256-GCM ciphertext payload while in transit.',
    defence: 'The Galois Counter Mode (GCM) authentication tag fails authentication and the server refuses decryption.',
  },
  {
    type: 'Replay Attack',
    name: 'Transaction Replay Attack',
    category: 'Replay & Nonce Violation',
    attack: 'Capture an authentic 5,000 SKY self-transfer and re-transmit the exact same encrypted payload a second time.',
    defence: 'The server caches all used nonces with timestamps. The second request is rejected for duplicate nonce reuse.',
  },
];

function flipCharacter(value: string, index = 10): string {
  const replacement = value[index] === 'A' ? 'B' : 'A';
  return value.substring(0, index) + replacement + value.substring(index + 1);
}

function testTransactionId(): string {
  return 'TX-TEST-' + Math.floor(100000 + Math.random() * 900000);
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
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setServerPublicKey(data.publicKey));
  }, []);

  const runTest = async (testType: TestType) => {
    setRunning(testType);
    setStatus(`Executing attack simulation: ${testType}...`);
    setResult('');

    try {
      const transactionId = testTransactionId();
      const timestamp = new Date().toISOString();
      const amount = 5000;
      const recipient = testType === 'Replay Attack' ? session.account.accountNumber : 'SKY-99999';

      const jwkStr = localStorage.getItem(`skybank_priv_${session.user.username}`);
      if (!jwkStr) throw new Error('Your RSA-PSS private key is missing from this browser.');

      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(jwkStr),
        { name: 'RSA-PSS', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const aesKey = await generateAESKey();

      const payloadObj = {
        sender: session.account.accountNumber,
        recipient,
        amount,
        description: 'Security Simulation Test',
        timestamp,
        transactionId,
      };

      // TEST 1: Amount Tampering
      if (testType === 'Amount Tampering') {
        payloadObj.amount = 50000;
      }

      const payloadString = JSON.stringify(payloadObj);
      const encrypted = await encryptAESGCM(payloadString, aesKey);
      let ciphertext = encrypted.ciphertext;
      const aesNonce = encrypted.iv;
      const authTag = encrypted.authTag;

      const canonicalData = canonicalizeTransaction(
        session.account.accountNumber,
        recipient,
        5000,
        timestamp,
        aesNonce,
        'Security Simulation Test'
      );
      let signature = await signData(canonicalData, privateKey);

      // TEST 2: Signature Tampering
      if (testType === 'Signature Tampering') {
        signature = flipCharacter(signature);
      }

      // TEST 3: Ciphertext Tampering
      if (testType === 'Ciphertext Tampering') {
        ciphertext = flipCharacter(ciphertext);
      }

      const encryptedAesKey = await encryptAESKeyWithServerRSA(aesKey, serverPublicKey);

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
          amount: testType === 'Amount Tampering' ? 50000 : 5000,
          description: 'Security Simulation Test',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(`BLOCKED: ${data.error}`);
      } else {
        setResult('WARNING: Transaction succeeded when it should have been refused!');
      }

      // TEST 4: Replay Attack (Send duplicate payload with reused nonce)
      if (testType === 'Replay Attack' && res.ok) {
        setStatus('Replay step 1 completed. Now transmitting duplicate payload with identical nonce...');
        await new Promise((r) => setTimeout(r, 400));

        const replayRes = await fetch('/api/transfer', {
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
            amount: 5000,
            description: 'Security Simulation Test',
          }),
        });

        const replayData = await replayRes.json();
        if (!replayRes.ok) {
          setResult(`BLOCKED (REPLAY DETECTED): ${replayData.error}`);
        } else {
          setResult('CRITICAL WARNING: Replay attack succeeded! Duplicate nonce was accepted.');
        }
        await refresh();
      }
    } catch (err) {
      setResult(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }

    setStatus(`Simulation finished for ${testType}.`);
    setRunning(null);
  };

  const blocked = result.startsWith('BLOCKED');

  return (
    <div className={styles.page}>
      <PageHeader
        title="Security Attack Simulator"
        description="Run live cryptographic attack vectors against your account to verify SkyBank's defenses in real-time."
      />

      {/* Attack Test Cards */}
      <section className={styles.testsGrid} aria-label="Attack simulations">
        {tests.map((test) => {
          const isRunning = running === test.type;
          return (
            <div key={test.type} className={`card ${styles.testCard}`}>
              <div className={styles.testCardTop}>
                <span className={styles.categoryBadge}>{test.category}</span>
                <button
                  type="button"
                  onClick={() => runTest(test.type)}
                  className="btn btn-secondary btn-sm"
                  disabled={running !== null || !serverPublicKey}
                >
                  {isRunning ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : (
                    <PlayIcon size={13} />
                  )}
                  <span>{isRunning ? 'Simulating...' : 'Simulate Attack'}</span>
                </button>
              </div>

              <h2 className={styles.testName}>{test.name}</h2>

              <div className={styles.attackMeta}>
                <div className={styles.metaRow}>
                  <dt className={styles.dtAttack}>Attack Vector</dt>
                  <dd className={styles.ddAttack}>{test.attack}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.dtDefence}>Active Defense</dt>
                  <dd className={styles.ddDefence}>{test.defence}</dd>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Security Verification Console */}
      <section className={`card ${styles.consoleCard}`} aria-label="Test output" aria-live="polite">
        <div className="card-header">
          <div className={styles.consoleHead}>
            <ShieldIcon size={16} />
            <h2 className="card-title">Security Verification Console</h2>
          </div>
          {result && (
            <div className={styles.consoleHeaderRight}>
              <span className={`badge ${blocked ? 'badge-success' : 'badge-error'}`}>
                {blocked ? 'Attack Defeated' : 'Simulation Alert'}
              </span>
              <CopyButton value={result} label="Copy Log" size="sm" />
            </div>
          )}
        </div>

        <div className={styles.consoleBody}>
          <div className={styles.consoleStatus}>
            {status || 'Select an attack vector above to launch real-time simulation.'}
          </div>

          {result ? (
            <div className={`${styles.consoleResult} ${blocked ? styles.consoleOk : styles.consoleBad}`}>
              <div className={styles.resultPrefix}>
                {blocked ? (
                  <>
                    <CheckCircleIcon size={14} />
                    <span>DEFENSE TRIGGERED &amp; VERIFIED</span>
                  </>
                ) : (
                  <>
                    <AlertTriangleIcon size={14} />
                    <span>SECURITY ATTENTION REQUIRED</span>
                  </>
                )}
              </div>
              <div className={styles.resultMsg}>{result}</div>
            </div>
          ) : (
            <div className={styles.consolePlaceholder}>
              Interactive cryptographic payload generator is ready.
            </div>
          )}
        </div>
      </section>

      <div className={styles.footNote}>
        <p>
          Every blocked attempt is permanently written to the{' '}
          <Link href="/audit" className={styles.footLink}>
            Audit Log
          </Link>{' '}
          with exact error details. For the replay attack, the initial transfer is routed to yourself (net 0 SKY)
          before the duplicate payload is fired to trigger nonce reuse refusal.
        </p>
      </div>
    </div>
  );
}
