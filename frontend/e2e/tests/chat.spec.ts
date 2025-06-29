import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ChatPage } from '../pages/ChatPage';

// Dados de teste para respostas da IA
const AI_RESPONSES = {
  greeting: 'Olá! Sou o Dr. Corvus, seu assistente médico de IA. Como posso ajudar você hoje?',
  clinicalQuestion: 'Com base nos sintomas descritos, há algumas possibilidades a considerar. A febre alta, dor de cabeça e fadiga podem ser indicativos de uma infecção viral, como gripe. No entanto, a rigidez na nuca levanta preocupações sobre meningite, que é uma condição séria que requer avaliação médica imediata.'
};

test.describe('Fluxo de Chat com IA', () => {
  // Hook de setup para autenticar o usuário antes de cada teste
  test.beforeEach(async ({ page }) => {
    // Configurar autenticação simulada
    await page.route('**/api/auth/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isAuthenticated: true, 
          user: { id: '123', name: 'Dr. Teste', email: 'doutor@exemplo.com', role: 'doctor' }
        })
      });
    });
    
    // Autenticar diretamente navegando para o dashboard
    await page.goto('/dashboard');
  });
  
  test('iniciar nova conversa e receber respostas da IA', async ({ page }) => {
    // Inicializar page objects
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);
    
    // Configurar mock para conversas
    await page.route('**/api/ai-chat/conversations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Configurar mock para mensagens iniciais
    await page.route('**/api/ai-chat/messages**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'msg1',
            role: 'assistant',
            content: AI_RESPONSES.greeting,
            timestamp: Date.now() - 1000
          }
        ])
      });
    });
    
    // Verificar se estamos no dashboard
    await dashboardPage.expectToBeInDashboard();
    
    // Navegar para a página de chat
    await dashboardPage.navigateToChat();
    
    // Verificar se estamos na página de chat
    await chatPage.expectToBeInChatPage();
    
    // Verificar mensagem de saudação do assistente
    await chatPage.expectAssistantMessageVisible(AI_RESPONSES.greeting);
    
    // Configurar mock para resposta da IA a uma pergunta clínica
    await page.route('**/api/ai-chat/send', async route => {
      const requestData = JSON.parse(route.request().postData() || '{}');
      
      // Verificar se é a pergunta clínica esperada
      const isClinicQuestion = requestData.message.includes('febre');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg2',
          role: 'assistant',
          content: isClinicQuestion ? AI_RESPONSES.clinicalQuestion : 'Não entendi sua pergunta.',
          timestamp: Date.now()
        })
      });
    });
    
    // Enviar uma pergunta clínica
    const clinicalQuestion = 'O que pode causar febre alta, dor de cabeça, fadiga e rigidez na nuca?';
    await chatPage.sendMessage(clinicalQuestion);
    
    // Verificar se a mensagem do usuário foi exibida
    await chatPage.expectUserMessageVisible(clinicalQuestion);
    
    // Verificar se a resposta da IA foi recebida e exibida
    await chatPage.expectAssistantMessageVisible(AI_RESPONSES.clinicalQuestion.substring(0, 30));
    
    // Verificar se temos pelo menos 3 mensagens (saudação + pergunta + resposta)
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(3);
    
    // Testar iniciar uma nova conversa
    // Configurar mock para nova conversa
    await page.route('**/api/ai-chat/conversations/new', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'conv2',
          created_at: new Date().toISOString()
        })
      });
    });
    
    // Iniciar uma nova conversa
    await chatPage.startNewChat();
    
    // Verificar que as mensagens anteriores não estão mais visíveis
    const newMessageCount = await chatPage.getMessageCount();
    expect(newMessageCount).toBeLessThan(messageCount);
  });
}); 