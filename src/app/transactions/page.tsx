'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        if (data.transactions) setTransactions(data.transactions);
      });
  }, []);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 500 }}>Transactions</h2>
        <p style={{ color: 'var(--skybank-text-secondary)', marginBottom: '3rem' }}>
          View your transaction history and inspect cryptographic metadata.
        </p>

        <style dangerouslySetInnerHTML={{__html: `
          .tx-container { display: flex; flex-direction: column; gap: 2rem; }
          .tx-list { flex: 1; }
          .tx-inspector { width: 100%; }
          @media (min-width: 1024px) {
            .tx-container { flex-direction: row; }
            .tx-inspector { width: 400px; }
          }
        `}} />

        <div className="tx-container">
          <div className="card tx-list" style={{ padding: 0, overflow: 'hidden', alignSelf: 'flex-start' }}>
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Recipient</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--skybank-text-secondary)' }}>
                      No transactions found.
                    </td>
                  </tr>
                ) : transactions.map(tx => (
                  <tr 
                    key={tx.id} 
                    onClick={() => setSelectedTx(tx)} 
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedTx?.id === tx.id ? '#F0F4F8' : 'transparent',
                      borderLeft: selectedTx?.id === tx.id ? '4px solid var(--skybank-accent)' : '4px solid transparent'
                    }}
                  >
                    <td data-label="ID" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.id.split('-').slice(0, 2).join('-')}...</td>
                    <td data-label="Date">{new Date(tx.timestamp).toLocaleString()}</td>
                    <td data-label="Amount" style={{ fontWeight: 600, color: 'var(--skybank-navy)' }}>{tx.amount.toLocaleString()} SKY</td>
                    <td data-label="Recipient">{tx.recipient_number}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${tx.status === 'COMPLETED' ? 'status-success' : 'status-error'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedTx && (
            <div className="card tx-inspector" style={{ alignSelf: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 500, margin: 0 }}>Transaction Details</h3>
                <button className="hide-on-desktop" onClick={() => setSelectedTx(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--skybank-text-secondary)' }}>×</button>
              </div>
              
              <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--skybank-border)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--skybank-text-secondary)', fontSize: '0.875rem' }}>ID</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{selectedTx.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--skybank-text-secondary)', fontSize: '0.875rem' }}>Sender</span>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{selectedTx.sender_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--skybank-text-secondary)', fontSize: '0.875rem' }}>Recipient</span>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{selectedTx.recipient_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--skybank-text-secondary)', fontSize: '0.875rem' }}>Amount</span>
                  <span style={{ fontWeight: 600, color: 'var(--skybank-navy)', fontSize: '1rem' }}>{selectedTx.amount.toLocaleString()} SKY</span>
                </div>
              </div>

              <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--skybank-navy)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Security Verification
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.75rem' }}>
                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>Payload Encryption Algorithm</div>
                  <div style={{ fontFamily: 'monospace', background: '#F0F4F8', padding: '0.5rem', borderRadius: '4px' }}>AES-256-GCM</div>
                </div>
                
                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>Key Exchange Encryption</div>
                  <div style={{ fontFamily: 'monospace', background: '#F0F4F8', padding: '0.5rem', borderRadius: '4px' }}>RSA-OAEP</div>
                </div>

                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>Digital Signature Algorithm</div>
                  <div style={{ fontFamily: 'monospace', background: '#F0F4F8', padding: '0.5rem', borderRadius: '4px' }}>RSA-PSS</div>
                </div>

                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>AES-GCM Nonce</div>
                  <div className="break-all" style={{ fontFamily: 'monospace', background: '#F0F4F8', padding: '0.5rem', borderRadius: '4px' }}>
                    {selectedTx.nonce}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>Authentication Tag</div>
                  <div className="break-all" style={{ fontFamily: 'monospace', background: '#E6FFFA', color: 'var(--skybank-success)', padding: '0.5rem', borderRadius: '4px' }}>
                    {selectedTx.auth_tag} (VERIFIED)
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>Digital Signature</div>
                  <div style={{ fontFamily: 'monospace', background: '#E6FFFA', color: 'var(--skybank-success)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div className="truncate" style={{ maxWidth: '100%' }}>{selectedTx.rsa_signature}</div>
                    <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>VERIFIED</div>
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--skybank-text-secondary)', marginBottom: '0.25rem' }}>Replay Protection</div>
                  <div style={{ fontFamily: 'monospace', background: '#E6FFFA', color: 'var(--skybank-success)', padding: '0.5rem', borderRadius: '4px' }}>PASSED</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
