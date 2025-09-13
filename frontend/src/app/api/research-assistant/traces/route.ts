import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_API_URL = 'http://backend-api:8000';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = `${BACKEND_API_URL}/api/research/traces`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

