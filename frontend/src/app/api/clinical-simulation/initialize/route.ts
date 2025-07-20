import { NextRequest, NextResponse } from 'next/server';

// The backend URL is centralized for easy configuration.
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-api:8000';

// Function to transform frontend case format to backend expected format
function transformCaseContext(frontendCase: any) {
  console.log('[API] Transforming frontend case:', frontendCase);
  
  // Create a standardized case context that matches the backend model
  return {
    demographics: `Paciente do caso: ${frontendCase.title}`,
    chief_complaint: frontendCase.brief || 'Sem queixa principal especificada',
    physical_exam: 'Dados do exame físico não disponíveis no formato simplificado',
    vital_signs: 'Sinais vitais não disponíveis no formato simplificado',
    full_description: frontendCase.details || frontendCase.brief || 'Sem descrição detalhada',
    expected_differentials: [],
    learning_objectives: frontendCase.learning_objectives || [],
    expert_analysis: ''
  };
}

/**
 * @swagger
 * /api/clinical-simulation/initialize:
 *   post:
 *     summary: Initializes a new clinical simulation session.
 *     description: Forwards a request to the backend to create a new session state for a clinical simulation based on the provided case context.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               case_context:
 *                 type: object
 *                 description: The context of the clinical case to initialize the simulation with.
 *     responses:
 *       200:
 *         description: Successfully initialized session. Returns the initial session state.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session_state:
 *                   type: object
 *       500:
 *         description: Failed to initialize simulation session due to a server error.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[API] Received initialize request:', body);
    
    // Transform the frontend case format to backend format
    const transformedBody = {
      case_context: transformCaseContext(body.case_context)
    };
    
    console.log('[API] Transformed request body:', transformedBody);

    const apiResponse = await fetch(`${BACKEND_URL}/api/simulation/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedBody),
    });

    console.log('[API] Backend response status:', apiResponse.status, apiResponse.statusText);
    
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error('[API] Backend error:', errorBody);
      return new NextResponse(errorBody, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
      });
    }

    const data = await apiResponse.json();
    console.log('[API] Backend response data:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error in initialize proxy route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
