
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BiasLibraryComponent from '@/components/academy/metacognition/BiasLibraryComponent';

describe('BiasLibraryComponent', () => {
  const mockOnBiasSelected = jest.fn();
  const mockOnTransferToAnalysis = jest.fn();

  beforeEach(() => {
    mockOnBiasSelected.mockClear();
    mockOnTransferToAnalysis.mockClear();
  });

  it('renders the library and quiz tabs', () => {
    render(<BiasLibraryComponent />);
    expect(screen.getByRole('heading', { name: /Biblioteca de Vieses Cognitivos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Biblioteca/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Quiz Interativo/i })).toBeInTheDocument();
  });

  describe('Library Tab', () => {
    it('filters biases by search term', async () => {
      render(<BiasLibraryComponent />);
      const searchInput = screen.getByPlaceholderText(/Nome, descrição, exemplo.../i);
      await userEvent.type(searchInput, 'Ancoragem');
      expect(screen.getByText('Ancoragem')).toBeInTheDocument();
      expect(screen.queryByText('Disponibilidade')).not.toBeInTheDocument();
    });

    it('expands a bias to show details', async () => {
      render(<BiasLibraryComponent />);
      const biasCard = screen.getByText('Ancoragem');
      fireEvent.click(biasCard);
      await waitFor(() => {
        expect(screen.getByText(/Exemplo Clínico/i)).toBeInTheDocument();
        expect(screen.getByText(/Estratégias de Mitigação/i)).toBeInTheDocument();
      });
    });

    it('calls onBiasSelected when the action button is clicked', async () => {
        render(<BiasLibraryComponent onBiasSelected={mockOnBiasSelected} />);
        const biasCard = screen.getByText('Ancoragem');
        fireEvent.click(biasCard);
        const analyzeButton = await screen.findByRole('button', { name: /Analisar Casos com Este Viés/i });
        fireEvent.click(analyzeButton);
        expect(mockOnBiasSelected).toHaveBeenCalledWith('Ancoragem', expect.any(String));
      });
  });

  describe('Quiz Tab', () => {
    it('allows the user to answer a question and see the result', async () => {
      render(<BiasLibraryComponent />);
      fireEvent.click(screen.getByRole('tab', { name: /Quiz Interativo/i }));

      const optionButton = screen.getByText(/Viés de Disponibilidade/i);
      fireEvent.click(optionButton);

      const confirmButton = screen.getByRole('button', { name: /Confirmar Resposta/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Correto!/i)).toBeInTheDocument();
        expect(screen.getByText(/Este é um exemplo clássico de viés de disponibilidade./i)).toBeInTheDocument();
      });
    });

    it('progresses to the next question', async () => {
        render(<BiasLibraryComponent />);
        fireEvent.click(screen.getByRole('tab', { name: /Quiz Interativo/i }));
      
        // Answer first question
        fireEvent.click(screen.getByText(/Viés de Disponibilidade/i));
        fireEvent.click(screen.getByRole('button', { name: /Confirmar Resposta/i }));
        const nextButton = await screen.findByRole('button', { name: /Próxima Pergunta/i });
        fireEvent.click(nextButton);
      
        // Now on the second question
        await waitFor(() => {
          expect(screen.getByText(/Pergunta 2 de 2/i)).toBeInTheDocument();
          expect(screen.getByText(/Uma paciente de 70 anos chega com "mal-estar geral"/i)).toBeInTheDocument();
        });
      });

    it('shows the final score after the last question', async () => {
        render(<BiasLibraryComponent />);
        fireEvent.click(screen.getByRole('tab', { name: /Quiz Interativo/i }));
      
        // Question 1
        fireEvent.click(screen.getByText(/Viés de Disponibilidade/i)); // Correct
        fireEvent.click(screen.getByRole('button', { name: /Confirmar Resposta/i }));
        let nextButton = await screen.findByRole('button', { name: /Próxima Pergunta/i });
        fireEvent.click(nextButton);

        // Question 2
        await waitFor(() => fireEvent.click(screen.getByText(/Viés de Representatividade/i))); // Correct
        fireEvent.click(screen.getByRole('button', { name: /Confirmar Resposta/i }));
        nextButton = await screen.findByRole('button', { name: /Finalizar Quiz/i });
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(screen.getByText(/Quiz Completo!/i)).toBeInTheDocument();
            expect(screen.getByText(/Você acertou 2 de 2 perguntas/i)).toBeInTheDocument();
          });
      });
  });
});
