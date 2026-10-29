import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = getHealthStatus();
  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
