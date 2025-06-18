import { Page, expect } from '@playwright/test';

export class PatientDetailsPage {
  constructor(private page: Page) {}

  // URLs - Usamos um wildcard já que o URL contém o ID do paciente
  readonly baseUrl = '/patients/';

  // Locators
  private patientName = () => this.page.getByRole('heading', { level: 1 });
  private examsTab = () => this.page.getByRole('tab', { name: 'Exames' });
  private medicationsTab = () => this.page.getByRole('tab', { name: 'Medicações' });
  private notesTab = () => this.page.getByRole('tab', { name: 'Anotações Clínicas' });
  private uploadExamButton = () => this.page.getByRole('button', { name: /Upload de Exame/i });
  private analyzeButton = () => this.page.getByRole('button', { name: /Analisar/i });
  private fileInput = () => this.page.getByLabel(/Upload de Exame \(PDF\)/i);
  private alertsPanel = () => this.page.locator('[data-testid="alerts-panel"]');

  // Methods
  async navigate(patientId: string) {
    await this.page.goto(`${this.baseUrl}${patientId}`);
  }

  async expectToBeOnPatientPage(patientName?: string) {
    await expect(this.page).toHaveURL(new RegExp(`${this.baseUrl}.*`));
    if (patientName) {
      await expect(this.patientName()).toContainText(patientName);
    }
  }

  async switchToExamsTab() {
    await this.examsTab().click();
  }

  async switchToMedicationsTab() {
    await this.medicationsTab().click();
  }

  async switchToNotesTab() {
    await this.notesTab().click();
  }

  async uploadExam(filePath: string) {
    await this.examsTab().click();
    await this.fileInput().setInputFiles(filePath);
    await this.uploadExamButton().click();
  }

  async analyzeResults() {
    await this.analyzeButton().click();
    // Aguardar a análise
    await this.page.waitForResponse(response => 
      response.url().includes('/api/analyze') && response.status() === 200
    );
  }

  async expectAlertsToBeVisible() {
    await expect(this.alertsPanel()).toBeVisible();
  }
} 