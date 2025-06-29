import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '@/app/page';

// Mock the layout component to simplify testing
jest.mock('@/components/layout/MainLayout', () => {
  const MockMainLayout = ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>;
  MockMainLayout.displayName = 'MockMainLayout';
  return { __esModule: true, default: MockMainLayout };
});

// Mock next/link
jest.mock('next/link', () => {
  const MockNextLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="next-link">{children}</a>
  );
  MockNextLink.displayName = 'MockNextLink';
  return { __esModule: true, default: MockNextLink };
});

// Mock next/image
jest.mock('next/image', () => {
  /* eslint-disable @next/next/no-img-element */
  const MockNextImage = ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="next-image" {...props} />
  );
  MockNextImage.displayName = 'MockNextImage';
  return { __esModule: true, default: MockNextImage };
});

describe('Home Page', () => {
  it('renders the hero section', () => {
    render(<HomePage />);
    
    // Check for hero heading
    expect(screen.getByText('Dr. Corvus')).toBeInTheDocument();
    expect(screen.getByText('Clinical Helper')).toBeInTheDocument();
    
    // Check for hero description
    expect(screen.getByText(/Análise inteligente de exames laboratoriais/)).toBeInTheDocument();
    
    // Check for CTA buttons
    expect(screen.getByText('Análise Rápida')).toBeInTheDocument();
    expect(screen.getByText('Fazer Login')).toBeInTheDocument();
  });

  it('renders the features section', () => {
    render(<HomePage />);
    
    // Check for section heading
    expect(screen.getByText('Recursos Poderosos')).toBeInTheDocument();
    
    // Check for feature cards
    expect(screen.getByText('Análise de Exames')).toBeInTheDocument();
    expect(screen.getByText('Assistente Dr. Corvus')).toBeInTheDocument();
    expect(screen.getByText('Visualização Temporal')).toBeInTheDocument();
    
    // Check for feature descriptions
    expect(screen.getByText(/Upload e processamento inteligente/)).toBeInTheDocument();
    expect(screen.getByText(/Converse com o Dr. Corvus/)).toBeInTheDocument();
    expect(screen.getByText(/Acompanhe a evolução/)).toBeInTheDocument();
  });

  it('renders the CTA section', () => {
    render(<HomePage />);
    
    // Check for CTA heading
    expect(screen.getByText('Comece Agora')).toBeInTheDocument();
    
    // Check for CTA description
    expect(screen.getByText(/Experimente o Dr. Corvus Clinical Helper hoje/)).toBeInTheDocument();
    
    // Check for CTA buttons
    expect(screen.getByText('Experimentar Gratuitamente')).toBeInTheDocument();
    expect(screen.getByText('Saiba Mais')).toBeInTheDocument();
  });

  it('includes navigation links to other pages', () => {
    render(<HomePage />);
    
    // Get all next/link components
    const links = screen.getAllByTestId('next-link');
    
    // Check that at least we have links to login
    const loginLinks = links.filter((link: HTMLAnchorElement) => link.getAttribute('href') === '/auth/login');
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it('is wrapped in the MainLayout component', () => {
    render(<HomePage />);
    
    // Check that the page content is wrapped in the layout
    const layout = screen.getByTestId('main-layout');
    expect(layout).toBeInTheDocument();
    
    // Check that the layout contains the hero section
    expect(layout).toContainElement(screen.getByText('Dr. Corvus'));
  });
}); 