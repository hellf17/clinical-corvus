import { Page, expect } from '@playwright/test';

export class DoctorDashboardPage {
  constructor(private page: Page) {}

  // URLs
  readonly url = '/dashboard-doctor';

  // Main dashboard elements
  private welcomeBanner = () => this.page.locator('.bg-gradient-to-br');
  private dashboardTitle = () => this.page.getByRole('heading', { name: /Dashboard Clínico/i });
  private welcomeMessage = () => this.page.getByText(/Visão geral do seu consultório/i);
  private userWelcome = () => this.page.locator('.bg-white\\/20').first();
  private systemStatus = () => this.page.locator('.bg-white\\/20').nth(1);

  // Card components
  private criticalAlertsCard = () => this.page.locator('[data-testid="critical-alerts-card"]').or(
    this.page.getByText(/Alertas Críticos|Critical Alerts/i).locator('..').locator('..')
  );
  private groupAlertsCard = () => this.page.locator('[data-testid="group-alerts-card"]').or(
    this.page.getByText(/Alertas de Grupo|Group Alerts/i).locator('..').locator('..')
  );
  private quickAnalysisCard = () => this.page.locator('[data-testid="quick-analysis-card"]').or(
    this.page.getByText(/Análise Rápida|Quick Analysis/i).locator('..').locator('..')
  );
  private clinicalAcademyCard = () => this.page.locator('[data-testid="clinical-academy-card"]').or(
    this.page.getByText(/Academia Clínica|Clinical Academy/i).locator('..').locator('..')
  );
  private groupOverviewCard = () => this.page.locator('[data-testid="group-overview-card"]').or(
    this.page.getByText(/Visão Geral dos Grupos|Groups Overview/i).locator('..').locator('..')
  );
  private frequentGroupsCard = () => this.page.locator('[data-testid="frequent-groups-card"]').or(
    this.page.getByText(/Grupos Frequentes|Frequent Groups/i).locator('..').locator('..')
  );
  private doctorPatientList = () => this.page.locator('[data-testid="doctor-patient-list"]').or(
    this.page.getByText(/Lista de Pacientes|Patient List/i).locator('..').locator('..')
  );

  // Navigation elements
  private sidebar = () => this.page.locator('.lg\\:w-64');
  private mobileMenuButton = () => this.page.getByRole('button', { name: /Toggle Menu/i });
  private header = () => this.page.locator('header');

  // Patient-related elements
  private patientCards = () => this.page.locator('[data-testid="patient-card"]');
  private addPatientButton = () => this.page.getByRole('link', { name: /Adicionar Paciente|Add Patient/i });

  // Group-related elements
  private groupCards = () => this.page.locator('[data-testid="group-card"]');
  private createGroupButton = () => this.page.getByRole('link', { name: /Criar Grupo|Create Group/i });

  // Alert elements
  private alertItems = () => this.page.locator('[data-testid="alert-item"]');
  private viewAllAlertsButton = () => this.page.getByRole('button', { name: /Ver Todos|View All/i }).first();

  // Quick action buttons
  private quickAnalysisButton = () => this.page.getByRole('button', { name: /Análise|Analysis/i });
  private academyButton = () => this.page.getByRole('button', { name: /Academia|Academy/i });

