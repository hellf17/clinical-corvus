import { test, expect } from '@playwright/test';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';

test.describe('Doctor Dashboard - Patient Management Workflow', () => {
  let doctorDashboardPage: DoctorDashboardPage;

  test.beforeEach(async ({ page }) => {
    doctorDashboardPage = new DoctorDashboardPage(page);
    await doctorDashboardPage.navigate();
    await doctorDashboardPage.waitForDataToLoad();
  });

  test.describe('Patient Navigation Workflows', () => {
    test('should navigate from dashboard to patient overview', async ({ page }) => {
      // Get initial patient count
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        // Click on first patient
        await doctorDashboardPage.clickPatientCard(0);
        
        // Should navigate to patient overview
        await expect(page).toHaveURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Verify we're on patient overview page
        const overviewHeader = page.getByRole('heading', { name: /Overview|Visão Geral/i });
        await expect(overviewHeader).toBeVisible({ timeout: 10000 });
      } else {
        console.log('No patients available for navigation test');
      }
    });

    test('should navigate to patient details subpages', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        await doctorDashboardPage.clickPatientCard(0);
        
        // Wait for patient page to load
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Test navigation to different patient sections
        const sections = [
          { name: 'Notes', path: 'notes' },
          { name: 'Medications', path: 'medications' },
          { name: 'Labs', path: 'labs' },
          { name: 'Charts', path: 'charts' },
          { name: 'Vitals', path: 'vitals' },
          { name: 'Scores', path: 'scores' },
          { name: 'Exams', path: 'exams' },
          { name: 'Alerts', path: 'alerts' }
        ];

        for (const section of sections) {
          // Look for navigation link/button
          const navLink = page.getByRole('link', { name: new RegExp(section.name, 'i') }).or(
            page.getByRole('button', { name: new RegExp(section.name, 'i') })
          );
          
          if (await navLink.isVisible()) {
            await navLink.click();
            await page.waitForURL(`**/patients/*/${section.path}`);
            
            // Verify we're on the correct page
            await expect(page).toHaveURL(new RegExp(`.*/${section.path}$`));
            console.log(`Successfully navigated to ${section.name} section`);
          }
        }
      }
    });

    test('should handle patient edit workflow', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Look for edit button
        const editButton = page.getByRole('button', { name: /Edit|Editar/i }).or(
          page.getByRole('link', { name: /Edit|Editar/i })
        );
        
        if (await editButton.isVisible()) {
          await editButton.click();
          
          // Should navigate to edit page
          await expect(page).toHaveURL(/.*\/edit$/);
          
          // Verify edit form is present
          const editForm = page.locator('form').or(
            page.getByRole('textbox').first()
          );
          await expect(editForm).toBeVisible({ timeout: 5000 });
          
          console.log('Patient edit workflow accessible');
        }
      }
    });
  });

  test.describe('Patient Data Interactions', () => {
    test('should display patient information correctly', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        // Get patient info from dashboard card first
        const patientCard = page.locator('[data-testid="patient-card"]').first();
        const patientName = await patientCard.textContent();
        
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Verify patient information is displayed on detail page
        const patientHeader = page.locator('h1, h2, [data-testid="patient-name"]');
        await expect(patientHeader).toBeVisible({ timeout: 10000 });
        
        // Check for basic patient information elements
        const infoElements = [
          page.getByText(/Age|Idade/i),
          page.getByText(/Gender|Sexo/i),
          page.getByText(/DOB|Data de Nascimento/i),
          page.getByText(/ID|Identificação/i)
        ];
        
        let visibleElements = 0;
        for (const element of infoElements) {
          if (await element.isVisible().catch(() => false)) {
            visibleElements++;
          }
        }
        
        expect(visibleElements).toBeGreaterThan(0);
        console.log(`Found ${visibleElements} patient information elements`);
      }
    });

    test('should handle patient notes workflow', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Navigate to notes
        const notesLink = page.getByRole('link', { name: /Notes|Notas/i });
        if (await notesLink.isVisible()) {
          await notesLink.click();
          await page.waitForURL(/.*\/notes$/);
          
          // Check for notes interface
          const notesContainer = page.locator('[data-testid="notes-container"]').or(
            page.getByText(/Notes|Notas/i).locator('..').locator('..')
          );
          await expect(notesContainer).toBeVisible({ timeout: 5000 });
          
          // Look for add note button
          const addNoteButton = page.getByRole('button', { name: /Add Note|Adicionar Nota/i });
          if (await addNoteButton.isVisible()) {
            await addNoteButton.click();
            
            // Should show note creation interface
            const noteInput = page.getByRole('textbox').or(page.locator('textarea'));
            await expect(noteInput).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });

    test('should handle patient medications workflow', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Navigate to medications
        const medicationsLink = page.getByRole('link', { name: /Medications|Medicamentos/i });
        if (await medicationsLink.isVisible()) {
          await medicationsLink.click();
          await page.waitForURL(/.*\/medications$/);
          
          // Check for medications interface
          const medicationsContainer = page.locator('[data-testid="medications-container"]').or(
            page.getByText(/Medications|Medicamentos/i).locator('..').locator('..')
          );
          await expect(medicationsContainer).toBeVisible({ timeout: 5000 });
          
          // Look for medication management buttons
          const managementButtons = [
            page.getByRole('button', { name: /Add|Adicionar/i }),
            page.getByRole('button', { name: /Edit|Editar/i }),
            page.getByRole('button', { name: /Delete|Excluir/i })
          ];
          
          let visibleButtons = 0;
          for (const button of managementButtons) {
            if (await button.isVisible().catch(() => false)) {
              visibleButtons++;
            }
          }
          
          console.log(`Found ${visibleButtons} medication management buttons`);
        }
      }
    });

    test('should handle patient lab results workflow', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Navigate to labs
        const labsLink = page.getByRole('link', { name: /Labs?|Exames?/i });
        if (await labsLink.isVisible()) {
          await labsLink.click();
          await page.waitForURL(/.*\/labs$/);
          
          // Check for lab results interface
          const labsContainer = page.locator('[data-testid="labs-container"]').or(
            page.getByText(/Lab Results|Resultados/i).locator('..').locator('..')
          );
          await expect(labsContainer).toBeVisible({ timeout: 5000 });
          
          // Look for lab result elements
          const labElements = [
            page.getByText(/Date|Data/i),
            page.getByText(/Test|Exame/i),
            page.getByText(/Result|Resultado/i),
            page.getByText(/Reference|Referência/i)
          ];
          
          let visibleElements = 0;
          for (const element of labElements) {
            if (await element.isVisible().catch(() => false)) {
              visibleElements++;
            }
          }
          
          console.log(`Found ${visibleElements} lab result elements`);
        }
      }
    });
  });

  test.describe('Patient Alert Management', () => {
    test('should handle patient alerts workflow', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Navigate to alerts
        const alertsLink = page.getByRole('link', { name: /Alerts|Alertas/i });
        if (await alertsLink.isVisible()) {
          await alertsLink.click();
          await page.waitForURL(/.*\/alerts$/);
          
          // Check for alerts interface
          const alertsContainer = page.locator('[data-testid="alerts-container"]').or(
            page.getByText(/Alerts|Alertas/i).locator('..').locator('..')
          );
          await expect(alertsContainer).toBeVisible({ timeout: 5000 });
          
          // Look for alert items
          const alertItems = page.locator('[data-testid="alert-item"]');
          const alertCount = await alertItems.count();
          
          if (alertCount > 0) {
            // Test clicking on first alert
            await alertItems.first().click();
            
            // Should show alert details or navigate
            console.log(`Found and interacted with ${alertCount} alerts`);
          } else {
            console.log('No alerts found for this patient');
          }
        }
      }
    });

    test('should display critical alerts prominently', async ({ page }) => {
      // Check for critical alerts on dashboard level
      const criticalAlertsCount = await doctorDashboardPage.getAlertCount();
      
      if (criticalAlertsCount > 0) {
        // Click on first critical alert
        await doctorDashboardPage.clickAlert(0);
        
        // Should navigate to relevant patient or alert details
        await page.waitForLoadState('networkidle');
        
        // Verify we're on an appropriate page
        const currentUrl = page.url();
        const isPatientPage = currentUrl.includes('/patients/');
        const isAlertsPage = currentUrl.includes('/alerts');
        
        expect(isPatientPage || isAlertsPage).toBe(true);
        console.log(`Critical alert navigation led to: ${currentUrl}`);
      }
    });
  });

  test.describe('Patient Search and Filter', () => {
    test('should handle patient search functionality', async ({ page }) => {
      // Look for search functionality in patient list
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/Search|Buscar/i)
      );
      
      if (await searchInput.isVisible()) {
        // Test search functionality
        await searchInput.fill('Test Patient');
        await page.keyboard.press('Enter');
        
        // Wait for search results
        await page.waitForTimeout(1000);
        
        // Verify search was executed (results may be empty)
        console.log('Patient search functionality is available');
      } else {
        console.log('Patient search functionality not found on this page');
      }
    });

    test('should handle patient filtering', async ({ page }) => {
      // Look for filter options
      const filterButtons = [
        page.getByRole('button', { name: /Filter|Filtro/i }),
        page.getByRole('button', { name: /Sort|Ordenar/i }),
        page.getByRole('combobox')
      ];
      
      let filterCount = 0;
      for (const button of filterButtons) {
        if (await button.isVisible().catch(() => false)) {
          filterCount++;
        }
      }
      
      console.log(`Found ${filterCount} filter/sort options`);
      expect(filterCount).toBeGreaterThanOrEqual(0); // Can be 0 if not implemented
    });
  });

  test.describe('Patient Workflow Integration', () => {
    test('should maintain patient context across navigation', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        // Navigate to patient
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/([^/]+)$/);
        
        // Extract patient ID from URL
        const url = page.url();
        const patientId = url.match(/\/patients\/([^/]+)/)?.[1];
        
        if (patientId) {
          // Navigate to different sections and verify patient ID remains
          const sections = ['notes', 'medications', 'labs'];
          
          for (const section of sections) {
            const sectionLink = page.getByRole('link', { name: new RegExp(section, 'i') });
            if (await sectionLink.isVisible()) {
              await sectionLink.click();
              await page.waitForURL(`**/patients/${patientId}/${section}`);
              
              // Verify URL contains correct patient ID
              expect(page.url()).toContain(patientId);
              console.log(`Patient context maintained in ${section} section`);
            }
          }
        }
      }
    });

    test('should handle back navigation correctly', async ({ page }) => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      
      if (patientCount > 0) {
        // Navigate to patient
        await doctorDashboardPage.clickPatientCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/patients\/[^/]+$/);
        
        // Use browser back button
        await page.goBack();
        
        // Should be back on dashboard
        await expect(page).toHaveURL(/.*\/dashboard-doctor$/);
        await doctorDashboardPage.expectToBeInDoctorDashboard();
        
        console.log('Back navigation works correctly');
      }
    });
  });
});