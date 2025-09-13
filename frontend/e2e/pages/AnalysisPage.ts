import { Page, expect } from '@playwright/test';

export class AnalysisPage {
  constructor(private page: Page) {}

  // URLs
  readonly url = '/analysis';

  // Main page elements
  private pageTitle = () => this.page.getByRole('heading', { name: /Central de Análise Dr. Corvus/i });
  private pageDescription = () => this.page.getByText(/Faça upload de um PDF de exame ou insira os dados manualmente/i);
  private statusIndicators = () => this.page.locator('.bg-white\\/20');

  // Input mode toggle
  private manualInputSwitch = () => this.page.getByRole('switch', { name: /manual-input-switch/i });
  private manualInputLabel = () => this.page.getByText(/Entrada Manual Ativa|Upload de Arquivo Ativo/i);
  private modeDescription = () => this.page.locator('p').filter({ hasText: /Insira os valores dos exames manualmente|Faça upload de um arquivo PDF/i });

  // File upload section
  private fileUploadSection = () => this.page.locator('.border-dashed');
  private fileUploadComponent = () => this.page.locator('[data-testid="file-upload-component"]').or(this.page.locator('input[type="file"]'));

  // Manual input section
  private patientIdInput = () => this.page.getByLabel(/ID do Paciente/i);
  private examDateInput = () => this.page.getByLabel(/Data do Exame/i);
  private manualInputCategories = () => this.page.locator('.border.border-gray-200.rounded-lg');
  private manualSubmitButton = () => this.page.getByRole('button', { name: /Analisar Dados Manuais/i });

  // Results section
  private resultsSection = () => this.page.locator('[data-testid="results-section"]').or(this.page.locator('.mt-8.p-6.border.border-gray-200.rounded-lg.shadow-lg.bg-white'));
  private resultsTitle = () => this.page.getByText(/Resultados da Análise/i);
  private copyReportButton = () => this.page.getByRole('button', { name: /Copiar Relatório/i });
  private drCorvusButton = () => this.page.locator('.dr-corvus-image-button');
  private analysisResults = () => this.page.locator('[data-testid="analysis-result"]');
  private labResultsTable = () => this.page.locator('table').first();
  private alertsSection = () => this.page.locator('[data-testid="alerts-section"]').or(this.page.locator('.space-y-2').filter({ hasText: /Alertas Clínicos/i }));

  // Dr. Corvus Insights
  private insightsModal = () => this.page.getByRole('dialog').filter({ hasText: /Configurar Insights/i });
  private contextTextarea = () => this.page.getByLabel(/Contexto do Paciente/i);
  private specificQueryInput = () => this.page.getByLabel(/Pergunta Específica/i);
  private generateInsightsButton = () => this.page.getByRole('button', { name: /Gerar Insights/i });
  private insightsLoadingState = () => this.page.locator('.animate-pulse').filter({ hasText: /Dr. Corvus está analisando/i });
  private insightsResults = () => this.page.locator('[data-testid="insights-results"]').or(this.page.locator('.border-2.border-blue-900.rounded-lg'));

  // Error and success messages
  private errorAlert = () => this.page.locator('.border-red-500.text-red-700.bg-red-50');
  private successAlert = () => this.page.locator('.border-green-500.text-green-700.bg-green-50');

