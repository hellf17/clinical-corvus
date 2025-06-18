import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion';

describe('Accordion', () => {
  it('renders with all items closed by default', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    // Triggers should be visible
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
    
    // Content should be hidden initially
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('opens an item when clicked in single type mode', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    // Click first trigger
    fireEvent.click(screen.getByText('Section 1'));
    
    // First content should now be visible
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    
    // Second content should remain hidden
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    
    // Click second trigger
    fireEvent.click(screen.getByText('Section 2'));
    
    // First content should be hidden again (since it's single mode)
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    
    // Second content should now be visible
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('allows multiple items to be open in multiple type mode', () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    // Click first trigger
    fireEvent.click(screen.getByText('Section 1'));
    
    // First content should be visible
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    
    // Click second trigger
    fireEvent.click(screen.getByText('Section 2'));
    
    // Both contents should be visible (since it's multiple mode)
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    
    // Click first trigger again to close it
    fireEvent.click(screen.getByText('Section 1'));
    
    // First content should be hidden
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    
    // Second content should still be visible
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('applies custom class name to each component', () => {
    render(
      <Accordion className="custom-accordion" type="single">
        <AccordionItem className="custom-item" value="item-1">
          <AccordionTrigger className="custom-trigger">Section 1</AccordionTrigger>
          <AccordionContent className="custom-content">Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    // Check if custom classes are applied
    const accordion = screen.getByText('Section 1').closest('.custom-accordion');
    expect(accordion).toHaveClass('custom-accordion');
    
    const item = screen.getByText('Section 1').closest('.custom-item');
    expect(item).toHaveClass('custom-item');
    
    const trigger = screen.getByText('Section 1');
    expect(trigger.closest('button')).toHaveClass('custom-trigger');
    
    // Open the item to check content
    fireEvent.click(screen.getByText('Section 1'));
    
    const content = screen.getByText('Content 1').closest('div');
    expect(content).toHaveClass('custom-content');
  });

  it('forwards additional props to trigger button', () => {
    const handleClick = jest.fn();
    
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger onClick={handleClick} data-testid="trigger">
            Section 1
          </AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);
    
    expect(handleClick).toHaveBeenCalled();
  });
}); 