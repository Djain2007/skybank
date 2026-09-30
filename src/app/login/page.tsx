'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <style dangerouslySetInnerHTML={{__html: `
        .login-container { display: flex; min-height: 100vh; flex-direction: column; }
        .login-brand { flex: 1; background-color: var(--skybank-navy); display: flex; flex-direction: column; justify-content: center; padding: 2rem; color: white; text-align: left; }
        .login-form-area { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 2rem; background-color: var(--skybank-background); align-items: center; }
        
        @media (min-width: 768px) {
          .login-container { flex-direction: row; }
          .login-brand { padding: 4rem; }
          .login-form-area { padding: 4rem; }
        }
      `}} />

      <div className="login-brand">
        <h1 style={{ fontSize: '2.5rem', fontWeight: 600, marginBottom: '1rem', letterSpacing: '-1px' }}>SkyBank.</h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.9, maxWidth: '400px', lineHeight: 1.5 }}>
          Secure Banking. Built on Trust. <br /><br />
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Educational Secure Online Banking Transaction Simulator.</span>
        </p>
      </div>
      
      <div className="login-form-area">
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>Sign In</h2>
          
          {error && (
            <div style={{ padding: '1rem', backgroundColor: '#FFF5F5', color: 'var(--skybank-error)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Sign In to SkyBank
            </button>
          </form>

          <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', textAlign: 'left' }}>
            <p style={{ marginBottom: '1rem' }}>Your credentials are protected using secure password hashing (Argon2id).</p>
            <p>Don't have an account? <a href="/register">Register here</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
