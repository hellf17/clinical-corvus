import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SystemExamsViewer } from '@/components/SystemExamsViewer';
import { Patient } from '@/store/patientStore';

// Mock the Accordion components
jest.mock('@/components/ui/Accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion">{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion-item">{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion-trigger">{children}</div>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion-content">{children}</div>,
}));

// Mock the Badge component
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode, className?: string }) => 
    <div data-testid="badge" className={className}>{children}</div>,
}));

// Mock patient data
const mockPatient: Patient = {
  id: "1",
  name: "Test Patient",
  dateOfBirth: "1980-01-01",
  gender: "male" as const,
  vitalSigns: [
    {
      temperature: 37.0,
      date: new Date().toISOString()
    }
  ],
  exams: [
    {
      id: "exam1",
      date: "2023-01-01",
      type: "blood",
      file: "test.pdf",
      results: [
        {
          id: "result1",
          name: "Hemoglobina",
          date: "2023-01-01",
          value: 10,
          unit: "g/dL",
          referenceRange: "12-16",
          isAbnormal: true
        },
        {
          id: "result2",
          name: "Creatinina",
          date: "2023-01-01",
          value: 0.9,
          unit: "mg/dL",
          referenceRange: "0.7-1.2",
          isAbnormal: false
        }
      ]
    }
  ]
};

const emptyPatient: Patient = {
  ...mockPatient,
  exams: []
};

describe('SystemExamsViewer Component', () => {
  it('displays message when no exams are available', () => {
    render(<SystemExamsViewer patient={emptyPatient} />);
    
    expect(screen.getByText('Sem exames disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Faça upload de exames para visualizar resultados e análises.')).toBeInTheDocument();
  });
  
  it('renders systems with exam results', () => {
    render(<SystemExamsViewer patient={mockPatient} />);
    
    // Check for component title
    expect(screen.getByText('Exames por Sistema')).toBeInTheDocument();
    
    // Check if systems are displayed - Hemoglobina is in hematology system
    expect(screen.getAllByTestId('accordion-item').length).toBeGreaterThan(0);
    
    // Find specific system titles - at least Hemograma should be there based on mock data
    const hematologySystem = screen.getByText('Hemograma');
    expect(hematologySystem).toBeInTheDocument();
    
    // Find renal system based on mock data
    const renalSystem = screen.getByText('Função Renal');
    expect(renalSystem).toBeInTheDocument();
  });
  
  it('shows abnormal count badge for altered results', () => {
    render(<SystemExamsViewer patient={mockPatient} />);
    
    // Our mock has one abnormal result (Hemoglobina)
    const badge = screen.getByText('1 alterado');
    expect(badge).toBeInTheDocument();
  });
}); 