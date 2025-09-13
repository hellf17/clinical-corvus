import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DoctorSettingsPage from '@/app/dashboard-doctor/settings/page';
import * as nextNavigation from 'next/navigation';

// Mock all child components to avoid complex dependencies
jest.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div className={className} data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={className} data-testid="tabs-list">
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, className }: any) => (
    <button className={className} data-testid="tabs-trigger" data-value={value}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <div className={className} data-testid="card-title">
      {children}
    </div>
  ),
  CardDescription: ({ children, className }: any) => (
    <div className={className} data-testid="card-description">
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="button"
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  User: () => <div data-testid="user-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  CreditCard: () => <div data-testid="credit-card-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
}));

// Mock Next.js router hooks
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  usePathname: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: any) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Clerk UserProfile component
jest.mock('@clerk/nextjs', () => ({
  UserProfile: () => <div data-testid="user-profile">User Profile Component</div>,
}));

// Mock Footer component
jest.mock('@/app/landing/templates/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer Component</div>,
}));

describe('Doctor Settings Page', () => {
  const { usePathname } = nextNavigation;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock pathname
    (usePathname as jest.Mock).mockReturnValue('/dashboard-doctor/settings');
    
    // Clear router mocks
    mockPush.mockClear();
    mockBack.mockClear();
  });

  it('renders the settings page with all components', () => {
    render(<DoctorSettingsPage />);
    
    // Check main header
    expect(screen.getByText('Configurações da Conta')).toBeInTheDocument();
    expect(
      screen.getByText('Gerencie suas informações pessoais, segurança e preferências da conta')
    ).toBeInTheDocument();
    
    // Check back button
    expect(screen.getByText('Voltar ao Dashboard')).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Segurança')).toBeInTheDocument();
    expect(screen.getByText('Assinatura')).toBeInTheDocument();
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    
    // Check user profile component
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    
    // Check support section
    expect(screen.getByText('Suporte e Ajuda')).toBeInTheDocument();
    expect(screen.getByText('Documentação')).toBeInTheDocument();
    expect(screen.getByText('Contatar Suporte')).toBeInTheDocument();
    
    // Check footer
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('displays account tab as active by default', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard-doctor/settings');
    
    render(<DoctorSettingsPage />);
    
    // The tabs component should have the account tab active
    const tabs = screen.getByTestId('tabs');
    expect(tabs).toHaveAttribute('data-value', 'account');
  });

  it('displays security tab as active when on security path', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard-doctor/settings/security');
    
    render(<DoctorSettingsPage />);
    
    // The tabs component should have the security tab active
    const tabs = screen.getByTestId('tabs');
    expect(tabs).toHaveAttribute('data-value', 'security');
  });

  it('displays subscription tab as active when on subscription path', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard-doctor/settings/subscription');
    
    render(<DoctorSettingsPage />);
    
    // The tabs component should have the subscription tab active
    const tabs = screen.getByTestId('tabs');
    expect(tabs).toHaveAttribute('data-value', 'subscription');
  });

  it('displays notifications tab as active when on notifications path', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard-doctor/settings/notifications');
    
    render(<DoctorSettingsPage />);
    
    // The tabs component should have the notifications tab active
    const tabs = screen.getByTestId('tabs');
    expect(tabs).toHaveAttribute('data-value', 'notifications');
  });
});