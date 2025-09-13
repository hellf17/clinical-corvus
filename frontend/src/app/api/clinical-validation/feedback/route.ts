import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Minimal server-side logging for validation program.
    // In production, forward this to a proper backend endpoint or datastore.
    console.log('Clinical Validation Feedback:', JSON.stringify({ userId, ...body }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to record clinical validation feedback:', err);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}

