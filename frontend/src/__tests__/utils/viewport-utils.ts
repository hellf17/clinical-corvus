/**
 * Utilitários para simular diferentes tamanhos de viewport em testes
 */

export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

interface ViewportDimensions {
  width: number;
  height: number;
}

// Definições de tamanhos de viewport
export const viewportSizes: Record<ViewportSize, ViewportDimensions> = {
  mobile: { width: 375, height: 667 },     // iPhone padrão
  tablet: { width: 768, height: 1024 },    // iPad padrão
  desktop: { width: 1280, height: 800 },   // Laptop/Desktop padrão
  largeDesktop: { width: 1920, height: 1080 } // Monitor grande
};

/**
 * Configura o viewport para um tamanho específico em testes
 * @param size Tamanho do viewport a simular
 */
export function setViewportSize(size: ViewportSize): void {
  const dimensions = viewportSizes[size];
  setViewportDimensions(dimensions.width, dimensions.height);
}

/**
 * Configura o viewport para dimensões específicas
 * @param width Largura do viewport
 * @param height Altura do viewport
 */
export function setViewportDimensions(width: number, height: number): void {
  // Definir as dimensões da janela
  global.innerWidth = width;
  global.innerHeight = height;
  
  // Simular o evento resize
  global.dispatchEvent(new Event('resize'));
  
  // Configurar matchMedia para responder corretamente com base nas dimensões
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => {
      // Analisar consultas comuns de media queries
      const isMobileQuery = query.includes('max-width') && /\d+/.test(query) && 
        parseInt(query.match(/\d+/)[0]) >= width;
      
      const isTabletQuery = query.includes('min-width') && query.includes('max-width') && 
        /\d+/.test(query) && parseInt(query.match(/\d+/)[0]) <= width;
      
      const isDesktopQuery = query.includes('min-width') && /\d+/.test(query) && 
        parseInt(query.match(/\d+/)[0]) <= width;
      
      return {
        matches: isMobileQuery || isTabletQuery || isDesktopQuery,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    })
  });
}

/**
 * Configura o matchMedia para responder à consulta específica
 * Útil para testar media queries específicas
 * @param query Media query a ser simulada
 * @param matches Valor booleano indicando se a consulta corresponde
 */
export function setMediaQueryMatch(query: string, matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(testQuery => ({
      matches: testQuery === query ? matches : false,
      media: testQuery,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

/**
 * Configura respostas para múltiplas media queries
 * @param queryMatches Mapa de consultas para seus valores de correspondência
 */
export function setMediaQueries(queryMatches: Record<string, boolean>): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query in queryMatches ? queryMatches[query] : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

/**
 * Restaura o estado padrão do matchMedia
 */
export function resetViewport(): void {
  // Restaurar dimensões padrão
  global.innerWidth = 1024;
  global.innerHeight = 768;
  
  // Resetar o matchMedia para um estado neutro
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
  
  // Simular o evento resize
  global.dispatchEvent(new Event('resize'));
}

// Testes unitários para as funções de utilitário de viewport
describe('Viewport Utilities', () => {
  beforeEach(() => {
    // Reset any previous settings
    resetViewport();
  });

  test('viewportSizes contém dimensões corretas para diferentes dispositivos', () => {
    expect(viewportSizes.mobile.width).toBe(375);
    expect(viewportSizes.tablet.width).toBe(768);
    expect(viewportSizes.desktop.width).toBe(1280);
    expect(viewportSizes.largeDesktop.width).toBe(1920);
  });

  test('setViewportSize configura corretamente dimensões para dispositivo móvel', () => {
    setViewportSize('mobile');
    expect(global.innerWidth).toBe(375);
    expect(global.innerHeight).toBe(667);
  });

  test('setViewportSize configura corretamente dimensões para tablet', () => {
    setViewportSize('tablet');
    expect(global.innerWidth).toBe(768);
    expect(global.innerHeight).toBe(1024);
  });

  test('setViewportDimensions configura dimensões personalizadas', () => {
    setViewportDimensions(500, 800);
    expect(global.innerWidth).toBe(500);
    expect(global.innerHeight).toBe(800);
  });

  test('setMediaQueryMatch configura corretamente matchMedia para uma consulta específica', () => {
    setMediaQueryMatch('(min-width: 768px)', true);
    
    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const tabletQuery = window.matchMedia('(min-width: 768px)');
    
    expect(mobileQuery.matches).toBe(false);
    expect(tabletQuery.matches).toBe(true);
  });

  test('setMediaQueries configura corretamente matchMedia para múltiplas consultas', () => {
    setMediaQueries({
      '(max-width: 640px)': false,
      '(min-width: 768px)': true,
      '(min-width: 1024px)': true
    });
    
    expect(window.matchMedia('(max-width: 640px)').matches).toBe(false);
    expect(window.matchMedia('(min-width: 768px)').matches).toBe(true);
    expect(window.matchMedia('(min-width: 1024px)').matches).toBe(true);
    expect(window.matchMedia('(min-width: 1400px)').matches).toBe(false);
  });

  test('resetViewport restaura dimensões padrão', () => {
    setViewportSize('mobile');
    resetViewport();
    
    expect(global.innerWidth).toBe(1024);
    expect(global.innerHeight).toBe(768);
    
    // Verifica que matchMedia foi resetado
    const query = window.matchMedia('(min-width: 768px)');
    expect(query.matches).toBe(false);
  });
}); 