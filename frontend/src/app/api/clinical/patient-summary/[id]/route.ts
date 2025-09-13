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

    // Create a patient summary with the required information
    const summary = {
      patient_id: patient.patient_id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      status: 'ativo',
      primary_diagnosis: patient.primary_diagnosis,
      last_updated: patient.updatedAt || patient.createdAt,
      summary: `Paciente ${patient.name}, ${patient.age} anos, gênero ${patient.gender}. ${patient.primary_diagnosis ? `Diagnóstico principal: ${patient.primary_diagnosis}.` : 'Sem diagnóstico principal registrado.'}`
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching patient summary:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar resumo do paciente' },
      { status: 500 }
    );
  }
}