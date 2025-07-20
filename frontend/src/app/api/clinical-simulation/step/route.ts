import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-api:8000';

/**
 * @swagger
 * /api/clinical-simulation/step:
 *   post:
 *     summary: Executes a single step in the clinical simulation.
 *     description: >
 *       Forwards a request to the backend's stateful SNAPPS step endpoint.
 *       It can target the default or translated endpoint based on the 'translate' query parameter.
 *     parameters:
 *       - in: query
 *         name: translate
 *         schema:
 *           type: boolean
 *         description: If true, the request is sent to the translated endpoint.
 *       - in: query
 *         name: target_lang
 *         schema:
 *           type: string
 *         description: The target language for translation (e.g., 'PT'). Defaults to 'PT' if not provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_state:
 *                 type: object
 *                 description: The current state of the simulation session.
 *               current_step:
 *                 type: string
 *                 description: The SNAPPS step to be executed.
 *               current_input:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: The student's input for the current step.
 *     responses:
 *       200:
 *         description: Successfully executed step. Returns feedback and the updated session state.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Failed to process the step due to a server error.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const translate = searchParams.get('translate') === 'true';
    const targetLang = searchParams.get('target_lang') || 'PT';

    let endpoint = `${BACKEND_URL}/api/simulation/snapps-step`;
    if (translate) {
      endpoint = `${BACKEND_URL}/api/simulation/snapps-step-translated?target_lang=${targetLang}`;
    }

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error('Backend error:', errorBody);
      return new NextResponse(errorBody, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
      });
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in step proxy route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
