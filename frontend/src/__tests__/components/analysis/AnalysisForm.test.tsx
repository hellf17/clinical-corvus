import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import AnalysisForm from '@/components/analysis/AnalysisForm';
import analysisService from '@/services/analysisService';

// Mock the analysis service
jest.mock('@/services/analysisService', () => ({
  default: {
    analyzeBloodGas: jest.fn(),
    analyzeElectrolytes: jest.fn(),
    analyzeHematology: jest.fn(),
    analyzeRenal: jest.fn(),
    analyzeHepatic: jest.fn(),
    analyzeCardiac: jest.fn(),
    analyzeMicrobiology: jest.fn(),
    analyzeMetabolic: jest.fn(),
    calculateSofa: jest.fn(),
  }
}));

// Mock the AnalysisResult component
jest.mock('@/components/analysis/AnalysisResult', () => ({
  default: ({ title, interpretation }: { title: string; interpretation: string }) => (
    <div data-testid="analysis-result">
      <h3>{title}</h3>
      <p>{interpretation}</p>
    </div>
  )
}));

const mockAnalysisService = analysisService as {
  analyzeBloodGas: jest.MockedFunction<any>;
  analyzeElectrolytes: jest.MockedFunction<any>;
  analyzeHematology: jest.MockedFunction<any>;
  analyzeRenal: jest.MockedFunction<any>;
  analyzeHepatic: jest.MockedFunction<any>;
  analyzeCardiac: jest.MockedFunction<any>;
  analyzeMicrobiology: jest.MockedFunction<any>;
  analyzeMetabolic: jest.MockedFunction<any>;
  calculateSofa: jest.MockedFunction<any>;
};

