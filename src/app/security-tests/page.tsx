'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { 
  canonicalizeTransaction, 
  generateAESKey, 
  encryptAESGCM, 
  encryptAESKeyWithServerRSA, 
  signData
} from '@/lib/crypto/client';

export default function SecurityTests() {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [serverPublicKey, setServerPublicKey] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/config').then(res => res.json()).then(data => setServerPublicKey(data.publicKey));
    fetch('/api/auth/me').then(res => res.json()).then(data => { if (!data.error) setUser(data); });
  }, []);

  const runTest = async (testType: string) => {
    setStatus(`Running: ${testType}...`);
    setResult('');
    
    try {
      const transactionId = 'TX-TEST-' + Math.floor(Math.random() * 900000);
      const timestamp = new Date().toISOString();
      const amount = 5000;
      const recipient = 'SKY-99999';
      
      const jwkStr = localStorage.getItem(`skybank_priv_${user.user.username}`);
      if (!jwkStr) throw new Error("Private key not found.");
      const privateKey = await window.crypto.subtle.importKey('jwk', JSON.parse(jwkStr), { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign']);

      const aesKey = await generateAESKey();
      
      let payloadObj = { sender: user.account.accountNumber, recipient, amount, description: 'Test', timestamp, transactionId };
      
      // TEST 1: Amount Tampering
      if (testType === 'Amount Tampering') payloadObj.amount = 50000;
      
      const payloadString = JSON.stringify(payloadObj);
      let { ciphertext, iv: aesNonce, authTag } = await encryptAESGCM(payloadString, aesKey);

      const canonicalData = canonicalizeTransaction(user.account.accountNumber, recipient, 5000, timestamp, aesNonce, 'Test');
      let signature = await signData(canonicalData, privateKey);

      // TEST 2: Signature Tampering
      if (testType === 'Signature Tampering') signature = signature.substring(0, 10) + 'A' + signature.substring(11);

      // TEST 3: Ciphertext Tampering
      if (testType === 'Ciphertext Tampering') ciphertext = ciphertext.substring(0, 10) + 'A' + ciphertext.substring(11);

      const encryptedAesKey = await encryptAESKeyWithServerRSA(aesKey, serverPublicKey);

      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext, nonce: aesNonce, authTag, encryptedAesKey, signature, transactionId, timestamp, 
          senderAccount: user.account.accountNumber, recipientAccount: recipient, 
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
        setStatus(`Running: ${testType} (Sending duplicate)...`);
        const replayRes = await fetch('/api/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ciphertext, nonce: aesNonce, authTag, encryptedAesKey, signature, transactionId, timestamp, senderAccount: user.account.accountNumber, recipientAccount: recipient, amount: 5000, description: 'Test' })
        });
        const replayData = await replayRes.json();
        if (!replayRes.ok) {
          setResult(`BLOCKED (REPLAY): ${replayData.error}`);
        } else {
          setResult('WARNING: Replay succeeded!');
        }
      }

    } catch (err: any) {
      setResult(`ERROR: ${err.message}`);
    }
    setStatus('Test Complete.');
  };

  if (!user) return <DashboardLayout><div style={{ padding: '2rem' }}>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 500 }}>Security Tests</h2>
        <p style={{ color: 'var(--skybank-text-secondary)', marginBottom: '3rem' }}>
          Educational lab to demonstrate active attacks and cryptographic defenses in real-time.
        </p>

        <style dangerouslySetInnerHTML={{__html: `
          .test-buttons { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
          @media (min-width: 768px) { .test-buttons { flex-direction: row; flex-wrap: wrap; } }
        `}} />

        <div className="test-buttons">
          <button onClick={() => runTest('Amount Tampering')} className="btn btn-secondary">Test: Amount Tampering</button>
          <button onClick={() => runTest('Signature Tampering')} className="btn btn-secondary">Test: Invalid Signature</button>
          <button onClick={() => runTest('Ciphertext Tampering')} className="btn btn-secondary">Test: Modified Ciphertext</button>
          <button onClick={() => runTest('Replay Attack')} className="btn btn-secondary">Test: Replay Attack</button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', color: 'var(--skybank-navy)', marginBottom: '1rem', fontWeight: 500 }}>Test Output</h3>
          <div style={{ padding: '1rem', background: '#F0F4F8', fontFamily: 'monospace', minHeight: '120px', borderRadius: '6px', fontSize: '0.875rem' }}>
            <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '1rem' }}>{status || 'Select a test above to run an active attack simulation.'}</div>
            {result && (
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: '4px',
                backgroundColor: result.includes('BLOCKED') ? '#E6FFFA' : '#FFF5F5',
                color: result.includes('BLOCKED') ? 'var(--skybank-success)' : 'var(--skybank-error)',
                fontWeight: 600
              }}>
                {result}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '2.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>
            <strong>Note:</strong> When an attack is blocked, an immutable record is securely written to the <a href="/audit" style={{ fontWeight: 500 }}>Audit Log</a>.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
