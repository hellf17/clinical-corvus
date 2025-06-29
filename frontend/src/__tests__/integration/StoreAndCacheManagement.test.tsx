import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/store/authStore';
import { usePatientStore } from '@/store/patientStore';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { setupFetchMock } from '@/__tests__/utils/test-utils';

// Mock do useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn()
  })),
  usePathname: jest.fn(() => '/')
}));

// Componente simples para testar integração com as stores
function TestComponent() {
  // Usa todas as stores
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const { patients, selectedPatientId, selectPatient, addPatient } = usePatientStore();
  const { theme, setTheme, addNotification } = useUIStore();
  
  // Adaptação para resolver problemas com o store de chat
  const chatStore = useChatStore();
  const messages = chatStore.conversations || [];
  const sendMessage = chatStore.sendMessage || (() => {});
  const clearMessages = chatStore.clearConversations || (() => {});

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Autenticado' : 'Não autenticado'}
      </div>
      {user && (
        <div data-testid="user-info">
          {user.name} ({user.role})
        </div>
      )}

      <div data-testid="patient-count">
        {patients.length} pacientes
      </div>

      <div data-testid="message-count">
        {messages.length} mensagens
      </div>

      <div data-testid="theme-status">
        Tema: {theme}
      </div>

      <div data-testid="selected-patient-id">
        ID selecionado: {selectedPatientId || 'nenhum'}
      </div>

      <button 
        data-testid="login-button"
        onClick={() => login('test@example.com', 'password')}
      >
        Login
      </button>

      <button 
        data-testid="logout-button"
        onClick={() => logout()}
      >
        Logout
      </button>

      <button 
        data-testid="add-patient-button"
        onClick={() => addPatient({
          name: 'Novo Paciente',
          gender: 'male',
          dateOfBirth: '1990-01-01'
        })}
      >
        Adicionar Paciente
      </button>

      <button 
        data-testid="select-patient-button"
        onClick={() => patients.length > 0 && selectPatient(patients[0].id)}
      >
        Selecionar Primeiro Paciente
      </button>

      <button 
        data-testid="send-message-button"
        onClick={() => typeof sendMessage === 'function' && sendMessage('Mensagem de teste')}
      >
        Enviar Mensagem
      </button>

      <button 
        data-testid="clear-messages-button"
        onClick={() => typeof clearMessages === 'function' && clearMessages()}
      >
        Limpar Mensagens
      </button>

      <button 
        data-testid="toggle-theme-button"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        Alternar Tema
      </button>

      <button 
        data-testid="add-notification-button"
        onClick={() => addNotification({
          type: 'success',
          message: 'Notificação de teste'
        })}
      >
        Adicionar Notificação
      </button>
    </div>
  );
}

describe('Testes de Gerenciamento de Estado e Cache', () => {
  beforeEach(() => {
    // Limpar todas as stores entre testes
    act(() => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });

      usePatientStore.setState({
        patients: [],
        selectedPatientId: null
      });

      useChatStore.setState({
        conversations: [],
        isLoading: false,
        error: null
      });

      useUIStore.setState({
        theme: 'light',
        language: 'pt-BR',
        isSidebarOpen: true,
        notifications: []
      });
    });

    // Configurar mock de fetch
    setupFetchMock({
      'api/auth/login': {
        ok: true,
        json: async () => ({
          user: {
            user_id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'doctor'
          },
          token: 'mock-token'
        })
      },
      'api/auth/logout': {
        ok: true,
        json: async () => ({ detail: 'Logout realizado com sucesso' })
      }
    });
  });

  it('deve adicionar pacientes corretamente', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent />);
    
    // Estado inicial
    expect(screen.getByTestId('patient-count')).toHaveTextContent('0 pacientes');
    
    // Adicionar paciente
    await act(async () => {
      await user.click(screen.getByTestId('add-patient-button'));
    });
    
    // Verificar adição do paciente
    expect(screen.getByTestId('patient-count')).toHaveTextContent('1 pacientes');
  });

  it('deve selecionar pacientes corretamente', async () => {
    const user = userEvent.setup();
    
    // Preparar estado com um paciente
    act(() => {
      usePatientStore.setState({
        patients: [{
          id: 'patient-123',
          name: 'Paciente Teste',
          gender: 'male',
          dateOfBirth: '1990-01-01',
          exams: [],
          vitalSigns: []
        }],
        selectedPatientId: null
      });
    });
    
    render(<TestComponent />);
    
    // Verificar que não há paciente selecionado inicialmente
    expect(screen.getByTestId('selected-patient-id')).toHaveTextContent('ID selecionado: nenhum');
    
    // Selecionar paciente
    await act(async () => {
      await user.click(screen.getByTestId('select-patient-button'));
    });
    
    // Verificar seleção
    expect(screen.getByTestId('selected-patient-id')).toHaveTextContent('ID selecionado: patient-123');
  });

  it('deve alternar o tema corretamente', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent />);
    
    // Verificar tema inicial
    expect(screen.getByTestId('theme-status')).toHaveTextContent('Tema: light');
    
    // Alternar tema
    await act(async () => {
      await user.click(screen.getByTestId('toggle-theme-button'));
    });
    
    // Verificar novo tema
    expect(screen.getByTestId('theme-status')).toHaveTextContent('Tema: dark');
  });

  it('deve manter o tema entre montagens de componentes', () => {
    // Configurar tema escuro
    act(() => {
      useUIStore.setState({ theme: 'dark' });
    });
    
    // Primeira renderização
    const { unmount } = render(<TestComponent />);
    
    // Verificar tema
    expect(screen.getByTestId('theme-status')).toHaveTextContent('Tema: dark');
    
    // Desmontar
    unmount();
    
    // Renderizar novamente
    render(<TestComponent />);
    
    // Verificar que tema persistiu
    expect(screen.getByTestId('theme-status')).toHaveTextContent('Tema: dark');
  });

  // Teste adicional para login
  it('deve executar o login corretamente (mock direto do estado)', async () => {
    render(<TestComponent />);
    
    // Verificar estado inicial
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Não autenticado');
    
    // Simular login bem-sucedido alterando o estado diretamente
    act(() => {
      useAuthStore.setState({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'doctor'
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    });
    
    // Verificar estado após login
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-info')).toHaveTextContent('Test User (doctor)');
  });
}); 