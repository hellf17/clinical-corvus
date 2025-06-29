import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// GET a specific medication
export async function GET(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  const { params } = context;
  try {
    const medicationId = params["medicationId"];
    const apiUrl = process.env.API_URL || 'http://backend-api:8000';
    const response = await axios.get(`${apiUrl}/api/medications/${medicationId}`);

    // Map backend model to frontend model
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

    return NextResponse.json({ medication }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching medication:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medication' },
      { status: error.response?.status || 500 }
    );
  }
}

// PUT update a medication
export async function PUT(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  const { params } = context;
  try {
    const medicationId = params["medicationId"];
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
      status: body.active ? 'active' : 'suspended'
    };

    const response = await axios.put(`${apiUrl}/api/medications/${medicationId}`, medicationPayload);

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

    return NextResponse.json({ medication }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating medication:', error);
    return NextResponse.json(
      { error: 'Failed to update medication' },
      { status: error.response?.status || 500 }
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
    const apiUrl = process.env.API_URL || 'http://backend-api:8000';
    
    await axios.delete(`${apiUrl}/api/medications/${medicationId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting medication:', error);
    return NextResponse.json(
      { error: 'Failed to delete medication' },
      { status: error.response?.status || 500 }
    );
  }
} 