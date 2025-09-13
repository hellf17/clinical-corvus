import { NextRequest, NextResponse } from 'next/server';
import { getPatientById } from '@/services/patientService.server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patient = await getPatientById(params.id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do paciente' },
      { status: 500 }
    );
  }
}