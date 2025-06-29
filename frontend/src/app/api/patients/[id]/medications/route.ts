import { NextRequest, NextResponse } from 'next/server';

// GET medications for a patient
import axios from 'axios';

export async function GET(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  const { params } = context;
  try {
    const patientId = params["id"];
    const apiUrl = process.env.API_URL || 'http://backend-api:8000';
    const response = await axios.get(`${apiUrl}/api/medications/patient/${patientId}`);

    // Map backend model to frontend model
    const medications = response.data.medications.map((med: any) => ({
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      route: med.route,
      startDate: med.start_date,
      endDate: med.end_date || '',
      notes: med.notes || '',
      active: med.status === 'active'
    }));

    return NextResponse.json({ medications }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: error.response?.status || 500 }
    );
  }
}
// POST a new medication
export async function POST(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  const { params } = context;
  try {
    const patientId = params["id"];
    const apiUrl = process.env.API_URL || 'http://backend-api:8000';
    const body = await request.json();

    // Map frontend model to backend model
    const medicationPayload = {
      name: body.name,
      dosage: body.dosage,
      frequency: body.frequency,
      route: body.route,
      start_date: body.startDate,
      end_date: body.endDate || null,
      notes: body.notes || null,
      status: body.active ? 'active' : 'suspended',
      patient_id: patientId
    };

    const response = await axios.post(`${apiUrl}/api/medications/`, medicationPayload);

    // Map response back to frontend model
    const medication = {
      id: response.data.id,
      name: response.data.name,
      dosage: response.data.dosage,
      frequency: response.data.frequency,
      route: response.data.route,
      startDate: response.data.start_date,
      endDate: response.data.end_date || '',
      notes: response.data.notes || '',
      active: response.data.status === 'active'
    };

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating medication:', error);
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: error.response?.status || 500 }
    );
  }
}