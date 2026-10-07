import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LabelConfiguration } from './LabelConfiguration';

// `t` must keep its identity: the component refetches the labels whenever it changes.
const language = vi.hoisted(() => ({ current: 'pt-BR', t: (key: string) => key }));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: language.t, currentLanguage: language.current }),
}));

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: {
    getLabels: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'l1',
          title: 'urgente',
          color: '#ff0000',
          show_on_sidebar: false,
          // 2025-10-01 12:00 UTC, in seconds like the labels API sends it.
          created_at: 1759320000,
          updated_at: 1759320000,
        },
      ],
    }),
  },
}));

const renderConfig = () =>
  render(
    <LabelConfiguration
      labelId="l1"
      labelAction="applied"
      onLabelIdChange={vi.fn()}
      onLabelActionChange={vi.fn()}
    />,
  );

describe('LabelConfiguration — selected label created at', () => {
  it.each([
    ['pt-BR', '01/10/2025'],
    ['en', '10/1/2025'],
    ['es', '1/10/2025'],
  ])('shows the creation day in %s', async (lang, expected) => {
    language.current = lang;
    renderConfig();

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });
});
