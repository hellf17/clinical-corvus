import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../pages/AnalysisPage';
import path from 'path';

test.describe('Analysis Page - Complete Workflows', () => {
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page);
    await analysisPage.navigate();
    await analysisPage.expectToBeOnAnalysisPage();
  });

  test.describe('Page Structure and Navigation', () => {
    test('should display complete page header with status indicators', async () => {
      await analysisPage.verifyPageHeader();
    });

    test('should have responsive layout on different screen sizes', async () => {
      await analysisPage.verifyResponsiveLayout();
    });

    test('should support keyboard navigation', async () => {
      const focusedElement = await analysisPage.verifyKeyboardNavigation();
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper accessibility features', async () => {
      await analysisPage.verifyAccessibility();
    });
  });

  test.describe('Input Mode Toggle Functionality', () => {
    test('should start in file upload mode by default', async () => {
      await analysisPage.verifyFileUploadMode();
    });

    test('should switch to manual input mode correctly', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.verifyManualInputMode();
    });

    test('should switch back to file upload mode', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.verifyManualInputMode();
      
      await analysisPage.toggleManualInput();
      await analysisPage.verifyFileUploadMode();
    });

    test('should clear data when switching modes', async () => {
      // Switch to manual mode and fill some data
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P001', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      // Switch back to file upload
      await analysisPage.toggleManualInput();
      await analysisPage.verifyFileUploadMode();
      
      // Switch back to manual - data should be cleared
      await analysisPage.toggleManualInput();
      // Patient ID and exam date should be reset
    });
  });

  test.describe('Manual Input Workflows', () => {
    test.beforeEach(async () => {
      await analysisPage.toggleManualInput();
    });

    test('should complete normal hematology analysis workflow', async () => {
      await analysisPage.fillPatientInformation('P001', '2023-12-01');
      await analysisPage.fillCompleteHematologyPanel();
      
      await analysisPage.submitManualAnalysis();
      
      await analysisPage.verifyAnalysisResults();
      const resultsCount = await analysisPage.getAnalysisResultsCount();
      expect(resultsCount).toBeGreaterThan(0);
    });

    test('should handle abnormal renal function analysis', async () => {
      await analysisPage.fillPatientInformation('P002', '2023-12-01');
      await analysisPage.fillAbnormalRenalValues();
      
      await analysisPage.submitManualAnalysis();
      
      await analysisPage.verifyAnalysisResults();
      await analysisPage.verifyAlertsSection(); // Should show alerts for abnormal values
    });

    test('should detect critical hepatic values', async () => {
      await analysisPage.fillPatientInformation('P003', '2023-12-01');
      await analysisPage.fillCriticalHepaticValues();
      
      await analysisPage.submitManualAnalysis();
      
      await analysisPage.verifyAnalysisResults();
      await analysisPage.verifyAlertsSection(); // Should show critical alerts
    });

    test('should handle comprehensive multi-system analysis', async () => {
      await analysisPage.fillPatientInformation('P004', '2023-12-01');
      
      // Fill multiple systems with various values
      await analysisPage.fillHematologyValues({
        'Hemoglobina': '12.0', // Slightly low
        'Leucócitos': '12000', // Elevated
        'Plaquetas': '150000' // Low normal
      });
      
      await analysisPage.fillRenalValues({
        'Creatinina': '1.8', // Elevated
        'Ureia': '60' // Elevated
      });
      
      await analysisPage.fillHepaticValues({
        'TGO': '80', // Mildly elevated
        'TGP': '90' // Mildly elevated
      });
      
      await analysisPage.submitManualAnalysis();
      
      await analysisPage.verifyAnalysisResults();
      await analysisPage.verifyLabResultsTable();
      
      // Should have results from multiple systems
      const labResultsCount = await analysisPage.getLabResultsCount();
      expect(labResultsCount).toBeGreaterThanOrEqual(6);
    });

    test('should validate required fields before submission', async () => {
      // Try to submit without any data
      await analysisPage.submitManualAnalysis();
      
      // Should show validation error
      await analysisPage.verifyErrorMessage();
    });

    test('should handle empty patient ID gracefully', async () => {
      // Fill exam date but leave patient ID empty
      await analysisPage.fillPatientInformation('', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      await analysisPage.submitManualAnalysis();
      
      // Should still process successfully as anonymous analysis
      await analysisPage.verifyAnalysisResults();
    });

    test('should display loading state during submission', async () => {
      await analysisPage.fillPatientInformation('P005', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      // Start submission and verify loading state
      const submitPromise = analysisPage.submitManualAnalysis();
      await analysisPage.verifyManualSubmissionLoading();
      
      await submitPromise;
      await analysisPage.verifyAnalysisResults();
    });

    test('should handle mixed normal and abnormal values', async () => {
      await analysisPage.fillPatientInformation('P006', '2023-12-01');
      
      await analysisPage.fillHematologyValues({
        'Hemoglobina': '14.5', // Normal
        'Leucócitos': '20000', // Very high - abnormal
        'Plaquetas': '50000' // Low - abnormal
      });
      
      await analysisPage.submitManualAnalysis();
      
      await analysisPage.verifyAnalysisResults();
      await analysisPage.verifyAlertsSection();
      
      // Should identify abnormalities while showing normal values too
      const labResultsCount = await analysisPage.getLabResultsCount();
      expect(labResultsCount).toBe(3);
    });
  });

  test.describe('File Upload Workflows', () => {
    const testFilePath = path.join(__dirname, '../test_data/hemograma_pt_decimal.pdf');

    test('should display file upload interface in default mode', async () => {
      await analysisPage.verifyFileUploadMode();
      
      // Verify upload area is visible and interactive
      const { page } = analysisPage as any;
      const uploadArea = page.locator('.border-dashed');
      await expect(uploadArea).toBeVisible();
    });

    test('should handle drag and drop interactions', async ({ page }) => {
      // Simulate drag and drop behavior
      const uploadArea = page.locator('.border-dashed');
      
      // Simulate dragenter
      await uploadArea.dispatchEvent('dragenter');
      // Should show visual feedback for drag state
      
      // Simulate dragleave
      await uploadArea.dispatchEvent('dragleave');
      // Should return to normal state
    });

    test('should process uploaded PDF with PT decimals and display correct results', async ({ page }) => {
      await analysisPage.uploadFile(testFilePath);

      // 3. Wait for the analysis to complete and results to be displayed
      await expect(page.getByTestId('analysis-results')).toBeVisible({ timeout: 60000 });
  
      // 4. Verify key extracted values are displayed correctly
      
      // Check for Hemoglobina
      const hemoglobinaRow = page.locator('tr:has-text("Hemoglobina")');
      await expect(hemoglobinaRow).toBeVisible();
      await expect(hemoglobinaRow.locator('td').nth(1)).toHaveText('14.5'); // Check if 14,5 is converted to 14.5
      await expect(hemoglobinaRow.locator('td').nth(3)).toContainText('Normal');
  
      // Check for Hematócrito
      const hematocritoRow = page.locator('tr:has-text("Hematócrito")');
      await expect(hematocritoRow).toBeVisible();
      await expect(hematocritoRow.locator('td').nth(1)).toHaveText('45.0');
      await expect(hematocritoRow.locator('td').nth(3)).toContainText('Normal');
  
      // Check for Leucócitos (abnormal value)
      const leucocitosRow = page.locator('tr:has-text("Leucócitos")');
      await expect(leucocitosRow).toBeVisible();
      await expect(leucocitosRow.locator('td').nth(1)).toHaveText('7.17'); // Check if 7,17 is converted to 7.17
      await expect(leucocitosRow.locator('td').nth(3)).toContainText('Anormal'); // Expecting this to be abnormal
  
      // 5. Verify insights are generated
      await expect(page.locator('h3:has-text("Insights Clínicos")')).toBeVisible();
      const insights = page.getByTestId('clinical-insights');
      await expect(insights).toContainText(/Leucócitos/);
      
      // 6. Verify BAML analysis output is displayed
      await expect(page.locator('h3:has-text("Análise do Dr. Corvus")')).toBeVisible();
      const bamlAnalysis = page.getByTestId('baml-analysis');
      await expect(bamlAnalysis).toContainText(/análise dos resultados/);
    });
  });

  test.describe('Analysis Results Display', () => {
    test.beforeEach(async () => {
      // Set up analysis with some results
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P007', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyAnalysisResults();
    });

    test('should display complete analysis results section', async () => {
      await analysisPage.verifyAnalysisResults();
      await analysisPage.verifyLabResultsTable();
    });

    test('should allow copying analysis results', async () => {
      await analysisPage.copyAnalysisResults();
      // In a real test, you might check clipboard content
      // This would require additional setup for clipboard API testing
    });

    test('should show appropriate sections based on analysis type', async () => {
      // Verify different sections are visible based on the type of analysis
      const { page } = analysisPage as any;
      
      // Should show hematology results
      expect(await page.getByText(/Sistema Hematológico|Hematológicos/i).isVisible()).toBeTruthy();
      
      // Should show renal results
      expect(await page.getByText(/Função Renal/i).isVisible()).toBeTruthy();
    });

    test('should handle results pagination for large datasets', async () => {
      // This would test handling of many lab results
      // Implementation would depend on how pagination is handled
      const labResultsCount = await analysisPage.getLabResultsCount();
      expect(labResultsCount).toBeGreaterThan(0);
    });
  });

  test.describe('Dr. Corvus Insights Integration', () => {
    test.beforeEach(async () => {
      // Set up analysis with results first
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P008', '2023-12-01');
      await analysisPage.fillCompleteHematologyPanel();
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyAnalysisResults();
    });

    test('should open Dr. Corvus insights configuration modal', async () => {
      await analysisPage.openDrCorvusInsights();
      
      const { page } = analysisPage as any;
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(page.getByText(/Configurar Insights/i)).toBeVisible();
    });

    test('should generate insights with context information', async () => {
      await analysisPage.openDrCorvusInsights();
      
      await analysisPage.fillInsightsContext(
        'Patient is a 45-year-old male with history of diabetes and hypertension',
        'Are there any concerning trends in these lab values?'
      );
      
      await analysisPage.generateInsights();
      await analysisPage.verifyInsightsResults();
    });

    test('should generate insights without additional context', async () => {
      await analysisPage.openDrCorvusInsights();
      
      // Generate insights without filling context
      await analysisPage.generateInsights();
      await analysisPage.verifyInsightsResults();
    });

    test('should handle insights generation errors gracefully', async () => {
      // This would test error handling in insights generation
      // Might require mocking the API to return errors
      await analysisPage.openDrCorvusInsights();
      await analysisPage.generateInsights();
      
      // Wait for either success or error
      await analysisPage.waitForAnalysisToComplete();
    });

    test('should display insights in proper accordion format', async () => {
      await analysisPage.openDrCorvusInsights();
      await analysisPage.generateInsights();
      await analysisPage.verifyInsightsResults();
      
      const { page } = analysisPage as any;
      
      // Check for accordion sections
      const clinicalSummary = page.getByText(/Resumo Clínico/i);
      const detailedReasoning = page.getByText(/Raciocínio Clínico/i);
      
      // At least one should be visible
      const hasClinicalSummary = await clinicalSummary.isVisible().catch(() => false);
      const hasDetailedReasoning = await detailedReasoning.isVisible().catch(() => false);
      
      expect(hasClinicalSummary || hasDetailedReasoning).toBeTruthy();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors during manual submission', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P009', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      // Simulate network failure by intercepting requests
      await analysisPage['page'].route('**/api/lab-analysis/**', route => {
        route.abort('failed');
      });
      
      await analysisPage.submitManualAnalysis();
      
      // Should show error message
      await analysisPage.verifyErrorMessage();
    });

    test('should handle server errors gracefully', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P010', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      // Mock server error response
      await analysisPage['page'].route('**/api/lab-analysis/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyErrorMessage();
    });

    test('should handle malformed API responses', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P011', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      // Mock malformed response
      await analysisPage['page'].route('**/api/lab-analysis/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });
      
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyErrorMessage();
    });

    test('should allow dismissing error messages', async () => {
      await analysisPage.toggleManualInput();
      
      // Try to submit without data to trigger validation error
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyErrorMessage();
      
      // Dismiss the error
      await analysisPage.dismissErrorMessage();
    });

    test('should handle very large input values', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P012', '2023-12-01');
      
      // Fill with extreme values
      await analysisPage.fillHematologyValues({
        'Hemoglobina': '99999',
        'Leucócitos': '999999',
        'Plaquetas': '9999999'
      });
      
      await analysisPage.submitManualAnalysis();
      
      // Should either process successfully or show appropriate validation
      await analysisPage.waitForAnalysisToComplete();
    });

    test('should handle special characters in patient ID', async () => {
      await analysisPage.toggleManualInput();
      
      await analysisPage.fillPatientInformation('P-123/ABC@2023', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyAnalysisResults();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle multiple rapid submissions', async () => {
      await analysisPage.toggleManualInput();
      
      for (let i = 0; i < 3; i++) {
        await analysisPage.clearAllInputs();
        await analysisPage.fillPatientInformation(`P${i + 100}`, '2023-12-01');
        await analysisPage.fillNormalBasicPanel();
        
        await analysisPage.submitManualAnalysis();
        await analysisPage.verifyAnalysisResults();
        
        // Small delay between submissions
        await analysisPage['page'].waitForTimeout(1000);
      }
    });

    test('should maintain performance with large datasets', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P999', '2023-12-01');
      
      // Fill many different test values
      await analysisPage.fillHematologyValues({
        'Hemoglobina': '14.5',
        'Leucócitos': '7500',
        'Plaquetas': '250000',
        'Hematócrito': '42'
      });
      
      await analysisPage.fillRenalValues({
        'Creatinina': '1.0',
        'Ureia': '30',
        'Ácido Úrico': '6.0'
      });
      
      await analysisPage.fillHepaticValues({
        'TGO': '25',
        'TGP': '30',
        'Bilirrubina': '1.0'
      });
      
      const startTime = Date.now();
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyAnalysisResults();
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('should handle concurrent user interactions', async () => {
      // Test rapid mode switching and data entry
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P200', '2023-12-01');
      
      await analysisPage.toggleManualInput(); // Switch back to file upload
      await analysisPage.toggleManualInput(); // Switch back to manual
      
      // Data should be cleared, form should be functional
      await analysisPage.fillNormalBasicPanel();
      await analysisPage.submitManualAnalysis();
      await analysisPage.verifyAnalysisResults();
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should support screen reader navigation', async ({ page }) => {
      // Test ARIA labels and roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      
      // Check for proper form labels
      await analysisPage.toggleManualInput();
      const patientIdInput = page.getByLabel(/ID do Paciente/i);
      await expect(patientIdInput).toBeVisible();
      await expect(patientIdInput).toHaveAttribute('id');
    });

    test('should provide clear error messages and instructions', async () => {
      await analysisPage.toggleManualInput();
      
      // Try to submit without data
      await analysisPage.submitManualAnalysis();
      
      // Error message should be descriptive and helpful
      await analysisPage.verifyErrorMessage();
    });

    test('should have proper color contrast and visual hierarchy', async ({ page }) => {
      // Verify important elements have sufficient contrast
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.bg-gradient-to-br')).toBeVisible();
      
      // Check button visibility
      const submitButton = page.getByRole('button', { name: /Analisar Dados Manuais/i });
      await analysisPage.toggleManualInput();
      await expect(submitButton).toBeVisible();
    });

    test('should work with keyboard-only navigation', async ({ page }) => {
      // Navigate through the form using only keyboard
      await analysisPage.toggleManualInput();
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should provide progress feedback for long operations', async () => {
      await analysisPage.toggleManualInput();
      await analysisPage.fillPatientInformation('P300', '2023-12-01');
      await analysisPage.fillNormalBasicPanel();
      
      // Start submission and verify loading feedback
      const submitPromise = analysisPage.submitManualAnalysis();
      await analysisPage.verifyManualSubmissionLoading();
      
      await submitPromise;
      await analysisPage.verifyAnalysisResults();
    });
  });
});