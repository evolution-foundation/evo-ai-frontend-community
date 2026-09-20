import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OpenAIConfig from './OpenAIConfig';

// Radix UI Switch uses ResizeObserver internally
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const stableT = (key: string) => key;

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: stableT,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();

vi.mock('@/services/admin/adminConfigService', () => ({
  adminConfigService: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  },
}));

vi.mock('@/utils/apiHelpers', () => ({
  extractError: () => ({ message: 'Test error' }),
}));

const EMPTY_CONFIG: Record<string, unknown> = {
  OPENAI_API_URL: '',
  OPENAI_API_SECRET: null,
  OPENAI_MODEL: '',
  OPENAI_ENABLE_AUDIO_TRANSCRIPTION: false,
  OPENAI_PROMPT_REPLY: '',
  OPENAI_PROMPT_SUMMARY: '',
  OPENAI_PROMPT_REPHRASE: '',
  OPENAI_PROMPT_FIX_GRAMMAR: '',
  OPENAI_PROMPT_SHORTEN: '',
  OPENAI_PROMPT_EXPAND: '',
  OPENAI_PROMPT_FRIENDLY: '',
  OPENAI_PROMPT_FORMAL: '',
  OPENAI_PROMPT_SIMPLIFY: '',
};

async function renderAndWait(mockData: Record<string, unknown> = EMPTY_CONFIG) {
  mockGetConfig.mockImplementation(() => Promise.resolve(mockData));
  await act(async () => {
    render(<OpenAIConfig />, { wrapper: MemoryRouter });
  });
}

describe('OpenAIConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner before data loads', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}));
    const { container } = render(<OpenAIConfig />, { wrapper: MemoryRouter });
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads config from openai endpoint', async () => {
    await renderAndWait();

    expect(mockGetConfig).toHaveBeenCalledWith('openai');
  });

  it('renders title and description', async () => {
    await renderAndWait();

    expect(screen.getByText('openai.title')).toBeInTheDocument();
    expect(screen.getByText('openai.description')).toBeInTheDocument();
  });

  it('renders connection settings card', async () => {
    await renderAndWait();

    expect(screen.getByText('openai.connection.cardTitle')).toBeInTheDocument();
    expect(screen.getByLabelText('openai.connection.fields.apiUrl')).toBeInTheDocument();
    expect(screen.getByLabelText('openai.connection.fields.model')).toBeInTheDocument();
    // EVO-2250: the credential moved to Settings > AI Credentials.
    expect(screen.queryByLabelText('openai.connection.fields.apiSecret')).not.toBeInTheDocument();
    expect(screen.getByText('openai.connection.credentialMoved')).toBeInTheDocument();
  });

  it('renders audio transcription toggle', async () => {
    await renderAndWait();

    expect(screen.getByText('openai.connection.fields.audioTranscription')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders all 9 prompt textarea fields', async () => {
    await renderAndWait();

    expect(screen.getByText('openai.prompts.cardTitle')).toBeInTheDocument();

    const promptKeys = [
      'OPENAI_PROMPT_REPLY', 'OPENAI_PROMPT_SUMMARY', 'OPENAI_PROMPT_REPHRASE',
      'OPENAI_PROMPT_FIX_GRAMMAR', 'OPENAI_PROMPT_SHORTEN', 'OPENAI_PROMPT_EXPAND',
      'OPENAI_PROMPT_FRIENDLY', 'OPENAI_PROMPT_FORMAL', 'OPENAI_PROMPT_SIMPLIFY',
    ];

    for (const key of promptKeys) {
      expect(screen.getByText(`openai.prompts.fields.${key}`)).toBeInTheDocument();
    }

    const textareas = screen.getAllByRole('textbox');
    // 2 connection inputs (apiUrl, model) + 9 prompt textareas.
    expect(textareas.length).toBeGreaterThanOrEqual(9);
  });

  it('calls saveConfig with openai on form submit', async () => {
    await renderAndWait({
      ...EMPTY_CONFIG,
      OPENAI_API_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o',
    });
    mockSaveConfig.mockResolvedValue({
      ...EMPTY_CONFIG,
      OPENAI_API_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'gpt-4o',
    });

    await act(async () => {
      fireEvent.click(screen.getByText('openai.save'));
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('openai', expect.objectContaining({
        OPENAI_API_URL: 'https://api.openai.com/v1',
        OPENAI_MODEL: 'gpt-4o',
      }));
    });
  });

  it('never sends the retired credential field on save (EVO-2250)', async () => {
    await renderAndWait();
    mockSaveConfig.mockResolvedValue(EMPTY_CONFIG);

    await act(async () => {
      fireEvent.click(screen.getByText('openai.save'));
    });

    await waitFor(() => {
      const [, payload] = mockSaveConfig.mock.calls[0];
      expect(payload).not.toHaveProperty('OPENAI_API_SECRET');
    });
  });
});
