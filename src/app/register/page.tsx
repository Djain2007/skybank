'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '../components/AuthLayout';
import { AlertIcon, ShieldIcon } from '../components/Icons';
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
      setStatus('Generating your 4096-bit RSA-PSS key pair in this browser...');
      const keyPair = await generateUserRSAKeys();
      const publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);

      setStatus('Registering account & registering public key with server...');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, password, publicKey: publicKeyPem }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store private key safely in browser localStorage
      const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
      localStorage.setItem(`skybank_priv_${username}`, JSON.stringify(privateKeyJwk));

      setStatus('Key pair secured. Opening your account overview...');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setStatus('');
    }
  };

  return (
    <AuthLayout>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.securePill}>
            <ShieldIcon size={13} />
            <span>WebCrypto RSA-PSS 4096-bit Keygen</span>
          </div>
          <h1 className={styles.title}>Open an Account</h1>
          <p className={styles.lead}>
            Your digital signing key pair is generated locally in this browser. Your private key never touches the network.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>
            <AlertIcon size={18} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleRegister} className={styles.form}>
          <p className={styles.sectionHeader}>Personal Information</p>

          <div className="field">
            <label className="label" htmlFor="fullName">
              Full Legal Name
            </label>
            <input
              id="fullName"
              type="text"
              className="input"
              autoComplete="name"
              placeholder="e.g. Daksh Jain"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <p className={styles.sectionHeader} style={{ marginTop: 20 }}>
            Account Credentials
          </p>

          <div className="field">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="input"
              autoComplete="username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              <span>Password</span>
              <span className={styles.hint}>Min. 8 characters</span>
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={busy}
          >
            {busy ? (
              <span className="spinner spinner-light" aria-hidden="true" />
            ) : null}
            {busy ? 'Generating Keys & Creating Account...' : 'Generate Keys & Create Account'}
          </button>

          {status && (
            <div className={styles.progress} role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <span>{status}</span>
            </div>
          )}
        </form>

        <div className={styles.demoNote}>
          <strong>Pre-configured Demo Accounts:</strong>
          <p>
            Register with username <code>daksh</code> for initial balance of 50,000 SKY (account SKY-10001), or{' '}
            <code>jash</code> for 20,000 SKY (account SKY-10002).
          </p>
        </div>

        <div className={styles.switch}>
          <span>Already registered on this device?</span>{' '}
          <Link href="/login" className={styles.switchLink}>
            Sign in &rarr;
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
