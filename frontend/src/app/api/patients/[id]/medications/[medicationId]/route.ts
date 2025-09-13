import { NextRequest, NextResponse } from 'next/server';

// PUT update a medication
export async function PUT(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  const { params } = context;
  try {
    const medicationId = params["medicationId"];
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/medications/${medicationId}`;
    const authHeader = request.headers.get('Authorization') || '';
    const body = await request.json();

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || errorData.error || 'Failed to update medication' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating medication:', error);
    return NextResponse.json(
      { error: 'Failed to update medication' },
      { status: 500 }
    );
  }
}

// DELETE a medication
export async function DELETE(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  const { params } = context;
  try {
    const medicationId = params["medicationId"];
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/medications/${medicationId}`;
    const authHeader = request.headers.get('Authorization') || '';
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || errorData.error || 'Failed to delete medication' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting medication:', error);
    return NextResponse.json(
      { error: 'Failed to delete medication' },
      { status: 500 }
    );
  }
}