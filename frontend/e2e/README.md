# Testes End-to-End (E2E) para Clinical Helper

Este diretório contém testes E2E para o Clinical Helper usando o Playwright.

## Estrutura

```
e2e/
├── pages/           # Page objects para cada página da aplicação
│   ├── LoginPage.ts
│   ├── RoleSelectionPage.ts
│   ├── DashboardPage.ts
│   ├── PatientDetailsPage.ts
│   ├── MedicationPage.ts
│   └── ChatPage.ts
├── tests/           # Testes E2E para diferentes fluxos
│   ├── auth.spec.ts
│   ├── patient-flow.spec.ts
│   ├── medication.spec.ts
│   └── chat.spec.ts
├── fixtures.ts      # Dados de teste compartilhados
├── types.ts         # Tipos compartilhados para os testes
└── README.md        # Este arquivo
```

## Page Objects

Usamos o padrão Page Object para encapsular a interação com as páginas da aplicação, tornando os testes mais legíveis e fáceis de manter. Cada page object contém:

- Locators para os elementos da página
- Métodos para interagir com a página
- Métodos para verificar o estado da página

## Executando os Testes

Para executar os testes E2E, use os seguintes comandos:

```bash
# Executar todos os testes E2E
npm run test:e2e

# Executar com UI para debug visual
npm run test:e2e:ui

# Executar com modo debug
npm run test:e2e:debug

# Executar um teste específico (exemplo: apenas testes de medicamentos)
npx playwright test medication
```

## Mocking das APIs

Os testes E2E mockam as chamadas de API para evitar dependências externas e simular diferentes cenários. Usamos o `page.route()` do Playwright para interceptar requisições HTTP e retornar respostas simuladas.

Exemplo:

```typescript
// Mockando resposta de API
await page.route('**/api/patients', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([TEST_PATIENT])
  });
});
```

## Fluxos Principais Testados

1. **Fluxo de Autenticação**
   - Login com Google
   - Seleção de papel (médico/paciente)
   - Navegação para dashboard

2. **Fluxo de Gerenciamento de Pacientes**
   - Visualização de detalhes do paciente
   - Upload e análise de exames
   - Alertas clínicos

3. **Fluxo de Gerenciamento de Medicamentos**
   - Visualização da lista de medicamentos de um paciente
   - Visualização de detalhes de um medicamento específico
   - Adição de novo medicamento

4. **Fluxo de Chat com IA**
   - Iniciar nova conversa
   - Enviar perguntas clínicas
   - Receber e verificar respostas da IA

## Boas Práticas

- Mantenha os testes independentes e isolados
- Use dados de teste consistentes disponíveis em `fixtures.ts`
- Implemente verificações explícitas após cada ação
- Adicione comentários descrevendo a finalidade de cada seção do teste
- Use timeouts razoáveis para esperar por ações assíncronas 