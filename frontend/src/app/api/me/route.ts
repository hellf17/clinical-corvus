import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/status`, {
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
    console.error('Error in /api/me:', e);
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 });
  }
}

