import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n/config';
import { BaseFilter } from '@/types/core';
import { buildCustomToolFilterTypes } from '@/components/customTools/customToolFilterTypes';
import BaseFilterRow from './BaseFilterRow';

// Radix Select needs these jsdom polyfills (same as ConditionRow.spec.tsx).
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const tagsFilter: BaseFilter = {
  attributeKey: 'tags',
  filterOperator: 'equal_to',
  values: '',
  queryOperator: 'and',
  attributeModel: 'standard',
};

async function openValueSelect(tagOptions: string[]) {
  render(
    <BaseFilterRow
      filter={tagsFilter}
      index={0}
      showQueryOperator={false}
      filterTypes={buildCustomToolFilterTypes(tagOptions)}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  const trigger = screen
    .getAllByRole('combobox')
    .find(combobox => combobox.textContent?.includes('Select option'));
  await userEvent.click(trigger!);
  return screen.findByRole('listbox');
}

describe('BaseFilterRow option-backed value', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('says there is nothing to pick when no tag is known', async () => {
    const listbox = await openValueSelect([]);

    expect(within(listbox).getByText('No options available')).toBeInTheDocument();
  });

  it('shows a tag as stored, even one shaped like an i18n key', async () => {
    // Through t(), "team:a.b" would render as "a.b": the prefix reads as a namespace.
    const listbox = await openValueSelect(['team:a.b']);

    expect(within(listbox).getByRole('option', { name: 'team:a.b' })).toBeInTheDocument();
  });
});
