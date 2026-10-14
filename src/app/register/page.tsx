'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '../components/AuthLayout';
import { AlertIcon } from '../components/Icons';
import { generateUserRSAKeys, exportPublicKeyToPem } from '@/lib/crypto/client';
import styles from '../auth.module.css';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const router = useRouter();
  const busy = status !== '';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    try {
      setStatus('Generating your RSA-PSS key pair in this browser');
      const keyPair = await generateUserRSAKeys();
      const publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);

      setStatus('Creating your account');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, password, publicKey: publicKeyPem })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
      localStorage.setItem(`skybank_priv_${username}`, JSON.stringify(privateKeyJwk));

      setStatus('Account created. Opening your overview');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setStatus('');
    }
  };

  return (
    <AuthLayout>
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.lead}>
        Your signing key pair is generated here in the browser. The private key never leaves it.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertIcon size={18} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleRegister} className={styles.form}>
        <p className={styles.section}>About you</p>

        <div className="field">
          <label className="label" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            type="text"
            className="input"
            autoComplete="name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            disabled={busy}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={busy}
          />
        </div>

        <p className={styles.section}>Sign-in details</p>

        <div className="field">
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            className="input"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={busy}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={busy}
          />
          <span className="hint">At least 8 characters.</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            disabled={busy}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? <span className="spinner spinner-light" aria-hidden="true" /> : null}
          {busy ? 'Creating account' : 'Create account'}
        </button>

        {status && (
          <div className={styles.progress} role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            {status}
          </div>
        )}
      </form>

      <div className={styles.demo}>
        Demo accounts: register as <code>daksh</code> for SKY-10001 with 50,000 SKY, or{' '}
        <code>jash</code> for SKY-10002 with 20,000 SKY. Use two browsers or a private window to
        run both at once.
      </div>

      <p className={styles.switch}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
