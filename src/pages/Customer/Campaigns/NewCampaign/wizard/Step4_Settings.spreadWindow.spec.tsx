import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import catalog from '@/i18n/locales/pt-BR/campaigns.json';

vi.mock('@/hooks/useLanguage', async () => {
  const pt = (await import('@/i18n/locales/pt-BR/campaigns.json')).default as unknown;
  const read = (key: string) =>
    key.split('.').reduce<unknown>((acc, seg) => {
      if (acc === null || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[seg];
    }, pt);
  return { useLanguage: () => ({ t: (key: string) => (read(key) as string) ?? key }) };
});

import Step4_Settings from './Step4_Settings';
import { SPREAD_OPTIONS } from './options';

/**
 * Distribution window, CRM-479. Two failures, both invisible on screen:
 *  - a row whose label states a number the option does not persist (the "10 Horas"
 *    row shipped bound to 9, so picking it spread the campaign over 9 hours);
 *  - a value dropped from the list while campaigns still hold it — the Radix trigger
 *    then renders EMPTY, not the placeholder, so the window reads as "no interval".
 */

const LABELS: Record<string, string> = catalog.wizard.step4.spreadOptions;

const renderWithHours = (hours: number) => {
  const { unmount } = render(
    <Step4_Settings
      data={{ schedule_option: 'now', template_ids: ['a'], spread_sending_hours: hours }}
      onChange={() => {}}
      onNext={() => {}}
      onBack={() => {}}
    />,
  );
  const text = screen.getAllByRole('combobox').map((el) => el.textContent).join('|');
  unmount();
  return text;
};

describe('Step4 distribution window (CRM-479)', () => {
  it.each(SPREAD_OPTIONS.filter((o) => /^h\d+$/.test(o.key)))(
    'the $key row states the number it persists',
    ({ value, key }) => {
      const hours = key.slice(1);
      expect(value).toBe(hours);
      expect(LABELS[key]).toMatch(new RegExp(`^${hours}\\s`));
    },
  );

  it.each(SPREAD_OPTIONS)('$key renders its label instead of an empty trigger', ({ value, key }) => {
    expect(renderWithHours(parseFloat(value))).toContain(LABELS[key]);
  });

  // Pinned by value, not iterated: 9 is what the mislabelled row persisted for months,
  // so dropping it from the list would blank the trigger on those campaigns. Iterating
  // SPREAD_OPTIONS cannot catch a row that is gone.
  it('keeps 9 selectable so campaigns saved by the old "10 Horas" row still show a window', () => {
    expect(SPREAD_OPTIONS.map((o) => o.value)).toContain('9');
    expect(renderWithHours(9)).toContain(LABELS.h9);
  });
});
