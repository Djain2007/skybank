import { NextResponse } from 'next/server';
import { getServerPublicKey } from '@/lib/serverConfig';

export async function GET() {
  try {
    const publicKey = getServerPublicKey();
    return NextResponse.json({ publicKey });
  } catch (err) {
    console.error('Failed to get server public key', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
