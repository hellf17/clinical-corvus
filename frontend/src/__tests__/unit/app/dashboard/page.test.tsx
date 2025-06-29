import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard/page';
import { useAuthStore } from '@/store/authStore';
import { usePatientStore } from '@/store/patientStore';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';
import { 
  mockZustandStore, 
  createMockPatient, 
  createMockConversation, 
  createMockUser 
} from '@/__tests__/utils/test-utils';

// Mock the stores
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn()
}));

jest.mock('@/store/patientStore', () => ({
  usePatientStore: jest.fn()
}));

jest.mock('@/store/chatStore', () => ({
  useChatStore: jest.fn()
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock the layout component
jest.mock('@/components/layout/MainLayout', () => {
  const MockMainLayout = ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>;
  MockMainLayout.displayName = 'MockMainLayout';
  return MockMainLayout;
});

// Mock next/link
jest.mock('next/link', () => {
  const MockNextLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="next-link">{children}</a>
  );
  MockNextLink.displayName = 'MockNextLink';
  return MockNextLink;
});

describe('Dashboard Page', () => {
  const mockSelectPatient = jest.fn();
  
  // Create sample data
  const patients = [
    createMockPatient({
      id: '1',
      name: 'John Doe',
      diagnosis: 'Pneumonia'
    }),
    createMockPatient({
      id: '2',
      name: 'Jane Smith',
      diagnosis: 'Sepsis',
      exams: [{ id: 'exam1' }, { id: 'exam2' }]
    }),
    createMockPatient({
      id: '3',
      name: 'Bob Johnson',
      diagnosis: 'Fracture',
      exams: [{ id: 'exam3' }]
    })
  ];
  
  const conversations = [
    createMockConversation({
      id: 'conv1',
      title: 'Discussion about treatment',
      updatedAt: new Date('2023-05-15').getTime()
    }),
    createMockConversation({
      id: 'conv2',
      title: 'Follow-up on patient',
      updatedAt: new Date('2023-05-20').getTime()
    })
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation with data
    mockZustandStore(usePatientStore, {
      patients,
      selectedPatientId: null,
      selectPatient: mockSelectPatient
    });
    
    mockZustandStore(useChatStore, {
      conversations
    });
  });
  
  it('renders dashboard with all statistics correctly', () => {
    render(<DashboardPage />);
    
    // Check title
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Check statistics cards
    const cards = screen.getAllByRole('heading', { level: 3 });
    const patientsCard = cards.find((card: any) => card.textContent === 'Total de Pacientes')?.closest('div')?.parentElement;
    const examsCard = cards.find((card: any) => card.textContent === 'Total de Exames')?.closest('div')?.parentElement;
    const conversationsCard = cards.find((card: any) => card.textContent === 'Conversas com Dr. Corvus')?.closest('div')?.parentElement;

    // Verify patients stats
    expect(within(patientsCard as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(patientsCard as HTMLElement).getByText('3 pacientes cadastrados')).toBeInTheDocument();
    
    // Verify exams stats
    expect(within(examsCard as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(examsCard as HTMLElement).getByText('3 exames cadastrados')).toBeInTheDocument();
    
    // Verify conversations stats
    expect(within(conversationsCard as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(within(conversationsCard as HTMLElement).getByText('2 conversas iniciadas')).toBeInTheDocument();
  });
  
  it('displays recent patients correctly', () => {
    render(<DashboardPage />);
    
    // Check section title
    expect(screen.getByText('Pacientes Recentes')).toBeInTheDocument();
    
    // Check all patient names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    
    // Check diagnoses are displayed
    expect(screen.getByText('Pneumonia')).toBeInTheDocument();
    expect(screen.getByText('Sepsis')).toBeInTheDocument();
    expect(screen.getByText('Fracture')).toBeInTheDocument();
    
    // Check for view buttons with correct links
    const links = screen.getAllByTestId('next-link');
    const patientViewLinks = links.filter((link: any) => link.getAttribute('href')?.startsWith('/patients/'));
    
    expect(patientViewLinks).toHaveLength(3);
    expect(patientViewLinks[0].getAttribute('href')).toBe('/patients/1');
    expect(patientViewLinks[1].getAttribute('href')).toBe('/patients/2');
    expect(patientViewLinks[2].getAttribute('href')).toBe('/patients/3');
  });
  
  it('displays recent conversations correctly', () => {
    render(<DashboardPage />);
    
    // Check section title
    expect(screen.getByText('Conversas Recentes com Dr. Corvus')).toBeInTheDocument();
    
    // Check conversation titles are displayed
    expect(screen.getByText('Discussion about treatment')).toBeInTheDocument();
    expect(screen.getByText('Follow-up on patient')).toBeInTheDocument();
    
    // Check for continue buttons with correct links
    const links = screen.getAllByTestId('next-link');
    const chatLinks = links.filter((link: any) => link.getAttribute('href')?.startsWith('/chat?id='));
    
    expect(chatLinks).toHaveLength(2);
    expect(chatLinks[0].getAttribute('href')).toBe('/chat?id=conv2'); // Most recent first
    expect(chatLinks[1].getAttribute('href')).toBe('/chat?id=conv1');
  });
  
  it('shows empty state for patients when there are no patients', () => {
    // Mock empty patients list
    mockZustandStore(usePatientStore, {
      patients: [],
      selectedPatientId: null,
      selectPatient: mockSelectPatient
    });
    
    render(<DashboardPage />);
    
    // Check empty state - use getAllByText because it might appear in multiple places
    const emptyStateTexts = screen.getAllByText('Nenhum paciente cadastrado');
    expect(emptyStateTexts.length).toBeGreaterThan(0);
    
    // Check for "Add Patient" button
    const addPatientButton = screen.getByText('Adicionar Paciente');
    expect(addPatientButton).toBeInTheDocument();
    
    // Check button link
    const addPatientLink = addPatientButton.closest('a');
    expect(addPatientLink).toHaveAttribute('href', '/patients');
  });
  
  it('shows empty state for conversations when there are no conversations', () => {
    // Mock empty conversations list
    mockZustandStore(useChatStore, {
      conversations: []
    });
    
    render(<DashboardPage />);
    
    // Check empty state - use getAllByText because it might appear in multiple places
    const emptyStateTexts = screen.getAllByText('Nenhuma conversa iniciada');
    expect(emptyStateTexts.length).toBeGreaterThan(0);
    
    // Check for "Chat with Dr. Corvus" button
    const chatButton = screen.getByText('Conversar com Dr. Corvus');
    expect(chatButton).toBeInTheDocument();
    
    // Check button link
    const chatLink = chatButton.closest('a');
    expect(chatLink).toHaveAttribute('href', '/chat');
  });
  
  it('shows singular text for single items', () => {
    // Mock single patient and conversation
    mockZustandStore(usePatientStore, {
      patients: [patients[0]],
      selectedPatientId: null,
      selectPatient: mockSelectPatient
    });
    
    mockZustandStore(useChatStore, {
      conversations: [conversations[0]]
    });
    
    render(<DashboardPage />);
    
    // Check singular text
    expect(screen.getByText('1 paciente cadastrado')).toBeInTheDocument();
    expect(screen.getByText('1 conversa iniciada')).toBeInTheDocument();
  });
  
  it('limits patients shown to 5', () => {
    // Create more than 5 patients
    const manyPatients = Array.from({ length: 8 }, (_, i) => 
      createMockPatient({
        id: `id${i}`,
        name: `Patient ${i}`,
        diagnosis: `Diagnosis ${i}`
      })
    );
    
    mockZustandStore(usePatientStore, {
      patients: manyPatients,
      selectedPatientId: null,
      selectPatient: mockSelectPatient
    });
    
    render(<DashboardPage />);
    
    // Should only show 5 patients
    const patientEntries = screen.getAllByText(/Patient \d/);
    expect(patientEntries.length).toBeLessThanOrEqual(5);
  });
}); 