  // Methods
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }

  async expectToBeInDoctorDashboard() {
    await expect(this.page).toHaveURL(/.*\/dashboard-doctor.*/);
    await expect(this.dashboardTitle()).toBeVisible({ timeout: 10000 });
    await expect(this.welcomeBanner()).toBeVisible();
  }

  // Welcome banner interactions
  async verifyWelcomeBanner() {
    await expect(this.welcomeBanner()).toBeVisible();
    await expect(this.dashboardTitle()).toBeVisible();
    await expect(this.welcomeMessage()).toBeVisible();
    await expect(this.userWelcome()).toBeVisible();
    await expect(this.systemStatus()).toBeVisible();
  }

  async getUserWelcomeText() {
    const welcomeElement = this.userWelcome();
    return await welcomeElement.textContent();
  }

  // Card interactions
  async verifyCriticalAlertsCard() {
    const card = this.criticalAlertsCard();
    await expect(card).toBeVisible();
    return card;
  }

  async verifyGroupAlertsCard() {
    const card = this.groupAlertsCard();
    await expect(card).toBeVisible();
    return card;
  }

  async verifyQuickAnalysisCard() {
    const card = this.quickAnalysisCard();
    await expect(card).toBeVisible();
    return card;
  }

  async verifyClinicalAcademyCard() {
    const card = this.clinicalAcademyCard();
    await expect(card).toBeVisible();
    return card;
  }

  async verifyGroupOverviewCard() {
    const card = this.groupOverviewCard();
    await expect(card).toBeVisible();
    return card;
  }

  async verifyFrequentGroupsCard() {
    const card = this.frequentGroupsCard();
    await expect(card).toBeVisible();
    return card;
  }

  async verifyDoctorPatientList() {
    const list = this.doctorPatientList();
    await expect(list).toBeVisible();
    return list;
  }

  // Navigation interactions
  async verifySidebar() {
    // On desktop
    if (await this.sidebar().isVisible()) {
      await expect(this.sidebar()).toBeVisible();
    }
    // On mobile, verify menu button
    else {
      await expect(this.mobileMenuButton()).toBeVisible();
    }
  }

  async openMobileSidebar() {
    if (await this.mobileMenuButton().isVisible()) {
      await this.mobileMenuButton().click();
      await this.page.waitForTimeout(500); // Wait for animation
    }
  }

  async verifyHeader() {
    await expect(this.header()).toBeVisible();
  }

  // Patient management
  async getPatientCardCount() {
    try {
      const cards = this.patientCards();
      return await cards.count();
    } catch (e) {
      console.log('Could not get patient card count:', e);
      return 0;
    }
  }

  async clickPatientCard(index: number = 0) {
    const cards = this.patientCards();
    const count = await cards.count();
    if (count > index) {
      await cards.nth(index).click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Patient card at index ${index} not found. Only ${count} cards available.`);
    }
  }

  async navigateToAddPatient() {
    const button = this.addPatientButton();
    if (await button.isVisible()) {
      await button.click();
      await this.page.waitForURL('**/patients/new', { timeout: 10000 });
    }
  }

  // Group management
  async getGroupCardCount() {
    try {
      const cards = this.groupCards();
      return await cards.count();
    } catch (e) {
      console.log('Could not get group card count:', e);
      return 0;
    }
  }

  async clickGroupCard(index: number = 0) {
    const cards = this.groupCards();
    const count = await cards.count();
    if (count > index) {
      await cards.nth(index).click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Group card at index ${index} not found. Only ${count} cards available.`);
    }
  }

  async navigateToCreateGroup() {
    const button = this.createGroupButton();
    if (await button.isVisible()) {
      await button.click();
      await this.page.waitForURL('**/groups/new', { timeout: 10000 });
    }
  }

  // Alert interactions
  async getAlertCount() {
    try {
      const alerts = this.alertItems();
      return await alerts.count();
    } catch (e) {
      console.log('Could not get alert count:', e);
      return 0;
    }
  }

  async clickAlert(index: number = 0) {
    const alerts = this.alertItems();
    const count = await alerts.count();
    if (count > index) {
      await alerts.nth(index).click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Alert at index ${index} not found. Only ${count} alerts available.`);
    }
  }

  async viewAllAlerts() {
    const button = this.viewAllAlertsButton();
    if (await button.isVisible()) {
      await button.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  // Quick actions
  async clickQuickAnalysis() {
    const button = this.quickAnalysisCard();
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickClinicalAcademy() {
    const button = this.clinicalAcademyCard();
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Layout verification
  async verifyResponsiveLayout() {
    // Check grid layout
    const mainGrid = this.page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
    await expect(mainGrid).toBeVisible();

    // Check responsive columns
    const leftColumn = this.page.locator('.lg\\:col-span-2');
    await expect(leftColumn).toBeVisible();

    const rightColumn = this.page.locator('.lg\\:col-span-1');
    await expect(rightColumn).toBeVisible();
  }

  // Comprehensive dashboard verification
  async verifyAllDashboardComponents() {
    await this.verifyWelcomeBanner();
    await this.verifyHeader();
    await this.verifySidebar();
    await this.verifyResponsiveLayout();
    
    // Verify all cards are present
    await this.verifyCriticalAlertsCard();
    await this.verifyGroupAlertsCard();
    await this.verifyQuickAnalysisCard();
    await this.verifyClinicalAcademyCard();
    await this.verifyGroupOverviewCard();
    await this.verifyFrequentGroupsCard();
    await this.verifyDoctorPatientList();
  }

  // Data loading verification
  async waitForDataToLoad() {
    // Wait for network requests to complete
    await this.page.waitForLoadState('networkidle');
    
    // Wait for key components to be visible
    await expect(this.dashboardTitle()).toBeVisible({ timeout: 15000 });
    
    // Give additional time for dynamic content
    await this.page.waitForTimeout(1000);
  }

  // Error state verification
  async checkForErrorStates() {
    const errorMessages = this.page.locator('[data-testid*="error"], .error, [class*="error"]');
    const errorCount = await errorMessages.count();
    return errorCount === 0;
  }

  // Accessibility verification
  async verifyKeyboardNavigation() {
    // Focus first interactive element
    await this.page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    return focusedElement;
  }
}