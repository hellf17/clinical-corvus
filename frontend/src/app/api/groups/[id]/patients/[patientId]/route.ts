import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; patientId: string } }) {
  try {
    const groupId = params.id;
    const patientId = params.patientId;
    const { getToken } = getAuth(request);
    const token = await getToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Forward to backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/groups/${groupId}/patients/${patientId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove patient from group' }, { status: 500 });
  }
}