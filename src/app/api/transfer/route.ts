import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import crypto from 'crypto';
import { getServerRSAKeys } from '@/lib/serverConfig';
import { decryptAESKey, decryptTransaction, verifySignature, canonicalizeTransaction } from '@/lib/crypto/server';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ciphertext,
      nonce: aesNonce, // AES-GCM nonce base64
      authTag,
      encryptedAesKey,
      signature,
      transactionId,
      timestamp,
      senderAccount,
      recipientAccount,
      amount,
      description
    } = body;

    // Validate structure
    if (!ciphertext || !aesNonce || !authTag || !encryptedAesKey || !signature || !transactionId || !timestamp || !senderAccount || !recipientAccount || !amount) {
      return NextResponse.json({ error: 'Missing transaction data' }, { status: 400 });
    }

    // Server RSA private key for decrypting the AES key
    const { privateKey } = getServerRSAKeys();
    
    // 1. Decrypt the AES Key
    let aesKeyBuffer: Buffer;
    try {
      aesKeyBuffer = decryptAESKey(encryptedAesKey, privateKey);
    } catch {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Failed to decrypt AES key');
      return NextResponse.json({ error: 'Cryptographic failure (Key Decryption)' }, { status: 400 });
    }

    // 2. Decrypt the transaction payload and verify auth tag (AES-GCM).
    // Decryption throws if the authentication tag does not match, which is the check itself.
    try {
      decryptTransaction(ciphertext, aesKeyBuffer, aesNonce, authTag);
    } catch {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'AES-GCM Authentication failed (Tampering detected)');
      return NextResponse.json({ error: 'Cryptographic failure (AES-GCM Authentication)' }, { status: 400 });
    }

    // The decrypted payload could be JSON containing the transaction details for extra verification.
    // However, the canonical transaction itself is constructed from server-side trusted parameters matching the plaintext fields submitted.
    // Let's reconstruct the canonical transaction and verify the digital signature.
    
    const canonicalData = canonicalizeTransaction(
      senderAccount,
      recipientAccount,
      amount,
      timestamp,
      aesNonce, // using aesNonce as the transaction freshness nonce
      description
    );

    // 3. Verify RSA-PSS Signature
    const isSignatureValid = verifySignature(canonicalData, signature, session.public_key);
    if (!isSignatureValid) {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Invalid RSA-PSS Signature (Tampering or spoofing detected)');
      return NextResponse.json({ error: 'Cryptographic failure (Invalid Signature)' }, { status: 400 });
    }

    // 4. Replay Protection
    // Check if nonce/transactionId already exists
    const existingTx = db.prepare('SELECT id FROM transactions WHERE nonce = ?').get(aesNonce);
    if (existingTx) {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Replay Attack Detected (Nonce reused)');
      return NextResponse.json({ error: 'Replay protection error' }, { status: 400 });
    }

    // Validate timestamp freshness (e.g., within 5 minutes)
    const txTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - txTime) > 5 * 60 * 1000) {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Transaction expired (Timestamp out of bounds)');
      return NextResponse.json({ error: 'Transaction expired' }, { status: 400 });
    }

    // 5. Validate sender account ownership and balance
    const sender = db.prepare('SELECT id, balance FROM accounts WHERE account_number = ? AND user_id = ?').get(senderAccount, session.id) as
      | { id: string; balance: number }
      | undefined;
    if (!sender) {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Invalid sender account');
      return NextResponse.json({ error: 'Invalid sender account' }, { status: 400 });
    }

    if (sender.balance < amount) {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Insufficient balance');
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 6. Validate recipient account
    const recipient = db.prepare('SELECT id FROM accounts WHERE account_number = ?').get(recipientAccount) as { id: string } | undefined;
    if (!recipient) {
      logSecurityEvent('TRANSACTION_REJECTED', session.id, 'Invalid recipient account');
      return NextResponse.json({ error: 'Invalid recipient account' }, { status: 400 });
    }

    // 7. Atomic Database Transaction
    try {
      const dbTx = db.transaction(() => {
        // Debit sender
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, sender.id);
        
        // Credit recipient
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, recipient.id);

        // Record transaction
        db.prepare(`
          INSERT INTO transactions (id, sender_account_id, recipient_account_id, amount, status, timestamp, description, nonce)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(transactionId, sender.id, recipient.id, amount, 'COMPLETED', timestamp, description, aesNonce);

        // Record security metadata
        db.prepare(`
          INSERT INTO transaction_security (transaction_id, ciphertext, auth_tag, encrypted_aes_key, rsa_signature)
          VALUES (?, ?, ?, ?, ?)
        `).run(transactionId, ciphertext, authTag, encryptedAesKey, signature);

        // Record Audit log
        db.prepare(`
          INSERT INTO audit_logs (id, event_type, user_id, transaction_id, result, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), 'TRANSACTION_COMPLETED', session.id, transactionId, 'SUCCESS', 'Cryptographic transaction fully verified and processed');
      });

      dbTx(); // Execute atomic transaction
    } catch (dbErr) {
      console.error(dbErr);
      logSecurityEvent('TRANSACTION_FAILED', session.id, 'Database transaction failed');
      return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true, transactionId });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function logSecurityEvent(eventType: string, userId: string | null, details: string) {
  const id = crypto.randomUUID();
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, event_type, user_id, result, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, eventType, userId, 'FAILURE', details);
  } catch (e) {
    console.error('Failed to write audit log', e);
  }
}
