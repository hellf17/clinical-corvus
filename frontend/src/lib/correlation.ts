/**
 * Calcula o coeficiente de correlação de Pearson entre dois conjuntos de dados
 * @param x Primeiro conjunto de dados
 * @param y Segundo conjunto de dados
 * @returns Valor da correlação entre -1 e 1, ou null se não for possível calcular
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number | null {
  // Verifica se os arrays têm o mesmo tamanho
  if (x.length !== y.length || x.length < 2) {
    return null;
  }

  // Calcula as médias
  const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;

  // Calcula os componentes da fórmula de correlação
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    
    numerator += xDiff * yDiff;
    denominatorX += xDiff * xDiff;
    denominatorY += yDiff * yDiff;
  }

  // Verifica se o denominador é zero
  if (denominatorX === 0 || denominatorY === 0) {
    return null;
  }

  // Retorna o coeficiente de correlação
  return numerator / Math.sqrt(denominatorX * denominatorY);
}

/**
 * Descreve a força da correlação com base no valor do coeficiente
 * @param correlation Valor da correlação entre -1 e 1
 * @returns Descrição textual da força da correlação
 */
export function getCorrelationStrength(correlation: number | null): string {
  if (correlation === null) return 'N/A';
  
  const absoluteCorrelation = Math.abs(correlation);
  
  if (absoluteCorrelation >= 0.9) return 'Muito forte';
  if (absoluteCorrelation >= 0.7) return 'Forte';
  if (absoluteCorrelation >= 0.5) return 'Moderada';
  if (absoluteCorrelation >= 0.3) return 'Fraca';
  return 'Insignificante';
}

/**
 * Determina a classe CSS para a célula da correlação com base no valor
 * @param correlation Valor da correlação entre -1 e 1
 * @returns Classe CSS para coloração da célula
 */
export function getCorrelationColorClass(correlation: number | null): string {
  if (correlation === null) return 'bg-gray-100';
  
  const absoluteCorrelation = Math.abs(correlation);
  const direction = correlation >= 0 ? 'positive' : 'negative';
  
  if (absoluteCorrelation >= 0.9) {
    return direction === 'positive' ? 'bg-green-200' : 'bg-red-200';
  }
  if (absoluteCorrelation >= 0.7) {
    return direction === 'positive' ? 'bg-green-100' : 'bg-red-100';
  }
  if (absoluteCorrelation >= 0.5) {
    return direction === 'positive' ? 'bg-green-50' : 'bg-red-50';
  }
  if (absoluteCorrelation >= 0.3) {
    return direction === 'positive' ? 'bg-blue-50' : 'bg-orange-50';
  }
  
  return 'bg-gray-50';
} 