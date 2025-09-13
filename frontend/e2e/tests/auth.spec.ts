import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RoleSelectionPage } from '../pages/RoleSelectionPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DEFAULT_USER } from '../fixtures';
import { Route } from '@playwright/test';

// Flag to enable full page mocking for environments 
// where the application server might not be available
const USE_FULL_PAGE_MOCKING = false;

test.describe('Fluxo de Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    if (USE_FULL_PAGE_MOCKING) {
      // Mock the login page HTML
      await page.route('**/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Login - Clinical Helper</title>
              </head>
              <body>
                <div>
                  <h1>Clinical Helper</h1>
                  <p>Faça login para acessar sua conta</p>
                  <button>Entrar com Google</button>
                  <a href="/">Voltar para a página inicial</a>
                </div>
              </body>
            </html>
          `
        });
      });

      // Mock the role selection page
      await page.route('**/auth/role', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Selecione seu perfil - Clinical Helper</title>
              </head>
              <body>
                <div>
                  <h1>Selecione seu perfil</h1>
                  <button>Médico / Profissional de Saúde</button>
                  <button>Paciente</button>
                </div>
              </body>
            </html>
          `
        });
      });

      // Mock the dashboard page
      await page.route('**/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Dashboard - Clinical Helper</title>
              </head>
              <body>
                <div>
                  <h1>Dashboard</h1>
                  <div>
                    <div>Total de Pacientes</div>
                    <div>5 pacientes cadastrados</div>
                  </div>
                  <div>
                    <div>Total de Exames</div>
                    <div>10 exames cadastrados</div>
                  </div>
                  <div>
                    <div>Conversas com Dr. Corvus</div>
                    <div>3 conversas iniciadas</div>
                  </div>
                </div>
              </body>
            </html>
          `
        });
      });
    }
  });

  test('login com Google, seleção de papel e navegação para dashboard', async ({ page }: { page: Page }) => {
    // Inicializar page objects
    const loginPage = new LoginPage(page);
    const rolePage = new RoleSelectionPage(page);
    const dashboardPage = new DashboardPage(page);
    
    // Interceptar chamadas de API para fins de teste
    await page.route('**/api/auth/google-auth-url', async (route: Route) => {
      // Fingir que temos um URL de autenticação do Google
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth' })
      });
    });
    
    // Interceptar redirecionamento OAuth
    await page.route('https://accounts.google.com/o/oauth2/v2/auth**', async (route: Route) => {
      // Redirecionar para nossa callback
      await page.goto('/auth/callback/google?code=test_code');
    });
    
    // Interceptar callback do Google
    await page.route('**/api/auth/callback/google**', async (route: Route) => {
      // Simular login bem-sucedido mas sem papel
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isAuthenticated: true, 
          user: { ...DEFAULT_USER, role: 'guest' }
        })
      });
      
      // Redirecionar para a página de seleção de papel
      await page.goto('/auth/role');
    });
    
    // Interceptar configuração de papel
    await page.route('**/api/auth/role', async (route: Route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      
      // Simular sucesso na atribuição de papel
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          detail: 'Papel definido com sucesso',
          user: { 
            ...DEFAULT_USER,
            role: body.role || 'doctor'
          }
        })
      });
      
      // Não navegamos explicitamente aqui, pois a página front-end deve lidar com isso
    });
    
    // Interceptar verificação de status para exibir dashboard
    await page.route('**/api/auth/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isAuthenticated: true, 
          user: DEFAULT_USER
        })
      });
    });
    
    // Interceptar dados do dashboard
    await page.route('**/api/dashboard', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          patients: { total: 5 },
          exams: { total: 10 },
          conversations: { total: 3 }
        })
      });
    });
    
    // ETAPA 1: Navegar para a página de login
    await loginPage.navigate();
    await loginPage.expectToBeInLoginPage();
    
    // Tira um screenshot para depuração
    await page.screenshot({ path: './e2e-login-page.png' });
    
    // ETAPA 2: Clicar no botão de login com Google
    // (O redirecionamento e callback são simulados pelos interceptadores acima)
    await page.waitForTimeout(1000); // Aguardar carregamento completo
    
    try {
      await loginPage.loginWithGoogle();
      
      // ETAPA 3: Verificar redirecionamento para seleção de papel
      await rolePage.expectToBeInRoleSelectionPage();
      
      // ETAPA 4: Selecionar papel de médico
      await rolePage.selectDoctorRole();
      
      // ETAPA 5: Verificar redirecionamento para dashboard
      await dashboardPage.expectToBeInDashboard();
      
      // ETAPA 6: Verificar conteúdo do dashboard
      const patientCount = await dashboardPage.getPatientCount();
      expect(patientCount).toBe(5);
      
      const examCount = await dashboardPage.getExamCount();
      expect(examCount).toBe(10);
      
      const conversationCount = await dashboardPage.getConversationCount();
      expect(conversationCount).toBe(3);
    } catch (error) {
      console.error('Test failed:', error);
      // Capture screenshot on failure for debugging
      await page.screenshot({ path: './e2e-test-failure.png' });
      throw error;
    }
  });
}); 