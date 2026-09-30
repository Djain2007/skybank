'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import { 
  canonicalizeTransaction, 
  generateAESKey, 
  encryptAESGCM, 
  encryptAESKeyWithServerRSA, 
  signData
} from '@/lib/crypto/client';

export default function Transfer() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState(1); // 1 = form, 2 = review, 3 = processing, 4 = success
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [serverPublicKey, setServerPublicKey] = useState('');
  const [user, setUser] = useState<any>(null);
  const [txDetails, setTxDetails] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setServerPublicKey(data.publicKey));
      
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setUser(data);
      });
  }, []);

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (parseFloat(amount) > user.account.balance) {
      setError('Insufficient funds');
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
      const transactionId = 'TX-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
      const timestamp = new Date().toISOString();
      const amountNum = parseFloat(amount);
      
      addStatus('Loading secure signing key...');
      const jwkStr = localStorage.getItem(`skybank_priv_${user.user.username}`);
      if (!jwkStr) throw new Error("Private key not found. Please re-register or use a demo account.");
      const jwk = JSON.parse(jwkStr);
      const privateKey = await window.crypto.subtle.importKey(
        'jwk', jwk, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign']
      );

      addStatus('Generating AES-256 transaction key...');
      const aesKey = await generateAESKey();
      
      addStatus('Encrypting payload (AES-GCM)...');
      const payloadString = JSON.stringify({
        sender: user.account.accountNumber,
        recipient,
        amount: amountNum,
        description,
        timestamp,
        transactionId
      });
      
      const { ciphertext, iv: aesNonce, authTag } = await encryptAESGCM(payloadString, aesKey);

      addStatus('Signing canonical transaction data...');
      const canonicalData = canonicalizeTransaction(
        user.account.accountNumber,
        recipient,
        amountNum,
        timestamp,
        aesNonce,
        description
      );
      const signature = await signData(canonicalData, privateKey);

      addStatus('Securing AES key with server RSA...');
      const encryptedAesKey = await encryptAESKeyWithServerRSA(aesKey, serverPublicKey);

      addStatus('Transmitting securely...');
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
          senderAccount: user.account.accountNumber,
          recipientAccount: recipient,
          amount: amountNum,
          description
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      setTxDetails({ transactionId, timestamp, recipient, amount: amountNum });
      setStep(4);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setStep(2); // Go back to review so they can cancel or retry
    }
  };

  if (!user) return <DashboardLayout><div style={{ padding: '2rem' }}>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 500 }}>Transfer SkyCoins</h2>
        <p style={{ color: 'var(--skybank-text-secondary)', marginBottom: '3rem' }}>
          Securely transfer funds using hybrid encryption and RSA-PSS signatures.
        </p>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#FFF5F5', color: 'var(--skybank-error)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Transfer could not be completed.</strong>
            {error}
          </div>
        )}

        <div className="card">
          {step === 1 && (
            <form onSubmit={handleReview}>
              <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--skybank-border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>From Account</div>
                <div style={{ fontWeight: 500 }}>SkyBank Account •••• {user.account.accountNumber.slice(-4)}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', marginTop: '0.25rem' }}>Available Balance: {user.account.balance.toLocaleString()} SKY</div>
              </div>

              <div className="form-group">
                <label className="form-label">To Account Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. SKY-12345"
                  value={recipient} 
                  onChange={e => setRecipient(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (SKY)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Description (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Review Transfer
              </button>
            </form>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 500 }}>Transfer Review</h3>
              
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>From</div>
                <div style={{ fontWeight: 500 }}>SkyBank Account •••• {user.account.accountNumber.slice(-4)}</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>To</div>
                <div style={{ fontWeight: 500 }}>{recipient}</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>Amount</div>
                <div style={{ fontWeight: 600, fontSize: '1.5rem', color: 'var(--skybank-navy)' }}>{parseFloat(amount).toLocaleString()} SKY</div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>Description</div>
                <div style={{ fontWeight: 500 }}>{description || 'None'}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: '1 1 auto', minWidth: '120px' }}>
                  Back
                </button>
                <button onClick={executeTransfer} className="btn btn-primary" style={{ flex: '2 1 auto', minWidth: '160px' }}>
                  Confirm & Transfer
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ padding: '2rem 0' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', fontWeight: 500 }}>Security Verification</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {statusSteps.map((status, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--skybank-navy)' }}>
                    <span style={{ color: 'var(--skybank-success)', fontWeight: 'bold' }}>✓</span>
                    {status}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', marginTop: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--skybank-border)', borderTopColor: 'var(--skybank-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                  <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
                  Processing...
                </div>
              </div>
            </div>
          )}

          {step === 4 && txDetails && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E6FFFA', color: 'var(--skybank-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 500, margin: 0 }}>Transfer Successful</h3>
              </div>
              
              <div style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600, color: 'var(--skybank-navy)' }}>
                {txDetails.amount.toLocaleString()} SKY
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>To</div>
                <div style={{ fontWeight: 500 }}>{txDetails.recipient}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>Transaction ID</div>
                <div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{txDetails.transactionId}</div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)' }}>Date</div>
                <div style={{ fontWeight: 500 }}>{new Date(txDetails.timestamp).toLocaleString()}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <a href="/transactions" className="btn btn-secondary" style={{ flex: '1 1 auto', minWidth: '140px' }}>
                  View Transactions
                </a>
                <button onClick={() => { setRecipient(''); setAmount(''); setDescription(''); setStep(1); }} className="btn btn-primary" style={{ flex: '1 1 auto', minWidth: '140px' }}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
