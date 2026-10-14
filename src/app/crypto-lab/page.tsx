'use client';

import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageHeader from '../components/PageHeader';
import { arrayBufferToBase64 } from '@/lib/crypto/client';
import styles from './page.module.css';

const primitives = [
  {
    name: 'AES-256-GCM',
    role: 'Authenticated encryption',
    where: 'Seals the transfer payload in the browser. The authentication tag detects any change to the ciphertext.',
  },
  {
    name: 'RSA-OAEP',
    role: 'Key exchange',
    where: 'Wraps the one-time AES key with the server’s 4096-bit public key so only the server can unwrap it.',
  },
  {
    name: 'RSA-PSS',
    role: 'Digital signature',
    where: 'Signs the canonical transaction with your private key. The server verifies it with your public key.',
  },
  {
    name: 'Argon2id',
    role: 'Password hashing',
    where: 'Hashes passwords at registration and login with a random salt and memory-hard parameters.',
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
    <div className={styles.page}>
      <PageHeader
        title="Cryptography lab"
        description="Try the primitives SkyBank is built on. Everything here runs in your browser with the Web Crypto API."
      />

      <div className={styles.tools}>
        <section className="card" aria-labelledby="hash-title">
          <div className="card-header">
            <h2 id="hash-title" className="card-title">Hash a message</h2>
            <span className="tag">SHA-256</span>
          </div>
          <form
            className="card-body"
            onSubmit={e => {
              e.preventDefault();
              handleHash();
            }}
          >
            <p className={styles.explain}>
              A hash maps input of any length to a fixed 256-bit digest. Change one character
              and the whole digest changes, and there is no way back from digest to message.
            </p>
            <div className="field">
              <label className="label" htmlFor="hash-input">Message</label>
              <input id="hash-input" type="text" className="input" value={hashInput} onChange={e => setHashInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">Compute hash</button>

            <Output label="Digest (Base64)" value={hashOutput} />
          </form>
        </section>

        <section className="card" aria-labelledby="hmac-title">
          <div className="card-header">
            <h2 id="hmac-title" className="card-title">Authenticate a message</h2>
            <span className="tag">HMAC-SHA-256</span>
          </div>
          <form
            className="card-body"
            onSubmit={e => {
              e.preventDefault();
              handleHmac();
            }}
          >
            <p className={styles.explain}>
              A MAC proves a message came from someone who holds the key and was not altered.
              SkyBank gets this from AES-GCM&apos;s tag, but HMAC is the tool when you need
              integrity without confidentiality.
            </p>
            <div className="field">
              <label className="label" htmlFor="hmac-key">Secret key</label>
              <input id="hmac-key" type="text" className="input mono" value={hmacKey} onChange={e => setHmacKey(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="hmac-input">Message</label>
              <input id="hmac-input" type="text" className="input" value={hmacInput} onChange={e => setHmacInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">Compute MAC</button>

            <Output label="MAC (Base64)" value={hmacOutput} />
          </form>
        </section>
      </div>

      <section className="card" aria-labelledby="primitives-title">
        <div className="card-header">
          <h2 id="primitives-title" className="card-title">Where each primitive is used</h2>
        </div>
        <div className={styles.primitives}>
          {primitives.map(p => (
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
      <div className={styles.outputLabel}>{label}</div>
      <code className="code-block">{value}</code>
    </div>
  );
}
