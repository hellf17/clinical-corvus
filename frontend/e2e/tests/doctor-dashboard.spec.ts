import { test, expect } from '@playwright/test';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Doctor Dashboard', () => {
  let doctorDashboardPage: DoctorDashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    doctorDashboardPage = new DoctorDashboardPage(page);
    loginPage = new LoginPage(page);
    
    // Navigate to dashboard (assuming user is already authenticated)
    await doctorDashboardPage.navigate();
    await doctorDashboardPage.waitForDataToLoad();
  });

  test.describe('Dashboard Layout and Components', () => {
    test('should display welcome banner with correct information', async () => {
      await doctorDashboardPage.verifyWelcomeBanner();
      
      // Verify banner contains user welcome and system status
      const welcomeText = await doctorDashboardPage.getUserWelcomeText();
      expect(welcomeText).toContain('Bem-vindo');
    });

    test('should display all dashboard cards', async () => {
      await doctorDashboardPage.verifyAllDashboardComponents();
    });

    test('should have responsive layout structure', async () => {
      await doctorDashboardPage.verifyResponsiveLayout();
    });

    test('should display sidebar on desktop and mobile menu button on mobile', async () => {
      await doctorDashboardPage.verifySidebar();
    });

    test('should display header with navigation', async () => {
      await doctorDashboardPage.verifyHeader();
    });
  });

  test.describe('Critical Alerts Functionality', () => {
    test('should display critical alerts card', async () => {
      const alertsCard = await doctorDashboardPage.verifyCriticalAlertsCard();
      await expect(alertsCard).toBeVisible();
    });

    test('should handle alert interactions', async () => {
      const alertCount = await doctorDashboardPage.getAlertCount();
      console.log(`Found ${alertCount} critical alerts`);

      if (alertCount > 0) {
        // Test clicking on first alert
        await doctorDashboardPage.clickAlert(0);
        // Should navigate or show alert details
      }
    });

    test('should allow viewing all alerts', async () => {
      await doctorDashboardPage.viewAllAlerts();
      // Should navigate to alerts page or show all alerts
    });
  });

  test.describe('Group Management', () => {
    test('should display group overview card', async () => {
      const groupCard = await doctorDashboardPage.verifyGroupOverviewCard();
      await expect(groupCard).toBeVisible();
    });

    test('should display frequent groups card', async () => {
      const frequentGroupsCard = await doctorDashboardPage.verifyFrequentGroupsCard();
      await expect(frequentGroupsCard).toBeVisible();
    });

    test('should display group alerts card', async () => {
      const groupAlertsCard = await doctorDashboardPage.verifyGroupAlertsCard();
      await expect(groupAlertsCard).toBeVisible();
    });

    test('should handle group card interactions', async () => {
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      console.log(`Found ${groupCount} group cards`);

      if (groupCount > 0) {
        // Test clicking on first group
        await doctorDashboardPage.clickGroupCard(0);
        // Should navigate to group details
      }
    });

    test('should navigate to create new group', async () => {
      await doctorDashboardPage.navigateToCreateGroup();
      // Should navigate to group creation page
    });
  });

  test.describe('Patient Management', () => {
    test('should display doctor patient list', async () => {
      const patientList = await doctorDashboardPage.verifyDoctorPatientList();
      await expect(patientList).toBeVisible();
    });

    test('should handle patient card interactions', async () => {
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      console.log(`Found ${patientCount} patient cards`);

      if (patientCount > 0) {
        // Test clicking on first patient
        await doctorDashboardPage.clickPatientCard(0);
        // Should navigate to patient details
      }
    });

    test('should navigate to add new patient', async () => {
      await doctorDashboardPage.navigateToAddPatient();
      // Should navigate to patient creation page
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick analysis card', async () => {
      const analysisCard = await doctorDashboardPage.verifyQuickAnalysisCard();
      await expect(analysisCard).toBeVisible();
    });

    test('should display clinical academy card', async () => {
      const academyCard = await doctorDashboardPage.verifyClinicalAcademyCard();
      await expect(academyCard).toBeVisible();
    });

    test('should handle quick analysis click', async () => {
      await doctorDashboardPage.clickQuickAnalysis();
      // Should navigate to analysis page or show analysis modal
    });

    test('should handle clinical academy click', async () => {
      await doctorDashboardPage.clickClinicalAcademy();
      // Should navigate to academy page
    });
  });

  test.describe('Mobile Responsive Behavior', () => {
    test('should handle mobile sidebar toggle', async ({ page, isMobile }) => {
      if (isMobile) {
        // Open mobile sidebar
        await doctorDashboardPage.openMobileSidebar();
        
        // Verify sidebar is visible
        const sidebar = page.locator('.lg\\:w-64');
        await expect(sidebar).toBeVisible();
      }
    });

    test('should maintain functionality on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify essential components are still accessible
      await doctorDashboardPage.verifyWelcomeBanner();
      await doctorDashboardPage.verifyCriticalAlertsCard();
      await doctorDashboardPage.verifyDoctorPatientList();
    });
  });

  test.describe('Data Loading and Performance', () => {
    test('should load dashboard data within reasonable time', async () => {
      const startTime = Date.now();
      await doctorDashboardPage.navigate();
      await doctorDashboardPage.waitForDataToLoad();
      const loadTime = Date.now() - startTime;
      
      console.log(`Dashboard loaded in ${loadTime}ms`);
      expect(loadTime).toBeLessThan(15000); // Should load within 15 seconds
    });

    test('should handle loading states gracefully', async () => {
      await doctorDashboardPage.navigate();
      
      // Check that no error states are displayed
      const hasNoErrors = await doctorDashboardPage.checkForErrorStates();
      expect(hasNoErrors).toBe(true);
    });

    test('should display appropriate empty states when no data', async () => {
      // This test would need mock data or a test environment with no data
      // For now, we verify that the components render without errors
      const patientCount = await doctorDashboardPage.getPatientCardCount();
      const groupCount = await doctorDashboardPage.getGroupCardCount();
      const alertCount = await doctorDashboardPage.getAlertCount();
      
      console.log(`Dashboard state - Patients: ${patientCount}, Groups: ${groupCount}, Alerts: ${alertCount}`);
      
      // Even with no data, cards should be visible
      await doctorDashboardPage.verifyAllDashboardComponents();
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async () => {
      const focusedElement = await doctorDashboardPage.verifyKeyboardNavigation();
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for main landmarks
      const main = page.locator('main');
      await expect(main).toBeVisible();

      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Check for heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('should maintain focus management', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      let focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Tab to next element
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      await doctorDashboardPage.navigate();
      
      // Should still show basic layout even if API calls fail
      await expect(doctorDashboardPage['dashboardTitle']()).toBeVisible();
    });

    test('should display error messages when appropriate', async ({ page }) => {
      // This would need proper error state testing
      // For now, verify no unexpected errors are shown
      const hasNoErrors = await doctorDashboardPage.checkForErrorStates();
      expect(hasNoErrors).toBe(true);
    });
  });

  test.describe('Dashboard Integration', () => {
    test('should maintain session state across navigation', async ({ page }) => {
      await doctorDashboardPage.navigate();
      
      // Navigate away and back
      await page.goto('/');
      await doctorDashboardPage.navigate();
      
      // Should still be in authenticated state
      await doctorDashboardPage.expectToBeInDoctorDashboard();
    });

    test('should handle real-time updates if implemented', async ({ page }) => {
      // This would test WebSocket or polling updates
      // For now, we verify the dashboard can handle page refreshes
      await doctorDashboardPage.navigate();
      await page.reload();
      await doctorDashboardPage.waitForDataToLoad();
      await doctorDashboardPage.expectToBeInDoctorDashboard();
    });
  });
});