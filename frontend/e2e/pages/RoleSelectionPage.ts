import { Page, expect } from '@playwright/test';

export class RoleSelectionPage {
  constructor(private page: Page) {}

  // URLs
  readonly url = '/auth/role';

  // Locators
  private doctorButton = () => this.page.getByRole('button', { name: /Médico|Profissional de Saúde|Doctor/i });
  private patientButton = () => this.page.getByRole('button', { name: /Paciente|Patient/i });
  private pageTitle = () => this.page.getByRole('heading', { name: /Selecione seu perfil|Select your role/i }).first();

  // Methods
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }

  async selectDoctorRole() {
    // Wait for button to be visible and stable
    await this.page.waitForTimeout(1000);
    const button = this.doctorButton();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    
    // Esperamos navegação para o dashboard após selecionar o papel
    try {
      await this.page.waitForURL('**/dashboard', { timeout: 15000 });
    } catch (error) {
      console.error('Navigation to dashboard failed after role selection:', error);
      // Take a screenshot to help debug
      await this.page.screenshot({ path: './role-selection-error.png' });
      throw error;
    }
  }

  async selectPatientRole() {
    // Wait for button to be visible and stable
    await this.page.waitForTimeout(1000);
    const button = this.patientButton();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    
    // Esperamos navegação para o dashboard após selecionar o papel
    try {
      await this.page.waitForURL('**/dashboard', { timeout: 15000 });
    } catch (error) {
      console.error('Navigation to dashboard failed after role selection:', error);
      // Take a screenshot to help debug
      await this.page.screenshot({ path: './role-selection-error.png' });
      throw error;
    }
  }

  async expectToBeInRoleSelectionPage() {
    // Use a more relaxed check for the URL
    await expect(this.page).toHaveURL(/.*\/auth\/role.*|.*\/role.*/);
    
    // Check for title with increased timeout
    try {
      await expect(this.pageTitle()).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log('Could not find page title, checking for role buttons instead');
      // Verify at least one of the role buttons is visible
      const doctorButtonVisible = await this.doctorButton().isVisible().catch(() => false);
      const patientButtonVisible = await this.patientButton().isVisible().catch(() => false);
      
      expect(doctorButtonVisible || patientButtonVisible).toBeTruthy();
    }
  }
} 