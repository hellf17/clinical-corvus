
import React from 'react';
import { render, screen } from '@testing-library/react';
import AcademyPage from '@/app/academy/page';
import { useAuth, useUser } from '@clerk/nextjs';

// Mock the Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

// Mock the ModuleButton component as it might have its own dependencies
jest.mock('@/components/ui/ModuleButton', () => ({
  ModuleButton: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AcademyPage', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseUser = useUser as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockUseAuth.mockReturnValue({ isLoaded: true, userId: 'user_123' });
    mockUseUser.mockReturnValue({ isLoaded: true, user: { firstName: 'Tester' } });
  });

  it('renders the main heading', () => {
    render(<AcademyPage />);
    expect(screen.getByRole('heading', { name: /Academia Clínica Dr. Corvus/i })).toBeInTheDocument();
  });

  it('renders the welcome message with the user\'s name', () => {
    render(<AcademyPage />);
    expect(screen.getByText(/Bem-vindo\(a\) de volta à Academia, Tester!/i)).toBeInTheDocument();
  });

  it('renders all module cards', () => {
    render(<AcademyPage />);
    // There are 7 modules defined in the component
    const moduleTitles = [
      'Diagnóstico Diferencial e Teste de Hipóteses',
      'Simulação Clínica Integrada (Framework SNAPPS)',
      'Medicina Baseada em Evidências (MBE) na Prática',
      'Raciocínio Diagnóstico Fundamental',
      'Metacognição e Evitando Erros Diagnósticos',
      'Interpretação Avançada de Exames Laboratoriais',
      'Comunicação Efetiva em Saúde',
    ];
    moduleTitles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it('renders the correct link for an active module', () => {
    render(<AcademyPage />);
    const differentialDiagnosisModule = screen.getByText('Diagnóstico Diferencial e Teste de Hipóteses').closest('a');
    expect(differentialDiagnosisModule).toHaveAttribute('href', '/academy/differential-diagnosis');
  });

  it('renders a disabled button for a module that is "coming soon"', () => {
    render(<AcademyPage />);
    const labInterpretationModule = screen.getByText('Interpretação Avançada de Exames Laboratoriais');
    // The button is the closest element with the text "Em Breve"
    const button = screen.getByRole('button', { name: /Em Breve/i });
    expect(button).toBeDisabled();
  });

  it('shows a loading state when Clerk is not loaded', () => {
    mockUseAuth.mockReturnValue({ isLoaded: false, userId: null });
    mockUseUser.mockReturnValue({ isLoaded: false, user: null });
    render(<AcademyPage />);
    expect(screen.getByRole('status')).toBeInTheDocument(); // Assuming a loading spinner has a role of 'status'
  });
});
