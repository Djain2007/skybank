'use client';

import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { arrayBufferToBase64 } from '@/lib/crypto/client';

export default function CryptoLab() {
  const [hashInput, setHashInput] = useState('SkyBank Transaction Data');
  const [hashOutput, setHashOutput] = useState('');

  const [hmacInput, setHmacInput] = useState('SkyBank Transaction Data');
  const [hmacKey, setHmacKey] = useState('SuperSecretKey');
  const [hmacOutput, setHmacOutput] = useState('');

  const handleHash = async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    setHashOutput(arrayBufferToBase64(hash));
  };

  const handleHmac = async () => {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(hmacKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(hmacInput));
    setHmacOutput(arrayBufferToBase64(signature));
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 500 }}>Cryptography Lab</h2>
        <p style={{ color: 'var(--skybank-text-secondary)', marginBottom: '3rem' }}>
          Interactive educational demonstrations of cryptographic primitives used in SkyBank.
        </p>

        {/* SHA-256 */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 500 }}>1. Hashing (SHA-256)</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', marginBottom: '1.5rem' }}>
            A cryptographic hash function maps data of arbitrary size to a fixed-size bit string.
            It provides collision resistance, pre-image resistance, and second pre-image resistance.
          </p>
          <div className="form-group">
            <label className="form-label">Input Message</label>
            <input type="text" className="form-input" value={hashInput} onChange={e => setHashInput(e.target.value)} />
          </div>
          <button onClick={handleHash} className="btn btn-secondary" style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '200px' }}>Compute Hash</button>
          
          {hashOutput && (
            <div className="break-all" style={{ background: '#F0F4F8', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.875rem' }}>
              <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>SHA-256 (Base64)</div>
              {hashOutput}
            </div>
          )}
        </div>

        {/* HMAC */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 500 }}>2. HMAC-SHA-256</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', marginBottom: '1.5rem' }}>
            Hash-based Message Authentication Code provides both data integrity and authenticity. Note that while SkyBank uses AES-GCM for authenticated encryption, HMAC is useful when confidentiality isn't required but integrity is.
          </p>
          <div className="form-group">
            <label className="form-label">Secret Key</label>
            <input type="text" className="form-input" value={hmacKey} onChange={e => setHmacKey(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <input type="text" className="form-input" value={hmacInput} onChange={e => setHmacInput(e.target.value)} />
          </div>
          <button onClick={handleHmac} className="btn btn-secondary" style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '200px' }}>Compute MAC</button>
          
          {hmacOutput && (
            <div className="break-all" style={{ background: '#F0F4F8', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.875rem' }}>
              <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>MAC (Base64)</div>
              {hmacOutput}
            </div>
          )}
        </div>

        {/* Note on others */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 500 }}>Other Primitives</h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong style={{ color: 'var(--skybank-text-primary)' }}>AES-256-GCM:</strong> Used in the Transfer flow for authenticated encryption.
            </div>
            <div>
              <strong style={{ color: 'var(--skybank-text-primary)' }}>RSA-OAEP & RSA-PSS:</strong> Used in the Transfer flow for secure key exchange and digital signatures.
            </div>
            <div>
              <strong style={{ color: 'var(--skybank-text-primary)' }}>Argon2id:</strong> Used during Registration and Login for secure password hashing.
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
