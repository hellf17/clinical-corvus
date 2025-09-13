
import { test, expect } from '@playwright/test';

const API_ANALYZE_BIAS = '/api/clinical-assistant/analyze-cognitive-bias-translated';
const API_DIAGNOSTIC_TIMEOUT = '/api/clinical-assistant/generate-diagnostic-timeout-translated';

test.describe('Metacognition & Diagnostic Errors Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academy/metacognition-diagnostic-errors');
  });

  test('should allow completing the bias quiz', async ({ page }) => {
    // Navigate to the quiz
    await page.click('button[role="tab"]:has-text("Biblioteca de Vieses")');
    await page.click('button[role="tab"]:has-text("Quiz Interativo")');

    // Answer first question (correctly)
    await page.click('button:has-text("Viés de Disponibilidade")');
    await page.click('button:has-text("Confirmar Resposta")');
    await expect(page.locator('text=Correto!')).toBeVisible();
    await page.click('button:has-text("Próxima Pergunta")');

    // Answer second question (incorrectly)
    await page.click('button:has-text("Viés de Confirmação")');
    await page.click('button:has-text("Confirmar Resposta")');
    await expect(page.locator('text=Incorreto')).toBeVisible();
    await page.click('button:has-text("Finalizar Quiz")');

    // Check final score
    await expect(page.locator('h3:has-text("Quiz Completo!")')).toBeVisible();
    await expect(page.locator('p:has-text("Você acertou 1 de 2 perguntas")')).toBeVisible();
  });

  test('should submit a case for bias analysis and display results', async ({ page }) => {
    // Mock the API response
    await page.route(API_ANALYZE_BIAS, async route => {
      const json = {
        detected_biases: [
          { bias_name: 'Ancoragem', description: 'Mock description' },
        ],
        overall_analysis: 'This is the mock overall analysis.',
        educational_insights: 'Mock educational insights.',
      };
      await route.fulfill({ json });
    });

    // Navigate to the tab
    await page.click('button[role="tab"]:has-text("Análise de Casos")');

    // Select a vignette
    await page.locator('button[role="combobox"]').click();
    await page.locator('div[role="option"]:has-text("Dispneia em DPOC")').click();

    // Submit for analysis
    await page.click('button:has-text("Analisar com Dr. Corvus")');

    // Assert on the results
    await expect(page.locator('h3:has-text("Reflexões do Dr. Corvus")')).toBeVisible();
    await expect(page.locator('h4:has-text("Ancoragem")')).toBeVisible();
    await expect(page.locator('p:has-text("This is the mock overall analysis.")')).toBeVisible();
  });

  test('should run a diagnostic timeout session and display analysis', async ({ page }) => {
    // Mock the API response
    await page.route(API_DIAGNOSTIC_TIMEOUT, async route => {
      const json = {
        alternative_diagnoses_to_consider: ['Mock Alternative Diagnosis'],
        key_questions_to_ask: ['Mock key question?'],
        red_flags_to_check: [],
        next_steps_suggested: [],
        cognitive_checks: [],
        timeout_recommendation: '...',
      };
      await route.fulfill({ json });
    });

    // Navigate to the tab
    await page.click('button[role="tab"]:has-text("Diagnostic Timeout")');

    // Fill form and start session
    await page.fill('#caseDescription', 'A test case for timeout');
    await page.click('div:text("Timeout de Emergência")');
    await page.click('button:has-text("Iniciar Diagnostic Timeout")');

    // Wait for session to start and fill prompts
    const promptTextarea = page.locator('textarea[placeholder*="Anote suas reflexões"]');
    await expect(promptTextarea).toBeVisible();
    const promptsCount = 4; // Emergency template has 4 prompts
    for (let i = 0; i < promptsCount; i++) {
      await promptTextarea.fill(`Response for prompt ${i + 1}`);
      if (i < promptsCount - 1) {
        await page.click('button[aria-label="Next prompt"]'); // Assuming a label for next button
      }
    }

    // Submit for analysis
    await page.click('button:has-text("Analisar Timeout")');

    // Assert on the results
    await expect(page.locator('h3:has-text("Análise do Diagnostic Timeout")')).toBeVisible();
    await expect(page.locator('text=Mock Alternative Diagnosis')).toBeVisible();
    await expect(page.locator('text=Mock key question?')).toBeVisible();
  });
});
