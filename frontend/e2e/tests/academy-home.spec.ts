
import { test, expect } from '@playwright/test';

test.describe('Academy Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the academy home page before each test
    await page.goto('/academy');
  });

  test('should load the page and display the main heading', async ({ page }) => {
    // Check for the main heading
    const heading = page.locator('h1:has-text("Academia Clínica Dr. Corvus")');
    await expect(heading).toBeVisible();

    // Check for the welcome message (assuming a user is logged in)
    const welcomeMessage = page.locator('p:has-text("Bem-vindo\(a\) de volta à Academia")');
    await expect(welcomeMessage).toBeVisible();
  });

  test('should display all academy module cards', async ({ page }) => {
    // Check for the presence of a few key modules to confirm they are rendered
    await expect(page.locator('h3:has-text("Raciocínio Diagnóstico Fundamental")')).toBeVisible();
    await expect(page.locator('h3:has-text("Simulação Clínica Integrada")')).toBeVisible();
    await expect(page.locator('h3:has-text("Interpretação Avançada de Exames Laboratoriais")')).toBeVisible();
    
    // Check the total number of modules rendered
    const moduleCards = page.locator('.module-card-class'); // Note: A specific class selector is needed here
    // await expect(moduleCards).toHaveCount(7); // This requires a specific class on the card component
  });

  test('should navigate to the correct page when an active module is clicked', async ({ page }) => {
    // Click on the "Raciocínio Diagnóstico Fundamental" module
    await page.click('h3:has-text("Raciocínio Diagnóstico Fundamental")');

    // Wait for navigation and check the URL
    await page.waitForURL('/academy/fundamental-diagnostic-reasoning');
    await expect(page).toHaveURL('/academy/fundamental-diagnostic-reasoning');

    // Verify that a key element on the new page is visible
    const newPageHeading = page.locator('h1:has-text("Raciocínio Diagnóstico Fundamental")');
    await expect(newPageHeading).toBeVisible();
  });

  test('should have a disabled button for modules that are coming soon', async ({ page }) => {
    // Find the card for the "coming soon" module
    const labModuleCard = page.locator('div.card:has-text("Interpretação Avançada de Exames Laboratoriais")');
    
    // Find the button within that card
    const comingSoonButton = labModuleCard.locator('button:has-text("Em Breve")');

    // Assert that the button is disabled
    await expect(comingSoonButton).toBeDisabled();
  });
});
