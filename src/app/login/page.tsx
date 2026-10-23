'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '../components/AuthLayout';
import { AlertIcon, LockIcon } from '../components/Icons';
import styles from '../auth.module.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setSubmitting(false);
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <AuthLayout>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.securePill}>
            <LockIcon size={13} />
            <span>Argon2id Encrypted Sign-In</span>
          </div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.lead}>Sign in to your SkyBank simulated account.</p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>
            <AlertIcon size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* Demo Fast-Login helper buttons */}
        <div className={styles.demoHelper}>
          <span className={styles.demoHelperLabel}>Fast Demo Sign-In:</span>
          <div className={styles.demoBtnRow}>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={() => fillDemo('daksh', 'password123')}
            >
              Daksh (SKY-10001)
            </button>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={() => fillDemo('jash', 'password123')}
            >
              Jash (SKY-10002)
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="field">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="input"
              autoComplete="username"
              placeholder="e.g. daksh"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner spinner-light" aria-hidden="true" />
            ) : null}
            {submitting ? 'Verifying Credentials...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.note}>
          Passwords are salted and hashed with memory-hard Argon2id before server validation. SkyBank never transmits or stores plaintext passwords.
        </p>

        <div className={styles.switch}>
          <span>New to SkyBank?</span>{' '}
          <Link href="/register" className={styles.switchLink}>
            Create an account &rarr;
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
