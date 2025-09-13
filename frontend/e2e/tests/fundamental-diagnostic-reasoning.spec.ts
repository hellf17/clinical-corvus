
import { test, expect } from '@playwright/test';

const API_PROBLEM_REPRESENTATION = '/api/clinical-assistant/provide-feedback-on-problem-representation-translated';
const API_ILLNESS_SCRIPT = '/api/clinical-assistant/generate-illness-script-translated';

test.describe('Fundamental Diagnostic Reasoning Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page before each test
    await page.goto('/academy/fundamental-diagnostic-reasoning');
  });

  test('should allow navigation between all tabs', async ({ page }) => {
    // Click on the second tab and verify its content appears
    await page.click('button[role="tab"]:has-text("Representação do Problema")');
    await expect(page.locator('h3:has-text("Laboratório de Prática")')).toBeVisible();

    // Click on the third tab
    await page.click('button[role="tab"]:has-text("Illness Scripts")');
    await expect(page.locator('h3:has-text("Ferramenta de Exploração")')).toBeVisible();

    // Click on the fourth tab
    await page.click('button[role="tab"]:has-text("Coleta de Dados")');
    await expect(page.locator('h3:has-text("Simulador de Anamnese")')).toBeVisible();
  });

  test('should submit problem representation form and display feedback', async ({ page }) => {
    // Mock the API response
    await page.route(API_PROBLEM_REPRESENTATION, async route => {
      const json = {
        overall_assessment: 'This is a great assessment from the mock API.',
        feedback_strengths: ['Very concise summary'],
        feedback_improvements: ['Could use more semantic qualifiers'],
        missing_elements: [],
        socratic_questions: [],
        next_step_guidance: 'Next step is to...',
      };
      await route.fulfill({ json });
    });

    // Navigate to the tab
    await page.click('button[role="tab"]:has-text("Representação do Problema")');

    // Fill the form
    await page.fill('#oneSentenceSummaryPR', 'A patient with chest pain.');
    await page.fill('#semanticQualifiersPR', 'acute, severe');

    // Click the submit button
    await page.click('button:has-text("Obter Feedback do Dr. Corvus")');

    // Wait for the feedback to be visible
    const feedbackLocator = page.locator('text=This is a great assessment from the mock API.');
    await expect(feedbackLocator).toBeVisible();
    await expect(page.locator('text=Very concise summary')).toBeVisible();
  });

  test('should submit illness script form and display results', async ({ page }) => {
    // Mock the API response
    await page.route(API_ILLNESS_SCRIPT, async route => {
      const json = {
        disease_name: 'Pneumonia',
        predisposing_conditions: ['Old age', 'Immunosuppression'],
        pathophysiology_summary: 'Infection of lung parenchyma.',
        key_symptoms_and_signs: ['Cough', 'Fever', 'Crackles'],
        disclaimer: 'For educational purposes only.',
      };
      await route.fulfill({ json });
    });

    // Navigate to the tab
    await page.click('button[role="tab"]:has-text("Illness Scripts")');

    // Fill the form
    await page.fill('#diseaseForScript', 'Pneumonia');

    // Click the submit button
    await page.click('button:has-text("Buscar Illness Script")');

    // Wait for the results to be visible
    const resultsLocator = page.locator('h4:has-text("Illness Script para: Pneumonia")');
    await expect(resultsLocator).toBeVisible();
    await expect(page.locator('text=Infection of lung parenchyma.')).toBeVisible();
    await expect(page.locator('text=Cough')).toBeVisible();
  });
});
