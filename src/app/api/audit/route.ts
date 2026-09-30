import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real banking app, users might only see their own audit logs,
    // but for educational demonstration purposes, we will return logs related to this user
    // or all logs if we want to show the full picture. Let's restrict to this user's activity.
    const logs = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(session.id);

    return NextResponse.json({ logs });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
