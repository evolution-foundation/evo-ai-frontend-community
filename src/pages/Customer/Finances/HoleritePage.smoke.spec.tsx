import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HoleritePage from './HoleritePage';
import { financialTransactionsService } from '@/services/finances/financesService';

vi.mock('@/services/finances/financesService', () => ({
  financialTransactionsService: {
    getTransactions: vi.fn(),
    getTransaction: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
  },
}));

const mockPage = () => render(<HoleritePage />);

describe('HoleritePage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(financialTransactionsService.createTransaction).mockResolvedValue({
      id: '1',
      kind: 'expense',
      scope: 'store',
      description: 'Salário João da Silva — 06/2026',
      category: 'Folha de Pagamento',
      amount: 1000,
      transaction_date: new Date().toISOString(),
      recurring_transaction_id: null,
      occurrence_number: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it('renders without crashing and shows the pay stub panel', async () => {
    let error: unknown = null;
    try {
      mockPage();
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    expect(await screen.findByText('Holerite & RH')).toBeInTheDocument();
    expect(screen.getByText('Emitir Pagamento')).toBeInTheDocument();
    expect(screen.getByText(/Recibo de/)).toBeInTheDocument();
  });

  it('emits a store expense on "Emitir Pagamento"', async () => {
    mockPage();
    fireEvent.click(screen.getByRole('button', { name: /Emitir Pagamento/i }));
    expect(financialTransactionsService.createTransaction).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(financialTransactionsService.createTransaction).mock.calls[0][0];
    expect(payload.kind).toBe('expense');
    expect(payload.scope).toBe('store');
    expect(payload.description).toContain('Salário João da Silva');
  });
});
