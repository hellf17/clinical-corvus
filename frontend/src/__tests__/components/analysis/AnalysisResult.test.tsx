import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AnalysisResult from '@/components/analysis/AnalysisResult';

describe('AnalysisResult', () => {
  const defaultProps = {
    title: 'Test Analysis',
    interpretation: 'Test interpretation message',
    abnormalities: [],
    recommendations: [],
    isCritical: false,
    details: {}
  };

  describe('Basic Rendering', () => {
    it('should render with minimal props', () => {
      render(<AnalysisResult {...defaultProps} />);
      
      expect(screen.getByText('Test Analysis')).toBeInTheDocument();
      expect(screen.getByText('Test interpretation message')).toBeInTheDocument();
    });

    it('should display title correctly', () => {
      render(<AnalysisResult {...defaultProps} title="Blood Gas Analysis" />);
      
      expect(screen.getByText('Blood Gas Analysis')).toBeInTheDocument();
    });

    it('should display interpretation text', () => {
      const interpretation = 'Normal blood gas values with adequate oxygenation and ventilation.';
      render(<AnalysisResult {...defaultProps} interpretation={interpretation} />);
      
      expect(screen.getByText(interpretation)).toBeInTheDocument();
    });

    it('should preserve line breaks in interpretation', () => {
      const interpretationWithLineBreaks = 'Line 1\nLine 2\nLine 3';
      render(<AnalysisResult {...defaultProps} interpretation={interpretationWithLineBreaks} />);
      
      // Use a more flexible matcher for multiline text
      const interpretationElement = screen.getByText((content, node) => {
        const hasText = (node: Element | null) => node?.textContent === interpretationWithLineBreaks;
        const nodeHasText = hasText(node as Element);
        const childrenDontHaveText = Array.from(node?.children || []).every(child => !hasText(child));
        return nodeHasText && childrenDontHaveText;
      });
      expect(interpretationElement).toHaveClass('whitespace-pre-line');
    });
  });

  describe('Status Badge Display', () => {
    it('should show Normal badge for normal results', () => {
      render(<AnalysisResult {...defaultProps} isCritical={false} abnormalities={[]} />);
      
      expect(screen.getByText('Normal')).toBeInTheDocument();
      // The badge has the capitalize class, but it's on a different element
      const badgeContainer = screen.getByText('Normal').closest('[class*="capitalize"]');
      expect(badgeContainer).toBeInTheDocument();
    });

    it('should show Alterado badge for abnormal but non-critical results', () => {
      render(<AnalysisResult 
        {...defaultProps} 
        isCritical={false} 
        abnormalities={['Mild elevation']} 
      />);
      
      expect(screen.getByText('Alterado')).toBeInTheDocument();
    });

    it('should show Crítico badge for critical results', () => {
      render(<AnalysisResult 
        {...defaultProps} 
        isCritical={true} 
        abnormalities={['Critical value']} 
      />);
      
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });

    it('should display critical warning banner for critical results', () => {
      render(<AnalysisResult 
        {...defaultProps} 
        isCritical={true} 
        abnormalities={['Critical finding']} 
      />);
      
      expect(screen.getByText(/Atenção: Resultado crítico que requer intervenção imediata/)).toBeInTheDocument();
    });

    it('should not display critical banner for non-critical results', () => {
      render(<AnalysisResult 
        {...defaultProps} 
        isCritical={false} 
        abnormalities={['Minor abnormality']} 
      />);
      
      expect(screen.queryByText(/Atenção: Resultado crítico/)).not.toBeInTheDocument();
    });
  });

  describe('Abnormalities Section', () => {
    it('should not display abnormalities section when empty', () => {
      render(<AnalysisResult {...defaultProps} abnormalities={[]} />);
      
      expect(screen.queryByText('Alterações Identificadas:')).not.toBeInTheDocument();
    });

    it('should display abnormalities section with single abnormality', () => {
      const abnormalities = ['pH value is slightly low'];
      render(<AnalysisResult {...defaultProps} abnormalities={abnormalities} />);
      
      expect(screen.getByText('Alterações Identificadas:')).toBeInTheDocument();
      expect(screen.getByText('pH value is slightly low')).toBeInTheDocument();
    });

    it('should display multiple abnormalities as list items', () => {
      const abnormalities = [
        'pH value is low',
        'pCO2 is elevated', 
        'Bicarbonate is within normal limits'
      ];
      render(<AnalysisResult {...defaultProps} abnormalities={abnormalities} />);
      
      expect(screen.getByText('Alterações Identificadas:')).toBeInTheDocument();
      
      abnormalities.forEach(abnormality => {
        expect(screen.getByText(abnormality)).toBeInTheDocument();
      });

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('should render abnormalities in correct list structure', () => {
      const abnormalities = ['Abnormality 1', 'Abnormality 2'];
      render(<AnalysisResult {...defaultProps} abnormalities={abnormalities} />);
      
      const list = screen.getByRole('list');
      expect(list).toHaveClass('list-disc', 'space-y-1', 'pl-5');
      
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });
  });

  describe('Recommendations Section', () => {
    it('should not display recommendations section when empty', () => {
      render(<AnalysisResult {...defaultProps} recommendations={[]} />);
      
      expect(screen.queryByText('Recomendações:')).not.toBeInTheDocument();
    });

    it('should display recommendations section with single recommendation', () => {
      const recommendations = ['Monitor patient closely'];
      render(<AnalysisResult {...defaultProps} recommendations={recommendations} />);
      
      expect(screen.getByText('Recomendações:')).toBeInTheDocument();
      expect(screen.getByText('Monitor patient closely')).toBeInTheDocument();
    });

    it('should display multiple recommendations as list items', () => {
      const recommendations = [
        'Continue current treatment',
        'Order arterial blood gas in 4 hours',
        'Consider respiratory therapy consultation'
      ];
      render(<AnalysisResult {...defaultProps} recommendations={recommendations} />);
      
      expect(screen.getByText('Recomendações:')).toBeInTheDocument();
      
      recommendations.forEach(recommendation => {
        expect(screen.getByText(recommendation)).toBeInTheDocument();
      });

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    it('should apply correct styling to recommendations list', () => {
      const recommendations = ['Recommendation 1'];
      render(<AnalysisResult {...defaultProps} recommendations={recommendations} />);
      
      const list = screen.getByRole('list');
      expect(list).toHaveClass('list-disc', 'space-y-1', 'pl-5', 'text-sm', 'text-primary');
    });
  });

  describe('Details Section', () => {
    it('should not display details section when empty', () => {
      render(<AnalysisResult {...defaultProps} details={{}} />);
      
      expect(screen.queryByText('Detalhes dos Parâmetros:')).not.toBeInTheDocument();
    });

    it('should display details section with single parameter', () => {
      const details = { pH: 7.35 };
      render(<AnalysisResult {...defaultProps} details={details} />);
      
      expect(screen.getByText('Detalhes dos Parâmetros:')).toBeInTheDocument();
      expect(screen.getByText('pH: 7.35')).toBeInTheDocument();
    });

    it('should display multiple parameters as badges', () => {
      const details = {
        pH: 7.35,
        pCO2: 45,
        pO2: 95,
        HCO3: 22
      };
      render(<AnalysisResult {...defaultProps} details={details} />);
      
      expect(screen.getByText('Detalhes dos Parâmetros:')).toBeInTheDocument();
      expect(screen.getByText('pH: 7.35')).toBeInTheDocument();
      expect(screen.getByText('pCO2: 45')).toBeInTheDocument();
      expect(screen.getByText('pO2: 95')).toBeInTheDocument();
      expect(screen.getByText('HCO3: 22')).toBeInTheDocument();
    });

    it('should filter out null and undefined values from details', () => {
      const details = {
        pH: 7.35,
        pCO2: null,
        pO2: undefined,
        HCO3: 0,
        valid: 'test'
      };
      render(<AnalysisResult {...defaultProps} details={details} />);
      
      expect(screen.getByText('pH: 7.35')).toBeInTheDocument();
      expect(screen.getByText('HCO3: 0')).toBeInTheDocument(); // 0 should be shown
      expect(screen.getByText('valid: test')).toBeInTheDocument();
      expect(screen.queryByText(/pCO2:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/pO2:/)).not.toBeInTheDocument();
    });

    it('should handle string and numeric detail values', () => {
      const details = {
        numericValue: 123.45,
        stringValue: 'Normal',
        booleanValue: true,
        zeroValue: 0
      };
      render(<AnalysisResult {...defaultProps} details={details} />);
      
      expect(screen.getByText('numericValue: 123.45')).toBeInTheDocument();
      expect(screen.getByText('stringValue: Normal')).toBeInTheDocument();
      expect(screen.getByText('booleanValue: true')).toBeInTheDocument();
      expect(screen.getByText('zeroValue: 0')).toBeInTheDocument();
    });

    it('should apply correct badge styling to detail items', () => {
      const details = { pH: 7.35 };
      render(<AnalysisResult {...defaultProps} details={details} />);
      
      const badge = screen.getByText('pH: 7.35').closest('[class*="font-normal"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Combined Content Display', () => {
    it('should display all sections when all data is provided', () => {
      const props = {
        title: 'Complete Analysis',
        interpretation: 'Mixed acid-base disorder',
        abnormalities: ['pH low', 'pCO2 elevated'],
        recommendations: ['Start treatment', 'Monitor closely'],
        isCritical: true,
        details: { pH: 7.25, pCO2: 55 }
      };
      
      render(<AnalysisResult {...props} />);
      
      // Check all sections are present
      expect(screen.getByText('Complete Analysis')).toBeInTheDocument();
      expect(screen.getByText('Mixed acid-base disorder')).toBeInTheDocument();
      expect(screen.getByText('Crítico')).toBeInTheDocument();
      expect(screen.getByText('Alterações Identificadas:')).toBeInTheDocument();
      expect(screen.getByText('Recomendações:')).toBeInTheDocument();
      expect(screen.getByText('Detalhes dos Parâmetros:')).toBeInTheDocument();
      expect(screen.getByText(/Atenção: Resultado crítico/)).toBeInTheDocument();
    });

    it('should handle partial data gracefully', () => {
      const props = {
        title: 'Partial Analysis',
        interpretation: 'Some interpretation',
        abnormalities: ['One abnormality'],
        recommendations: [], // Empty
        isCritical: false,
        details: {} // Empty
      };
      
      render(<AnalysisResult {...props} />);
      
      expect(screen.getByText('Partial Analysis')).toBeInTheDocument();
      expect(screen.getByText('Some interpretation')).toBeInTheDocument();
      expect(screen.getByText('Alterações Identificadas:')).toBeInTheDocument();
      expect(screen.queryByText('Recomendações:')).not.toBeInTheDocument();
      expect(screen.queryByText('Detalhes dos Parâmetros:')).not.toBeInTheDocument();
    });
  });

  describe('Card Styling', () => {
    it('should apply critical border for critical results', () => {
      render(<AnalysisResult {...defaultProps} isCritical={true} />);
      
      const card = screen.getByText('Test Analysis').closest('.mb-2');
      expect(card).toHaveClass('border-destructive');
    });

    it('should not apply critical border for normal results', () => {
      render(<AnalysisResult {...defaultProps} isCritical={false} />);
      
      const card = screen.getByText('Test Analysis').closest('.mb-2');
      expect(card).not.toHaveClass('border-destructive');
    });

    it('should have proper card structure', () => {
      render(<AnalysisResult {...defaultProps} />);
      
      // Should have proper card structure with title and content
      expect(screen.getByText('Test Analysis')).toBeInTheDocument();
      expect(screen.getByText('Test interpretation message')).toBeInTheDocument();
      
      // Check for proper semantic structure
      const title = screen.getByText('Test Analysis');
      expect(title.tagName.toLowerCase()).toBe('h3'); // CardTitle should be h3
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<AnalysisResult {...defaultProps} title="Analysis Title" />);
      
      const title = screen.getByText('Analysis Title');
      expect(title.tagName.toLowerCase()).toBe('h3'); // CardTitle should render as h3
    });

    it('should have proper list semantics for abnormalities', () => {
      const abnormalities = ['Abnormal 1', 'Abnormal 2'];
      render(<AnalysisResult {...defaultProps} abnormalities={abnormalities} />);
      
      const list = screen.getByRole('list');
      const items = screen.getAllByRole('listitem');
      
      expect(list).toBeInTheDocument();
      expect(items).toHaveLength(2);
    });

    it('should have proper list semantics for recommendations', () => {
      const recommendations = ['Rec 1', 'Rec 2'];
      render(<AnalysisResult {...defaultProps} recommendations={recommendations} />);
      
      const lists = screen.getAllByRole('list');
      expect(lists).toHaveLength(1); // Should have one list for recommendations
      
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('should provide appropriate visual hierarchy', () => {
      const props = {
        ...defaultProps,
        abnormalities: ['Abnormality'],
        recommendations: ['Recommendation'],
        details: { param: 'value' }
      };
      
      render(<AnalysisResult {...props} />);
      
      // Section headings should be h4
      const sectionHeadings = [
        screen.getByText('Alterações Identificadas:'),
        screen.getByText('Recomendações:'),
        screen.getByText('Detalhes dos Parâmetros:')
      ];
      
      sectionHeadings.forEach(heading => {
        expect(heading.tagName.toLowerCase()).toBe('h4');
        expect(heading).toHaveClass('font-medium');
      });
    });

    it('should have appropriate color contrast for different states', () => {
      // Normal state
      render(<AnalysisResult {...defaultProps} />);
      expect(screen.getByText('Normal')).toBeInTheDocument();
      
      // Abnormal state  
      render(<AnalysisResult {...defaultProps} abnormalities={['Issue']} />);
      expect(screen.getByText('Alterado')).toBeInTheDocument();
      
      // Critical state
      render(<AnalysisResult {...defaultProps} isCritical={true} />);
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values gracefully', () => {
      const props = {
        title: '',
        interpretation: '',
        abnormalities: [''],
        recommendations: [''],
        isCritical: false,
        details: { empty: '' }
      };
      
      render(<AnalysisResult {...props} />);
      
      // Should not crash and should handle empty values
      expect(screen.getByText('empty:')).toBeInTheDocument();
    });

    it('should handle very long interpretation text', () => {
      const longInterpretation = 'A'.repeat(1000);
      render(<AnalysisResult {...defaultProps} interpretation={longInterpretation} />);
      
      expect(screen.getByText(longInterpretation)).toBeInTheDocument();
    });

    it('should handle special characters in text content', () => {
      const specialChars = 'Special chars: ñáéíóú çÇ <>&"\'';
      render(<AnalysisResult {...defaultProps} interpretation={specialChars} />);
      
      expect(screen.getByText(specialChars)).toBeInTheDocument();
    });

    it('should handle numeric values in abnormalities and recommendations', () => {
      const props = {
        ...defaultProps,
        abnormalities: ['pH: 7.25 (normal: 7.35-7.45)'],
        recommendations: ['Target pCO2: 35-45 mmHg'],
        details: { 'complex-key': 'complex-value' }
      };
      
      render(<AnalysisResult {...props} />);
      
      expect(screen.getByText('pH: 7.25 (normal: 7.35-7.45)')).toBeInTheDocument();
      expect(screen.getByText('Target pCO2: 35-45 mmHg')).toBeInTheDocument();
      expect(screen.getByText('complex-key: complex-value')).toBeInTheDocument();
    });
  });
});