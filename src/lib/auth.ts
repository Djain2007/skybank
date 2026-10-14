import { cookies } from 'next/headers';
import db from './db';
import crypto from 'crypto';

export async function createSession(userId: string) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiration

  const insertStmt = db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  );
  insertStmt.run(sessionId, userId, expiresAt.toISOString());

  const cookieStore = await cookies();
  cookieStore.set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/'
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;

  const getStmt = db.prepare(`
    SELECT users.id, users.username, users.full_name, users.public_key, sessions.expires_at 
    FROM sessions 
    JOIN users ON sessions.user_id = users.id 
    WHERE sessions.id = ?
  `);
  
  const session = getStmt.get(sessionToken) as
    | { id: string; username: string; full_name: string; public_key: string; expires_at: string }
    | undefined;
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    // Session expired
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToken);
    return null;
  }

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (sessionToken) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToken);
  }
  cookieStore.delete('session');
}
