import { Page, Route } from '@playwright/test';
import { AuthUser } from './types';

/**
 * Configura uma autenticação simulada para testes
 * @param page Página do Playwright
 * @param user Dados do usuário a ser autenticado
 */
export async function mockAuthentication(page: Page, user: AuthUser) {
  // Interceptar verificação de status de autenticação
  await page.route('**/api/auth/status', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        isAuthenticated: true, 
        user
      })
    });
  });
}

/**
 * Converte um objeto para uma string adequada para uso em consultas de URL
 * @param params Parâmetros a serem convertidos para string
 * @returns String formatada para query string
 */
export function objectToQueryString(params: Record<string, any>): string {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * Gera um ID aleatório para uso em testes
 * @param prefix Prefixo opcional para o ID
 * @returns ID aleatório
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Espera que um elemento esteja estável (não movendo/mudando) antes de interagir
 * @param page Página do Playwright
 * @param selector Seletor do elemento
 * @param timeout Tempo máximo de espera
 */
export async function waitForElementStability(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { timeout });
  
  // Esperar um tempo para garantir que animações terminaram
  await page.waitForTimeout(500);
} 