  // Methods
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }

  async expectToBeOnAnalysisPage() {
    await expect(this.page).toHaveURL(/.*\/analysis$/);
    await expect(this.pageTitle()).toBeVisible({ timeout: 10000 });
    await expect(this.pageDescription()).toBeVisible();
  }

  // Header and status verification
  async verifyPageHeader() {
    await expect(this.pageTitle()).toBeVisible();
    await expect(this.pageDescription()).toBeVisible();
    
    const statusIndicators = this.statusIndicators();
    await expect(statusIndicators.first()).toBeVisible();
    await expect(statusIndicators.nth(1)).toBeVisible();
    
    // Verify status messages
    await expect(this.page.getByText(/Sistema Ativo/i)).toBeVisible();
    await expect(this.page.getByText(/Análise Avançada com Insights/i)).toBeVisible();
  }

  // Input mode toggle
  async toggleManualInput() {
    const toggle = this.manualInputSwitch();
    await toggle.click();
    await this.page.waitForTimeout(500); // Wait for animation
  }

  async verifyFileUploadMode() {
    await expect(this.manualInputLabel()).toContainText(/Upload de Arquivo Ativo/i);
    await expect(this.modeDescription()).toContainText(/Faça upload de um arquivo PDF/i);
    await expect(this.fileUploadSection()).toBeVisible();
  }

  async verifyManualInputMode() {
    await expect(this.manualInputLabel()).toContainText(/Entrada Manual Ativa/i);
    await expect(this.modeDescription()).toContainText(/Insira os valores dos exames manualmente/i);
    await expect(this.patientIdInput()).toBeVisible();
    await expect(this.examDateInput()).toBeVisible();
  }

  // File upload workflow
  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.page.waitForLoadState('networkidle');
  }

  async verifyFileUploadSuccess(fileName?: string) {
    const successAlert = this.successAlert();
    await expect(successAlert).toBeVisible({ timeout: 15000 });
    
    if (fileName) {
      await expect(successAlert).toContainText(fileName);
    }
  }

  // Manual input workflow
  async fillPatientInformation(patientId?: string, examDate?: string) {
    if (patientId) {
      await this.patientIdInput().fill(patientId);
    }
    
    if (examDate) {
      await this.examDateInput().fill(examDate);
    }
  }

  async fillManualLabResult(category: string, testName: string, value: string) {
    // Find the category section
    const categorySection = this.page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: category });
    await expect(categorySection).toBeVisible();
    
    // Find the specific test input within that category
    const testInput = categorySection.locator('input').filter({ hasText: testName }).or(
      categorySection.getByLabel(testName)
    ).or(
      categorySection.locator(`input[placeholder*="${testName}"]`)
    );
    
    await testInput.fill(value);
  }

  async fillHematologyValues(values: { [key: string]: string }) {
    const hematologySection = this.page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Sistema Hematológico/i });
    
    for (const [testName, value] of Object.entries(values)) {
      const input = hematologySection.locator('input').filter({ hasText: testName }).or(
        hematologySection.getByLabel(new RegExp(testName, 'i'))
      ).first();
      
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  }

  async fillRenalValues(values: { [key: string]: string }) {
    const renalSection = this.page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Função Renal/i });
    
    for (const [testName, value] of Object.entries(values)) {
      const input = renalSection.locator('input').filter({ hasText: testName }).or(
        renalSection.getByLabel(new RegExp(testName, 'i'))
      ).first();
      
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  }

  async fillHepaticValues(values: { [key: string]: string }) {
    const hepaticSection = this.page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Função Hepática/i });
    
    for (const [testName, value] of Object.entries(values)) {
      const input = hepaticSection.locator('input').filter({ hasText: testName }).or(
        hepaticSection.getByLabel(new RegExp(testName, 'i'))
      ).first();
      
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  }

  async submitManualAnalysis() {
    await this.manualSubmitButton().click();
    
    // Wait for analysis to complete
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Additional wait for API processing
  }

  async verifyManualSubmissionLoading() {
    const submitButton = this.manualSubmitButton();
    await expect(submitButton).toContainText(/Analisando Dados/i);
    await expect(submitButton).toBeDisabled();
  }

  // Results verification
  async verifyAnalysisResults() {
    const resultsSection = this.resultsSection();
    await expect(resultsSection).toBeVisible({ timeout: 20000 });
    await expect(this.resultsTitle()).toBeVisible();
    await expect(this.copyReportButton()).toBeVisible();
  }

  async verifyLabResultsTable() {
    const table = this.labResultsTable();
    await expect(table).toBeVisible();
    
    // Check for table headers
    await expect(this.page.getByText(/Resumo dos Exames/i)).toBeVisible();
    
    // Verify table has content
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  }

  async verifyAlertsSection() {
    const alertsSection = this.alertsSection();
    
    if (await alertsSection.isVisible()) {
      await expect(this.page.getByText(/Alertas Clínicos/i)).toBeVisible();
      
      // Check for alert items
      const alertItems = alertsSection.locator('.border-amber-200.bg-amber-50');
      const alertCount = await alertItems.count();
      
      if (alertCount > 0) {
        console.log(`Found ${alertCount} clinical alerts`);
      }
    }
  }

  async getAnalysisResultsCount() {
    const results = this.analysisResults();
    return await results.count();
  }

  async getLabResultsCount() {
    const resultsText = await this.page.getByText(/\d+ resultado[s]?/).textContent();
    return resultsText ? parseInt(resultsText.match(/\d+/)?.[0] || '0') : 0;
  }

  // Dr. Corvus Insights workflow
  async openDrCorvusInsights() {
    const drCorvusButton = this.drCorvusButton();
    await expect(drCorvusButton).toBeVisible();
    await drCorvusButton.click();
    
    const modal = this.insightsModal();
    await expect(modal).toBeVisible({ timeout: 5000 });
  }

  async fillInsightsContext(context: string, specificQuery?: string) {
    const contextArea = this.contextTextarea();
    await contextArea.fill(context);
    
    if (specificQuery) {
      const queryInput = this.specificQueryInput();
      await queryInput.fill(specificQuery);
    }
  }

  async generateInsights() {
    const generateButton = this.generateInsightsButton();
    await generateButton.click();
    
    // Verify loading state
    const loadingState = this.insightsLoadingState();
    await expect(loadingState).toBeVisible({ timeout: 5000 });
    
    // Wait for insights to be generated
    await expect(loadingState).not.toBeVisible({ timeout: 30000 });
  }

  async verifyInsightsResults() {
    const insightsResults = this.insightsResults();
    await expect(insightsResults).toBeVisible({ timeout: 30000 });
    
    // Check for insights sections
    const clinicalSummary = this.page.getByText(/Resumo Clínico Objetivo/i);
    const detailedReasoning = this.page.getByText(/Raciocínio Clínico Detalhado/i);
    
    // At least one section should be present
    await expect(clinicalSummary.or(detailedReasoning)).toBeVisible();
  }

  // Error handling
  async verifyErrorMessage(expectedMessage?: string) {
    const errorAlert = this.errorAlert();
    await expect(errorAlert).toBeVisible();
    
    if (expectedMessage) {
      await expect(errorAlert).toContainText(expectedMessage);
    }
  }

  async verifySuccessMessage(expectedMessage?: string) {
    const successAlert = this.successAlert();
    await expect(successAlert).toBeVisible();
    
    if (expectedMessage) {
      await expect(successAlert).toContainText(expectedMessage);
    }
  }

  async dismissErrorMessage() {
    const dismissButton = this.errorAlert().locator('button');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await expect(this.errorAlert()).not.toBeVisible();
    }
  }

  // Utility methods
  async waitForAnalysisToComplete() {
    // Wait for loading states to disappear
    const loadingSpinner = this.page.locator('.animate-spin');
    if (await loadingSpinner.isVisible()) {
      await expect(loadingSpinner).not.toBeVisible({ timeout: 30000 });
    }
    
    // Wait for results or error to appear
    await this.page.waitForFunction(() => {
      const hasResults = document.querySelector('[data-testid="results-section"]') !== null;
      const hasError = document.querySelector('.border-red-500.text-red-700') !== null;
      return hasResults || hasError;
    }, { timeout: 30000 });
  }

  async copyAnalysisResults() {
    const copyButton = this.copyReportButton();
    await copyButton.click();
    
    // Wait for copy confirmation (toast or success message)
    await this.page.waitForTimeout(1000);
  }

  async verifyResponsiveLayout() {
    // Test mobile layout
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.pageTitle()).toBeVisible();
    await expect(this.manualInputSwitch()).toBeVisible();
    
    // Test tablet layout
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.pageTitle()).toBeVisible();
    
    // Test desktop layout
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await expect(this.pageTitle()).toBeVisible();
  }

  async verifyAccessibility() {
    // Check for proper heading structure
    const h1 = this.page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for form labels
    await this.toggleManualInput();
    const patientIdLabel = this.page.getByText(/ID do Paciente/i);
    const examDateLabel = this.page.getByText(/Data do Exame/i);
    
    await expect(patientIdLabel).toBeVisible();
    await expect(examDateLabel).toBeVisible();
    
    // Check for button accessibility
    const submitButton = this.manualSubmitButton();
    await expect(submitButton).toHaveAttribute('type', 'button');
  }

  async verifyKeyboardNavigation() {
    // Tab through main interactive elements
    await this.page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    return focusedElement;
  }

  // Test data methods
  async fillCompleteHematologyPanel() {
    await this.fillHematologyValues({
      'Hemoglobina': '14.5',
      'Leucócitos': '7500',
      'Plaquetas': '250000',
      'Hematócrito': '42'
    });
  }

  async fillAbnormalRenalValues() {
    await this.fillRenalValues({
      'Creatinina': '2.5', // Elevated
      'Ureia': '80', // Elevated
      'Ácido Úrico': '9.0' // Elevated
    });
  }

  async fillCriticalHepaticValues() {
    await this.fillHepaticValues({
      'TGO': '150', // Elevated
      'TGP': '200', // Elevated
      'Bilirrubina': '5.0' // Elevated
    });
  }

  async fillNormalBasicPanel() {
    await this.fillHematologyValues({
      'Hemoglobina': '14.0',
      'Leucócitos': '6000',
      'Plaquetas': '300000'
    });
    
    await this.fillRenalValues({
      'Creatinina': '1.0',
      'Ureia': '30'
    });
  }

  // Cleanup methods
  async clearAllInputs() {
    // Clear patient information
    await this.patientIdInput().fill('');
    await this.examDateInput().fill(new Date().toISOString().split('T')[0]);
    
    // Clear all manual input fields
    const allInputs = this.page.locator('.space-y-6 input[type="text"], .space-y-6 input[type="number"]');
    const inputCount = await allInputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill('');
      }
    }
  }

  async resetToFileUploadMode() {
    // If in manual mode, switch back to file upload
    if (await this.patientIdInput().isVisible()) {
      await this.toggleManualInput();
    }
    
    await this.verifyFileUploadMode();
  }
}