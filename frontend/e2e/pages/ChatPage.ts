import { Page, expect } from '@playwright/test';

export class ChatPage {
  constructor(private page: Page) {}

  // URLs
  readonly url = '/chat';
  
  // Locators
  private chatTitle = () => this.page.getByRole('heading', { name: 'Chat com Dr. Corvus' });
  private messageInput = () => this.page.getByRole('textbox', { name: /Envie uma mensagem/i });
  private sendButton = () => this.page.getByRole('button', { name: /Enviar/i });
  private messageContainer = () => this.page.locator('[data-testid="chat-messages-container"]');
  private messages = () => this.page.locator('[data-testid="chat-message"]');
  private assistantMessage = (text: string) => this.page.getByText(text).filter({ has: this.page.locator('[data-testid="assistant-message"]') });
  private userMessage = (text: string) => this.page.getByText(text).filter({ has: this.page.locator('[data-testid="user-message"]') });
  private newChatButton = () => this.page.getByRole('button', { name: /Nova Conversa/i });
  
  // Methods
  async navigate() {
    await this.page.goto(this.url);
  }
  
  async expectToBeInChatPage() {
    await expect(this.page).toHaveURL(/.*\/chat.*/);
    await expect(this.chatTitle()).toBeVisible();
  }
  
  async sendMessage(text: string) {
    await this.messageInput().fill(text);
    await this.sendButton().click();
    
    // Esperar pela resposta do assistente
    await this.page.waitForResponse(response => 
      response.url().includes('/api/ai-chat') && response.status() === 200
    );
  }
  
  async expectUserMessageVisible(text: string) {
    await expect(this.userMessage(text)).toBeVisible();
  }
  
  async expectAssistantMessageVisible(text: string) {
    // Método flexível, usando o início do texto para corresponder
    const partialTextRegex = new RegExp(text.substring(0, Math.min(30, text.length)));
    await expect(this.page.locator('[data-testid="assistant-message"]')
      .filter({ hasText: partialTextRegex })).toBeVisible();
  }
  
  async startNewChat() {
    await this.newChatButton().click();
    // Esperar que a UI seja atualizada
    await expect(this.messages()).toHaveCount(0);
  }
  
  async getMessageCount() {
    return await this.messages().count();
  }
} 