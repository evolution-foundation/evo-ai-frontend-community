import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotaFiscalPage from './NotaFiscalPage';

vi.mock('@/services/finances/financesService', () => ({
  financialTransactionsService: {
    getTransactions: vi.fn(),
    getTransaction: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
  },
}));

describe('NotaFiscalPage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows the fiscal module heading', async () => {
    let error: unknown = null;
    try {
      render(<NotaFiscalPage />);
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    expect(screen.getByText(/Nota Fiscal & Módulo Fiscal/i)).toBeInTheDocument();
  });

  it('embeds the fiscal app in an iframe pointing to the static file', () => {
    render(<NotaFiscalPage />);
    const frame = screen.getByTitle('Módulo Fiscal');
    expect(frame).toBeInTheDocument();
    expect(frame.getAttribute('src')).toBe('/nota-fiscal.html');
  });
});
