import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Mock data for demonstration - in a real app, this would come from a database
let mockNotes = [
  {
    id: '1',
    title: 'Consulta Inicial',
    content: '<p>Paciente apresenta queixa de dor de cabeça há 3 dias. Exame físico normal.</p>',
    note_type: 'consultation' as const,
    patient_id: '1',
    user_id: 'doctor1',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    author: 'Dr. João Silva'
  },
  {
    id: '2',
    title: 'Evolução do Tratamento',
    content: '<p>Paciente respondeu bem ao tratamento medicamentoso. Queixas diminuíram.</p>',
    note_type: 'evolution' as const,
    patient_id: '1',
    user_id: 'doctor1',
    created_at: '2024-01-16T14:20:00Z',
    updated_at: '2024-01-16T14:20:00Z',
    author: 'Dr. João Silva'
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Filter notes by patient ID
    const patientNotes = mockNotes.filter(note => note.patient_id === params.id);
    
    return NextResponse.json({
      notes: patientNotes,
      total: patientNotes.length
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar notas clínicas' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, note_type } = body;

    // Validate required fields
    if (!title || !content || !note_type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: título, conteúdo e tipo' },
        { status: 400 }
      );
    }

    // Create new note
    const newNote = {
      id: Date.now().toString(),
      title,
      content,
      note_type,
      patient_id: params.id,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: 'Dr. Atual' // In a real app, this would come from user profile
    };

    mockNotes.unshift(newNote); // Add to beginning of array

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Erro ao criar nota clínica' },
      { status: 500 }
    );
  }
}