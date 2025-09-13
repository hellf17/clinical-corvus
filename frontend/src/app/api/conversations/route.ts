import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform response to match RecentConversationsCard component format
    const transformedData = {
      conversations: data.conversations?.map((conv: any) => ({
        conversation_id: conv.id || conv.conversation_id,
        patient_name: conv.patient_name || conv.title || 'Conversa sem título',
        last_message_content: conv.last_message || conv.content || conv.title || 'Sem mensagens',
        unread_count: conv.unread_count || 0,
      })) || []
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { getToken } = await auth();
    const token = await getToken();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform response to match RecentConversationsCard component format
    const transformedData = {
      id: data.id,
      patientName: data.patient_name || data.title,
      content: data.last_message || data.title,
      createdAt: data.created_at,
      lastMessageAt: data.updated_at,
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}