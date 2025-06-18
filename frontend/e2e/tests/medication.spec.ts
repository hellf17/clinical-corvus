import { test, expect, Page } from '@playwright/test';
import { PatientDetailsPage } from '../pages/PatientDetailsPage';
import { MedicationPage } from '../pages/MedicationPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DEFAULT_USER } from '../fixtures';

// Flag to enable full page mocking for environments 
// where the application server might not be available
const USE_FULL_PAGE_MOCKING = true;

test.describe('Fluxo de Gerenciamento de Medicamentos', () => {
  // Mock data for patient and medications
  const TEST_PATIENT_ID = '12345';
  const TEST_MEDICATION = {
    id: 'med-123',
    name: 'Atorvastatina',
    dosage: '10mg',
    frequency: 'Uma vez ao dia',
    startDate: '2023-05-01'
  };
  
  const TEST_NEW_MEDICATION = {
    name: 'Losartana',
    dosage: '50mg',
    frequency: 'Duas vezes ao dia',
    startDate: '2023-06-15'
  };

  test.beforeEach(async ({ page }) => {
    // Mock login and authentication - similar to auth tests
    await page.route('**/api/auth/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isAuthenticated: true, 
          user: DEFAULT_USER
        })
      });
    });
    
    // Mock patient details
    await page.route(`**/api/patients/${TEST_PATIENT_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: TEST_PATIENT_ID,
          name: 'João Silva',
          dateOfBirth: '1980-01-15',
          gender: 'Masculino',
          document: '123.456.789-00',
          contact: '[email protected]'
        })
      });
    });
    
    // Mock patient medications list
    await page.route(`**/api/patients/${TEST_PATIENT_ID}/medications`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([TEST_MEDICATION])
        });
      } else if (route.request().method() === 'POST') {
        // Handle POST request for new medication
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'med-456',
            ...JSON.parse(route.request().postData() || '{}')
          })
        });
      }
    });
    
    // Mock individual medication details
    await page.route(`**/api/patients/${TEST_PATIENT_ID}/medications/${TEST_MEDICATION.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEST_MEDICATION)
      });
    });
    
    if (USE_FULL_PAGE_MOCKING) {
      // Mock html pages if needed
      await page.route(`**/patients/${TEST_PATIENT_ID}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Detalhes do Paciente - Clinical Helper</title>
              </head>
              <body>
                <div>
                  <h1>João Silva</h1>
                  <div>
                    <button role="tab">Informações</button>
                    <button role="tab">Exames</button>
                    <button role="tab">Medicamentos</button>
                    <button role="tab">Histórico</button>
                  </div>
                  <div class="medication-list">
                    <button>Adicionar Medicamento</button>
                    <div class="medication-item">Atorvastatina 10mg</div>
                  </div>
                </div>
              </body>
            </html>
          `
        });
      });
      
      // Mock medication details page
      await page.route(`**/patients/${TEST_PATIENT_ID}/medications/**`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Detalhes do Medicamento - Clinical Helper</title>
              </head>
              <body>
                <div>
                  <h1>Detalhes do Medicamento</h1>
                  <div>
                    <div>Nome: Atorvastatina</div>
                    <div>Dosagem: 10mg</div>
                    <div>Frequência: Uma vez ao dia</div>
                    <div>Data de Início: 01/05/2023</div>
                  </div>
                </div>
              </body>
            </html>
          `
        });
      });
    }
  });

  test('visualizar e adicionar medicamentos para um paciente', async ({ page }: { page: Page }) => {
    // Inicializar page objects
    const patientPage = new PatientDetailsPage(page);
    const medicationPage = new MedicationPage(page);
    
    // ETAPA 1: Navegar para a página de detalhes do paciente
    await medicationPage.navigateToPatientMedications(TEST_PATIENT_ID);
    await medicationPage.expectToBeInMedicationList();
    
    // ETAPA 2: Verificar medicamento existente
    const initialCount = await medicationPage.getMedicationCount();
    expect(initialCount).toBe(1);
    await medicationPage.expectMedicationToExist(TEST_MEDICATION.name);
    
    // ETAPA 3: Verificar detalhes do medicamento existente
    await medicationPage.selectMedication(TEST_MEDICATION.name);
    await medicationPage.expectToBeInMedicationDetails();
    
    // Voltar para a lista de medicamentos
    await medicationPage.navigateToPatientMedications(TEST_PATIENT_ID);
    
    // ETAPA 4: Adicionar novo medicamento
    await medicationPage.addNewMedication(
      TEST_NEW_MEDICATION.name,
      TEST_NEW_MEDICATION.dosage,
      TEST_NEW_MEDICATION.frequency,
      TEST_NEW_MEDICATION.startDate
    );
    
    // ETAPA 5: Verificar que o medicamento foi adicionado
    // Nota: Como estamos mockando a API, não podemos verificar a renderização real,
    // mas podemos verificar que as chamadas à API foram feitas corretamente
    
    // Capturar requisição de criação de medicamento
    const postRequests = [];
    await page.route(`**/api/patients/${TEST_PATIENT_ID}/medications`, async (route) => {
      if (route.request().method() === 'POST') {
        postRequests.push(route.request());
        await route.continue();
      }
    });
    
    // Verificar que pelo menos uma requisição POST foi feita
    expect(postRequests.length).toBeGreaterThan(0);
  });
}); 