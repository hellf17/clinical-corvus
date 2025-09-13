import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
export async function GET() {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/preferences`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    console.error('GET /api/user/preferences proxy failed', e);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (e) {
    console.error('POST /api/user/preferences proxy failed', e);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
