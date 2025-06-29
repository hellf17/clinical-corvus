import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SWRConfig } from 'swr';
import userEvent from '@testing-library/user-event';

// Componente de exemplo que usa SWR para buscar dados
function PatientDataComponent({ patientId }: { patientId: string }) {
  // Importamos useSWR inline para que possamos mockear seu comportamento
  const { useSWR } = require('swr');
  const { data, error, isLoading, mutate } = useSWR(`/api/patients/${patientId}`, {
    revalidateOnFocus: false, // Desativar revalidação automática para testes
  });

  if (isLoading) return <div data-testid="loading">Carregando...</div>;
  if (error) return <div data-testid="error">Erro: {error.message}</div>;
  if (!data) return <div data-testid="no-data">Nenhum dado disponível</div>;

  return (
    <div>
      <h1 data-testid="patient-name">{data.name}</h1>
      <p data-testid="patient-info">
        {data.gender}, {data.age} anos
      </p>
      <button 
        data-testid="refresh-button" 
        onClick={() => mutate()}
      >
        Atualizar
      </button>
    </div>
  );
}

// Componente wrapper com SWR Provider
function TestApp({ patientId }: { patientId: string }) {
  return (
    <SWRConfig 
      value={{
        provider: () => new Map(),
        fetcher: (url: string) => Promise.resolve(mockResponses[url] || {}),
      }}
    >
      <PatientDataComponent patientId={patientId} />
    </SWRConfig>
  );
}

// Mock de respostas para diferentes URLs
const mockResponses: Record<string, any> = {
  '/api/patients/1': {
    id: '1',
    name: 'João Silva',
    gender: 'masculino',
    age: 45,
    diagnosis: 'Pneumonia'
  },
  '/api/patients/2': {
    id: '2',
    name: 'Maria Oliveira',
    gender: 'feminino',
    age: 62,
    diagnosis: 'Hipertensão'
  }
};

// Mock do módulo SWR
jest.mock('swr', () => {
  const originalModule = jest.requireActual('swr');
  
  return {
    __esModule: true,
    ...originalModule,
    useSWR: jest.fn((key: string) => {
      const data = mockResponses[key];
      return {
        data,
        error: null,
        isLoading: false,
        mutate: jest.fn().mockImplementation(() => {
          // Simulamos que a mutação atualiza os dados
          return Promise.resolve({ ...data, updatedAt: Date.now() });
        })
      };
    })
  };
});

describe('Testes de Gerenciamento de Cache com SWR', () => {
  beforeEach(() => {
    // Limpar mocks entre testes
    jest.clearAllMocks();
  });

  it('deve carregar dados corretamente', async () => {
    // Renderizar componente
    render(<TestApp patientId="1" />);
    
    // Verificar se os dados foram carregados
    expect(screen.getByTestId('patient-name')).toHaveTextContent('João Silva');
    expect(screen.getByTestId('patient-info')).toHaveTextContent('masculino, 45 anos');
  });

  it('deve renderizar dados diferentes para pacientes diferentes', async () => {
    const { rerender } = render(<TestApp patientId="1" />);
    
    // Verificar dados do paciente 1
    expect(screen.getByTestId('patient-name')).toHaveTextContent('João Silva');
    
    // Re-renderizar o componente com ID diferente
    act(() => {
      rerender(<TestApp patientId="2" />);
    });
    
    // Verificar que os dados mudaram
    await waitFor(() => {
      expect(screen.getByTestId('patient-name')).toHaveTextContent('Maria Oliveira');
    });
  });

  it('deve chamar a função mutate ao clicar no botão de atualizar', async () => {
    const user = userEvent.setup();
    
    // Mock SWR methods mais específico
    const mutateMock = jest.fn().mockImplementation(() => Promise.resolve({}));
    
    // Substituir o mock de SWR para este teste
    const mockSWR = require('swr');
    mockSWR.useSWR.mockImplementationOnce((key: string) => {
      return {
        data: mockResponses[key],
        error: null,
        isLoading: false,
        mutate: mutateMock
      };
    });
    
    // Renderizar componente
    render(<TestApp patientId="1" />);
    
    // Clicar no botão de atualizar
    await user.click(screen.getByTestId('refresh-button'));
    
    // Verificar se mutate foi chamado
    expect(mutateMock).toHaveBeenCalled();
  });

  it('deve atualizar a interface quando dados são revalidados', async () => {
    const user = userEvent.setup();
    
    // Mock para atualizar os dados no cache
    const mockSWR = require('swr');
    let hasRefreshed = false;
    
    mockSWR.useSWR.mockImplementation((key: string) => {
      // Se já revalidou, retornar dados atualizados
      if (hasRefreshed && key === '/api/patients/1') {
        return {
          data: {
            ...mockResponses[key],
            name: 'João Silva (Atualizado)'
          },
          error: null,
          isLoading: false,
          mutate: jest.fn().mockImplementation(() => {
            hasRefreshed = true;
            return Promise.resolve();
          })
        };
      }
      
      // Caso contrário, retornar dados originais com função mutate
      return {
        data: mockResponses[key],
        error: null,
        isLoading: false,
        mutate: jest.fn().mockImplementation(() => {
          hasRefreshed = true;
          return Promise.resolve();
        })
      };
    });
    
    // Renderizar componente
    const { rerender } = render(<TestApp patientId="1" />);
    
    // Verificar dados iniciais
    expect(screen.getByTestId('patient-name')).toHaveTextContent('João Silva');
    
    // Clicar no botão de atualizar
    await user.click(screen.getByTestId('refresh-button'));
    
    // Forçar uma nova renderização para ver os dados atualizados
    act(() => {
      rerender(<TestApp patientId="1" />);
    });
    
    // Verificar se os dados foram atualizados
    await waitFor(() => {
      expect(screen.getByTestId('patient-name')).toHaveTextContent('João Silva (Atualizado)');
    });
  });

  it('deve tratar erros de carregamento', async () => {
    // Mock para simular erro
    const mockSWR = require('swr');
    mockSWR.useSWR.mockImplementationOnce((key: string) => {
      return {
        data: undefined,
        error: new Error('Falha ao carregar dados do paciente'),
        isLoading: false,
        mutate: jest.fn()
      };
    });
    
    // Renderizar componente
    render(<TestApp patientId="999" />);
    
    // Verificar mensagem de erro
    expect(screen.getByTestId('error')).toHaveTextContent('Erro: Falha ao carregar dados do paciente');
  });

  it('deve mostrar estado de carregamento', async () => {
    // Mock para simular carregamento
    const mockSWR = require('swr');
    mockSWR.useSWR.mockImplementationOnce((key: string) => {
      return {
        data: undefined,
        error: null,
        isLoading: true,
        mutate: jest.fn()
      };
    });
    
    // Renderizar componente
    render(<TestApp patientId="1" />);
    
    // Verificar estado de carregamento
    expect(screen.getByTestId('loading')).toHaveTextContent('Carregando...');
  });
}); 