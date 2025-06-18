/**
 * Utility functions for statistical calculations
 */

/**
 * Calculate the Pearson correlation coefficient between two arrays of numbers.
 * 
 * @param x First array of numeric values
 * @param y Second array of numeric values (must be same length as x)
 * @returns Correlation coefficient between -1 and 1
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }
  
  // Calculate means
  const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  // Calculate covariance and standard deviations
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  
  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }
  
  // Prevent division by zero
  if (xVariance === 0 || yVariance === 0) {
    return 0;
  }
  
  // Calculate correlation
  return covariance / (Math.sqrt(xVariance) * Math.sqrt(yVariance));
} 