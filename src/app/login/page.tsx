'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '../components/AuthLayout';
import { AlertIcon } from '../components/Icons';
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
        body: JSON.stringify({ username, password })
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

  return (
    <AuthLayout>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.lead}>Use the username you registered with.</p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertIcon size={18} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleLogin} className={styles.form}>
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
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? <span className="spinner spinner-light" aria-hidden="true" /> : null}
          {submitting ? 'Signing in' : 'Sign in'}
        </button>
      </form>

      <p className={styles.note}>
        Passwords are hashed with Argon2id before they are stored. SkyBank never keeps them in
        plain text.
      </p>

      <p className={styles.switch}>
        New to SkyBank? <Link href="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