describe('AnalysisForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the analysis form with default blood gas type', () => {
      render(<AnalysisForm />);
      
      expect(screen.getByText('Análise Clínica')).toBeInTheDocument();
      expect(screen.getByLabelText('Tipo de Análise')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analisar/i })).toBeInTheDocument();
    });

    it('should display analysis type selector with all available options', async () => {
      render(<AnalysisForm />);
      
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      
      const expectedTypes = [
        'Gasometria Arterial',
        'Eletrólitos',
        'Hemograma',
        'Função Renal',
        'Função Hepática',
        'Marcadores Cardíacos',
        'Microbiologia',
        'Metabólico',
        'Escore SOFA'
      ];
      
      for (const type of expectedTypes) {
        expect(screen.getByText(type)).toBeInTheDocument();
      }
    });

    it('should render blood gas form fields by default', () => {
      render(<AnalysisForm />);
      
      expect(screen.getByLabelText(/pH/)).toBeInTheDocument();
      expect(screen.getByLabelText(/pCO2/)).toBeInTheDocument();
      expect(screen.getByLabelText(/HCO3/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Excesso de Base/)).toBeInTheDocument();
    });
  });

  describe('Analysis Type Selection', () => {
    it('should change form fields when analysis type changes', async () => {
      render(<AnalysisForm />);
      
      // Initially should show blood gas fields
      expect(screen.getByLabelText(/pH/)).toBeInTheDocument();
      
      // Change to electrolytes
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Eletrólitos'));
      
      // Should now show electrolyte fields
      expect(screen.queryByLabelText(/pH/)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Sódio/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Potássio/)).toBeInTheDocument();
    });

    it('should clear form data and results when analysis type changes', async () => {
      render(<AnalysisForm />);
      
      // Fill in some data
      const phInput = screen.getByLabelText(/pH/);
      await user.type(phInput, '7.4');
      
      // Change analysis type
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Eletrólitos'));
      
      // Change back to blood gas
      await user.click(selector);
      await user.click(screen.getByText('Gasometria Arterial'));
      
      // pH field should be empty
      expect(screen.getByLabelText(/pH/)).toHaveValue('');
    });

    it('should render hematology fields correctly', async () => {
      render(<AnalysisForm />);
      
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Hemograma'));
      
      expect(screen.getByLabelText(/Hemoglobina/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hematócrito/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Leucócitos/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Plaquetas/)).toBeInTheDocument();
    });

    it('should render renal function fields correctly', async () => {
      render(<AnalysisForm />);
      
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Função Renal'));
      
      expect(screen.getByLabelText(/Creatinina/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ureia/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ácido Úrico/)).toBeInTheDocument();
      expect(screen.getByLabelText(/TFG estimada/)).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should handle numeric input correctly', async () => {
      render(<AnalysisForm />);
      
      const phInput = screen.getByLabelText(/pH/);
      await user.type(phInput, '7.35');
      
      expect(phInput).toHaveValue(7.35);
    });

    it('should display units in field labels', () => {
      render(<AnalysisForm />);
      
      expect(screen.getByLabelText(/pCO2 \(mmHg\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/HCO3 \(mEq\/L\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Excesso de Base \(mEq\/L\)/)).toBeInTheDocument();
    });

    it('should mark required fields appropriately', () => {
      render(<AnalysisForm />);
      
      // pH, pCO2, and HCO3 should be required for blood gas
      expect(screen.getByLabelText(/pH/)).toBeRequired();
      expect(screen.getByLabelText(/pCO2/)).toBeRequired();
      expect(screen.getByLabelText(/HCO3/)).toBeRequired();
      
      // Other fields should not be required
      expect(screen.getByLabelText(/pO2/)).not.toBeRequired();
      expect(screen.getByLabelText(/Excesso de Base/)).not.toBeRequired();
    });

    it('should clear input values when form is reset', async () => {
      render(<AnalysisForm />);
      
      const phInput = screen.getByLabelText(/pH/);
      const pco2Input = screen.getByLabelText(/pCO2/);
      
      await user.type(phInput, '7.4');
      await user.type(pco2Input, '40');
      
      // Change analysis type to reset form
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Eletrólitos'));
      await user.click(selector);
      await user.click(screen.getByText('Gasometria Arterial'));
      
      expect(screen.getByLabelText(/pH/)).toHaveValue('');
      expect(screen.getByLabelText(/pCO2/)).toHaveValue('');
    });
  });

  describe('Form Submission', () => {
    it('should call appropriate analysis service for blood gas', async () => {
      const mockResult = {
        interpretation: 'Normal blood gas values',
        abnormalities: [],
        is_critical: false,
        recommendations: [],
        details: {}
      };
      
      mockAnalysisService.analyzeBloodGas.mockResolvedValue(mockResult);
      
      render(<AnalysisForm />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(mockAnalysisService.analyzeBloodGas).toHaveBeenCalledWith({
          ph: 7.4,
          pco2: 40,
          hco3: 24,
          po2: '',
          be: '',
          o2sat: '',
          lactate: ''
        });
      });
    });

    it('should call appropriate analysis service for electrolytes', async () => {
      const mockResult = {
        interpretation: 'Normal electrolyte values',
        abnormalities: [],
        is_critical: false,
        recommendations: [],
        details: {}
      };
      
      mockAnalysisService.analyzeElectrolytes.mockResolvedValue(mockResult);
      
      render(<AnalysisForm />);
      
      // Change to electrolytes
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Eletrólitos'));
      
      // Fill some fields
      await user.type(screen.getByLabelText(/Sódio/), '140');
      await user.type(screen.getByLabelText(/Potássio/), '4.0');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(mockAnalysisService.analyzeElectrolytes).toHaveBeenCalledWith({
          sodium: 140,
          potassium: 4.0,
          chloride: '',
          bicarbonate: '',
          calcium: '',
          magnesium: '',
          phosphorus: ''
        });
      });
    });

    it('should call appropriate analysis service for hematology', async () => {
      const mockResult = {
        interpretation: 'Normal hematology values',
        abnormalities: [],
        is_critical: false,
        recommendations: [],
        details: {}
      };
      
      mockAnalysisService.analyzeHematology.mockResolvedValue(mockResult);
      
      render(<AnalysisForm />);
      
      // Change to hematology
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Hemograma'));
      
      // Fill some fields
      await user.type(screen.getByLabelText(/Hemoglobina/), '14');
      await user.type(screen.getByLabelText(/Leucócitos/), '7000');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(mockAnalysisService.analyzeHematology).toHaveBeenCalledWith({
          hemoglobin: 14,
          hematocrit: '',
          wbc: 7000,
          platelet: '',
          neutrophils: '',
          lymphocytes: '',
          monocytes: '',
          eosinophils: '',
          basophils: ''
        });
      });
    });

    it('should display loading state during submission', async () => {
      mockAnalysisService.analyzeBloodGas.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<AnalysisForm />);
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      expect(screen.getByRole('button', { name: /analisar/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /analisar/i })).toHaveAttribute('isLoading');
    });

    it('should display results after successful analysis', async () => {
      const mockResult = {
        interpretation: 'Normal blood gas values indicating adequate ventilation',
        abnormalities: [],
        is_critical: false,
        recommendations: ['Continue current treatment'],
        details: { ph: 7.4, pco2: 40 }
      };
      
      mockAnalysisService.analyzeBloodGas.mockResolvedValue(mockResult);
      
      render(<AnalysisForm />);
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('analysis-result')).toBeInTheDocument();
        expect(screen.getByText('Gasometria Arterial')).toBeInTheDocument();
        expect(screen.getByText('Normal blood gas values indicating adequate ventilation')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when analysis fails', async () => {
      mockAnalysisService.analyzeBloodGas.mockRejectedValue(new Error('Analysis failed'));
      
      render(<AnalysisForm />);
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Ocorreu um erro ao processar a análise/)).toBeInTheDocument();
      });
    });

    it('should clear error message when analysis type changes', async () => {
      mockAnalysisService.analyzeBloodGas.mockRejectedValue(new Error('Analysis failed'));
      
      render(<AnalysisForm />);
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Ocorreu um erro ao processar a análise/)).toBeInTheDocument();
      });
      
      // Change analysis type
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Eletrólitos'));
      
      expect(screen.queryByText(/Ocorreu um erro ao processar a análise/)).not.toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      mockAnalysisService.analyzeBloodGas.mockRejectedValue(new Error('Network Error'));
      
      render(<AnalysisForm />);
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Ocorreu um erro ao processar a análise/)).toBeInTheDocument();
      });
      
      // Button should be re-enabled after error
      expect(screen.getByRole('button', { name: /analisar/i })).not.toBeDisabled();
    });

    it('should handle unsupported analysis type', async () => {
      render(<AnalysisForm />);
      
      // Manually set an unsupported analysis type (this would be edge case)
      const component = screen.getByRole('combobox').closest('form');
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      // Simulate form submission with invalid type
      const form = component?.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      // Should not crash and should handle gracefully
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for form elements', () => {
      render(<AnalysisForm />);
      
      expect(screen.getByLabelText('Tipo de Análise')).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/pH/)).toHaveAttribute('id');
      expect(screen.getByLabelText(/pCO2/)).toHaveAttribute('id');
    });

    it('should support keyboard navigation', async () => {
      render(<AnalysisForm />);
      
      const selector = screen.getByRole('combobox');
      selector.focus();
      
      expect(document.activeElement).toBe(selector);
      
      // Tab to next element
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/pH/));
    });

    it('should announce loading state to screen readers', async () => {
      mockAnalysisService.analyzeBloodGas.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<AnalysisForm />);
      
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      const submitButton = screen.getByRole('button', { name: /analisar/i });
      expect(submitButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields before submission', async () => {
      render(<AnalysisForm />);
      
      // Try to submit without required fields
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      // Form should not submit due to browser validation
      expect(mockAnalysisService.analyzeBloodGas).not.toHaveBeenCalled();
    });

    it('should accept valid numeric input', async () => {
      render(<AnalysisForm />);
      
      const phInput = screen.getByLabelText(/pH/);
      await user.type(phInput, '7.35');
      
      expect(phInput).toHaveValue(7.35);
      expect(phInput).toBeValid();
    });

    it('should handle decimal values correctly', async () => {
      render(<AnalysisForm />);
      
      const phInput = screen.getByLabelText(/pH/);
      await user.type(phInput, '7.387');
      
      expect(phInput).toHaveValue(7.387);
    });

    it('should handle negative values for appropriate fields', async () => {
      render(<AnalysisForm />);
      
      const beInput = screen.getByLabelText(/Excesso de Base/);
      await user.type(beInput, '-5.2');
      
      expect(beInput).toHaveValue(-5.2);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow from input to results', async () => {
      const mockResult = {
        interpretation: 'Mild respiratory acidosis with metabolic compensation',
        abnormalities: ['pH slightly low', 'pCO2 elevated'],
        is_critical: false,
        recommendations: ['Monitor closely', 'Consider respiratory support'],
        details: { ph: 7.32, pco2: 48, hco3: 26 }
      };
      
      mockAnalysisService.analyzeBloodGas.mockResolvedValue(mockResult);
      
      render(<AnalysisForm />);
      
      // Fill form
      await user.type(screen.getByLabelText(/pH/), '7.32');
      await user.type(screen.getByLabelText(/pCO2/), '48');
      await user.type(screen.getByLabelText(/HCO3/), '26');
      await user.type(screen.getByLabelText(/Excesso de Base/), '1.5');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      // Verify service call
      await waitFor(() => {
        expect(mockAnalysisService.analyzeBloodGas).toHaveBeenCalledWith({
          ph: 7.32,
          pco2: 48,
          hco3: 26,
          po2: '',
          be: 1.5,
          o2sat: '',
          lactate: ''
        });
      });
      
      // Verify results display
      await waitFor(() => {
        expect(screen.getByTestId('analysis-result')).toBeInTheDocument();
        expect(screen.getByText(/Mild respiratory acidosis/)).toBeInTheDocument();
      });
    });

    it('should handle multiple analysis types in sequence', async () => {
      const bloodGasResult = { interpretation: 'Blood gas normal', abnormalities: [], is_critical: false, recommendations: [], details: {} };
      const electrolyteResult = { interpretation: 'Electrolytes normal', abnormalities: [], is_critical: false, recommendations: [], details: {} };
      
      mockAnalysisService.analyzeBloodGas.mockResolvedValue(bloodGasResult);
      mockAnalysisService.analyzeElectrolytes.mockResolvedValue(electrolyteResult);
      
      render(<AnalysisForm />);
      
      // First analysis - blood gas
      await user.type(screen.getByLabelText(/pH/), '7.4');
      await user.type(screen.getByLabelText(/pCO2/), '40');
      await user.type(screen.getByLabelText(/HCO3/), '24');
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Blood gas normal')).toBeInTheDocument();
      });
      
      // Change to electrolytes
      const selector = screen.getByRole('combobox');
      await user.click(selector);
      await user.click(screen.getByText('Eletrólitos'));
      
      // Second analysis - electrolytes
      await user.type(screen.getByLabelText(/Sódio/), '140');
      await user.type(screen.getByLabelText(/Potássio/), '4.0');
      await user.click(screen.getByRole('button', { name: /analisar/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Electrolytes normal')).toBeInTheDocument();
      });
      
      // Both services should have been called
      expect(mockAnalysisService.analyzeBloodGas).toHaveBeenCalledTimes(1);
      expect(mockAnalysisService.analyzeElectrolytes).toHaveBeenCalledTimes(1);
    });
  });
});