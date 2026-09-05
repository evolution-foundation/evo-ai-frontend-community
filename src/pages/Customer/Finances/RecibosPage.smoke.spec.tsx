import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecibosPage from './RecibosPage';

vi.mock('@/services/finances/financesService', () => ({
  financialTransactionsService: {
    createTransaction: vi.fn(),
  },
  receiptExtractionService: {
    extract: vi.fn(),
    getProvidersStatus: vi.fn().mockResolvedValue({ openai: true, gemini: false }),
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RecibosPage />
    </MemoryRouter>,
  );

describe('RecibosPage smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows the upload dropzone', () => {
    let error: unknown = null;
    try {
      renderPage();
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    expect(screen.getByText('Notas & Recibos')).toBeInTheDocument();
    expect(screen.getByText(/Clique ou arraste as fotos/i)).toBeInTheDocument();
  });

  it('shows the empty state when no receipts were uploaded yet', () => {
    renderPage();
    expect(screen.getByText(/Nenhuma nota enviada ainda/i)).toBeInTheDocument();
  });

  it('shows the AI provider selector', () => {
    renderPage();
    expect(screen.getByText('Provedor de IA')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
  });
});
