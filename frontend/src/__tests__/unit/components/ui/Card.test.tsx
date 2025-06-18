import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card';

describe('Card component', () => {
  it('renders the Card component correctly', () => {
    const { container } = render(<Card>Card Content</Card>);
    const card = container.firstChild;
    
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow-sm');
    expect(card).toHaveTextContent('Card Content');
  });

  it('applies custom className to Card', () => {
    const customClass = 'custom-card-class';
    const { container } = render(<Card className={customClass}>Card Content</Card>);
    const card = container.firstChild;
    
    expect(card).toHaveClass(customClass);
    expect(card).toHaveClass('rounded-lg'); // Should still have default classes
  });

  it('renders CardHeader correctly', () => {
    const { container } = render(<CardHeader>Header Content</CardHeader>);
    const header = container.firstChild;
    
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('p-6');
    expect(header).toHaveTextContent('Header Content');
  });

  it('renders CardTitle correctly', () => {
    const { container } = render(<CardTitle>Card Title</CardTitle>);
    const title = container.firstChild;
    
    expect(title).toHaveClass('text-lg');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveTextContent('Card Title');
    expect(title?.nodeName).toBe('H3'); // Should be an h3 element
  });

  it('renders CardDescription correctly', () => {
    const { container } = render(<CardDescription>Card Description</CardDescription>);
    const description = container.firstChild;
    
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-gray-500');
    expect(description).toHaveTextContent('Card Description');
    expect(description?.nodeName).toBe('P'); // Should be a paragraph element
  });

  it('renders CardContent correctly', () => {
    const { container } = render(<CardContent>Content Area</CardContent>);
    const content = container.firstChild;
    
    expect(content).toHaveClass('p-6');
    expect(content).toHaveClass('pt-0');
    expect(content).toHaveTextContent('Content Area');
  });

  it('renders CardFooter correctly', () => {
    const { container } = render(<CardFooter>Footer Content</CardFooter>);
    const footer = container.firstChild;
    
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('p-6');
    expect(footer).toHaveClass('pt-0');
    expect(footer).toHaveTextContent('Footer Content');
  });

  it('renders a complete card with all subcomponents', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>This is a complete card example</CardDescription>
        </CardHeader>
        <CardContent>
          Card content area with details
        </CardContent>
        <CardFooter>
          Footer actions
        </CardFooter>
      </Card>
    );
    
    expect(getByText('Complete Card')).toBeInTheDocument();
    expect(getByText('This is a complete card example')).toBeInTheDocument();
    expect(getByText('Card content area with details')).toBeInTheDocument();
    expect(getByText('Footer actions')).toBeInTheDocument();
  });
}); 