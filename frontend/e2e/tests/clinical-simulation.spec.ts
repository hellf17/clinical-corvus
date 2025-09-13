
import { test, expect } from '@playwright/test';

const API_INITIALIZE = '/api/clinical-simulation/initialize';
const API_STEP = '/api/clinical-simulation/step-translated';

const mockCase = {
    id: 'case-001',
    title: 'Dor Torácica Súbita',
    brief: 'Paciente de 58 anos, masculino, com dor torácica opressiva de início súbito.',
    details: '...',
    difficulty: { level: 'Intermediário', focus: '...' },
    specialties: ['Cardiologia'],
    learning_objectives: ['...'],
};

const mockInitialState = { case_context: mockCase, feedback_history: [] };

test.describe('Clinical Simulation End-to-End Flow', () => {

  test('should complete a full simulation from case selection to summary', async ({ page }) => {
    // Mock the initialize call
    await page.route(API_INITIALIZE, async route => {
      await route.fulfill({ json: mockInitialState });
    });

    // Mock the step calls (will be called 6 times)
    await page.route(API_STEP, async (route, request) => {
        const requestBody = request.postDataJSON();
        const currentStep = requestBody.current_step;
        const json = {
            updated_session_state: { ...mockInitialState, student_summary: 'Updated state' },
            feedback: { 
                // Generic feedback for any step, but specific enough to identify
                overall_assessment: `Mock feedback for ${currentStep} received.`,
                // Add required fields for each feedback type to avoid component errors
                feedback_strengths: [], feedback_improvements: [], missing_elements: [], socratic_questions: [], next_step_guidance: 'Proceed.',
                ddx_evaluation: [], missing_differentials: [], prioritization_feedback: '',
                response: `Analysis for ${currentStep}`,
                answers_to_questions: [], additional_considerations: [], counter_questions: [], knowledge_gaps_identified: [], learning_resources: [],
                plan_strengths: [], plan_gaps: [], investigation_priorities: [], management_considerations: [], safety_concerns: [], cost_effectiveness_notes: [], guidelines_alignment: '',
                key_strengths: [], areas_for_development: [], learning_objectives_met: [], recommended_study_topics: [], metacognitive_insights: [], next_cases_suggestions: []
            }
        };
        await route.fulfill({ json });
      });

    // 1. Start on the main simulation page
    await page.goto('/academy/clinical-simulation');
    await expect(page.locator('h1:has-text("Biblioteca de Casos Clínicos")')).toBeVisible();

    // 2. Select a case to start
    await page.locator('button:has-text("Iniciar Simulação")').first().click();

    // 3. Wait for initialization and the first step to appear
    const workspaceInput = page.locator('textarea[data-testid="workspace-input"]');
    await expect(workspaceInput).toBeVisible();

    // 4. Loop through all 6 SNAPPS steps
    const steps = ['SUMMARIZE', 'NARROW', 'ANALYZE', 'PROBE', 'PLAN', 'SELECT'];
    for (let i = 0; i < steps.length; i++) {
      const stepName = steps[i];
      const isLastStep = i === steps.length - 1;
      const buttonName = isLastStep ? /Finalizar Simulação/i : /Enviar e Próximo/i;

      // Fill input and submit
      await workspaceInput.fill(`Test response for ${stepName}`);
      await page.locator(`button:has-text("${buttonName}")`).click();

      // Wait for the feedback to appear
      await expect(page.locator(`text=Mock feedback for ${stepName} received.`)).toBeVisible();
    }

    // 5. After the final step, verify the summary dashboard is shown
    await expect(page.locator('h2:has-text("Resumo da Sessão do Dr. Corvus")')).toBeVisible();
    await expect(page.locator('div:has-text("Pontuação Geral")')).toBeVisible();

    // 6. Test the restart functionality
    await page.locator('button:has-text("Reiniciar Simulação")').click();
    await expect(page.locator('h1:has-text("Biblioteca de Casos Clínicos")')).toBeVisible();
  });
});
