import { Page, expect } from '@playwright/test';

export class MedicationPage {
  constructor(private page: Page) {}

  // URLs
  readonly baseUrl = '/patients';
  
  // Navigate to a specific patient's medications
  async navigateToPatientMedications(patientId: string) {
    await this.page.goto(`${this.baseUrl}/${patientId}`);
    await this.page.waitForLoadState('networkidle');
    await this.medicationTabButton().click();
    await this.page.waitForSelector(this.medicationListSelector);
  }

  // Navigate to specific medication details
  async navigateToMedicationDetails(patientId: string, medicationId: string) {
    await this.page.goto(`${this.baseUrl}/${patientId}/medications/${medicationId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Locators
  private medicationTabButton = () => this.page.getByRole('tab', { name: /Medicamentos|Medications/i });
  private medicationListSelector = '.medication-list';
  private medicationItems = () => this.page.locator('.medication-item');
  private addMedicationButton = () => this.page.getByRole('button', { name: /Adicionar Medicamento|Add Medication/i });
  private medicationNameInput = () => this.page.getByLabel(/Nome do Medicamento|Medication Name/i);
  private medicationDosageInput = () => this.page.getByLabel(/Dosagem|Dosage/i);
  private medicationFrequencyInput = () => this.page.getByLabel(/Frequência|Frequency/i);
  private medicationStartDateInput = () => this.page.getByLabel(/Data de Início|Start Date/i);
  private saveButton = () => this.page.getByRole('button', { name: /Salvar|Save/i });
  private medicationTitle = () => this.page.getByRole('heading', { name: /Detalhes do Medicamento|Medication Details/i });
  
  // Actions
  async addNewMedication(name: string, dosage: string, frequency: string, startDate: string) {
    await this.addMedicationButton().click();
    await this.medicationNameInput().fill(name);
    await this.medicationDosageInput().fill(dosage);
    await this.medicationFrequencyInput().fill(frequency);
    await this.medicationStartDateInput().fill(startDate);
    await this.saveButton().click();
    
    // Wait for the save operation to complete
    await this.page.waitForLoadState('networkidle');
  }
  
  // Assertions
  async expectToBeInMedicationList() {
    await expect(this.medicationTabButton()).toBeVisible();
    await expect(this.page.locator(this.medicationListSelector)).toBeVisible();
  }
  
  async expectToBeInMedicationDetails() {
    await expect(this.medicationTitle()).toBeVisible();
  }
  
  async expectMedicationToExist(medicationName: string) {
    const medicationElement = this.page.getByText(medicationName, { exact: false });
    await expect(medicationElement).toBeVisible();
  }
  
  async getMedicationCount() {
    return await this.medicationItems().count();
  }
  
  async selectMedication(medicationName: string) {
    await this.page.getByText(medicationName, { exact: false }).click();
    await this.expectToBeInMedicationDetails();
  }
} 