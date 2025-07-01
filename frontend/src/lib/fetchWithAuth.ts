export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Exemplo mínimo: apenas faz fetch normal
  // Adapte para incluir token de autenticação conforme necessário
  return fetch(url, options);
} 