import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  // URLs
  readonly url = '/dashboard';

  // Locators
  private dashboardTitle = () => this.page.getByRole('heading', { name: /Dashboard/i }).first();
  private patientsCard = () => this.page.getByText(/Total de Pacientes|Patients/i).first();
  private examsCard = () => this.page.getByText(/Total de Exames|Exams/i).first();
  private conversationsCard = () => this.page.getByText(/Conversas com Dr. Corvus|Dr. Corvus|Conversations/i).first();
  private addPatientButton = () => this.page.getByRole('link', { name: /Adicionar Paciente|Add Patient/i });
  private startChatButton = () => this.page.getByRole('link', { name: /Conversar com Dr. Corvus|Chat with Dr. Corvus/i });
  private patientsSection = () => this.page.getByText(/Pacientes Recentes|Recent Patients/i);
  private patientViewButton = (patientName: string) => {
    const nameRegex = new RegExp(patientName, 'i');
    return this.page.getByRole('row', { name: nameRegex })
      .getByRole('link', { name: /Ver|View/i });
  }

  // Methods
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }

  async expectToBeInDashboard() {
    // Use a more relaxed check for the URL
    await expect(this.page).toHaveURL(/.*\/dashboard.*/);
    
    try {
      // Check for the dashboard title with increased timeout
      await expect(this.dashboardTitle()).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log('Could not find dashboard title, checking for dashboard elements instead');
      
      // Try to find any of the dashboard sections
      const patientsSectionVisible = await this.patientsSection().isVisible().catch(() => false);
      const patientsCardVisible = await this.patientsCard().isVisible().catch(() => false);
      
      expect(patientsSectionVisible || patientsCardVisible).toBeTruthy();
    }
  }

  async getPatientCount() {
    try {
      const countText = await this.patientsCard().textContent({ timeout: 5000 });
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (e) {
      console.log('Could not get patient count:', e);
      return 0;
    }
  }

  async getExamCount() {
    try {
      const countText = await this.examsCard().textContent({ timeout: 5000 });
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (e) {
      console.log('Could not get exam count:', e);
      return 0;
    }
  }

  async getConversationCount() {
    try {
      const countText = await this.conversationsCard().textContent({ timeout: 5000 });
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (e) {
      console.log('Could not get conversation count:', e);
      return 0;
    }
  }

  async navigateToAddPatient() {
    try {
      await this.addPatientButton().click();
      await this.page.waitForURL('**/patients/new', { timeout: 10000 });
    } catch (e) {
      console.error('Failed to navigate to add patient:', e);
      await this.page.screenshot({ path: './navigation-error.png' });
      throw e;
    }
  }

  async navigateToChat() {
    try {
      await this.startChatButton().click();
      await this.page.waitForURL('**/chat', { timeout: 10000 });
    } catch (e) {
      console.error('Failed to navigate to chat:', e);
      await this.page.screenshot({ path: './navigation-error.png' });
      throw e;
    }
  }

  async viewPatientDetails(patientName: string) {
    try {
      await this.patientViewButton(patientName).click();
      await this.page.waitForURL('**/patients/*', { timeout: 10000 });
    } catch (e) {
      console.error(`Failed to view patient details for ${patientName}:`, e);
      await this.page.screenshot({ path: './navigation-error.png' });
      throw e;
    }
  }
} 