import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(session.id) as any;
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const transactions = db.prepare(`
      SELECT t.*, ts.ciphertext, ts.auth_tag, ts.encrypted_aes_key, ts.rsa_signature, sa.account_number as sender_number, ra.account_number as recipient_number
      FROM transactions t
      JOIN transaction_security ts ON t.id = ts.transaction_id
      JOIN accounts sa ON t.sender_account_id = sa.id
      JOIN accounts ra ON t.recipient_account_id = ra.id
      WHERE t.sender_account_id = ? OR t.recipient_account_id = ?
      ORDER BY t.timestamp DESC
    `).all(account.id, account.id);

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
