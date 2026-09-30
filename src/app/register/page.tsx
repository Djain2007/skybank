'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateUserRSAKeys, exportPublicKeyToPem } from '@/lib/crypto/client';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setStatus('Generating RSA-PSS key pair in browser...');
      const keyPair = await generateUserRSAKeys();
      const publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);
      
      setStatus('Registering account with server...');
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
      
      setStatus('Registration successful. Redirecting...');
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      setStatus('');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--skybank-background)', padding: '1.5rem' }}>
      <div style={{ margin: '0 auto', width: '100%', maxWidth: '480px' }}>
        
        <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
          <h1 style={{ color: 'var(--skybank-navy)', margin: 0, fontSize: '1.5rem', letterSpacing: '-0.5px', textAlign: 'left' }}>
            SkyBank<span style={{ color: 'var(--skybank-accent)' }}>.</span>
          </h1>
        </div>

        <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', textAlign: 'left' }}>Create Account</h2>
        
        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#FFF5F5', color: 'var(--skybank-error)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        {status && (
          <div style={{ padding: '1rem', backgroundColor: '#E6FFFA', color: 'var(--skybank-success)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {status}
          </div>
        )}

        <form onSubmit={handleRegister} className="card" style={{ padding: '2rem' }}>
          
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--skybank-text-secondary)', borderBottom: '1px solid var(--skybank-border)', paddingBottom: '0.5rem' }}>Personal Information</h3>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '2rem', color: 'var(--skybank-text-secondary)', borderBottom: '1px solid var(--skybank-border)', paddingBottom: '0.5rem' }}>Account Security</h3>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
            <div style={{ fontSize: '0.75rem', color: 'var(--skybank-text-secondary)', marginTop: '0.25rem' }}>Must be at least 8 characters long.</div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Register Account
          </button>

          <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--skybank-text-secondary)', textAlign: 'left' }}>
            <p>Already have an account? <a href="/login">Sign in</a></p>
          </div>
        </form>
      </div>
    </div>
  );
}
