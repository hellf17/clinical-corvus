
import { test, expect } from '@playwright/test';

const API_FORMULATE_PICO = '/api/research-assistant/formulate-pico-translated';
const API_QUICK_SEARCH = '/api/research-assistant/quick-search-translated';
const API_UNIFIED_ANALYSIS = '/api/research-assistant/unified-evidence-analysis-translated';

test.describe('Evidence-Based Medicine Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academy/evidence-based-medicine');
  });

  test('should formulate a PICO question and transfer it to the research tab', async ({ page }) => {
    // Mock the PICO API response
    await page.route(API_FORMULATE_PICO, async route => {
      const json = {
        structured_question: 'Mock PICO Question: Does it work?',
        structured_pico_question: { patient_population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
        pico_derivation_reasoning: '',
        explanation: '',
        search_terms_suggestions: ['mock', 'test'],
        boolean_search_strategies: [],
        recommended_study_types: [],
        alternative_pico_formulations: [],
      };
      await route.fulfill({ json });
    });

    // 1. Go to PICO tab and fill the form
    await page.click('button[role="tab"]:has-text("Formulação PICO")');
    await page.fill('#clinicalScenario', 'A test scenario');
    await page.click('button:has-text("Formular Pergunta PICO")');

    // 2. Wait for the result and the transfer button
    await expect(page.locator('text=Mock PICO Question: Does it work?')).toBeVisible();
    const transferButton = page.locator('button:has-text("Pesquisar Evidências")');
    await expect(transferButton).toBeVisible();

    // 3. Click transfer button
    await transferButton.click();

    // 4. Assert that the tab switched and the question is in the input
    const researchTab = page.locator('button[role="tab"][aria-selected="true"]:has-text("Pesquisa Avançada")');
    await expect(researchTab).toBeVisible();
    await expect(page.locator('#researchQuestion')).toHaveValue('Mock PICO Question: Does it work?');
  });

  test('should perform a deep research search and display results', async ({ page }) => {
    // Mock the Research API response
    await page.route(API_QUICK_SEARCH, async route => {
      const json = {
        executive_summary: 'This is the mocked executive summary of the research.',
        relevant_references: [],
        key_findings_by_theme: [],
        clinical_implications: [],
        research_gaps_identified: [],
      };
      await route.fulfill({ json });
    });

    // Navigate to the research tab
    await page.click('button[role="tab"]:has-text("Pesquisa Avançada")');

    // Fill the form and submit
    await page.fill('#researchQuestion', 'A valid research question');
    await page.click('button:has-text("Pesquisar Evidências")');

    // Assert that the results are visible
    await expect(page.locator('text=This is the mocked executive summary of the research.')).toBeVisible();
  });

  test('should perform evidence analysis on text and display results', async ({ page }) => {
    // Mock the Analysis API response
    await page.route(API_UNIFIED_ANALYSIS, async route => {
      const json = {
        grade_summary: {
          overall_quality: 'MODERADA',
          recommendation_strength: 'FRACA',
          summary_of_findings: 'Mocked analysis found moderate quality evidence.',
          recommendation_balance: { positive_factors: [], negative_factors: [], overall_balance: '...' },
        },
        quality_factors: [],
        bias_analysis: [],
        practice_recommendations: { clinical_application: '...', monitoring_points: [], evidence_caveats: '...' },
      };
      await route.fulfill({ json });
    });

    // Navigate to the analysis tab
    await page.click('button[role="tab"]:has-text("Análise de Evidências")');
    await page.click('button[role="tab"]:has-text("Analisar Texto")');

    // Fill the form and submit
    await page.fill('#clinical-question-text', 'My question');
    await page.fill('#evidence-text', 'The full text of the article.');
    await page.click('button:has-text("Analisar Evidência")');

    // Assert that the results dashboard is visible
    await expect(page.locator('h3:has-text("Dashboard de Confiança da Evidência")')).toBeVisible();
    await expect(page.locator('text=Mocked analysis found moderate quality evidence.')).toBeVisible();
    await expect(page.locator('div:has-text("MODERADA")')).toBeVisible();
  });
});
