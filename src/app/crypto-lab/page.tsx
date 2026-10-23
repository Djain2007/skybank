'use client';

import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import CopyButton from '../components/CopyButton';
import { FlaskIcon, SparklesIcon, LockIcon } from '../components/Icons';
import { arrayBufferToBase64 } from '@/lib/crypto/client';
import styles from './page.module.css';

const primitives = [
  {
    name: 'AES-256-GCM',
    role: 'Authenticated Encryption',
    where: 'Encrypts the transfer payload locally inside the client browser. The Galois Counter Mode authentication tag detects any in-transit tampering.',
  },
  {
    name: 'RSA-OAEP 4096',
    role: 'Asymmetric Key Exchange',
    where: "Wraps the one-time random AES-256 key with SkyBank server's 4096-bit public key. Only the server holds the corresponding private key to unwrap it.",
  },
  {
    name: 'RSA-PSS 4096',
    role: 'Cryptographic Signature',
    where: "Digitally signs the canonical transaction string using the client's WebCrypto private key. The server validates the mathematical signature using the public key.",
  },
  {
    name: 'Argon2id',
    role: 'Memory-Hard Password Hashing',
    where: 'Hashes user passwords with cryptographically random salts, protecting against GPU and ASIC brute-force rainbow table attacks.',
  },
];

export default function CryptoLabPage() {
  return (
    <DashboardLayout>
      <CryptoLab />
    </DashboardLayout>
  );
}

function CryptoLab() {
  const [hashInput, setHashInput] = useState('SkyBank Secure Transfer Payload');
  const [hashOutput, setHashOutput] = useState('');

  const [hmacInput, setHmacInput] = useState('SkyBank Canonical Transaction');
  const [hmacKey, setHmacKey] = useState('SuperSecretSimulatedKey123');
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
    <div className={styles.page}>
      <PageHeader
        title="Cryptography Interactive Lab"
        description="Experiment directly with the WebCrypto primitives that power SkyBank. Everything executes locally in your browser sandbox."
      />

      <div className={styles.tools}>
        {/* SHA-256 Hasher */}
        <section className="card" aria-labelledby="hash-title">
          <div className="card-header">
            <h2 id="hash-title" className="card-title">
              Cryptographic Hash Generator
            </h2>
            <span className="tag">SHA-256</span>
          </div>

          <form
            className="card-body"
            onSubmit={(e) => {
              e.preventDefault();
              handleHash();
            }}
          >
            <p className={styles.explain}>
              A one-way mathematical function mapping data of arbitrary size to a fixed 256-bit digest.
              The slightest change produces an entirely different avalanche effect.
            </p>

            <div className="field">
              <label className="label" htmlFor="hash-input">
                Input Message / Payload
              </label>
              <input
                id="hash-input"
                type="text"
                className="input"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Enter string to hash..."
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Compute SHA-256 Digest
            </button>

            <Output label="Computed Digest (Base64)" value={hashOutput} />
          </form>
        </section>

        {/* HMAC Generator */}
        <section className="card" aria-labelledby="hmac-title">
          <div className="card-header">
            <h2 id="hmac-title" className="card-title">
              Message Authentication Code (MAC)
            </h2>
            <span className="tag">HMAC-SHA-256</span>
          </div>

          <form
            className="card-body"
            onSubmit={(e) => {
              e.preventDefault();
              handleHmac();
            }}
          >
            <p className={styles.explain}>
              Combines a secret key with a cryptographic hash to verify both the integrity and authenticity of a message.
            </p>

            <div className="field">
              <label className="label" htmlFor="hmac-key">
                Secret Shared Key
              </label>
              <input
                id="hmac-key"
                type="text"
                className="input mono"
                value={hmacKey}
                onChange={(e) => setHmacKey(e.target.value)}
                placeholder="Enter secret key..."
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="hmac-input">
                Message Content
              </label>
              <input
                id="hmac-input"
                type="text"
                className="input"
                value={hmacInput}
                onChange={(e) => setHmacInput(e.target.value)}
                placeholder="Enter message..."
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Compute HMAC
            </button>

            <Output label="Generated Authentication Code (Base64)" value={hmacOutput} />
          </form>
        </section>
      </div>

      {/* Primitives Architecture Overview */}
      <section className="card" aria-labelledby="primitives-title">
        <div className="card-header">
          <div className={styles.primitivesHeader}>
            <LockIcon size={18} />
            <h2 id="primitives-title" className="card-title">
              SkyBank Cryptographic Primitives Blueprint
            </h2>
          </div>
        </div>

        <div className={styles.primitives}>
          {primitives.map((p) => (
            <div key={p.name} className={styles.primitive}>
              <div className={styles.primitiveHead}>
                <span className="tag">{p.name}</span>
                <span className={styles.primitiveRole}>{p.role}</span>
              </div>
              <p className={styles.primitiveWhere}>{p.where}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Output({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className={styles.output} aria-live="polite">
      <div className={styles.outputHead}>
        <span className={styles.outputLabel}>{label}</span>
        <CopyButton value={value} label="Copy Output" size="sm" />
      </div>
      <code className="code-block">{value}</code>
    </div>
  );
}
