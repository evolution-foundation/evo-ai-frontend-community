import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancesPage from './FinancesPage';
import { financialTransactionsService, recurringTransactionsService } from '@/services/finances/financesService';

vi.mock('@/services/finances/financesService', () => ({
  financialTransactionsService: {
    getTransactions: vi.fn(),
    getTransaction: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
  },
  recurringTransactionsService: {
    getRecurringTransactions: vi.fn(),
    createRecurringTransaction: vi.fn(),
    updateRecurringTransaction: vi.fn(),
    deleteRecurringTransaction: vi.fn(),
  },
}));

const mockPage = () =>
  render(
    <MemoryRouter>
      <FinancesPage />
    </MemoryRouter>,
  );

describe('FinancesPage smoke', () => {
  beforeEach(() => {
    vi.mocked(financialTransactionsService.getTransactions).mockResolvedValue([
      {
        id: '1',
        kind: 'expense',
        scope: 'store',
        description: 'Aluguel',
        category: 'Fixas',
        amount: 1000,
        transaction_date: new Date().toISOString(),
        recurring_transaction_id: null,
        occurrence_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        kind: 'income',
        scope: 'personal',
        description: 'Freelance',
        category: 'Extra',
        amount: 500,
        transaction_date: new Date().toISOString(),
        recurring_transaction_id: null,
        occurrence_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(recurringTransactionsService.getRecurringTransactions).mockResolvedValue([]);
  });

  it('renders without crashing (default tab)', async () => {
    let error: unknown = null;
    try {
      mockPage();
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    expect(await screen.findByText('Despesas Loja')).toBeInTheDocument();
  });

  it('renders with empty data', async () => {
    vi.mocked(financialTransactionsService.getTransactions).mockResolvedValue([]);
    let error: unknown = null;
    try {
      mockPage();
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    expect(await screen.findByText('Despesas Loja')).toBeInTheDocument();
  });

  it('renders combined Histórico tab with both scopes in the same table', async () => {
    let error: unknown = null;
    try {
      mockPage();
      await screen.findByText('Aluguel');
      fireEvent.click(screen.getByRole('button', { name: 'Histórico' }));
      await screen.findByText('Freelance');
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    expect(screen.getByText('Origem')).toBeInTheDocument();
    expect(screen.getByText('Loja')).toBeInTheDocument();
    expect(screen.getByText('Pessoal')).toBeInTheDocument();
  });
});
