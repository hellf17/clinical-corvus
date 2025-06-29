import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

function getAPIUrl(): string {
  // In Docker development, use the backend service name
  // This matches the pattern used by the MBE routes that work
  return 'http://backend-api:8000';
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      );
    }

    // Obter dados da requisição
    const body = await request.json();

    // Validar dados obrigatórios
    if (!body.user_reasoning_process_description) {
      return NextResponse.json(
        { detail: 'Missing required field: user_reasoning_process_description' },
        { status: 400 }
      );
    }

    // Fazer chamada para o backend
    const apiUrl = getAPIUrl();
    const response = await fetch(`${apiUrl}/api/clinical/critique-reasoning-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { detail: errorData.detail || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in reasoning critique API route:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 