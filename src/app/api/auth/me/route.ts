import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = db.prepare('SELECT account_number, balance FROM accounts WHERE user_id = ?').get(session.id) as
      | { account_number: string; balance: number }
      | undefined;

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: session.id,
        username: session.username,
        fullName: session.full_name,
      },
      account: {
        accountNumber: account.account_number,
        balance: account.balance
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
