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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const groupId = params.id;
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
    
    // Forward to backend with group context
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/groups/${groupId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Group-ID': groupId,
      },
    });

    // Handle different response statuses
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
    
    if (response.status === 404) {
      return new NextResponse(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new NextResponse(JSON.stringify({
        error: errorData.error || `Failed to fetch group: ${response.status} ${response.statusText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const groupId = params.id;
    const { getToken } = getAuth(request);
    const token = await getToken();
    const body = await request.json();
    
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
    
    // Forward to backend with group context
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Group-ID': groupId,
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
    
    if (response.status === 404) {
      return new NextResponse(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new NextResponse(JSON.stringify({
        error: errorData.error || `Failed to update group: ${response.status} ${response.statusText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const groupId = params.id;
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
    
    // Forward to backend with group context
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/groups/${groupId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Group-ID': groupId,
      },
    });

    // Handle different response statuses
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
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
    
    if (response.status === 404) {
      return new NextResponse(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new NextResponse(JSON.stringify({
        error: errorData.error || `Failed to delete group: ${response.status} ${response.statusText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in DELETE /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}