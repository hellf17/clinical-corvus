
import { test, expect } from '@playwright/test';

const API_EXPAND_DDX = '/api/clinical-assistant/expand-differential-diagnosis-translated';
const API_GENERATE_QUESTIONS = '/api/clinical-assistant/generate-clinical-workflow-questions-translated';
const API_COMPARE_MATRIX = '/api/clinical-assistant/compare-contrast-matrix-feedback-translated';

test.describe('Differential Diagnosis Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academy/differential-diagnosis');
  });

  test('should submit the Expand DDx form and display results', async ({ page }) => {
    await page.route(API_EXPAND_DDX, async route => {
      const json = {
        suggested_additional_diagnoses_with_rationale: ['Mocked Diagnosis: Because the test said so.'],
      };
      await route.fulfill({ json });
    });

    await page.click('button[role="tab"]:has-text("Expandindo o DDx")');
    await page.fill('#symptoms', 'Dor de cabeça');
    await page.fill('#initialDiagnoses', 'Enxaqueca');
    await page.click('button:has-text("Expandir DDx com Dr. Corvus")');

    await expect(page.locator('text=Mocked Diagnosis: Because the test said so.')).toBeVisible();
  });

  test('should submit the Generate Questions form and display results', async ({ page }) => {
    await page.route(API_GENERATE_QUESTIONS, async route => {
      const json = {
        question_categories: [
          { category_name: 'History of Present Illness', questions: ['Is this a mock question?'], category_rationale: '...' },
        ],
        red_flag_questions: ['Any neurological deficits?'],
        overall_rationale: '...',
      };
      await route.fulfill({ json });
    });

    await page.click('button[role="tab"]:has-text("Gerar Perguntas para DDx")');
    await page.fill('#chiefComplaintQuestions', 'Fever');
    await page.fill('#patientDemographics', '30yo female');
    await page.click('button:has-text("Gerar Perguntas-Chave")');

    await expect(page.locator('text=Is this a mock question?')).toBeVisible();
    await expect(page.locator('text=Any neurological deficits?')).toBeVisible();
  });

  test('should submit the Compare Hypotheses matrix and display feedback', async ({ page }) => {
    await page.route(API_COMPARE_MATRIX, async route => {
      const json = {
        overall_matrix_feedback: 'Mocked feedback: Your matrix analysis was perfect.',
        discriminator_feedback: 'Mocked feedback: Excellent choice of discriminator.',
        expert_matrix_analysis: [],
        expert_recommended_discriminator: 'Sinal de Blumberg',
        expert_discriminator_rationale: '...',
        learning_focus_suggestions: [],
      };
      await route.fulfill({ json });
    });

    await page.click('button[role="tab"]:has-text("Comparando Hipóteses")');

    // Change the case to something other than the default to test the selector
    await page.click('button:has-text("Intermediário")');
    await expect(page.locator('text=Homem, 55 anos, diabético e hipertenso')).toBeVisible();

    // Interact with the matrix (click the first radio button)
    await page.locator('input[type="radio"]').first().check();

    // Select a discriminator
    await page.selectOption('select', { label: 'Elevação de ST' });

    // Submit
    await page.click('button:has-text("Ver Feedback do Dr. Corvus")');

    // Assert on the mocked feedback
    await expect(page.locator('text=Mocked feedback: Your matrix analysis was perfect.')).toBeVisible();
    await expect(page.locator('text=Mocked feedback: Excellent choice of discriminator.')).toBeVisible();
  });
});
