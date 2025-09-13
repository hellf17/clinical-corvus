import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

// Rate limiting function
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const key = `${userId}`;
  const record = rateLimitStore.get(key);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    // Reset rate limit counter
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    return true;
  }

  // Increment counter
  rateLimitStore.set(key, { count: record.count + 1, timestamp: record.timestamp });
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { getToken } = getAuth(request);
    const token = await getToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting using token as user identifier
    if (isRateLimited(token)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    
    // Forward to backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/groups/invitations/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    // Handle different response statuses
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return new NextResponse(JSON.stringify({
        error: errorData.error || 'Bad Request'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (response.status === 401) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (response.status === 403) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new NextResponse(JSON.stringify({
        error: errorData.error || `Failed to decline group invitation: ${response.status} ${response.statusText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/groups/invitations/decline:', error);
    return NextResponse.json({ error: 'Failed to decline group invitation' }, { status: 500 });
  }
}