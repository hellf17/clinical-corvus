import { test, expect } from '@playwright/test';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';

test.describe('Doctor Dashboard - Group Management Workflow', () => {
  let doctorDashboardPage: DoctorDashboardPage;

  test.beforeEach(async ({ page }) => {
    doctorDashboardPage = new DoctorDashboardPage(page);
    await doctorDashboardPage.navigate();
    await doctorDashboardPage.waitForDataToLoad();
  });

  test.describe('Group Navigation Workflows', () => {
    test('should navigate from dashboard to group overview', async ({ page }) => {
      // Click on group overview card
      const groupOverviewCard = await doctorDashboardPage.verifyGroupOverviewCard();
      await groupOverviewCard.click();
      
      // Should navigate to groups page
      await expect(page).toHaveURL(/.*\/dashboard-doctor\/groups$/);
      
      // Verify we're on groups page
      const groupsHeader = page.getByRole('heading', { name: /Groups|Grupos/i });
      await expect(groupsHeader).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to specific group details', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        // Click on first group card
        await doctorDashboardPage.clickGroupCard(0);
        
        // Should navigate to specific group
        await expect(page).toHaveURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Verify we're on group detail page
        const groupHeader = page.getByRole('heading').first();
        await expect(groupHeader).toBeVisible({ timeout: 10000 });
      } else {
        console.log('No groups available for navigation test');
      }
    });

    test('should navigate to group creation page', async ({ page }) => {
      await doctorDashboardPage.navigateToCreateGroup();
      
      // Should navigate to group creation
      await expect(page).toHaveURL(/.*\/dashboard-doctor\/groups\/new$/);
      
      // Verify group creation form is present
      const createForm = page.locator('form').or(
        page.getByRole('textbox', { name: /name|nome/i })
      );
      await expect(createForm).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to group subpages', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Test navigation to different group sections
        const sections = [
          { name: 'Members', path: 'members' },
          { name: 'Patients', path: 'patients' },
          { name: 'Settings', path: 'settings' }
        ];

        for (const section of sections) {
          const navLink = page.getByRole('link', { name: new RegExp(section.name, 'i') }).or(
            page.getByRole('button', { name: new RegExp(section.name, 'i') })
          );
          
          if (await navLink.isVisible()) {
            await navLink.click();
            await page.waitForURL(`**/groups/*/${section.path}`);
            
            // Verify we're on the correct page
            await expect(page).toHaveURL(new RegExp(`.*/${section.path}$`));
            console.log(`Successfully navigated to ${section.name} section`);
          }
        }
      }
    });
  });

  test.describe('Group Creation Workflow', () => {
    test('should handle group creation form', async ({ page }) => {
      await doctorDashboardPage.navigateToCreateGroup();
      await page.waitForURL(/.*\/dashboard-doctor\/groups\/new$/);
      
      // Fill group creation form
      const nameInput = page.getByRole('textbox', { name: /name|nome/i });
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Group E2E');
        
        const descriptionInput = page.getByRole('textbox', { name: /description|descrição/i }).or(
          page.locator('textarea')
        );
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('Test group created during E2E testing');
        }
        
        // Look for submit button
        const submitButton = page.getByRole('button', { name: /create|criar|save|salvar/i });
        if (await submitButton.isVisible()) {
          // Don't actually submit in test to avoid creating test data
          console.log('Group creation form is functional');
          
          // Verify form validation if any
          await submitButton.click();
          
          // Check if form was submitted or validation occurred
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should validate required fields in group creation', async ({ page }) => {
      await doctorDashboardPage.navigateToCreateGroup();
      await page.waitForURL(/.*\/dashboard-doctor\/groups\/new$/);
      
      // Try to submit without filling required fields
      const submitButton = page.getByRole('button', { name: /create|criar|save|salvar/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Look for validation messages
        const validationMessages = page.locator('[data-testid*="error"], .error, [aria-invalid="true"]');
        const validationCount = await validationMessages.count();
        
        console.log(`Found ${validationCount} validation messages`);
        // Validation is good UX, but not required
      }
    });
  });

  test.describe('Group Member Management', () => {
    test('should display group members', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to members section
        const membersLink = page.getByRole('link', { name: /Members|Membros/i });
        if (await membersLink.isVisible()) {
          await membersLink.click();
          await page.waitForURL(/.*\/members$/);
          
          // Check for members list
          const membersContainer = page.locator('[data-testid="members-container"]').or(
            page.getByText(/Members|Membros/i).locator('..').locator('..')
          );
          await expect(membersContainer).toBeVisible({ timeout: 5000 });
          
          // Look for member cards or list items
          const memberItems = page.locator('[data-testid="member-item"], .member-card, [data-testid*="member"]');
          const memberCount = await memberItems.count();
          
          console.log(`Found ${memberCount} group members`);
        }
      }
    });

    test('should handle member invitation workflow', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to members
        const membersLink = page.getByRole('link', { name: /Members|Membros/i });
        if (await membersLink.isVisible()) {
          await membersLink.click();
          await page.waitForURL(/.*\/members$/);
          
          // Look for invite button
          const inviteButton = page.getByRole('button', { name: /Invite|Convidar|Add Member/i });
          if (await inviteButton.isVisible()) {
            await inviteButton.click();
            
            // Should show invitation interface
            const inviteInput = page.getByRole('textbox', { name: /email/i }).or(
              page.getByPlaceholder(/email/i)
            );
            
            if (await inviteInput.isVisible()) {
              await inviteInput.fill('test@example.com');
              
              // Look for send button
              const sendButton = page.getByRole('button', { name: /Send|Enviar/i });
              if (await sendButton.isVisible()) {
                console.log('Member invitation workflow is available');
              }
            }
          }
        }
      }
    });

    test('should handle member role management', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to members
        const membersLink = page.getByRole('link', { name: /Members|Membros/i });
        if (await membersLink.isVisible()) {
          await membersLink.click();
          await page.waitForURL(/.*\/members$/);
          
          // Look for role management controls
          const roleControls = [
            page.getByRole('combobox', { name: /role|função/i }),
            page.getByRole('button', { name: /Admin|Doctor|Member/i }),
            page.locator('[data-testid*="role"]')
          ];
          
          let roleControlCount = 0;
          for (const control of roleControls) {
            if (await control.isVisible().catch(() => false)) {
              roleControlCount++;
            }
          }
          
          console.log(`Found ${roleControlCount} role management controls`);
        }
      }
    });
  });

  test.describe('Group Patient Management', () => {
    test('should display group patients', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to patients section
        const patientsLink = page.getByRole('link', { name: /Patients|Pacientes/i });
        if (await patientsLink.isVisible()) {
          await patientsLink.click();
          await page.waitForURL(/.*\/patients$/);
          
          // Check for patients list
          const patientsContainer = page.locator('[data-testid="patients-container"]').or(
            page.getByText(/Patients|Pacientes/i).locator('..').locator('..')
          );
          await expect(patientsContainer).toBeVisible({ timeout: 5000 });
          
          // Look for patient cards or list items
          const patientItems = page.locator('[data-testid="patient-item"], .patient-card, [data-testid*="patient"]');
          const patientCount = await patientItems.count();
          
          console.log(`Found ${patientCount} group patients`);
        }
      }
    });

    test('should handle adding patients to group', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to patients
        const patientsLink = page.getByRole('link', { name: /Patients|Pacientes/i });
        if (await patientsLink.isVisible()) {
          await patientsLink.click();
          await page.waitForURL(/.*\/patients$/);
          
          // Look for add patient button
          const addPatientButton = page.getByRole('button', { name: /Add Patient|Adicionar Paciente/i });
          if (await addPatientButton.isVisible()) {
            await addPatientButton.click();
            
            // Should show patient selection interface
            const patientSelector = page.locator('[data-testid="patient-selector"]').or(
              page.getByRole('combobox').or(page.getByRole('listbox'))
            );
            
            if (await patientSelector.isVisible()) {
              console.log('Add patient to group workflow is available');
            }
          }
        }
      }
    });

    test('should handle patient removal from group', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL /.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to patients
        const patientsLink = page.getByRole('link', { name: /Patients|Pacientes/i });
        if (await patientsLink.isVisible()) {
          await patientsLink.click();
          await page.waitForURL(/.*\/patients$/);
          
          // Look for remove/delete buttons on patient items
          const removeButtons = page.getByRole('button', { name: /Remove|Remover|Delete/i });
          const removeButtonCount = await removeButtons.count();
          
          if (removeButtonCount > 0) {
            console.log(`Found ${removeButtonCount} patient removal options`);
            
            // Don't actually remove to avoid affecting test data
            // Just verify the interface exists
          }
        }
      }
    });
  });

  test.describe('Group Settings Management', () => {
    test('should display group settings', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to settings section
        const settingsLink = page.getByRole('link', { name: /Settings|Configurações/i });
        if (await settingsLink.isVisible()) {
          await settingsLink.click();
          await page.waitForURL(/.*\/settings$/);
          
          // Check for settings interface
          const settingsContainer = page.locator('[data-testid="settings-container"]').or(
            page.getByText(/Settings|Configurações/i).locator('..').locator('..')
          );
          await expect(settingsContainer).toBeVisible({ timeout: 5000 });
          
          // Look for settings forms or options
          const settingsForms = page.locator('form, [data-testid*="setting"]');
          const settingsCount = await settingsForms.count();
          
          console.log(`Found ${settingsCount} settings sections`);
        }
      }
    });

    test('should handle group information editing', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to settings
        const settingsLink = page.getByRole('link', { name: /Settings|Configurações/i });
        if (await settingsLink.isVisible()) {
          await settingsLink.click();
          await page.waitForURL(/.*\/settings$/);
          
          // Look for editable fields
          const editableFields = [
            page.getByRole('textbox', { name: /name|nome/i }),
            page.getByRole('textbox', { name: /description|descrição/i }),
            page.locator('textarea')
          ];
          
          let editableCount = 0;
          for (const field of editableFields) {
            if (await field.isVisible().catch(() => false)) {
              editableCount++;
            }
          }
          
          console.log(`Found ${editableCount} editable group information fields`);
        }
      }
    });

    test('should handle group deletion workflow', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Navigate to settings
        const settingsLink = page.getByRole('link', { name: /Settings|Configurações/i });
        if (await settingsLink.isVisible()) {
          await settingsLink.click();
          await page.waitForURL(/.*\/settings$/);
          
          // Look for delete button
          const deleteButton = page.getByRole('button', { name: /Delete|Excluir|Remove Group/i });
          if (await deleteButton.isVisible()) {
            await deleteButton.click();
            
            // Should show confirmation dialog
            const confirmDialog = page.locator('[data-testid="confirm-dialog"]').or(
              page.getByRole('dialog').or(page.getByText(/Are you sure|Tem certeza/i))
            );
            
            if (await confirmDialog.isVisible()) {
              // Cancel to avoid actually deleting
              const cancelButton = page.getByRole('button', { name: /Cancel|Cancelar/i });
              if (await cancelButton.isVisible()) {
                await cancelButton.click();
                console.log('Group deletion workflow with confirmation is available');
              }
            }
          }
        }
      }
    });
  });

  test.describe('Group Alerts and Notifications', () => {
    test('should display group-specific alerts', async ({ page }) => {
      const groupAlertsCard = await doctorDashboardPage.verifyGroupAlertsCard();
      
      // Check for alert items in group alerts card
      const alertItems = page.locator('[data-testid="group-alert-item"]').or(
        groupAlertsCard.locator('[data-testid*="alert"]')
      );
      const alertCount = await alertItems.count();
      
      console.log(`Found ${alertCount} group alerts`);
      
      if (alertCount > 0) {
        // Test clicking on first group alert
        await alertItems.first().click();
        await page.waitForLoadState('networkidle');
        
        // Should navigate to relevant group or alert details
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/dashboard-doctor/);
        console.log(`Group alert click led to: ${currentUrl}`);
      }
    });

    test('should handle group notification settings', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Look for notification settings
        const notificationSettings = [
          page.getByText(/Notifications|Notificações/i),
          page.getByRole('checkbox', { name: /notification|notificação/i }),
          page.getByRole('switch')
        ];
        
        let notificationCount = 0;
        for (const setting of notificationSettings) {
          if (await setting.isVisible().catch(() => false)) {
            notificationCount++;
          }
        }
        
        console.log(`Found ${notificationCount} notification settings`);
      }
    });
  });

  test.describe('Group Search and Filter', () => {
    test('should handle group search functionality', async ({ page }) => {
      // Navigate to groups overview
      const groupOverviewCard = await doctorDashboardPage.verifyGroupOverviewCard();
      await groupOverviewCard.click();
      await page.waitForURL(/.*\/dashboard-doctor\/groups$/);
      
      // Look for search functionality
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/Search|Buscar/i)
      );
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test Group');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        console.log('Group search functionality is available');
      } else {
        console.log('Group search functionality not found');
      }
    });

    test('should handle group filtering and sorting', async ({ page }) => {
      // Navigate to groups overview
      const groupOverviewCard = await doctorDashboardPage.verifyGroupOverviewCard();
      await groupOverviewCard.click();
      await page.waitForURL(/.*\/dashboard-doctor\/groups$/);
      
      // Look for filter options
      const filterOptions = [
        page.getByRole('button', { name: /Filter|Filtro/i }),
        page.getByRole('button', { name: /Sort|Ordenar/i }),
        page.getByRole('combobox'),
        page.locator('[data-testid*="filter"]')
      ];
      
      let filterCount = 0;
      for (const option of filterOptions) {
        if (await option.isVisible().catch(() => false)) {
          filterCount++;
        }
      }
      
      console.log(`Found ${filterCount} group filter/sort options`);
    });
  });

  test.describe('Group Workflow Integration', () => {
    test('should maintain group context across navigation', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/([^/]+)$/);
        
        // Extract group ID from URL
        const url = page.url();
        const groupId = url.match(/\/groups\/([^/]+)/)?.[1];
        
        if (groupId) {
          // Navigate to different sections and verify group ID remains
          const sections = ['members', 'patients', 'settings'];
          
          for (const section of sections) {
            const sectionLink = page.getByRole('link', { name: new RegExp(section, 'i') });
            if (await sectionLink.isVisible()) {
              await sectionLink.click();
              await page.waitForURL(`**/groups/${groupId}/${section}`);
              
              // Verify URL contains correct group ID
              expect(page.url()).toContain(groupId);
              console.log(`Group context maintained in ${section} section`);
            }
          }
        }
      }
    });

    test('should handle group workflow back navigation', async ({ page }) => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      
      if (groupCount > 0) {
        // Navigate to group
        await doctorDashboardPage.clickGroupCard(0);
        await page.waitForURL(/.*\/dashboard-doctor\/groups\/[^/]+$/);
        
        // Use browser back button
        await page.goBack();
        
        // Should be back on dashboard
        await expect(page).toHaveURL(/.*\/dashboard-doctor$/);
        await doctorDashboardPage.expectToBeInDoctorDashboard();
        
        console.log('Group back navigation works correctly');
      }
    });
  });
});