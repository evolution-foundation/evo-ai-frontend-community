import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Step5_Instructions from './Step5_Instructions';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/integrations/openaiService', () => ({
  openaiService: { processEvent: vi.fn() },
}));

vi.mock('@/components/agents/wizard/PromptGeneratorModal', () => ({
  default: () => null,
}));

const mockConfig = { openaiConfigured: false };

vi.mock('@/contexts/GlobalConfigContext', () => ({
  useGlobalConfig: () => mockConfig,
}));

const makeProps = (instruction = '') => ({
  data: { instruction },
  onChange: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
});

describe('Step5_Instructions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.openaiConfigured = false;
  });

  it('renders Generate button disabled with aria-disabled when OpenAI is not configured', () => {
    render(<Step5_Instructions {...makeProps()} />);
    const btn = screen.getByText('wizard.step5.generateWithAI').closest('button');
    expect(btn).toBeTruthy();
    expect(btn?.hasAttribute('disabled')).toBe(true);
    expect(btn?.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders Generate button enabled when OpenAI is configured', () => {
    mockConfig.openaiConfigured = true;
    render(<Step5_Instructions {...makeProps()} />);
    const btn = screen.getByText('wizard.step5.generateWithAI').closest('button');
    expect(btn?.hasAttribute('disabled')).toBe(false);
  });

  it('does not render Review button when instruction is empty', () => {
    render(<Step5_Instructions {...makeProps('')} />);
    expect(screen.queryByText('wizard.promptGenerator.buttons.review')).toBeNull();
  });

  it('renders Review button disabled with aria-disabled when instruction has content but OpenAI is not configured', () => {
    render(<Step5_Instructions {...makeProps('A sufficiently long instruction string')} />);
    const reviewBtn = screen.getByText('wizard.promptGenerator.buttons.review').closest('button');
    expect(reviewBtn).toBeTruthy();
    expect(reviewBtn?.hasAttribute('disabled')).toBe(true);
    expect(reviewBtn?.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders Review button enabled when instruction has content and OpenAI is configured', () => {
    mockConfig.openaiConfigured = true;
    render(<Step5_Instructions {...makeProps('A sufficiently long instruction string')} />);
    const reviewBtn = screen.getByText('wizard.promptGenerator.buttons.review').closest('button');
    expect(reviewBtn).toBeTruthy();
    expect(reviewBtn?.hasAttribute('disabled')).toBe(false);
  });
});
