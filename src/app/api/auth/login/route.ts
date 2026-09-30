import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as argon2 from 'argon2';
import crypto from 'crypto';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (!user) {
      // Create audit log for failed login
      const auditId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO audit_logs (id, event_type, result, details)
        VALUES (?, ?, ?, ?)
      `).run(auditId, 'LOGIN_FAILED', 'FAILURE', `User not found: ${username}`);
      
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await argon2.verify(user.password_hash, password);

    if (!isValid) {
      const auditId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO audit_logs (id, event_type, user_id, result, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(auditId, 'LOGIN_FAILED', user.id, 'FAILURE', 'Invalid password');

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await createSession(user.id);

    const auditId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, event_type, user_id, result, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(auditId, 'LOGIN_SUCCESS', user.id, 'SUCCESS', 'User logged in securely');

    return NextResponse.json({ success: true, publicKey: user.public_key });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
