import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as argon2 from 'argon2';
import crypto from 'crypto';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, username, email, password, publicKey } = body;

    if (!fullName || !username || !email || !password || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash the password using Argon2id
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    // Generate unique user and account IDs
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    // Demo accounts assignment
    let accountNumber = 'SKY-' + crypto.randomInt(10000, 99999).toString();
    let defaultBalance = 50000;
    
    if (username.toLowerCase() === 'alice') {
      accountNumber = 'SKY-10001';
      defaultBalance = 50000;
    } else if (username.toLowerCase() === 'bob') {
      accountNumber = 'SKY-10002';
      defaultBalance = 20000;
    }

    const insertUser = db.prepare(`
      INSERT INTO users (id, full_name, username, email, password_hash, public_key)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertAccount = db.prepare(`
      INSERT INTO accounts (id, user_id, account_number, balance)
      VALUES (?, ?, ?, ?)
    `);

    // Execute in transaction
    const transaction = db.transaction(() => {
      insertUser.run(userId, fullName, username, email, passwordHash, publicKey);
      insertAccount.run(accountId, userId, accountNumber, defaultBalance);
    });

    transaction();

    // Create session
    await createSession(userId);

    // Audit log
    const auditId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, event_type, user_id, result, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(auditId, 'REGISTER_SUCCESS', userId, 'SUCCESS', 'New user registered');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
