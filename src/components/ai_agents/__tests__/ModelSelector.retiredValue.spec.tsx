import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelSelector from '@/components/ai_agents/ModelSelector';
import type { ApiKey } from '@/types/agents';

/**
 * What happens to an agent already stamped with an id the list no longer offers. Pruning
 * the pinned catalogue does that to real rows every time, so the promise is that the
 * value renders and survives being opened: it falls to the custom-model field, and
 * nothing rewrites it on the way there.
 */

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const listApiKeyModels = vi.fn();
vi.mock('@/services/agents/agentService', () => ({
  agentsService: {
    listApiKeyModels: (...args: unknown[]) => listApiKeyModels(...args),
  },
}));

// An id the pinned list once carried and no longer does — the shape of every row the
// CRM-442 sweep left behind.
const RETIRED = 'openai/gpt-4.1-nano';

const openAiKey: ApiKey = {
  id: 'key-1',
  name: 'OpenAI',
  provider: 'openai',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// The other shape of the same row: the provider answers that it does not list at all, so
// the fallback is the pinned list — which CRM-462 left empty for this axis.
const UNPINNED = 'perplexity/sonar-pro';

const perplexityKey: ApiKey = {
  id: 'key-2',
  name: 'Perplexity',
  provider: 'perplexity',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  listApiKeyModels.mockReset();
});

describe('a value the list no longer offers', () => {
  it('renders the id and leaves it alone when no key is chosen', () => {
    const onChange = vi.fn();
    render(<ModelSelector value={RETIRED} onChange={onChange} apiKeys={[]} />);

    expect(screen.getByDisplayValue(RETIRED)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent(RETIRED);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps it after a live listing answers without it', async () => {
    const onChange = vi.fn();
    listApiKeyModels.mockResolvedValue({
      provider: 'openai',
      supported: true,
      models: [{ value: 'openai/gpt-5.6', label: 'GPT-5.6', provider: 'openai' }],
    });

    render(
      <ModelSelector
        value={RETIRED}
        onChange={onChange}
        apiKeys={[openAiKey]}
        apiKeyId={openAiKey.id}
      />,
    );

    await waitFor(() => expect(listApiKeyModels).toHaveBeenCalledWith(openAiKey.id));
    await waitFor(() => expect(screen.getByDisplayValue(RETIRED)).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still holds it after the picker is opened on top of it', async () => {
    const onChange = vi.fn();
    render(<ModelSelector value={RETIRED} onChange={onChange} apiKeys={[]} />);

    await userEvent.click(screen.getByRole('combobox'));

    // The list rendering is what proves the popover actually opened — without it the
    // assertions below would pass on a picker that never came up.
    expect(await screen.findByText('Custom Model')).toBeInTheDocument();
    expect(screen.getByDisplayValue(RETIRED)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps it when the provider lists nothing and the pinned list is empty', async () => {
    const onChange = vi.fn();
    listApiKeyModels.mockResolvedValue({ provider: 'perplexity', supported: false, models: [] });

    render(
      <ModelSelector
        value={UNPINNED}
        onChange={onChange}
        apiKeys={[perplexityKey]}
        apiKeyId={perplexityKey.id}
      />,
    );

    await waitFor(() => expect(listApiKeyModels).toHaveBeenCalledWith(perplexityKey.id));
    await waitFor(() => expect(screen.getByDisplayValue(UNPINNED)).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows it read-only instead of blanking the field', () => {
    render(<ModelSelector value={RETIRED} onChange={vi.fn()} apiKeys={[]} isReadOnly />);

    expect(screen.getByText(RETIRED)).toBeInTheDocument();
    expect(screen.getByText('Custom Model')).toBeInTheDocument();
  });
});
